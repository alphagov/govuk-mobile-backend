terraform {
  cloud {
    organization = "govuk"
    workspaces {
      tags = ["govuk-app", "aws"]
    }
  }

  required_version = "~> 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    fastly = {
      source  = "fastly/fastly"
      version = "~> 5.7"
    }
  }
}

locals {
  default_tags = {
    Product              = "GOV.UK App"
    System               = "GOV.UK App"
    Environment          = var.govuk_environment
    Owner                = "govuk-app-engineering@digital.cabinet-office.gov.uk"
    project              = "GOV.UK App"
    repository           = "govuk-mobile-backend"
    terraform_deployment = basename(abspath(path.root))
  }
}

provider "aws" {
  region = "eu-west-2"
  default_tags { tags = local.default_tags }
}

provider "fastly" { api_key = "test" }

data "fastly_ip_ranges" "fastly" {}
