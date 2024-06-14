resource "aws_api_gateway_account" "account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_role.arn
}

resource "aws_iam_role" "api_gateway_role" {
  name = "api-gateway-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

# -- S3
resource "aws_iam_policy" "s3_policy" {
  name        = "s3-policy"
  description = "Policy to allow reading of items from static config bucket"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::${var.static_config_bucket_name}/*"
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "s3_policy_attach" {
  role       = aws_iam_role.api_gateway_role.name
  policy_arn = aws_iam_policy.s3_policy.arn
}

# -- CloudWatch
resource "aws_iam_policy" "cloudwatch_policy" {
  name        = "cloudwatch-policy"
  description = "Policy to allow writing to and from CloudWatch"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents"
            ],
            "Resource": ["*"]
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "cloudwatch_policy_attach" {
  role       = aws_iam_role.api_gateway_role.name
  policy_arn = aws_iam_policy.cloudwatch_policy.arn
}
