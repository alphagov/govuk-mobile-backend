import type {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  StatementEffect,
} from 'aws-lambda';
import type { SecretsConfig } from '../services/secrets-service';
import { SecretsService } from '../services/secrets-service';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoAccessTokenPayload } from 'aws-jwt-verify/jwt-model';

export class AuthorizerClient {
  public region = process.env['REGION'] ?? 'eu-west-2';
  public secretsService: SecretsService;
  public event: APIGatewayRequestAuthorizerEvent;

  public constructor(event: APIGatewayRequestAuthorizerEvent) {
    this.secretsService = new SecretsService(this.region);
    this.event = event;
  }

  /**
   * Authorizes the request by verifying the JWT token and returning an authorizer result.
   * @returns The authorizer result.
   */
  public async authorizerResult(): Promise<APIGatewayAuthorizerResult> {
    const secrets = await this.getChatSecrets();
    const { clientId, userPoolId, bearerToken } = secrets;
    const authHeader = this.event.headers?.['X-Auth'];

    if (authHeader === undefined || authHeader.trim() === '') {
      console.error("Authorization header 'X-Auth' is missing or empty");
      return AuthorizerClient.getAuthorizerResult(
        'unknown',
        'Deny',
        bearerToken,
      );
    }

    const cognitoTokenPayload =
      await AuthorizerClient.getCognitoTokenPayloadFromJwt(
        authHeader,
        userPoolId,
        clientId,
      );

    const effect: StatementEffect = cognitoTokenPayload ? 'Allow' : 'Deny';
    const userId = cognitoTokenPayload?.sub ?? 'unknown';

    return AuthorizerClient.getAuthorizerResult(userId, effect, bearerToken);
  }

  /**
   * Constructs the authorizer result based on the Cognito token payload and effect.
   * @param cognitoTokenPayload The Cognito token payload.
   * @param userId
   * @param effect The effect of the authorization (Allow or Deny).
   * @param bearerToken The bearer token to include in the context.
   * @returns The authorizer result.
   */
  public static getAuthorizerResult(
    userId: string,
    effect: StatementEffect,
    bearerToken: string,
  ): APIGatewayAuthorizerResult | PromiseLike<APIGatewayAuthorizerResult> {
    return {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: '*',
          },
        ],
      },
      context: {
        bearerToken: `Bearer ${bearerToken}`, // pragma: allowlist secret
        'Govuk-Chat-End-User-Id': userId,
      },
    };
  }

  /**
   * Retrieves the Cognito token payload from the JWT.
   * @param authHeader The authorization header containing the JWT.
   * @param userPoolId The Cognito User Pool ID.
   * @param clientId The Cognito Client ID.
   * @returns The Cognito token payload.
   */
  public static async getCognitoTokenPayloadFromJwt(
    authHeader: string,
    userPoolId: string,
    clientId: string,
  ): Promise<CognitoAccessTokenPayload | undefined> {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: userPoolId,
      tokenUse: 'access',
      clientId: clientId,
    });

    try {
      const payload: CognitoAccessTokenPayload = await verifier.verify(
        authHeader,
      );
      return payload;
    } catch (err) {
      console.error('Token not valid', err);
      return undefined;
    }
  }

  /**
   * Retrieves chat secrets from AWS Secrets Manager.
   * @returns The secrets configuration object.
   */
  public async getChatSecrets(): Promise<SecretsConfig> {
    const secretsName = process.env['CHAT_SECRET_NAME'];
    if (secretsName === undefined || secretsName === '') {
      throw new Error('Environment variable "CHAT_SECRET_NAME" is not set');
    }

    const secretsObject = await this.secretsService.getSecret(secretsName);

    if (secretsObject === undefined) {
      throw new Error('Failed to retrieve chat secret from Secrets Manager');
    }

    // prettier-ignore
    if (typeof secretsObject === 'string') { // pragma: allowlist secret
      throw new Error(
        'Retrieved secret is a string, expected an object with bearerToken, clientId, and userPoolId', // pragma: allowlist secret
      );
    }
    return secretsObject;
  }
}
