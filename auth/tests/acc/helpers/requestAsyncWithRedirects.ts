import { HTTP_RESPONSE, requestAsync } from './requestAsync';
import { addJourneyLogEntry } from './httpJourneyLog';
import { RequestOptions } from 'https';
import { IncomingHttpHeaders } from 'http';

async function getRedirect(
  options: RequestOptions,
  headers: IncomingHttpHeaders,
) {
  if (!headers || !headers['location']) return;
  try {
    new URL(headers['location']);
    return headers['location'];
  } catch (e) {
    if (!options || !options.hostname) return;
    return decodeURI(`https://${options.hostname}${headers['location']}`);
  }
}

async function requestAsyncHandleRedirects(
  options: RequestOptions,
  cookieJar,
  formData: any,
): Promise<{
  response: HTTP_RESPONSE;
  request: RequestOptions;
}> {
  const response = await requestAsync(options, formData);

  const redirect = await getRedirect(options, response.headers);
  addJourneyLogEntry(JSON.parse(JSON.stringify(options)), response);

  if (response.headers['set-cookie']) {
    await cookieJar.addCookie(
      `https://${options.hostname}${options.path}`,
      response.headers['set-cookie'],
    );
  }

  if (response.statusCode === 302) {
    if (!redirect)
      return {
        response,
        request: options, // Need to return this so we know where we end up after multiple recursions
      };

    const url: URL = new URL(redirect);
    const { searchParams } = url;

    const redirectOptions: RequestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: `${url.pathname}?${searchParams.toString()}`,
      method: 'GET',
      headers: options.headers,
    };

    if (
      redirectOptions &&
      redirectOptions.headers &&
      redirectOptions.headers['Content-Type']
    ) {
      delete redirectOptions.headers['Content-Type'];
    }

    const cookies = await cookieJar.getCookiesForUrl(url);

    if (cookies) {
      redirectOptions.headers['Cookie'] = cookies
        .map((c) => c.toClientString())
        .join(' ');
    }

    return await requestAsyncHandleRedirects(
      redirectOptions,
      cookieJar,
      formData,
    );
  }

  return {
    response: response,
    request: options, // Need to return this so we know where we end up after multiple recursions
  };
}

export { requestAsyncHandleRedirects };
