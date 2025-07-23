import {
  ExchangeTokenInput,
  LoginUserInput,
  LoginUserResponse,
  RefreshTokenResponse,
  TokenExchangeResponse,
} from "../types/user";

export interface AuthDriver {
  loginAndGetCode(input: LoginUserInput): Promise<LoginUserResponse>;
  exchangeCodeForTokens(
    input: ExchangeTokenInput
  ): Promise<TokenExchangeResponse>;
  refreshAccessToken(refreshToken: string, attestationToken: string): Promise<RefreshTokenResponse>;
}
