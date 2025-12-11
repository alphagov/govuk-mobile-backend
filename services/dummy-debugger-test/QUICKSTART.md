# Quick Start Guide for lambda-live-debugger Testing

This guide will help you quickly set up and test lambda-live-debugger with the dummy calculator Lambda function.

## Prerequisites

1. **Install lambda-live-debugger globally:**
   ```bash
   npm install -g lambda-live-debugger
   ```

   Or install locally in the project:
   ```bash
   npm install --save-dev lambda-live-debugger
   ```

2. **AWS Credentials:** Ensure your AWS CLI is configured with appropriate credentials
   ```bash
   aws configure
   ```

3. **SAM CLI:** Verify SAM CLI is installed
   ```bash
   sam --version
   ```

## Step 1: Run Tests

First, verify the Lambda function works correctly:

```bash
# From project root
nx test:unit dummy-debugger-test
```

## Step 2: Build and Deploy

Build the SAM application:

```bash
nx sam:build dummy-debugger-test
```

Deploy to AWS (use a development/test environment):

```bash
nx sam:deploy dummy-debugger-test
```

Note: You'll need a `samconfig.toml` file in the service directory. If it doesn't exist, SAM will prompt you to create one during deployment.

## Step 3: Configure lambda-live-debugger

1. Navigate to the service directory:
   ```bash
   cd services/dummy-debugger-test
   ```

2. Update `lldebugger.config.ts` with your settings:
   - Set the correct AWS region
   - Update the `samStackName` to match your deployed stack name
   - Adjust `samConfigFile` if your SAM config has a different name

## Step 4: Start the Debugger

Run the lambda-live-debugger:

```bash
lld
# OR if installed locally
npx lld
```

The first time you run it, it will:
- Detect your Lambda function from the SAM template
- Create an IoT Core topic for communication
- Attach a debugging layer to your Lambda
- Set up IDE configuration (VS Code `.vscode/launch.json` or JetBrains)

## Step 5: Set Breakpoints and Debug

1. **Open the Lambda handler** in your IDE:
   ```bash
   code services/dummy-debugger-test/app.ts
   # OR
   open services/dummy-debugger-test/app.ts
   ```

2. **Set breakpoints** in `app.ts` (e.g., line 28, 32, 35, etc.)

3. **Configure your IDE for debugging:**
   - VS Code: The wizard creates `.vscode/launch.json` automatically
   - Press F5 or go to Run → Start Debugging
   - Select "Lambda Live Debugger" configuration

4. **Invoke the Lambda function:**
   
   **Option A: Via API Gateway** (if deployed with API event):
   ```bash
   # Get the API endpoint from CloudFormation outputs
   curl -X POST https://<api-endpoint>/calculate \
     -H "Content-Type: application/json" \
     -d '{"operation":"add","a":5,"b":3}'
   ```

   **Option B: Via AWS CLI:**
   ```bash
   aws lambda invoke \
     --function-name <stack-name>-dummy-calculator \
     --payload '{"body":"{\"operation\":\"add\",\"a\":5,\"b\":3}"}' \
     response.json
   ```

   **Option C: Via AWS Console:**
   - Go to Lambda → Your function → Test
   - Create a test event with:
     ```json
     {
       "body": "{\"operation\":\"add\",\"a\":5,\"b\":3}"
     }
     ```

5. **Debug:**
   - Execution will pause at your breakpoints
   - Inspect variables (event, body, result, etc.)
   - Step through code (F10 for step over, F11 for step into)
   - Evaluate expressions
   - Continue execution (F5)

## Step 6: Clean Up

**Important:** Always remove the debugger when done to avoid unnecessary costs:

```bash
lld -r
```

This detaches the layer from your Lambda. To also remove the layer:

```bash
lld -r=all
```

## Troubleshooting

### "Function not found"
- Ensure the Lambda is deployed
- Check that `samStackName` in `lldebugger.config.ts` matches your actual stack name
- Verify the function name in AWS Console

### "Permission denied"
- Ensure your AWS credentials have permissions for:
  - Lambda: UpdateFunctionConfiguration, GetFunction
  - IoT Core: CreateTopic, Subscribe, Publish
  - IAM: CreateRole, AttachRolePolicy (for IoT permissions)

### Breakpoints not working
- Ensure `lld` is running
- Check IDE debugger is configured correctly
- Verify you're using the correct launch configuration
- Try restarting the debugger: stop `lld` and run it again

### High AWS costs
- Always run `lld -r` when done
- Use Observability Mode (`observable: true`) in production-like environments
- Consider using a dedicated development environment

## Example Test Scenarios

### Test Addition
```bash
curl -X POST <api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":15,"b":25}'
```
Expected: `{"operation":"add","a":15,"b":25,"result":40}`

### Test Division by Zero
```bash
curl -X POST <api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"divide","a":10,"b":0}'
```
Expected: `{"error":"Division by zero is not allowed"}`

### Test Invalid Operation
```bash
curl -X POST <api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"power","a":2,"b":3}'
```
Expected: `{"error":"Unsupported operation: power"}`

## Next Steps

- Experiment with different breakpoints
- Try modifying variables during debugging
- Test error handling scenarios
- Explore observability mode (`observable: true` in config)

For more information, see the [README.md](./README.md) and [lambda-live-debugger documentation](https://www.lldebugger.com/).

