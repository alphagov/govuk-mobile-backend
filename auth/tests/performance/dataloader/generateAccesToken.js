import { writeFileSync } from 'fs';
import querystring from 'node:querystring';

export const generateAccessToken = async () => {
  const payload = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    scope: process.env.SCOPE,
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const res = await fetch(process.env.TOKEN_EXCHANGE_URL, {
    headers,
    method: 'POST',
    body: payload,
  });

  const json = await res.json();

  writeFileSync('access-token.json', JSON.stringify(json));
};
