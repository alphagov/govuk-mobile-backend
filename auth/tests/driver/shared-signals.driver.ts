import { SignJWT, importJWK, JWK, KeyLike } from 'jose';
import { testConfig } from '../common/config';
import { getClientSecret } from '../common/secrets';

export interface generateJWTPayload {
  jti: string;
  payload: Record<string, unknown>;
  useExpClaim: boolean;
}

interface JwtProperties {
  iss: string;
  aud: string;
  alg: string;
  typ: string;
  kid: string;
}

type PartialJwtProperties = Partial<JwtProperties>;

interface CredentialChangeSignalInput {
  userId: string;
  email: string;
  accessToken: string;
}

interface AccountPurgeSignalInput {
  userId: string;
  accessToken: string;
}

const getPrivateKey = async () => {
  const privateKeyJwk = await getClientSecret(
    `/${testConfig.configStackName}/shared-signal/mock/pk`,
  );

  return await importJWK(JSON.parse(privateKeyJwk), 'RS256');
};

export class SharedSignalsDriver {
  baseUrl: string;
  privateKey: KeyLike | Uint8Array<ArrayBufferLike>;
  claims: JwtProperties;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.claims = {
      alg: 'RS256',
      aud: testConfig.cognitoUrl,
      typ: 'secevent+jwt',
      iss: 'https://ssf.account.gov.uk/',
      kid: '7702b2c3-cd49-4137-8523-4d979d25b23c',
    };
  }

  public async setPrivateKey(
    privateKey?: KeyLike | Uint8Array<ArrayBufferLike>,
  ) {
    this.privateKey = privateKey ? privateKey : await getPrivateKey();
  }

  public async setJwtClaims(overrides?: PartialJwtProperties) {
    this.claims = {
      ...this.claims,
      ...overrides,
    };
  }

  public sendPasswordSignal({
    userId,
    email,
    accessToken,
  }: CredentialChangeSignalInput) {
    return this._sendRequest(
      {
        events: {
          'https://schemas.openid.net/secevent/caep/event-type/credential-change':
            {
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
      },
      accessToken,
    );
  }

  public sendEmailSignal({
    userId,
    email,
    accessToken,
  }: CredentialChangeSignalInput) {
    return this._sendRequest(
      {
        events: {
          'https://schemas.openid.net/secevent/caep/event-type/credential-change':
            {
              change_type: 'update',
              credential_type: 'email',
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
      },
      accessToken,
    );
  }

  public sendAccountPurgeSignal({
    userId,
    accessToken,
  }: AccountPurgeSignalInput) {
    return this._sendRequest(
      {
        events: {
          'https://schemas.openid.net/secevent/risc/event-type/account-purged':
            {
              subject: {
                format: 'urn:example:format',
                uri: userId,
              },
            },
        },
      },
      accessToken,
    );
  }

  async _sendRequest(events: Record<string, unknown>, accessToken: string) {
    const payload = await this._signEventPayload({
      payload: events,
      useExpClaim: false,
      jti: '123e4567-e89b-12d3-a456-426614174000',
    });

    return fetch(`${this.baseUrl}/receiver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async _signEventPayload({ jti, payload, useExpClaim }: generateJWTPayload) {
    const basePayload = new SignJWT(payload)
      .setProtectedHeader({
        alg: this.claims.alg,
        typ: this.claims.typ,
        kid: this.claims.kid,
      })
      .setIssuedAt()
      .setIssuer(this.claims.iss)
      .setJti(jti)
      .setAudience(this.claims.aud);

    if (useExpClaim) {
      basePayload.setExpirationTime('1h');
    }

    if (!this.privateKey) {
      throw new Error(
        'Private key not set, run SharedSignalsDriver.setPrivateKey() to initialise the private key',
      );
    }

    return await basePayload.sign(this.privateKey);
  }
}
