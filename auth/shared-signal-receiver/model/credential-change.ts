/**
 * The type of credential the event message is about
 */
export type CredentialTypeEnum = 'email' | 'password';

/**
 * A credential has been created, changed, revoked or deleted.
 */
export interface CredentialChangeSchema {
  /**
   * The `aud` (audience) claim identifies the recipients that the JWT is intended for.
   */
  aud: string;
  events: CredentialChangeEventsClass;
  /**
   * The `iat` (issued at) claim identifies the time at which the JWT was issued.
   */
  iat: number;
  /**
   * The `iss` (issuer) claim identifies the principal that issued the JWT.
   */
  iss: string;
  /**
   * The `jti` (JWT ID) claim identifies the unique identifier of the JWT.
   */
  jti: string;
}
export interface CredentialChangeEventsClass {
  'https://schemas.openid.net/secevent/caep/event-type/credential-change': CredentialChangeClass;
  'https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation'?: CredentialChangeInformationClass | null;
}
/**
 * The credential change CAEP object
 */
export interface CredentialChangeClass {
  /**
   * The credential change type
   */
  change_type?: string | null;
  credential_type?: CredentialTypeEnum;
  subject: AccountIdentifierSubjectClass;
}
/**
 * The subject for the shared signal
 */
export interface AccountIdentifierSubjectClass {
  /**
   * The format of the subject of the shared signal
   */
  format: string;
  uri: string;
}
export interface CredentialChangeInformationClass {
  /**
   * The email address of the end user
   */
  email?: string | null;
}
