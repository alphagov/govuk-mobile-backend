import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

export const getJwksKeys = async () => {
  const parameter = await getParameter(process.env.JWKS_KEY_NAME!);
  console.log(parameter);
  if (!parameter) {
    throw new Error(
      `Missing parameter store value for: ${process.env.JWKS_KEY_NAME}`,
    );
  }
  const key = JSON.parse(parameter);

  return [key];
};
