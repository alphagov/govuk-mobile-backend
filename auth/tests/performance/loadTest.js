import { check } from 'k6';
import { b64encode } from 'k6/encoding';
import http from 'k6/http';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { getEnv } from './common/config/environment-variables.js';
import pkce from "k6/x/oauth-pkce";

export const options = {
  scenarios: {
    ui_login: {
      executor: 'shared-iterations',
      vus: 1, // Start with a low number for debugging
      iterations: 1, // Run once for debugging
      options: {},
    },
  },
  thresholds: {},
};

const env = {
  authURL: getEnv('AUTHORIZATION_URL'),
  tokenGenURL: getEnv('ATTESTATION_TOKEN_GEN_URL'),
  tokenExchangeURL: getEnv('TOKEN_EXCHANGE_URL'),
  clientID: getEnv('CLIENT_ID'),
  redirectURI: getEnv('REDIRECT_URI'),
  clientSecret: getEnv('CLIENT_SECRET'),
}

const scope = 'openid email';
const encodedRedirectUri = encodeURIComponent(env.redirectURI);
const encodedScope = encodeURIComponent(scope);
const state = 'k6-test-state-123';

function getAttestationToken() {
  const attestationResponse = http.post(env.tokenGenURL, JSON.stringify({
    length: 1
  }), {
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (attestationResponse.status !== 200) {
    throw new Error(`Failed to get attestation token: ${attestationResponse.status} ${attestationResponse.body}`);
  }

  const attestationResponseBody = JSON.parse(attestationResponse.body);
  check(attestationResponseBody.tokens[0], {
    'Attestation token is present': (token) => token !== null && token.length > 0,
  });
  return attestationResponseBody.tokens[0]
}

export default async function () {
  try {

    const attestationToken = getAttestationToken();

    const verifier = pkce.create("S256");

    const authorizeUrl = `${env.authURL}/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${env.clientID}&` +
      `redirect_uri=${encodedRedirectUri}&` +
      `scope=${encodedScope}&` +
      `state=${state}` +
      `&code_challenge=${verifier.challenge}` +
      `&code_challenge_method=S256`;

    const res = http.get(authorizeUrl);
    const parsedRedirectUrl = new URL(res.url);
    const authorizationCode = parsedRedirectUrl.searchParams.get('code');

    console.log(`Authorization Code: ${authorizationCode}`);

    check(authorizationCode, {
      'Authorization code is present': (code) => code !== null && code.length > 0,
    });

    const tokenRequestData = {
      grant_type: 'authorization_code',
      client_id: env.clientID,
      code: authorizationCode,
      redirect_uri: env.redirectURI,
      scope,
      code_verifier: verifier.verifier,
    };

    const tokenRequestHeaders = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Attestation-Token': attestationToken
      }
    }

    const tokenResponse = http.post(`${env.tokenExchangeURL}/oauth2/token`,
      tokenRequestData,
      tokenRequestHeaders
    );

    const tokenResponseBody = JSON.parse(tokenResponse.body);

    console.log(`Token Response: ${tokenResponse.status}`);

    if (tokenResponse.status !== 200) {
      console.log(`Token Error: ${tokenResponse.body}`)
    }

    const refreshToken = tokenResponseBody.refresh_token;

    check(tokenResponseBody, {
      'Access Token received': (data) => data.access_token && data.access_token.length > 0,
      'ID Token received': (data) => data.id_token && data.id_token.length > 0,
    });

    const tokenRefreshResponse = http.post(`${env.tokenExchangeURL}/oauth2/token`,
      {
        grant_type: 'refresh_token',
        client_id: env.clientID,
        refresh_token: refreshToken,
      },
      tokenRequestHeaders
    );

    const tokenRefreshResponseBody = JSON.parse(tokenRefreshResponse.body);

    check(tokenRefreshResponseBody, {
      'New Access Token received': (data) => data.access_token && data.access_token.length > 0,
    });

    const clientCredentials = `${env.clientID}:${env.clientSecret}`;
    const encodedCredentials = b64encode(clientCredentials);

    const logoutResponse = http.post(`${env.authURL}/oauth2/revoke`, {
      token: refreshToken,
    }, {
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log(`Logout response status: ${logoutResponse.status} ${logoutResponse.body}`);
    check(logoutResponse, {
      'Logout successful': (res) => res.status === 200,
    });

    console.log(`Logout Response: ${logoutResponse.status}`);
  } finally {
    console.log('Test completed');
  }
}