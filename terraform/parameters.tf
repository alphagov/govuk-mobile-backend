# This file contains parameters shared with CDK projects
# We will write the values to Parameter Store

resource "aws_ssm_parameter" "api_gateway_id" {
  name  = var.param_api_gateway_id
  type  = "String"
  value = module.routing.api_gateway_id
}

resource "aws_ssm_parameter" "api_gateway_root_resource_id" {
  name  = var.param_api_gateway_root_resource_id
  type  = "String"
  value = module.routing.api_gateway_root_resource_id
}
