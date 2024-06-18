import { get } from "../../src/hello-world";

test('get with no parameters', async () => {
    const response = await get();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toEqual('Hello from a Lambda function');
});
