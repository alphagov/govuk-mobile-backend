import { vi } from "vitest";

const mockRequest = vi.fn((options, callback) => {
    const res = {
        on: (event: string, cb: any) => {
            if (event === 'data') cb('mock response');
            if (event === 'end') cb();
        },
        headers: { 'content-type': 'application/json' },
        statusCode: 200,
    };

    const req = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(() => callback(res)),
    };

    return req;
});


const mockHttps = {
  request: mockRequest
}

export default mockHttps;
