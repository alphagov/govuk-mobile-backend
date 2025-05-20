import type { PostAuthenticationTriggerEvent } from 'aws-lambda';
import type { ReadonlyDeep } from 'type-fest';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
 * @returns object - Post Authentication Trigger Event
 */
export const lambdaHandler = (event: ReadonlyDeep<PostAuthenticationTriggerEvent>): PostAuthenticationTriggerEvent => {
    console.log(`Source = ${event.triggerSource}`);
    console.log(`User Pool Id = ${event.userPoolId}`);
    console.log(`Client Id = ${event.callerContext.clientId}`);
    console.log(`Username = ${event.userName}`);
    return event;
};
