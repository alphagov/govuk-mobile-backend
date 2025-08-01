export const getJwksKeys = () => {
  const key = JSON.parse(process.env.JWKS_KEY!);
  return [key];
};
