# Functional Testing

## Requirements

- Create a `.env` file in the `/auth` directory with the following:

```
COGNITO_IDP_URL=
APP_CLIENT_ID=
AUTH_URL=
REDIRECT_URI=
WAF_LOG_GROUP_NAME=
```

- Enter your cognito idp url into `COGNITO_IDP_URL`
- Enter your cognito app client id into `APP_CLIENT_ID`
- Enter the proxy api gateway url into `AUTH_URL`
- Enter a valid redirect uri that is set on the cognito app client into `REDIRECT_URI`
- Enter a valid log group name for the waf `WAF_LOG_GROUP_NAME`
- Run (from project root):

```bash
npx nx affected -t test:functional
```

- From domain root (`/auth`):
