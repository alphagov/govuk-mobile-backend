import { PreAuthenticationTriggerHandler } from 'aws-lambda';

export const handler: PreAuthenticationTriggerHandler = async (event) => {
  console.log('PreAuthentication Lambda Trigger called', event);

  if(!event.request.validationData?.attestationToken) {
    console.log('No attestation token')
    throw new Error('No attestation token')
  }

  // In a real implementation, you would:
  // 1. Retrieve the attestation token from the event (e.g., from headers or clientMetadata).
  // 2. Verify the attestation token with your backend verification service.
  // 3. Based on the verification result, either allow the authentication to proceed
  //    or throw an error to deny it.

  // For this basic example, we'll just log and allow the authentication.
  return event;
}; 