const oneLoginPrefix = 'onelogin_';

export const toCognitoUsername = (username: string): string => {
  return `${oneLoginPrefix}${username}`;
};
