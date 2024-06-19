import { buildHandler } from "../src/handler"
import { buildDummyRequest } from "./mockRequest";

test('create empty handler', () => {
    const handler = buildHandler({})
    expect(handler).toBeTruthy()
});

test('basic handler with just get', async () => {
    const mockResponse = {
        statusCode: 200,
        body: 'Some text here'
    };
    const dummyGet = async () => {
        return mockResponse
    };
    const handler = buildHandler({ get: dummyGet });
    const { event, context, callback } = buildDummyRequest({
        httpMethod: 'GET'
    });
    const response = await handler(event, context, callback);
    expect(response).toEqual(mockResponse);
});

test('handler with unimplemented method', async () => {
    const handler = buildHandler({})
    const { event, context } = buildDummyRequest({
        httpMethod: 'PATCH'
    });
    const response = await handler(event, context, () => { });
    expect(response?.statusCode).toEqual(405);
})

test('handler with get and post', async () => {
    const get = async () => {
        return { statusCode: 200, body: 'This is a get' }
    };
    const post = async () => {
        return { statusCode: 200, body: 'This is a post' }
    }
    const handler = buildHandler({ get, post })

    const getRequest = { ...buildDummyRequest({ httpMethod: 'GET' }) }
    const getResponse = await handler(getRequest.event, getRequest.context, () => { })
    expect(getResponse?.body).toEqual('This is a get');

    const postRequest = { ...buildDummyRequest({ httpMethod: 'POST' }) }
    const postResponse = await handler(postRequest.event, postRequest.context, () => { })
    expect(postResponse?.body).toEqual('This is a post');
})
