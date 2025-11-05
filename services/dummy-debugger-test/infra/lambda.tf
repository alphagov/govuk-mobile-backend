# Terraform configuration for dummy-debugger-test Lambda function

variable "app_backend_stack_name" {
  type    = string
  default = "ps-dummy-debugger-test"
  description = "Stack name for the application backend"
}

variable "environment" {
  type    = string
  default = "dev"
  description = "Environment name"
}

variable "aws_region" {
  type    = string
  default = "eu-west-2"
  description = "AWS region for resources"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# IAM Role for the Lambda function
resource "aws_iam_role" "dummy_calculator" {
  name = "${var.app_backend_stack_name}-dummy-calculator-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "dummy_calculator" {
  name              = "/aws/lambda/${var.app_backend_stack_name}-dummy-calculator-tf"
  retention_in_days = 7
}

# Lambda Function
resource "aws_lambda_function" "dummy_calculator" {
  function_name = "${var.app_backend_stack_name}-dummy-calculator"
  role          = aws_iam_role.dummy_calculator.arn
  handler       = "app.lambdaHandler"
  runtime       = "nodejs22.x"
  filename      = "${path.module}/../.build/app.zip"
  timeout       = 60
  memory_size   = 128
  
  source_code_hash = filebase64sha256("${path.module}/../.build/app.zip")
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
  
  tags = {
    Product     = "GOV.UK"
    Environment = var.environment
    System      = "Testing"
    Purpose     = "LambdaLiveDebuggerTesting"
  }
}

# API Gateway (optional - for testing)
resource "aws_api_gateway_rest_api" "dummy_calculator" {
  name        = "${var.app_backend_stack_name}-api"
  description = "API Gateway for dummy calculator Lambda"
}

resource "aws_api_gateway_resource" "calculate" {
  rest_api_id = aws_api_gateway_rest_api.dummy_calculator.id
  parent_id   = aws_api_gateway_rest_api.dummy_calculator.root_resource_id
  path_part   = "calculate"
}

resource "aws_api_gateway_method" "post" {
  rest_api_id   = aws_api_gateway_rest_api.dummy_calculator.id
  resource_id   = aws_api_gateway_resource.calculate.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.dummy_calculator.id
  resource_id = aws_api_gateway_resource.calculate.id
  http_method = aws_api_gateway_method.post.http_method
  
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.dummy_calculator.invoke_arn
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dummy_calculator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dummy_calculator.execution_arn}/*/*"
}

# Outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.dummy_calculator.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.dummy_calculator.arn
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_api_gateway_rest_api.dummy_calculator.execution_arn}/prod/calculate"
}

