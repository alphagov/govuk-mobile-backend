import type {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { getSecretObject } from './secret';
import { logger } from './logger';

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
): APIGatewayAuthorizerResult => {
  const authResponse: APIGatewayAuthorizerResult = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
  return authResponse;
};

/**
 * Validates the JWT token using AWS Cognito and returns the decoded token.
 * @param token - The JWT token to validate.
 * @returns A promise that resolves to the decoded token or undefined if validation fails.
 */
const validateAndReturnSubject = async (token: string): Promise<string> => {
  try {
    const secretsName = process.env['SHARED_SIGNAL_CLIENT_SECRET_NAME'];
    if (secretsName === undefined || secretsName === '') {
      throw new Error(
        'Environment variable "SHARED_SIGNAL_CLIENT_SECRET_NAME" is not set',
      );
    }
    const secretsObject = await getSecretObject(secretsName);

    const jwtVerifier = CognitoJwtVerifier.create({
      userPoolId: secretsObject.userPoolId, // The user pool ID from the secret
      tokenUse: 'access', //  "access" for Access tokens
      clientId: secretsObject.clientId, // The client ID from the secret
    });

    const response = await jwtVerifier.verify(token, secretsObject.clientId);

    return response.sub;
  } catch (error) {
    console.error('Error validating token:', error);
    throw new Error('Token validation failed');
  }
};

export const lambdaHandler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context,
): Promise<APIGatewayAuthorizerResult> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);

  //APIGatewayAuthorizerResult
  let token = event.authorizationToken; // The token is passed in the Authorization header

  if (!token) {
    logger.error('Authorization header missing');
    throw new Error('Unauthorized - Token not supplied'); // This will result in a 401 response from API Gateway
  }

  if (token.startsWith('Bearer ')) {
    const seven = 7; // Length of "Bearer "
    token = token.substring(seven);
  } else {
    logger.error('Token format invalid: Not a Bearer token');
    throw new Error('Unauthorized');
  }

  try {
    const subject = await validateAndReturnSubject(token);

    return generatePolicy(subject, 'Allow', event.methodArn);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    logger.error('Token verification failed:', error as Error);
    // Throwing an error here also results in a 401 Unauthorized response from API Gateway
    throw new Error('Unauthorized');
  }
};
