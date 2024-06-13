resource "aws_s3_bucket" "govuk_app_static" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_versioning" "govuk_app_static" {
  bucket = aws_s3_bucket.govuk_app_static.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Allow access from Fastly
# data "aws_iam_policy_document" "govuk_app_static" {
#   statement {
#     sid     = "S3FastlyReadBucket"
#     actions = ["s3:GetObject"]

#     resources = [
#       "arn:aws:s3:::${aws_s3_bucket.govuk_app_static.id}",
#       "arn:aws:s3:::${aws_s3_bucket.govuk_app_static.id}/*",
#     ]

#     condition {
#       test     = "IpAddress"
#       variable = "aws:SourceIp"

#       values = data.fastly_ip_ranges.fastly.cidr_blocks
#     }

#     principals {
#       type        = "AWS"
#       identifiers = ["*"]
#     }
#   }
# }

# resource "aws_s3_bucket_policy" "govuk_app_static_read_policy" {
#   bucket = aws_s3_bucket.govuk_app_static.id
#   policy = data.aws_iam_policy_document.govuk_app_static.json
# }
