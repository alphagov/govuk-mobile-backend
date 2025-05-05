import { describe,
	 it,
	 expect,
	 vi,
	 beforeEach
       } from 'vitest';
import { sanitiseHeaders } from '../../../services';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';

describe('sanitise headers', () => {
  beforeEach(() => {
  });
  it('should remove the host header', async () => {
    const headers: APIGatewayProxyEventHeaders = {
      "host": "testhost"
    }
    const result = sanitiseHeaders(headers);
    expect(result).toEqual({});
  });
  it('should set headers to lowercase', async () => {
    const headers: APIGatewayProxyEventHeaders = {
      "MYTESTHEADER": "testheader"
    }
    const result = sanitiseHeaders(headers);
    expect(result).toEqual({ "mytestheader": "testheader" });
  });
})


/**
    it('proxied requests have host stripped to avoid certificate name errors', async () => {
        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        expect(requestSpy.mock.calls[0][0].headers['host']).toBeUndefined()
    });
    it('proxied requests headers are lowercased', async () => {
        await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        const headerKeys = Object.keys(requestSpy.mock.calls[0][0].headers);
        const hasUppercaseKeys = headerKeys.some(k => /[A-Z]/.test(k));
        
        expect(hasUppercaseKeys).toBe(false);
    });
    it('returns 500 on proxy error', async () => {
        
        const brokenEvent = createMockEvent({ routeKey: '' });
        const response = await lambdaHandler(brokenEvent) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
    });
    it('returns 500 on catch-all errors', async () => {
        // Replace the implementation temporarily
        vi.spyOn(https, 'request').mockImplementationOnce((options, callback) => {
            throw new Error('generic error')
        });

        const response = await lambdaHandler(createMockEvent()) as APIGatewayProxyStructuredResultV2;
        
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body as string)).toEqual({ message: 'Internal server error' });
	});
    **/
