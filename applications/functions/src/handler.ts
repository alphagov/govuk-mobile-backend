import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

/**
 * This is a utility to create a generic handler which will delegate
 * HTTP requests to the method specified.
 * 
 * See ../test/handler.test.ts for usage examples.
 * 
 * TODO - expand the range of available methods as needed
 */

export interface HandlerOptions {
    get?: (event?: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
    post?: (event?: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
}

export const buildHandler = (opts: HandlerOptions): APIGatewayProxyHandler => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        switch (event.httpMethod) {
            case 'GET':
                return (opts.get ?? methodNotDefined)(event)
            case 'POST':
                return (opts.post ?? methodNotDefined)(event)
            default:
                return methodNotDefined()
        }
    }
}

const methodNotDefined = async (): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 405,
        body: JSON.stringify({
            message: 'Method not allowed'
        })
    }
}
