variable "govuk_environment" {
  type        = string
  description = "Acceptable values are test, integration, staging, production"
}

variable "aws_tags" {
  type = map(string)
}

variable "bucket_name" {
  type        = string
  description = "Name to use for the static config bucket"
}
