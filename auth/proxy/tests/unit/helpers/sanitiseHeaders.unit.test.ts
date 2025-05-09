import {
  describe,
  it,
  expect,
} from 'vitest';
import { sanitiseHeaders } from '../../../helpers';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';

describe('sanitise headers', () => {
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
