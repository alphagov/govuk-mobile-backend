import { requestAsync } from "./requestAsync";
import extractCSRFTokenHelper from "./csrf";

async function getRedirect(options: RequstOptions, headers: IncomingHttpHeaders) {
    if(!headers || !headers['location']) return;
	try {
	    new URL(headers['location']);
	    return headers['location'];
	} catch (e) {
	    if(!options || !options.hostname) return; 
	    return `https://${options.hostname}${headers['location']}`;
	}
    }
    
async function requestAsyncHandleRedirects (options: RequestOptions, cookieJar, formData: any): Promise<HTTP_RESPONSE> {
    console.log(options);
    const response = await requestAsync(options, formData);
    
    const redirect = await getRedirect(options, response.headers);

    if(response.statusCode === 302) {

	if(!redirect) return response;

	await cookieJar.addCookie(redirect, response.headers['set-cookie']);
	
	const url: URL = new URL(redirect);
	const { searchParams } = url;
		
	const redirectOptions: RequestOptions = {
	    hostname: url.hostname,
	    path: `${url.pathname}?${searchParams.toString()}`,
	    method: "GET",
	    headers: options.headers
	};

	const cookies = await cookieJar.getCookiesForUrl(url);

	if(cookies) {
	    redirectOptions.headers['Cookie'] = cookies.map(c => c.toClientString()).join(" ");
	}
	    
	return await requestAsyncHandleRedirects(redirectOptions, cookieJar);
    }
    
    return {
	response: response,
	request: options // Need to return this so we know where we end up after multiple recursions
    }
    
 }

export {
    requestAsyncHandleRedirects
}
