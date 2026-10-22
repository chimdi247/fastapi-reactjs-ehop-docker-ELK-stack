#!/bin/sh
# Creates the S3 buckets used by the stack (runs once in the `minio-init` container; idempotent).
#   mimir-blocks      Grafana Mimir: metric blocks (long-term metrics storage)
#   mimir-ruler       Grafana Mimir: ruler state
#   elk-logs-archive  Logstash: gzipped JSON-lines archive of every log record
#   es-snapshots      Elasticsearch: daily snapshots of the log indices (SLM)
#   ecommerce-uploads Product / avatar images uploaded through the API (public-read)
set -eu

until mc alias set local "http://minio:9000" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  echo "waiting for MinIO..."; sleep 2
done

for b in $BUCKETS; do
  mc mb --ignore-existing "local/$b"
done

# product images are shown directly by the browser
mc anonymous set download "local/$UPLOADS_BUCKET"

# S3 lifecycle: expire archived logs after N days (a second run just reports the rule exists)
mc ilm rule add --expire-days "${LOGS_ARCHIVE_RETENTION_DAYS:-90}" "local/$LOGS_ARCHIVE_BUCKET" >/dev/null 2>&1 \
  && echo "lifecycle rule added to $LOGS_ARCHIVE_BUCKET" || echo "lifecycle rule already present on $LOGS_ARCHIVE_BUCKET"

echo "buckets ready:"; mc ls local
