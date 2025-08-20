import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

export const createUser = async (email) => {
  const command = new AdminCreateUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: email,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
    MessageAction: 'SUPPRESS', // doesn't send invite email
  });

  try {
    const response = await client.send(command);

    return {
      id: response.User.Username,
      email,
    };
  } catch (err) {
    console.error('Error creating user:', err);
  }
};
