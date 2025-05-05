import { proxy, ProxyInput }  from "./proxy";

export const proxyWithHttps = async (proxyInput: ProxyInput) => {
  const {
    method,
    path,
    body,
    parsedUrl,
    targetPath,
    sanitisedHeaders
  } = proxyInput;
  if (method === "POST" && path.includes('/token')) {
    // In API Gateway Proxy v2, if the request body is base64-encoded (e.g. from a frontend form or custom client), you need to handle decoding it manually.
    const rawBody = isBase64Encoded ? Buffer.from(body!, 'base64').toString('utf-8') : body!;
    const parsedBody = querystring.parse(rawBody);
    const encodedBody = querystring.stringify(parsedBody);

    sanitisedHeaders['content-length'] = Buffer.byteLength(encodedBody).toString();
    sanitisedHeaders['content-type'] = 'application/x-www-form-urlencoded'; // just to be safe

    return await proxy(parsedUrl.hostname, targetPath, encodedBody, sanitisedHeaders, method);
  }
  return await proxy(parsedUrl.hostname, targetPath, body, sanitisedHeaders, method);
}
