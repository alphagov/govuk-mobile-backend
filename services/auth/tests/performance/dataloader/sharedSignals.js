import {
  SHARED_SIGNALS_CREDENTIAL_CHANGE_USERS,
  SHARED_SIGNALS_ACCOUNT_PURGE_USERS,
} from '../common/fixtures/sharedSignals.js';
import { createUser } from './createUser.js';
import { generateAccessToken } from './generateAccestoken.js';
import { generateEvent } from './generateEvent.js';
import { signEventPayload } from './signPayload.js';
import fs from 'fs';
import * as uuid from 'uuid';

const publicKey = JSON.parse(process.env.PUBLIC_KEY);
const privateKey = JSON.parse(process.env.PRIVATE_KEY);

if (!publicKey.kid) {
  throw new Error('No pkid');
}

if (!fs.existsSync('access-token.json')) {
  await generateAccessToken();
}

const createUsers = async (userList, eventType) => {
  const users = [];
  for (const user of userList) {
    const u = await createUser(user);
    users.push(u);
    await new Promise((r) => setTimeout(r, 100));
  }

  fs.writeFileSync(`${eventType}-users.json`, JSON.stringify(users));
};

const createEvents = async (eventType, credentialType) => {
  const users = JSON.parse(fs.readFileSync(`${eventType}-users.json`, 'utf-8'));

  const events = await Promise.all(
    users.map((u) =>
      signEventPayload({
        payload: generateEvent(eventType, u, credentialType),
        privateKey: privateKey,
        iss: 'https://ssf.account.gov.uk/',
        aud: process.env.AUDIENCE, // audience
        jti: uuid.v4(),
        alg: 'PS256',
        exp: Math.floor(Date.now() / 1000) + 3600, // expiration in seconds
        iat: Math.floor(Date.now() / 1000), // issued at
        kid: publicKey.kid,
        typ: 'secevent+jwt',
      }),
    ),
  );

  const fileName = credentialType
    ? `${eventType}-${credentialType}-events.json`
    : `${eventType}-events.json`;

  fs.writeFileSync(fileName, JSON.stringify(events));
};

const events = [
  {
    name: 'credential-change',
    users: SHARED_SIGNALS_CREDENTIAL_CHANGE_USERS(),
    credentialType: 'password',
  },
  {
    name: 'credential-change',
    // users are already created in credential change
    users: [],
    credentialType: 'email',
  },
  {
    name: 'account-purge',
    users: SHARED_SIGNALS_ACCOUNT_PURGE_USERS(),
  },
];

events.map(async ({ name, users, credentialType }) => {
  // only create users if none exist
  if (!fs.existsSync(`${name}-users.json`)) {
    console.log(`Creating users for ${name}`);
    await createUsers(users, name);
  } else {
    console.log(`Users already exist for ${name}`);
  }

  await createEvents(name, credentialType);
});
