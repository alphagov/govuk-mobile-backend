# Integration and Acceptance Approach

This Lambda function enables tests to interact with AWS services in environments where the test container has limited permissions. It acts as a proxy, executing AWS SDK commands on behalf of your tests.

## How It Works

The Lambda receives a payload specifying an AWS SDK client and command to execute. For example:

```ts
{
    service: "CloudWatchClient",
    command: new DescribeAlarmsCommand({ AlarmNames: [alarmName] }),
    action: "DescribeAlarmsCommand"
}
```

If the requested client and command are supported, the Lambda executes the command and returns the result. Otherwise, it rejects the request.

---

## Adding a New AWS SDK Client or Command

1. **Register the Client**

   Edit `../acceptance/clients.ts` and add your client to `SUPPORTED_AWS_SDK_CLIENTS`:

   ```ts
   export const SUPPORTED_AWS_SDK_CLIENTS = {
     CognitoIdentityProviderClient: CognitoIdentityProviderClient,
     CloudWatchClient: CloudWatchClient,
     // Add your new AWS SDK client here
   };
   ```

2. **Register the Command**

   In the same file, add your command to `SUPPORTED_AWS_SDK_COMMANDS` under the appropriate client:

   ```ts
   export const SUPPORTED_AWS_SDK_COMMANDS = {
     CognitoIdentityProviderClient: {
       DescribeUserPoolCommand: DescribeUserPoolCommand,
     },
     CloudWatchClient: {
       DescribeAlarmsCommand: DescribeAlarmsCommand,
     },
     // Add your new client + command mapping here
   };
   ```

   > **Note:** If the Lambda receives a client/command combination not listed here, it will reject the request.

3. **Update IAM Permissions**

   Add the required permissions to the `AcceptanceTestingFunctionIAMRole` in your CloudFormation/SAM template. For example:

   ```yaml
   - Effect: Allow
     Action:
       - iam:GetRole
     Resource:
       - !GetAtt SomeResourceRole.Arn
   ```

   Ensure the Lambda has all permissions needed for the new client/command.

4. **Deploy and Test**

   Deploy your changes to your ephemeral branch:

   ```sh
   sam deploy
   ```

   Then run the acceptance tests:

   ```sh
   npm run test:acc
   ```

---

## Troubleshooting

- **Permissions Boundaries:**  
  Some permissions may be restricted by the permissions boundary set on the secure pipeline. If you see errors like  
  `testing-function is not authorized to perform: ... because no permissions boundary allows the`,  
  review the allowed policies in the [sam deploy pipeline](https://github.com/govuk-one-login/devplatform-deploy/blob/main/sam-deploy-pipeline/template.yaml#L4256).

- **Client/Command Not Found:**  
  If your test fails with a "client/command not supported" error, double-check your registration in `clients.ts`.

- **Global Resources (e.g., AWS Chatbot):**  
  Some AWS resources, such as AWS Chatbot, are considered [global resources](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html#genref-arns) and are not region-specific.  
  The Lambda is deployed in a specific AWS region and can only interact with resources in that region.  
  Because AWS Chatbot commands target global resources, attempts to use them from this Lambda will fail.  
  If you need to test or automate actions involving global resources, you must use a different approach, such as running tests from an environment with broader/global AWS permissions or using AWS CLI/SDK directly from your local machine or

---

## Summary

- Register new AWS SDK clients and commands in `clients.ts`.
- Update Lambda IAM permissions as needed.
- Deploy and test.
- Check permissions boundaries if you encounter authorization errors.

---
