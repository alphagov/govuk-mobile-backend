import https, { RequestOptions } from "node:https";

/**@function requestAsync
 * Async wrapper for https requests
 * @async
 * @param {RequestOptions} options - The options for the request; can include body
 * @param {string} formData - The form in urlencoded format
 * @returns {Promise<HTTP_RESPONSE>} The response object
 */
async function requestAsync(
  options: RequestOptions,
  formData: string,
): Promise<any> {
  //Clone options for local work
  const localOptions = JSON.parse(JSON.stringify(options));

  //Get body if specified
  let body = undefined;
  if (localOptions.body) {
    body = localOptions.body;
    // Delete body from options object as https request options does not include this
    delete localOptions.body;
    // Convert to JSON if the called forgot to
    if (typeof body === "object") {
      body = JSON.stringify(body);
    }
    // Calculate Content-Length header
    localOptions.headers["Content-Length"] = body.length;
  }
  if (formData && localOptions.method != "GET") {
    localOptions.headers["Content-Length"] = Buffer.byteLength(formData);
  }

  return new Promise((resolve, reject) => {
    try {
      const req = https.request(options, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const { statusCode, headers } = res;
          const isResponseOK = res.complete;
          if (isResponseOK) {
            const body = chunks.join("");
            resolve({
              statusCode: statusCode,
              body: body,
              headers: headers,
            });
            // Return from function here as we don't want the function to continue
            return;
          }
          reject({
            statusCode: statusCode,
            headers: headers,
          });
        });
      });
      // Post form data if specified
      if (formData && localOptions.method != "GET") {
        req.write(formData);
      }
      // Send body if specified
      if (
        body &&
        ["PUT", "POST", "PATCH"].includes(localOptions.method.toUpperCase())
      ) {
        if (!req.write(body)) {
          console.log("Error sending body");
        }
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
