export interface CognitoCredentials {
  clientId: string;
  clientSecret: string;
}

export interface RevokeTokenInput {
  Token: string;
  ClientId: string;
  ClientSecret: string;
}
