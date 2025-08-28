import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = process.env.AWS_REGION || 'eu-west-2';
const DRY_RUN = (process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const PREFIX = process.env.PREFIX || 'perf-test-';
const USER_POOL_ID = process.env.USER_POOL_ID;

const client = new CognitoIdentityProviderClient({ region: REGION });

async function listUsersPaginated(prefix) {
  let paginationToken;
  const users = [];
  const filter = `email ^= \"${prefix}\"`;
  do {
    const res = await client.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60,
        PaginationToken: paginationToken,
        Filter: filter,
      }),
    );
    if (res.Users) users.push(...res.Users);
    paginationToken = res.PaginationToken;
  } while (paginationToken);
  return users;
}

async function deleteUser(username) {
  return client.send(
    new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );
}

(async () => {
  console.log(`Region: ${REGION}`);
  console.log(`UserPool: ${USER_POOL_ID}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Filter email: ${PREFIX}`);

  const users = await listUsersPaginated(PREFIX);
  console.log(`Found ${users.length} users to remove.`);

  if (DRY_RUN) {
    users.slice(0, 20).forEach((u) => console.log(`DRY-RUN -> ${u.Username}`));
    if (users.length > 20) console.log(`...and ${users.length - 20} more`);
    process.exit(0);
  }

  let deleted = 0;
  let failed = 0;

  await Promise.all(
    users.map(async ({ Username }) => {
      try {
        await deleteUser(Username);
        deleted++;
        if (deleted % 25 === 0)
          console.log(`Deleted ${deleted}/${users.length} users...`);
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        failed++;
        console.error(`Failed to delete ${Username}:`, err?.message || err);
      }
    }),
  );

  console.log(`\nSummary: deleted=${deleted}, failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
