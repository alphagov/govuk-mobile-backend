terraform {
  required_version = "~> 1.5"
  backend "s3" {
    bucket         = "govuk-mobile-backend-integration-tfstate"
    key            = "static-config/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "govuk-mobile-backend-integration-tf-lockid"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-2"
  default_tags { tags = local.default_tags }
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

  static_config_bucket_name = "govuk-app-${var.govuk_environment}-static-config"
}

module "static-config" {
  source      = "./static-config"
  aws_tags    = local.default_tags
  bucket_name = local.static_config_bucket_name
}

module "routing" {
  source                    = "./routing"
  govuk_environment         = var.govuk_environment
  aws_tags                  = local.default_tags
  static_config_bucket_name = local.static_config_bucket_name
}
