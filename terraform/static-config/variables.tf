variable "aws_tags" {
  type = map(string)
}

variable "bucket_name" {
  type        = string
  description = "Name to use for the static config bucket"
}
