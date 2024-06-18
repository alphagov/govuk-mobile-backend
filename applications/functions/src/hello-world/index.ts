import { APIGatewayProxyResult } from 'aws-lambda';
import { buildHandler } from '../handler';

export const get = async (): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello from a Lambda function',
        }),
    };
};

export const handler = buildHandler({ get })
