import { generateResponse } from "../response";
import type { credentialChangeSchema } from "../schema/credential-change";
import type { z } from "zod";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { adminGlobalSignOut } from "../cognito/client";
import type { APIGatewayProxyResult } from "aws-lambda";

export type CredentialChangeRequest = z.infer<typeof credentialChangeSchema>;

const isPasswordChange = (
  credentialChangeRequest: CredentialChangeRequest
): boolean => {
  const events =
    credentialChangeRequest.events[
      "https://schemas.openid.net/secevent/caep/event-type/credential-change"
    ];

  return (
    events.change_type === "update" && events.credential_type === "password"
  );
};

export const handleCredentialChangeRequest = async (
  credentialChangeRequest: CredentialChangeRequest
): Promise<APIGatewayProxyResult> => {
  try {
    const userId =
      credentialChangeRequest.events[
        "https://schemas.openid.net/secevent/caep/event-type/credential-change"
      ].subject.uri;
    if (isPasswordChange(credentialChangeRequest)) {
      const isUserSignedOut = await adminGlobalSignOut(userId);
      if (isUserSignedOut) {
        return generateResponse(StatusCodes.ACCEPTED, ReasonPhrases.ACCEPTED);
      } else {
        console.error("Sign out failed");
        return generateResponse(
          StatusCodes.INTERNAL_SERVER_ERROR,
          ReasonPhrases.INTERNAL_SERVER_ERROR
        );
      }
    }

    return generateResponse(
      StatusCodes.NOT_IMPLEMENTED,
      ReasonPhrases.NOT_IMPLEMENTED
    );
  } catch (e) {
    console.error("Credential change handling failed", e);
    return generateResponse(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR
    );
  }
};
