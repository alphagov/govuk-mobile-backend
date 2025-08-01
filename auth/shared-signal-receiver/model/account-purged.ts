/**
 * Account has been deleted.
 */
export interface AccountPurgedSchema {
  /**
   * The `aud` (audience) claim identifies the recipients that the JWT is intended for.
   */
  aud: string;
  events: AccountPurgedEventsClass;
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
export interface AccountPurgedEventsClass {
  'https://schemas.openid.net/secevent/risc/event-type/account-purged': AccountPurgedClass;
}
export interface AccountPurgedClass {
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
