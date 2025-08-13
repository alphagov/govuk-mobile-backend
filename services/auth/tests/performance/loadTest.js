import { check } from 'k6';
import http from 'k6/http';
import { getEnv } from './common/config/environment-variables.js';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const passwordCredentialChangeEvents = JSON.parse(
  open('credential-change-password-events.json'),
);
const emailCredentialChangeEvents = JSON.parse(
  open('credential-change-email-events.json'),
);
const accountPurgeEvents = JSON.parse(open('account-purge-events.json'));
const accessTokens = JSON.parse(open('access-token.json'));

const PASSWORD_CRED_RATE = Number(__ENV.PASSWORD_CRED_RATE) || 21; // default ~22 TPS
const EMAIL_CRED_RATE = Number(__ENV.EMAIL_CRED_RATE) || 1; // default ~22 TPS
const PURGE_RATE = Number(__ENV.PURGE_RATE) || 1; // default ~3 TPS
const MAX_VUS = Number(__ENV.MAX_VUS) || 30; // default 30 VUs
const PRE_ALLOCATED_VUS = Number(__ENV.PRE_ALLOCATED_VUS) || 5; // default 5 VUs

const TIME_UNIT = __ENV.TIME_UNIT || '1s';
const DURATION = __ENV.DURATION || '60s';

const scenarios = {
  email_cred_change: {
    executor: 'constant-arrival-rate',
    rate: EMAIL_CRED_RATE,
    timeUnit: TIME_UNIT,
    duration: DURATION,
    preAllocatedVUs: PRE_ALLOCATED_VUS,
    maxVUs: MAX_VUS,
    exec: 'emailCredentialChange',
    tags: { scenario: 'credential_change' },
  },
  password_cred_change: {
    executor: 'constant-arrival-rate',
    rate: PASSWORD_CRED_RATE,
    timeUnit: TIME_UNIT,
    duration: DURATION,
    preAllocatedVUs: PRE_ALLOCATED_VUS,
    maxVUs: MAX_VUS,
    exec: 'passwordCredentialChange',
    tags: { scenario: 'credential_change' },
  },
  account_purge: {
    executor: 'constant-arrival-rate',
    rate: PURGE_RATE,
    timeUnit: TIME_UNIT,
    duration: DURATION,
    preAllocatedVUs: PRE_ALLOCATED_VUS,
    maxVUs: MAX_VUS,
    exec: 'accountPurge',
    tags: { scenario: 'account_purge' },
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
const emailCredentialChangeCounter = new Counter(
  'email_credential_change_event',
);
const passwordCredentialChangeCounter = new Counter(
  'password_credential_change_event',
);
const fourHundredErrorCounter = new Counter('four_hundred_errors');
const fiveHundredErrorCounter = new Counter('five_hundred_errors');

function getNextEventSequential(eventsList) {
  const i = exec.scenario.iterationInTest; // 0,1,2,3... across all VUs in this scenario
  if (i >= eventsList.length) {
    return null;
  }
  return eventsList[i]; // strictly sequential, no reuse
}

function getNextEventRoundRobin(eventsList) {
  const i = exec.scenario.iterationInTest;
  return eventsList[i % eventsList.length];
}

function runScenario(event) {
  const token = accessTokens.access_token;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = http.post(env.receiverUrl, JSON.stringify(event), {
    headers,
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
  });

  if (res.status >= 400 && res.status < 500) {
    fourHundredErrorCounter.add(1);
  }
  if (res.status >= 500) {
    fiveHundredErrorCounter.add(1);
  }
}

export function accountPurge() {
  const event = getNextEventSequential(accountPurgeEvents);
  if (!event) {
    throw new Error('No more data');
  }
  purgedEventCounter.add(1);
  runScenario(event);
}

export function emailCredentialChange() {
  const event = getNextEventRoundRobin(emailCredentialChangeEvents);
  if (!event) {
    throw new Error('No more data');
  }
  emailCredentialChangeCounter.add(1);
  runScenario(event);
}

export function passwordCredentialChange() {
  const event = getNextEventRoundRobin(passwordCredentialChangeEvents);
  if (!event) {
    throw new Error('No more data');
  }
  passwordCredentialChangeCounter.add(1);
  runScenario(event);
}
