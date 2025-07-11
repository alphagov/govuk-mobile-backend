import https from "node:https";

async function requestAsync(
  options: RequestOptions,
  formData: string,
): Promise<HTTP_RESPONSE> {
  const localOptions = JSON.parse(JSON.stringify(options));
  return new Promise((resolve, reject) => {
    try {
      const req = https.request(options, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const { statusCode, headers } = res;
          //const isResponseOK = statusCode >=200 && statusCode <=399 && res.complete;
          const isResponseOK = res.complete;
          if (isResponseOK) {
            const body = chunks.join("");
            resolve({
              statusCode: statusCode,
              body: body,
              headers: headers,
            });
            return;
          }
          reject({
            statusCode: statusCode,
            headers: headers,
          });
        });
      });
      if (formData && localOptions.method != "GET") {
        localOptions.headers["Content-Length"] = Buffer.byteLength(formData);
        req.write(formData);
      }
      req.end();
    } catch (e) {
      console.log(e);
      reject({
        statusCode: e.statusCode,
        headers: e.rawHeaders,
        body: e.body,
      });
    }
  });
}

export { requestAsync };
