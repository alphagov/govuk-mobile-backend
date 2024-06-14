resource "aws_api_gateway_rest_api" "main_api_gateway" {
  name = "GOV.UK Mobile Backend API - ${var.govuk_environment}"
}

resource "aws_api_gateway_resource" "info" {
  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  parent_id   = aws_api_gateway_rest_api.main_api_gateway.root_resource_id
  path_part   = "info"
}

resource "aws_api_gateway_resource" "item" {
  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  parent_id   = aws_api_gateway_resource.info.id
  path_part   = "{item}"
}

resource "aws_api_gateway_method" "get_item_method" {
  rest_api_id   = aws_api_gateway_rest_api.main_api_gateway.id
  resource_id   = aws_api_gateway_resource.item.id
  http_method   = "GET"
  authorization = "NONE"
  request_parameters = {
    "method.request.path.item" = true
  }
}

resource "aws_api_gateway_integration" "info_integration" {
  rest_api_id             = aws_api_gateway_rest_api.main_api_gateway.id
  resource_id             = aws_api_gateway_resource.item.id
  http_method             = aws_api_gateway_method.get_item_method.http_method
  integration_http_method = "GET"
  type                    = "AWS"

  # todo fix hardcoded region
  uri         = "arn:aws:apigateway:eu-west-2:s3:path/${var.static_config_bucket_name}/{object}"
  credentials = aws_iam_role.api_gateway_role.arn

  # this maps the path variable name to the uri placeholder
  request_parameters = {
    "integration.request.path.object" = "method.request.path.item"
  }
}

resource "aws_api_gateway_method_response" "Status200" {
  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  resource_id = aws_api_gateway_resource.item.id
  http_method = aws_api_gateway_method.get_item_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Timestamp"      = true
    "method.response.header.Content-Length" = true
    "method.response.header.Content-Type"   = true
  }
}

resource "aws_api_gateway_integration_response" "IntegrationResponse200" {
  depends_on = [aws_api_gateway_integration.info_integration]

  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  resource_id = aws_api_gateway_resource.item.id
  http_method = aws_api_gateway_method.get_item_method.http_method
  status_code = aws_api_gateway_method_response.Status200.status_code

  response_parameters = {
    "method.response.header.Timestamp"      = "integration.response.header.Date"
    "method.response.header.Content-Length" = "integration.response.header.Content-Length"
    "method.response.header.Content-Type"   = "integration.response.header.Content-Type"
  }
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on  = [aws_api_gateway_integration.info_integration]
  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.item,
      aws_api_gateway_method.get_item_method,
      aws_api_gateway_integration.info_integration,
    ]))
  }
}

resource "aws_api_gateway_stage" "environment" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.main_api_gateway.id
  stage_name    = var.govuk_environment
}

resource "aws_api_gateway_method_settings" "environment" {
  rest_api_id = aws_api_gateway_rest_api.main_api_gateway.id
  stage_name  = aws_api_gateway_stage.environment.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}
