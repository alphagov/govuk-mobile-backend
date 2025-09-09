// import sharedSignals from '../dataloader/fixtures.json' assert { type: 'json' };

const accountPurgedEvent = (userId) => ({
  events: {
    'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
      subject: {
        format: 'urn:example:format',
        uri: userId,
      },
    },
  },
});

const credentialChangeEvent = ({ email, id, credentialType }) => ({
  events: {
    'https://schemas.openid.net/secevent/caep/event-type/credential-change': {
      change_type: 'update',
      credential_type: credentialType,
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

export function generateEvent(eventType, user, credentialType) {
  if (eventType === 'credential-change') {
    return credentialChangeEvent({
      ...user,
      credentialType,
    });
  }

  if (eventType === 'account-purge') {
    return accountPurgedEvent(user.id);
  }

  throw new Error('No matching event type');
}
