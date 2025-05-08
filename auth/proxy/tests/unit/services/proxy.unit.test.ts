/**
 * @vitest-environment node
 */

import { describe,
	 it,
	 expect,
	 vi,
	 beforeEach
       } from 'vitest';
import https from "node:https";
import { proxy } from '../../../services';

vi.mock('https');

describe('proxy', () => {
  beforeEach(() => {
  });
  it('should convert all response header keys to lower case', async () => {
    const hostname = "example.com";
    const path = "/testpath";
    const body = {};
    const headers: OutgoingHttpHeaders = {
      "content-type": "application/json"
    }
    const method = "GET";
    const mockResponse = {
      statusCode: 200,
      headers: {
	"CONTENT-TYPE": "application/json"
      },
      body: {
	"message": "test message"
      }
    };
    https.request.mockResponse.mockImplementation(() => mockResponse);
    const result = await proxy(hostname, path, body, headers, method);
    expect(Object.keys(result.headers)[0]).toEqual('content-type');
  });
  it('should return an HTTP 500 if the proxied resource does not return a status code', async () => {
    const hostname = "example.com";
    const path = "/testpath";
    const body = JSON.stringify({ message: "test"});
    const headers: OutgoingHttpHeaders = {
      "content-type": "application/json"
    }
    const method = "GET";
    const mockResponse = {
      statusCode: undefined,
      headers: {
	"CONTENT-TYPE": "application/json"
      },
      body: {
	"message": "test message"
      }
    };
    https.request.mockResponse.mockImplementation(() => mockResponse);
    const result = await proxy(hostname, path, body, headers, method);
    expect(result.statusCode).toEqual(500);
  });
  it('should return an HTTP 500 if an error occurs in the request stream', async () => {
    const hostname = "example.com";
    const path = "/testpath";
    const body = JSON.stringify({ message: "test"});
    const headers: OutgoingHttpHeaders = {
      "content-type": "application/json"
    }
    const method = "GET";
    const mockResponse = {
      statusCode: 200,
      headers: {
	"CONTENT-TYPE": "application/json"
      },
      body: {
	"message": "test message"
      }
    };
    https.request.mockResponse.mockImplementation(() => mockResponse);
    https.request.error.mockImplementation(() => "Timeout");
    const result = await proxy(hostname, path, body, headers, method);
    expect(result.statusCode).toEqual(500);
  });
})
