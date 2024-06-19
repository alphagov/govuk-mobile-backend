output "api_gateway_url" {
  value = aws_api_gateway_deployment.api_deployment.invoke_url
}

output "api_gateway_id" {
  value = aws_api_gateway_rest_api.main_api_gateway.id
}

output "api_gateway_root_resource_id" {
  value = aws_api_gateway_rest_api.main_api_gateway.root_resource_id
}
