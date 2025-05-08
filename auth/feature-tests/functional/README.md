# Functional Testing

## Requirements

- Create a `.env` file in the `/auth` directory with the following:

| Environment Variable       | Description                                      | Example Value                          |
|----------------------------|--------------------------------------------------|----------------------------------------|
| `CFN_UserPoolProviderUrl`          | Cognito Identity Provider URL                   | `https://cognito-idp.us-east-1.amazonaws.com` |
| `CFN_AppUserPoolClientId`            | Cognito Mobile App Client ID                           | `123abc456def789ghi`                   |
| `AUTH_URL`                 | Proxy API Gateway URL                           | `https://api.example.com/auth`         |
| `REDIRECT_URI`             | Valid redirect URI set on the Cognito App Client| `https://example.com/callback`         |
| `WAF_LOG_GROUP_NAME`       | Log group name for the Web Application Firewall | `waf-log-group`                        |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON file | `/path/to/service-account.json`        |
| `CFN_UserPoolId` | Cognito User pool id | `eu-west-2_I9asgj`        |
| `TEST_ENVIRONMENT` | Environment the test will be ran against | `staging`        |
| `AuthProxyLogGroupName` | Exported from SAM template. | `/aws/lambda/auth-proxy-1234abc` |
| `CFN_CognitoWafLogGroupName` | Exported from SAM template. | `/aws/waf/waf-1234abc` |

- Run (from project root):

```bash
npx nx affected -t test:functional
```

- From domain root (`/auth`):


## Firebase Credentials

* Request firebase `service-account.json` from a firebase admin
* The firebase sdk loads credentials from a path defined in `GOOGLE_APPLICATION_CREDENTIALS`