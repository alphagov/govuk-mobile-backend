import https from "node:https";

export interface ProxyInput {
  method: string
  path: string
  isBase64Encoded: boolean
  body: string | undefined
  sanitisedHeaders: OutgoingHttpHeaders
  targetPath: string
  parsedUrl: URL
}

export async function proxy(hostname: string, path: string, body: object, headers: OutgoingHttpHeaders, method = 'GET'): Promise<APIGatewayProxyResultV2> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk
        });
        res.on('end', () => {
          const respHeaders: IncomingHttpHeaders = {};
          for (const [k, v] of Object.entries(res.headers)) {
            respHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v || '';
          }

          resolve({
            statusCode: res.statusCode || 500,
            headers: respHeaders,
            body: data
          });
        });
      }
    );

    req.on('error', (e) => {
      console.error("Error proxying request to Cognito:", e);
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/x-amz-json-1.1' },
        body: JSON.stringify({ message: 'Internal server error' })
      });
      console.log("This code should be unreachable");
    });

    if (method === 'POST' && body) {
      req.write(body);
    }

    req.end();
  });
}
