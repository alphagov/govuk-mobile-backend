import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns object - API Gateway Lambda Proxy Output Format
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
    console.log("Shared signals receiver called")
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'signal received',
        }),
    };
};
