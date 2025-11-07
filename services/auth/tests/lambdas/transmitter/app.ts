import { getJwksKeys } from './getJwksKeys';
import { generateResponseV2 } from '@libs/http-utils';

export const lambdaHandler = async (event: any): Promise<any> => {
  console.log(event);
  try {
    if (event.path === '/.well-known/jwks.json' && event.httpMethod === 'GET') {
      // For JWKS, we need to return the keys directly, not wrapped in {message: ...}
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys: await getJwksKeys(),
        }),
      };
    }

    return generateResponseV2({ status: 404, message: 'not found' });
  } catch (error) {
    console.log(error);

    return generateResponseV2({
      status: 500,
      message: 'Internal server error',
    });
  }
};
