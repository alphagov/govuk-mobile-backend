import type { PostAuthenticationTriggerEvent } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 * @returns {object} object - Post Authentication Trigger Event
 */

export const lambdaHandler = async (
  event: PostAuthenticationTriggerEvent,
  // eslint-disable-next-line @typescript-eslint/require-await
): Promise<PostAuthenticationTriggerEvent> => {
  console.log(`Source = ${event.triggerSource}`);
  return event;
};
