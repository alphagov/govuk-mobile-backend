import { describe,
	 it,
	 expect,
	 vi,
	 beforeEach
       } from 'vitest';

import { proxy } from '../../../services';

describe('proxy', () => {
  beforeEach(() => {
  });
  it('does the thing', async () => {
    console.log("It does the thing");
    const hostname = "example.com";
    const path = "/testpath";
    const body = JSON.stringify({ message: "test"});
    const headers: OutgoingHttpHeaders = {
      "content-type": "application/json"
    }
    const method = "GET";
    const result = await proxy(hostname, path, body, headers, method);
  });
})
