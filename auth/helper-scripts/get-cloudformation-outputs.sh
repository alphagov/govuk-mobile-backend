#!/bin/bash

# Script to retrieve CloudFormation stack outputs and write them to a .env file.
# Each output key will be prefixed with 'CFN_'.

# --- Configuration ---
STACK_NAME="$1"
ENV_FILE_PATH="${2:-.env}" # Default to .env if not provided

# --- Prerequisites Check ---
# Check if a stack name was provided
if [ -z "$STACK_NAME" ]; then
  echo "Usage: $0 <cloudformation_stack_name> [output_env_file_path]"
  echo "Example: $0 MyDemoAppStack"
  echo "Example: $0 MyDemoAppStack my_app.env"
  exit 1
fi

if ! touch "$ENV_FILE_PATH" 2>/dev/null; then
  echo "Error: Cannot write to $ENV_FILE_PATH"
  exit 1
fi

# Start by copying .env.static contents (if it exists) to the target env file
if [ -f .env.static ]; then
  cat .env.static > "$ENV_FILE_PATH"
else
  echo "Warning: .env.static not found, static values will be skipped."
  echo "" > "$ENV_FILE_PATH"
fi

# --- Add a newline separator if .env.static was copied or file was just created ---
echo "" >> "$ENV_FILE_PATH"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed. Please install it to proceed."
  exit 1
fi

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
  echo "Error: 'jq' is not installed. Please install it (e.g., 'sudo apt-get install jq' or 'brew install jq')."
  exit 1
fi

# --- Main Logic ---
echo "Attempting to describe stack: ${STACK_NAME}..."

# Get stack outputs using AWS CLI and jq
# Filter for 'Outputs' array and then iterate through its elements
# For each element, extract OutputKey and OutputValue
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[]' \
  --output json 2>/dev/null) # Redirect stderr to /dev/null for cleaner output if stack not found immediately

# Check if the command failed or no outputs were returned
if [ $? -ne 0 ] || [ -z "$STACK_OUTPUTS" ] || [ "$STACK_OUTPUTS" = "[]" ]; then
  echo "Error: Could not retrieve outputs for stack '${STACK_NAME}'. It might not exist or you lack permissions."
  echo "Please ensure the stack name is correct and your AWS credentials are configured."
  exit 1
fi

echo "Writing stack outputs to ${ENV_FILE_PATH}:"

# Append CloudFormation outputs
echo "$STACK_OUTPUTS" | jq -r '.[] | "\(.OutputKey)=\(.OutputValue)"' | while IFS='=' read -r key value; do
  FORMATTED_KEY="CFN_${key}"
  echo "${FORMATTED_KEY}=\"${value}\"" >> "$ENV_FILE_PATH"
done

echo ""
echo "Successfully generated ${ENV_FILE_PATH} with CloudFormation outputs."
echo "You can now source this file: source ${ENV_FILE_PATH}"