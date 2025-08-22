import { z } from 'zod';
import { credentialChangeSchema } from '../../schema/credential-change';

type Signal = z.infer<typeof credentialChangeSchema>;

class SubjectBuilder {
  private value = {
    format: 'urn',
    uri: 'urn:example:account:1234567890',
  };

  withFormat(format: 'urn' | 'email' | string) {
    this.value.format = format;
    return this;
  }
  withUri(uri: string) {
    this.value.uri = uri;
    return this;
  }

  build() {
    return { ...this.value };
  }
}

interface EventBuilder {
  build(): Record<string, any>;
}

class BaseEventBuilder implements EventBuilder {
  public subject = new SubjectBuilder();

  constructor() {}

  build(): Record<string, any> {
    throw new Error('Method not implemented.');
  }

  withSubject(config?: (b: SubjectBuilder) => void) {
    if (config) config(this.subject);
    return this;
  }
}

export class CredentialChangeEventBuilder extends BaseEventBuilder {
  private change_type: 'update' | 'delete' | 'create' | 'revoke' | string =
    'update';
  private credential_type = 'email';

  withChangeType(t: 'update' | 'delete' | 'create' | 'revoke' | any) {
    this.change_type = t;
    return this;
  }
  withCredentialType(t: string) {
    this.credential_type = t;
    return this;
  }

  build() {
    return {
      'https://schemas.openid.net/secevent/caep/event-type/credential-change': {
        change_type: this.change_type,
        credential_type: this.credential_type,
        subject: this.subject.build(),
      },
      'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation':
        null,
    };
  }
}

export class AccountPurgedEventBuilder extends BaseEventBuilder {
  build() {
    return {
      'https://schemas.openid.net/secevent/risc/event-type/account-purged': {
        subject: this.subject.build(),
      },
    };
  }
}

export class SignalBuilder {
  private aud = 'https://service.example.gov.uk';
  private iss = 'https://identity.example.com';
  private iat = 1721126400;
  private jti = '123e4567-e89b-12d3-a456-426614174000';
  private event: EventBuilder;
  constructor(EventBuilderClass: EventBuilder) {
    this.event = EventBuilderClass;
  }

  withAudience(aud: string) {
    this.aud = aud;
    return this;
  }
  withIssuer(iss: string) {
    this.iss = iss;
    return this;
  }
  withIssuedAt(iat: number) {
    this.iat = iat;
    return this;
  }
  withJti(jti: string) {
    this.jti = jti;
    return this;
  }

  build(): Signal {
    const signal = {
      aud: this.aud,
      iss: this.iss,
      iat: this.iat,
      jti: this.jti,
      events: this.event.build(),
    };

    return signal as Signal;
  }
}
