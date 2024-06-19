import { APIGatewayEventRequestContext, APIGatewayProxyEvent, Context } from "aws-lambda";

// TODO add more options here and add to builder below when needed
interface DummyRequestOptions {
    httpMethod?: string;
}

interface DummyRequest {
    event: APIGatewayProxyEvent;
    context: Context;
    callback: () => void;
}

export const buildDummyRequest = (opts?: DummyRequestOptions): DummyRequest => {
    return {
        event: {
            httpMethod: opts?.httpMethod ?? 'GET',
            body: null,
            headers: {},
            multiValueHeaders: {},
            isBase64Encoded: false,
            path: "",
            pathParameters: null,
            queryStringParameters: null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: "",
                apiId: "",
                authorizer: undefined,
                protocol: "",
                httpMethod: "",
                identity: fakeIdentity,
                path: "",
                stage: "",
                requestId: "",
                requestTimeEpoch: 0,
                resourceId: "",
                resourcePath: ""
            },
            resource: ""
        },
        context: {
            callbackWaitsForEmptyEventLoop: false,
            functionName: "",
            functionVersion: "",
            invokedFunctionArn: "",
            memoryLimitInMB: "",
            awsRequestId: "",
            logGroupName: "",
            logStreamName: "",
            getRemainingTimeInMillis: function (): number {
                throw new Error("Function not implemented.");
            },
            done: function (error?: Error | undefined, result?: any): void {
                throw new Error("Function not implemented.");
            },
            fail: function (error: string | Error): void {
                throw new Error("Function not implemented.");
            },
            succeed: function (messageOrObject: any): void {
                throw new Error("Function not implemented.");
            }
        },
        callback: () => { }
    }
}

const fakeIdentity = {
    accessKey: null,
    accountId: null,
    apiKey: null,
    apiKeyId: null,
    caller: null,
    clientCert: null,
    cognitoAuthenticationProvider: null,
    cognitoAuthenticationType: null,
    cognitoIdentityId: null,
    cognitoIdentityPoolId: null,
    principalOrgId: null,
    sourceIp: "",
    user: null,
    userAgent: null,
    userArn: null
};
