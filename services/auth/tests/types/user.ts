export interface LoginUserInput {
  email: string;
  password: string;
  totpSecret: string;
}

export interface LoginUserResponse {
  code: string;
  code_verifier: string;
}

export type TokenExchangeResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  status: number;
  statusText?: string;
  expires_in?: number;
  token_type?: string;
};

export interface ExchangeTokenInput {
  code: string;
  attestationHeader?: string;
  code_verifier: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}

export interface RevokeTokenResponse {
  status: number;
  statusText?: string;
}
