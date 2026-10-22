# Flattens ONE OTLP LogRecord (already isolated by the `split` filters) into ECS-style fields.
#
# Input event (after splits):
#   [resourceLogs][resource][attributes]            => [{"key"=>"service.name","value"=>{"stringValue"=>"shopease-api"}}, ...]
#   [resourceLogs][scopeLogs][logRecords]           => {"timeUnixNano"=>"1760...", "severityText"=>"INFO",
#                                                       "body"=>{"stringValue"=>"..."}, "attributes"=>[...],
#                                                       "traceId"=>"<32 hex>", "spanId"=>"<16 hex>"}
# Output fields:
#   @timestamp, message, log.level, service.name/namespace, deployment.environment,
#   trace.id, span.id, fields.<every other attribute>

SEVERITY_BY_NUMBER = [
  [21, "fatal"], [17, "error"], [13, "warning"], [9, "info"], [5, "debug"], [1, "trace"]
].freeze

def register(params)
end

# OTLP AnyValue -> plain Ruby value
def any_value(v)
  return nil unless v.is_a?(Hash)
  if    v.key?("stringValue") then v["stringValue"]
  elsif v.key?("intValue")    then v["intValue"].to_i
  elsif v.key?("doubleValue") then v["doubleValue"].to_f
  elsif v.key?("boolValue")   then v["boolValue"]
  elsif v.key?("arrayValue")  then ((v["arrayValue"] || {})["values"] || []).map { |x| any_value(x) }
  elsif v.key?("kvlistValue") then kv_to_hash((v["kvlistValue"] || {})["values"])
  end
end

# [{"key"=>k,"value"=>AnyValue}, ...] -> {k => value}
def kv_to_hash(list)
  h = {}
  (list || []).each { |kv| h[kv["key"]] = any_value(kv["value"]) if kv.is_a?(Hash) }
  h
end

def severity_name(rec)
  text = rec["severityText"].to_s.strip
  return text.downcase unless text.empty?
  num = rec["severityNumber"].to_i
  SEVERITY_BY_NUMBER.each { |min, name| return name if num >= min }
  "info"
end

def filter(event)
  rec = event.get("[resourceLogs][scopeLogs][logRecords]")
  return [event] unless rec.is_a?(Hash)

  res  = kv_to_hash(event.get("[resourceLogs][resource][attributes]"))
  attr = kv_to_hash(rec["attributes"])

  # timestamp (nanoseconds as a string) -> @timestamp
  nano = (rec["timeUnixNano"] || rec["observedTimeUnixNano"]).to_i
  if nano > 0
    event.set("@timestamp", LogStash::Timestamp.at(nano / 1_000_000_000, (nano % 1_000_000_000) / 1000))
  end

  body = any_value(rec["body"])
  event.set("message", body.is_a?(String) ? body : body.to_s)
  event.set("[log][level]", severity_name(rec))

  event.set("[service][name]",        res["service.name"])        if res["service.name"]
  event.set("[service][namespace]",   res["service.namespace"])   if res["service.namespace"]
  event.set("[service][environment]", res["deployment.environment"]) if res["deployment.environment"]

  trace_id = rec["traceId"].to_s
  span_id  = rec["spanId"].to_s
  event.set("[trace][id]", trace_id) unless trace_id.empty? || trace_id =~ /\A0+\z/
  event.set("[span][id]",  span_id)  unless span_id.empty?  || span_id  =~ /\A0+\z/

  # everything else (http_status, duration_ms, code.function, ...) -> fields.*
  attr.each do |k, v|
    next if k.start_with?("otel")                 # otelTraceID etc. duplicate trace.id / span.id
    event.set("[fields][#{k}]", v)
  end
  [event]
end
