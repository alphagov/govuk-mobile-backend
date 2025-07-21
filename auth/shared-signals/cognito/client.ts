import {
  CognitoIdentityProviderClient,
  AdminUserGlobalSignOutCommand,
  InternalErrorException,
  InvalidParameterException,
  NotAuthorizedException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UserNotFoundException,
  CognitoIdentityProviderServiceException,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AdminUserGlobalSignOutCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoError } from "../errors";
import { StatusCodes } from "http-status-codes";

export const adminGlobalSignOut = async (
  userName: string
): Promise<boolean> => {
  const region = process.env["REGION"];
  const userPoolId = process.env["USER_POOL_ID"];
  try {
    if (userPoolId == undefined) {
      throw new Error("USER_POOL_ID environment variable is not set");
    }
    if (region == undefined) {
      throw new Error("REGION environment variable is not set");
    }

    const client = new CognitoIdentityProviderClient({ region });
    const input = {
      UserPoolId: userPoolId,
      Username: userName,
    };
    const command = new AdminUserGlobalSignOutCommand(input);
    const response: AdminUserGlobalSignOutCommandOutput =
      await client.send(command);

    return response.$metadata.httpStatusCode == StatusCodes.OK;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case error instanceof InternalErrorException:
      case error instanceof InvalidParameterException:
      case error instanceof NotAuthorizedException:
      case error instanceof ResourceNotFoundException:
      case error instanceof TooManyRequestsException:
      case error instanceof UserNotFoundException:
      case error instanceof CognitoIdentityProviderServiceException:
        throw new CognitoError(error.message);
      default:
        throw error instanceof Error
          ? error
          : new Error("Unhandled cognito exception");
    }
  }
};
