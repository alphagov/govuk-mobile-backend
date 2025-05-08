# Functional Testing

## Requirements

- Create a `.env` file in the `/auth` directory with the following:

```
CFN_UserPoolProviderUrl=
AUTH_URL=
REDIRECT_URI=
CFN_CognitoWafLogGroupName=
CFN_UserPoolId=
CFN_AppUserPoolClientId=
TEST_ENVIRONMENT=
```

- Enter your cognito idp url into `CFN_UserPoolProviderUrl`
- Enter your cognito app client id into `CFN_AppUserPoolClientId`
- Enter the proxy api gateway url into `AUTH_URL`
- Enter a valid redirect uri that is set on the cognito app client into `REDIRECT_URI`
- Enter a valid log group name for the waf `CFN_CognitoWafLogGroupName`
- Enter a test environment `TEST_ENVIRONMENT`
- Run (from project root):

```bash
npx nx affected -t test:functional
```

- From domain root (`/auth`):
