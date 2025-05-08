import { vi } from "vitest";
import { ClientRequest } from "node:http";
import { EventEmitter } from "node:events";

type HttpsOptions = Object | string | URL;
type HttpURL = string | URL;
type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;

interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>
    (eventName: K, fn: EventReceiver<T[K]>): void;
}

function createEmitter<T extends EventMap>(): Emitter<T> {
  return new EventEmitter();
}

interface IHttpResponse {
  headers: object,
  statusCode: number,
  body: string | object
}

let mockResponse = vi.fn();
let mockError = vi.fn();

let response = createEmitter<{
    data: Buffer | string;
    end: undefined;
    error: undefined;
  }>();


let request = createEmitter<{
    error:undefined
  }>();

function mockRequest(url?: HttpURL, options: HttpsOptions, callback: Function): ClientRequest;
function mockRequest(url: HttpURL, options: HttpsOptions, callback: Function) : ClientRequest;
function mockRequest(urlOrOptions: HttpURL | HttpsOptions, options: HttpsOptions | Function, callback: Function): ClientRequest {

  request = Object.assign(request, {
    end: vi.fn(),
    write: vi.fn(),
  });
  
  const nextError = mockError();
  
  if(nextError) {
    request.emit('error', nextError);
    return request;
  }
  
  const nextResponse = mockResponse();
  response = Object.assign(response, (({ body, ...o }) => o)(nextResponse));
  
  if (typeof options === "function")
    callback = options;
  callback(response);

  response.emit('data', nextResponse.body);
  response.emit('end');
    
  return request;
  
}

const mockHttps = {
  request: mockRequest
}

mockHttps.request.mockResponse = mockResponse;

mockHttps.request.error = mockError;

export default mockHttps;
