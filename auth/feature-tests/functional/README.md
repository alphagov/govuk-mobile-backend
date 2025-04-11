# Functional Testing

## Requirements

* Rename `.dev.env` to `.env`:

```bash
mv .dev.env .env
```

* Enter your cognito app client id into `APP_CLIENT_ID`
* Enter the proxy api gateway url into `AUTH_URL`
* Enter a valid redirect uri that is set on the cognito app client into `REDIRECT_URI`
* Run (from project root):

```bash
npx nx affected -t test:functional
```

* From domain root (`/auth`):
