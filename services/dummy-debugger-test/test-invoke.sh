#!/bin/bash
# Test script to invoke the Lambda function for debugging

echo "Invoking Lambda function: ps-dummy-debugger-test-dummy-calculator"
echo ""

aws-vault exec dev-admin -- aws lambda invoke \
  --function-name ps-dummy-debugger-test-dummy-calculator \
  --payload '{"body":"{\"operation\":\"add\",\"a\":15,\"b\":25}"}' \
  --region eu-west-2 \
  response.json

echo ""
echo "Response:"
cat response.json | jq .
