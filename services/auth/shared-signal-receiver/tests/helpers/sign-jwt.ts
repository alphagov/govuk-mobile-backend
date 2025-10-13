import { SignJWT } from 'jose';
import { generateJWTPayload } from '../unit/signature-verification/verify-signature.unit.test';

export const signEventPayload = async ({
  alg,
  audience,
  issuer,
  jti,
  payload,
  issuedAt,
  kid,
  exp = '2h',
  typ = 'secevent+jwt',
  pk,
}: generateJWTPayload) => {
  return new SignJWT(payload)
    .setProtectedHeader({
      alg,
      typ,
      kid,
    })
    .setIssuedAt(issuedAt ? issuedAt : Date.now())
    .setIssuer(issuer)
    .setJti(jti)
    .setExpirationTime(exp)
    .setAudience(audience)
    .sign(pk);
};
