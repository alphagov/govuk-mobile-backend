# Using lambda-live-debugger with Terraform

Yes! lambda-live-debugger supports Terraform. Here's how to set it up for your dummy-debugger-test project.

## Overview

Instead of using AWS SAM, you can use Terraform to define your Lambda function and configure lambda-live-debugger to work with it.

## Step 1: Create Terraform Configuration

I've created `infra/lambda.tf` with the Terraform configuration for your Lambda function. This includes:
- Lambda function definition
- IAM role and permissions
- CloudWatch log group
- Optional API Gateway for testing

## Step 2: Update lambda-live-debugger Config

Use the Terraform-specific config file:

```bash
# Rename the config file
mv lldebugger.config.ts lldebugger.config.sam.ts  # Keep SAM version as backup
mv lldebugger.config.terraform.ts lldebugger.config.ts
```

Or manually update `lldebugger.config.ts`:

```typescript
const config: LldConfigTs = {
  framework: 'terraform',  // Changed from 'sam'
  region: 'eu-west-2',
  // ... rest of config
};
```

## Step 3: Build Lambda Package

Before deploying with Terraform, you need to package your Lambda:

```bash
# Build the code
nx sam:build dummy-debugger-test

# Create a zip file for Terraform
cd services/dummy-debugger-test
zip -j .build/app.zip .build/app.js
```

Or create a script to automate this.

## Step 4: Deploy with Terraform

```bash
cd services/dummy-debugger-test/infra

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

## Step 5: Use lambda-live-debugger

Once deployed, use lambda-live-debugger the same way:

```bash
cd services/dummy-debugger-test
lld
```

lambda-live-debugger will:
1. Detect your Terraform configuration
2. Find the Lambda functions defined in your `.tf` files
3. Attach the debugger layer
4. Enable remote debugging

## Configuration Details

### Terraform Auto-Detection

lambda-live-debugger can automatically detect Lambda functions from your Terraform files if:
- You have `.tf` files in the current directory or subdirectories
- The Lambda functions are defined using `aws_lambda_function` resource
- The function names match the deployed functions in AWS

### Manual Configuration

If auto-detection doesn't work (common in monorepos), use the `getLambdas` function:

```typescript
getLambdas: (foundLambdas, config) => {
  // Provide explicit Lambda information
  return [
    {
      functionName: 'ps-dummy-debugger-test-dummy-calculator',
      codePath: 'app.ts',
    },
  ];
}
```

## Terraform vs SAM

### Terraform Advantages:
- ✅ More flexible infrastructure management
- ✅ Better state management
- ✅ Supports multiple providers
- ✅ More mature ecosystem

### SAM Advantages:
- ✅ Simpler for serverless-only projects
- ✅ Built-in local testing (`sam local`)
- ✅ Automatic API Gateway setup
- ✅ Faster for simple Lambda functions

## Troubleshooting

### "No framework found"
- Ensure `framework: 'terraform'` in config
- Check that `.tf` files are in the current directory or specified path
- Try using `getLambdas` to manually specify functions

### "Function not found"
- Verify the function name matches your Terraform `function_name`
- Check that the function is deployed: `terraform show`
- Ensure AWS credentials are configured

### Handler not found
- Make sure `app.ts` exports both `lambdaHandler` and `handler` (see app.ts)
- Verify the handler in Terraform matches: `handler = "app.lambdaHandler"`

## Example Terraform Configuration

See `infra/lambda.tf` for a complete example including:
- Lambda function
- IAM role and permissions
- CloudWatch log group
- API Gateway (optional)

## Next Steps

1. Review `infra/lambda.tf`
2. Update `lldebugger.config.ts` to use `framework: 'terraform'`
3. Build and deploy with Terraform
4. Test with `lld`

For more information, see the [lambda-live-debugger Terraform documentation](https://www.lldebugger.com/).

