// import sharedSignals from '../dataloader/fixtures.json' assert { type: 'json' };

const accountPurgedEvent = (userId, email) => ({
  events: {
    'https://schemas.openid.net/secevent/caep/event-type/credential-change': {
      change_type: 'update',
      credential_type: 'password',
      subject: {
        uri: userId,
        format: 'urn:example:format:account-id',
      },
    },
    'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
      {
        email,
      },
  },
});

const credentialChangeEvent = ({ email, id, changeType }) => ({
  events: {
    'https://schemas.openid.net/secevent/caep/event-type/credential-change': {
      change_type: changeType,
      credential_type: 'email',
      subject: {
        uri: id,
        format: 'urn:example:format:account-id',
      },
    },
    'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
      {
        email,
      },
  },
});

export function generateEvent(eventType, user) {
  if (eventType === 'email') {
    return credentialChangeEvent({
      ...user,
      changeType: 'update',
    });
  }

  if (eventType === 'purge') {
    return accountPurgedEvent('foo', 'foobar@foo.com');
  }

  throw new Error('No matching event type');
}
