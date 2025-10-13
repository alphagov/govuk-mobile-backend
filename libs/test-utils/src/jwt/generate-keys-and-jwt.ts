import type { JWTPayload, CryptoKey } from 'jose';
import {
  generateKeyPair,
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
} from 'jose';

interface GenerateJwtPayload {
  issuer: string;
  audience: string | string[];
  jti: string;
  payload: JWTPayload | undefined;
  alg: string;
  expiryDate: Date;
  typ?: string;
  kid?: string;
}

interface GeneratedJwtResponse {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKid: string;
  jwt: string;
}

const signWithPrivateKey = async (
  privateKey: CryptoKey,
  options: GenerateJwtPayload,
): Promise<string> => {
  const { issuer, audience, jti, payload, alg, expiryDate, typ, kid } = options;
  const protectedHeader = {
    alg,
    ...(typ != null ? { typ } : {}),
    ...(kid != null ? { kid } : {}),
  };
  return await new SignJWT(payload)
    .setProtectedHeader(protectedHeader)
    .setIssuedAt(new Date())
    .setIssuer(issuer)
    .setJti(jti)
    .setExpirationTime(expiryDate)
    .setAudience(audience)
    .sign(privateKey);
};

const generateKeysAndJwt = async (
  options: GenerateJwtPayload,
): Promise<GeneratedJwtResponse> => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);
  const publicKid = await calculateJwkThumbprint(publicJwk, 'sha256');

  const jwt = await signWithPrivateKey(privateKey, options);

  return {
    privateKey,
    publicKey,
    publicKid,
    jwt,
  };
};

export type { GenerateJwtPayload, GeneratedJwtResponse };
export { generateKeysAndJwt };
