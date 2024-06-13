terraform {
  required_version = "~> 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # fastly = {
    #   source  = "fastly/fastly"
    #   version = "~> 5.7"
    # }
  }
}

provider "aws" {
  region = "eu-west-2"
  default_tags { tags = var.aws_tags }
}

# not using Fastly for the time being.

# provider "fastly" { api_key = "test" }

# data "fastly_ip_ranges" "fastly" {}
