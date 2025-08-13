import { SignJWT, importJWK } from 'jose';

const getPrivateKey = async (privateKeyJwk) => {
  return await importJWK(privateKeyJwk, 'PS256');
};

export const signEventPayload = async ({
  jti,
  payload,
  useExpClaim,
  alg,
  typ,
  kid,
  iss,
  aud,
  privateKey,
}) => {
  const basePayload = new SignJWT(payload)
    .setProtectedHeader({
      alg,
      typ,
      kid,
    })
    .setIssuedAt()
    .setIssuer(iss)
    .setJti(jti)
    .setAudience(aud);

  if (useExpClaim) {
    basePayload.setExpirationTime('1h');
  }

  return await basePayload.sign(await getPrivateKey(privateKey));
};
