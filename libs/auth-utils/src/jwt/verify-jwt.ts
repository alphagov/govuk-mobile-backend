import type { CryptoKey, JWTPayload, JWTVerifyOptions } from 'jose';
import { jwtVerify } from 'jose';

const verifyJwt = async (
  jwt: string,
  jwks: CryptoKey,
  options: JWTVerifyOptions,
): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(jwt, jwks, options);
  return payload;
};

export { verifyJwt };
