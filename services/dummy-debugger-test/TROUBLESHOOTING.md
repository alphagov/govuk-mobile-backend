# Troubleshooting lambda-live-debugger

## Error: "The function's in live debug mode but it hasn't heard back from your machine yet"

**This error means the Lambda is in debug mode but can't reach your local IDE debugger.**

### Solution: Start the IDE Debugger

You need **TWO things running simultaneously**:

1. ✅ **`lld` command** in terminal (you have this)
2. ❌ **VS Code debugger** (you need this)

**Steps to fix:**

1. **Keep `lld` running** in your terminal (the one with reconnecting)

2. **Start VS Code debugger**:
   - Open `app.ts` in VS Code
   - Press **F5** OR go to **Run → Start Debugging**
   - Select **"Lambda Live Debugger"** from the dropdown
   - The debugger should start and connect

3. **Set breakpoints** in `app.ts` (click left of line numbers)

4. **Invoke the Lambda** - now it should hit your breakpoints!

### First Time Setup (10 minutes)

If this is the **first time** using lambda-live-debugger on this AWS account:
- AWS IoT Core needs ~10 minutes to fully set up
- Wait 10 minutes, then try again
- The error message will go away once AWS is ready

### Verify Debugger is Connected

Once both are running, you should see:
- `lld` terminal: Connection stabilized (no more reconnecting loop)
- VS Code: Debug controls appear (continue, step over, etc.)
- When Lambda is invoked: Breakpoints are hit

---

## IoT Reconnecting/Closing Issue

**This is normal behavior!** The IoT connection will keep reconnecting until you invoke the Lambda function. This happens because:

1. AWS IoT Core closes idle connections after a period of inactivity
2. The debugger needs to receive events from Lambda invocations to maintain an active connection
3. The reconnection loop is the debugger maintaining readiness for incoming events

### Solution

**Keep the debugger running** and **invoke your Lambda function**. Once invoked, the connection should stabilize and you'll see debug output.

### Steps to Test

1. **Keep `lld` running** in one terminal (the reconnecting is fine)

2. **In another terminal, invoke your Lambda** using one of these methods:

   **Option A: Via API Gateway** (if deployed with API event):
   ```bash
   curl -X POST https://<your-api-endpoint>/calculate \
     -H "Content-Type: application/json" \
     -d '{"operation":"add","a":5,"b":3}'
   ```

   **Option B: Via AWS CLI**:
   ```bash
   aws-vault exec dev-admin -- aws lambda invoke \
     --function-name ps-dummy-debugger-test-dummy-calculator \
     --payload '{"body":"{\"operation\":\"add\",\"a\":5,\"b\":3}"}' \
     --region eu-west-2 \
     response.json
   ```

   **Option C: Via AWS Console**:
   - Go to Lambda → Functions → `ps-dummy-debugger-test-dummy-calculator`
   - Click "Test"
   - Create a test event:
     ```json
     {
       "body": "{\"operation\":\"add\",\"a\":5,\"b\":3}"
     }
     ```
   - Click "Test"

3. **Once invoked**, you should see:
   - The IoT connection stabilize
   - Debug output in the `lld` terminal
   - Your breakpoints being hit (if set in IDE)

## Common Issues

### Issue: Debugger finds Lambda but can't connect

**Symptoms:**
- `[IoT] Closed` and `[IoT] Reconnecting...` repeatedly
- No errors but no connection

**Solutions:**
1. **Invoke the Lambda** - The debugger needs events to process
2. **Check IAM permissions** - The Lambda role needs IoT publish permissions (usually auto-attached by `lld`)
3. **Verify the function exists**: 
   ```bash
   aws-vault exec dev-admin -- aws lambda get-function \
     --function-name ps-dummy-debugger-test-dummy-calculator \
     --region eu-west-2
   ```

### Issue: Layer not attaching

**Symptoms:**
- Error about layer attachment
- Function not found

**Solutions:**
1. Ensure the Lambda is deployed:
   ```bash
   nx sam:deploy dummy-debugger-test
   ```

2. Check the function name matches:
   ```bash
   aws-vault exec dev-admin -- aws lambda list-functions \
     --region eu-west-2 \
     --query 'Functions[?contains(FunctionName, `dummy-calculator`)].FunctionName'
   ```

3. Remove and re-attach:
   ```bash
   lld -r  # Remove
   lld     # Re-attach
   ```

### Issue: Breakpoints not working

**Symptoms:**
- Debugger connected but breakpoints not hit

**Solutions:**
1. **Ensure IDE debugger is running**:
   - VS Code: Press F5 or Run → Start Debugging
   - Select "Lambda Live Debugger" configuration
   
2. **Check file paths match**:
   - The `codePath` in config should match your source file
   - Breakpoints must be in the exact file being executed

3. **Verify source maps**:
   - Lambda-live-debugger should handle TypeScript → JavaScript mapping
   - Ensure `app.ts` is the source file (not compiled `app.js`)

### Issue: Permission errors

**Symptoms:**
- Errors about IoT, Lambda, or IAM permissions

**Solutions:**
1. Ensure your AWS credentials have:
   - `lambda:UpdateFunctionConfiguration`
   - `lambda:GetFunction`
   - `iot:CreateTopic`
   - `iot:Subscribe`
   - `iot:Publish`
   - `iam:AttachRolePolicy` (for Lambda role)

2. Check Lambda execution role has IoT permissions:
   ```bash
   aws-vault exec dev-admin -- aws iam list-attached-role-policies \
     --role-name ps-dummy-debugger-test-DummyCalculatorFunctionRole-* \
     --region eu-west-2
   ```

## Verification Checklist

Before debugging, verify:

- [ ] Lambda function is deployed and exists in AWS
- [ ] Function name matches config: `ps-dummy-debugger-test-dummy-calculator`
- [ ] AWS credentials are configured correctly
- [ ] Running `lld` from `services/dummy-debugger-test/` directory
- [ ] `lldebugger.config.ts` has correct stack name and region
- [ ] IDE debugger is configured and running (VS Code/WebStorm)
- [ ] Breakpoints are set in the source file (`app.ts`)

## Expected Behavior

### Normal Flow:

1. **Start `lld`**: 
   ```
   ✅ Found Lambda function
   ✅ Layer attached
   ✅ Policy attached
   ✅ Watching for file changes
   ✅ Subscribed to IoT topic
   ⚠️  [IoT] Closed (normal - waiting for events)
   ⚠️  [IoT] Reconnecting... (normal - maintaining connection)
   ```

2. **Invoke Lambda**:
   ```
   ✅ [IoT] Connected
   ✅ Received event from Lambda
   ✅ Processing debug session
   ✅ Breakpoint hit (if set)
   ```

3. **After debugging**:
   ```bash
   lld -r  # Remove debugger
   ```

## Still Having Issues?

1. Check verbose output (`verbose: true` in config)
2. Review AWS CloudWatch Logs for the Lambda function
3. Check IoT Core logs in AWS Console
4. Try observability mode: `observable: true` (non-blocking)
5. Check [GitHub issues](https://github.com/ServerlessLife/lambda-live-debugger/issues)

