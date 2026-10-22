import asyncio
import secrets
import shutil
from pathlib import Path

import boto3
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import ApiException

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY,
    aws_secret_access_key=settings.AWS_SECRET_KEY,
    region_name=settings.AWS_BUCKET_REGION,
    # None => real AWS S3. Set AWS_ENDPOINT_URL to use MinIO / any S3-compatible store.
    endpoint_url=settings.AWS_ENDPOINT_URL or None,
)


def _unique_name(filename: str | None) -> str:
    """Random, URL-safe file name that keeps only the original extension."""
    ext = Path(filename or "").suffix.lower()
    return f"{secrets.token_hex(8)}{ext}"


async def upload_to_s3(file: UploadFile, upload_dir: Path) -> str:
    try:
        unique_name = _unique_name(file.filename)
        # as_posix() guarantees forward slashes, even on Windows
        s3_file_name = f"{upload_dir.as_posix()}/{unique_name}"

        # upload_fileobj is blocking, so run it in a worker thread
        await asyncio.to_thread(
            s3_client.upload_fileobj,
            file.file,
            settings.AWS_BUCKET_NAME,
            s3_file_name,
            ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
        )

        if settings.AWS_PUBLIC_BASE_URL:
            return f"{settings.AWS_PUBLIC_BASE_URL.rstrip('/')}/{s3_file_name}"

        return (
            f"https://{settings.AWS_BUCKET_NAME}.s3."
            f"{settings.AWS_BUCKET_REGION}.amazonaws.com/{s3_file_name}"
        )

    except Exception as e:
        raise ApiException(f"s3 upload failed: {str(e)}", 500)


async def upload_file(file: UploadFile, upload_dir: Path) -> str:
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_name = _unique_name(file.filename)
    file_path = upload_dir / unique_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"/{upload_dir.as_posix()}/{unique_name}"
