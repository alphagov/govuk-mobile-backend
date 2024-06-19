variable "govuk_environment" {
  type        = string
  description = "Acceptable values are test, integration, staging, production"
}

variable "param_api_gateway_id" {
  type        = string
  description = "Should be set by the TF_VAR_param_api_gateway_id env var"
}

variable "param_api_gateway_root_resource_id" {
  type        = string
  description = "Should be set by the TF_VAR_param_api_gateway_root_resource_id env var"
}
