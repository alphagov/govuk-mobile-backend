# Functional Testing

## Requirements

* Rename `.dev.env` to `.env`:

```bash
mv .dev.env .env
```

* Enter your cognito app client id into `APP_CLIENT_ID`
* Run (from project root):

```bash
npx nx affected -t test:functional
```

* From domain root (`/auth`):

```bash
npm run test --project infrastructure
```