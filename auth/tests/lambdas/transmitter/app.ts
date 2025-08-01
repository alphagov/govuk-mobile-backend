import { getJwksKeys } from './getJwksKeys';
import { generateResponse } from './response';

export const lambdaHandler = async (event: any): Promise<any> => {
  console.log(event);
  try {
    if (event.path === '/.well-known/jwks.json' && event.httpMethod === 'GET') {
      return generateResponse(200, {
        keys: getJwksKeys(),
      });
    }

    return generateResponse(404, {
      message: 'not found',
    });
  } catch (error) {
    console.log(error);

    return generateResponse(500, {
      message: 'Internal server error',
    });
  }
};
