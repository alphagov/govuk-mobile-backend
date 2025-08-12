import {
  SHARED_SIGNALS_CREDENTIAL_CHANGE_USERS,
  SHARED_SIGNALS_ACCOUNT_PURGE_USERS,
} from '../common/fixtures/sharedSignals.js';
import { createUser } from './createUser.js';
import { generateAccessToken } from './generateAccestoken.js';
import { generateEvent } from './generateEvent.js';
import { signEventPayload } from './signPayload.js';
import fs from 'fs';

const publicKey = JSON.parse(process.env.PUBLIC_KEY);
const privateKey = JSON.parse(process.env.PRIVATE_KEY);

if (!publicKey.kid) {
  throw new Error('No pkid');
}

if (!fs.existsSync('access-token.json')) {
  await generateAccessToken();
}

const createUsers = async (userList, eventType) => {
  const users = await Promise.all(userList.map(createUser));

  fs.writeFileSync(`${eventType}-users.json`, JSON.stringify(users));
};

const createEvents = async (eventType) => {
  const users = JSON.parse(fs.readFileSync(`${eventType}-users.json`, 'utf-8'));

  const events = await Promise.all(
    users.map((u) =>
      signEventPayload({
        payload: generateEvent('email', u),
        privateKey: privateKey,
        iss: 'https://ssf.account.gov.uk/',
        aud: process.env.AUDIENCE, // audience
        jti: '130142940214',
        alg: 'PS256',
        exp: Math.floor(Date.now() / 1000) + 3600, // expiration in seconds
        iat: Math.floor(Date.now() / 1000), // issued at
        kid: publicKey.kid,
        typ: 'secevent+jwt',
      }),
    ),
  );

  fs.writeFileSync(`${eventType}-events.json`, JSON.stringify(events));
};

const events = [
  {
    name: 'credential-change',
    users: SHARED_SIGNALS_CREDENTIAL_CHANGE_USERS(),
  },
  {
    name: 'account-purge',
    users: SHARED_SIGNALS_ACCOUNT_PURGE_USERS(),
  },
];

events.map(async ({ name, users }) => {
  // only create users if none exist
  if (!fs.existsSync(`${name}-users.json`)) {
    await createUsers(users, name);
  }

  await createEvents(name);
});
