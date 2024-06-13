variable "govuk_environment" {
  type        = string
  description = "Acceptable values are test, integration, staging, production"
}

variable "aws_tags" {
  type = map(string)
}

variable "static_config_bucket_name" {
  type        = string
  description = "Name of the static config bucket"
}
