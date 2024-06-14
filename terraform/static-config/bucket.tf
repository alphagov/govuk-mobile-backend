resource "aws_s3_bucket" "govuk_app_static" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "govuk_app_static" {
  bucket = aws_s3_bucket.govuk_app_static.id
  versioning_configuration {
    status = "Enabled"
  }
}
