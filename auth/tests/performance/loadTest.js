import { check } from 'k6';
import http from 'k6/http';
import { getEnv } from './common/config/environment-variables.js';
import { Counter } from 'k6/metrics';

const credentialChangeEvents = JSON.parse(
  open('credential-change-events.json'),
);
const accountPurgeEvents = JSON.parse(open('account-purge-events.json'));
const accessTokens = JSON.parse(open('access-token.json'));

const scenarios = {
  smoke: {
    executor: 'shared-iterations',
    vus: 1, // Start with a low number for debugging
    iterations: 1, // Run once for debugging
  },
  stress: {
    executor: 'constant-arrival-rate',
    rate: 100,
    timeUnit: '1s',
    duration: '1m',
    preAllocatedVUs: 50,
    maxVUs: 200,
  },
};

const { SCENARIO } = __ENV;

export const options = {
  // if a scenario is passed via a CLI env variable, then run that scenario. Otherwise, run
  // using the pre-configured scenarios above.
  scenarios: SCENARIO ? { [SCENARIO]: scenarios[SCENARIO] } : scenarios,
  thresholds: {
    // http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const env = {
  receiverUrl: getEnv('RECEIVER_URL'),
  tokenExchangeURL: getEnv('TOKEN_EXCHANGE_URL'),
  clientID: getEnv('CLIENT_ID'),
  clientSecret: getEnv('CLIENT_SECRET'),
  scope: getEnv('SCOPE'),
  privateKey: getEnv('PRIVATE_KEY'),
  publicKey: getEnv('PUBLIC_KEY'),
  audience: getEnv('AUDIENCE'),
};

const purgedEventCounter = new Counter('purged_event');
const credentialChangeCounter = new Counter('credential_change_event');

export default async function () {
  const token = accessTokens.access_token;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Weighted selection: 10% account purge, 90% credential change
  const usePurge = Math.random() < 0.1; // 10% probability
  const pool = usePurge ? accountPurgeEvents : credentialChangeEvents;

  if (usePurge) {
    purgedEventCounter.add(1);
  } else {
    credentialChangeCounter.add(1);
  }

  const event = pool[Math.floor(Math.random() * pool.length)];

  const res = http.post(env.receiverUrl, JSON.stringify(event), {
    headers,
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
  });
}
