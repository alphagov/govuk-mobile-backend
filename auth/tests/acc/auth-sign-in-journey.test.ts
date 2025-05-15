import {
    assert,
    describe,
    it,
    beforeEach,
} from "vitest";
import {
    OutgoingHttpHeaders,
    IncomingMessage,
    IncomingHttpHeaders
} from "node:http";
import https from "node:https";
import url, { URLSearchParams } from "node:url";
import { promisify } from "node:util";
import type {
    ClientRequest,
    ClientResponse,
    RequestOptions,
} from "node:https";
import { createHmac } from "node:crypto";

const request = promisify(https.request);

type METHOD_TYPE = "GET" | "POST";
type HTTP_RESPONSE = Partial<IncomingMessage> & {
    headers: IncomingHttpHeaders,
    body: string
}

const COGNITO_DOMAIN = process.env.CFN_COGNITO_DOMAIN || "eu-west-2fij6f25zh.auth.eu-west-2.amazoncognito.com";
const COGNITO_APP_CLIENT_ID = process.env.CFN_COGNITO_APP_CLIENT_ID || "121f51j1s4kmk9i98um0b5mphh";
const COGNITO_APP_CLIENT_REDIRECT_URL = process.env.CFN_COGNITO_APP_CLIENT_REDIRECT_URL || "https%3A%2F%2Fd84l1y8p4kdic.cloudfront.net"; 
const USER_AGENT_IPHONE_16E = `Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0`;
const redirectURL = `https://oidc.staging.account.gov.uk/authorize?client_id=Fm3j-88i76HVeZuHmLrvlHdlcCg&redirect_uri=https%3A%2F%2Feu-west-2fij6f25zh.auth.eu-west-2.amazoncognito.com%2Foauth2%2Fidpresponse&scope=openid+emai
l&response_type=code&state=H4sIAAAAAAAAAE2RzZKbMBCE30VnwxoEGHzLLhhDgrGzrFlIpVwySPxJiBgwhlTePfIllVvP9NczUzW_AQJbgEdpwv0gqRfi-cZO1dMSrMBVOLzFlBdVK8pMlIqqEF2plV5rWGNVljmy9VVnXfnkcwGUw9D125eX3NSoMpud1uRVJmeUjzm58XaQW
zwIFAs04zkWkggZevabkAXY_gC8w22VPxmGKgp-rkAliICdyzDypiA-wcOSPYKleYRuMofuaUlrWh9YoCRxApP6QA92WQa280iYt07qAgZRyoQ3HZaShXYzhVEyp65IFGJLLYa_q7ohZPO8pLtvir17vjumYfl-Ve-U-wI36fD1VxR3xwv2hpBZia7eR0RnstPamufIxE5c4ta_KfHF_
9zz8oIii7Zeozys2_x4Nb-4Kcns47SH_NvoeX10665Zb--LJUg0uB4j22fJGTqfQewVpxC-uscP6_v77Tq_kcahpvEROEUWw5nO-cS17h4svbiY_v87UtUGUfWllNE4lPK_vowYWnib8aKtBi5nnIkkA1tlo23gWofmZgU6sCWI9ngFbs8vQ2ToKsYSJkSXNIwUycSqJalYJwbStexqq
ODPX7VNkNQ7AgAA.H4sIAAAAAAAAAAt7s0b129QvWy5GvXd7oSukfzKHcdEyyRizzXahAc_8QqoByFTZ5CAAAAA.3`;

function base64URL(input: string) {
    return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function generateRandomString(length: number): string {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function requestAsync (options: RequestOptions): Promise<HTTP_RESPONSE> {
    return new Promise((resolve, reject) => {
	const req = https.request(options, res => {
	    const chunks = [];
	    res.on("data", chunk => chunks.push(chunk));
	    res.on("error", reject);
	    res.on("end", () => {
		const { statusCode, headers } = res;
		const isResponseOK = statusCode >=200 && statusCode <=399 && res.complete;
		if(isResponseOK) {
		    const body = chunks.join('');
		    resolve({
			...res,
			body: body,
			headers: headers,
		    });
		}
		reject({
		    ...res,
		    headers: headers
		});
	    });
	});
	
	req.end();
    });
}

describe("auth sign in journey", () => {
    let code_verifier: string = "";
    let code_challenge: string = "";
    let path: string = "";
    
    beforeEach(() => {
	code_verifier = generateRandomString(128);
	code_challenge = base64URL(
	    createHmac("sha256", "")
		.update(code_verifier)
		.digest("hex"));
path = `/oauth2/authorize?
response_type=code&
client_id=${COGNITO_APP_CLIENT_ID}&
redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&
code_challenge=${code_challenge}&
code_challenge_method=S256&
scope=openid+email&
idpidentifier=onelogin`;
	path = path.replace(/[\r\n]+/gm, "");
    });
    function interceptAuthGrantRedirectURI(searchParams: URLSearchParams): URLSearchParams{
	return new URLSearchParams([
	    ["client_id", searchParams.get("client_id")],
	    ["scope", searchParams.get("scope")],
	    ["response_type", searchParams.get("response_type")],
	    ["state", searchParams.get("state")],
	    ["redirect_uri", "https://localhost/oauth2/idpresponse"],
	]);
    }
    async function doRedirect(headers: OutgoingHttpHeaders, location: string) {

	const requestMethod: METHOD_TYPE = "GET";
	const url: URL = new URL(location);
	const { searchParams } = url;
	const interceptedSearchParams = interceptAuthGrantRedirectURI(searchParams);
		
	const options: RequestOptions = {
	    hostname: url.hostname,
	    //path: `${url.pathname}?${interceptedSearchParams.toString()}`,
	    path: `${url.pathname}?${searchParams.toString()}`,
	    method: requestMethod,
	    headers: headers
	};
	
	return await requestAsync(options);
	
    }
    
    it("should do redirect to one login", async () => {
	const headers: OutgoingHttpHeaders = {
	    "Accept": "*/*",
	    "AcceptEncoding": "gzip, deflate, br",
	    "Connection": "keep-alive",
	    "User-Agent": USER_AGENT_IPHONE_16E,
	};
	const result: HTTP_RESPONSE = await doRedirect(headers, redirectURL);
	assert.equal(result.statusCode, 302);
	
    });
    it("should sign the app into cognito using one login as the idp", async () => {

	const requestMethod: METHOD_TYPE = "GET";
	const requestHeaders: OutgoingHttpHeaders = {
	    "Accept": "*/*",
	    "AcceptEncoding": "gzip, deflate, br",
	    "Connection": "keep-alive",
	    "User-Agent": USER_AGENT_IPHONE_16E,
	};

	const options: RequestOptions = {
	    hostname: COGNITO_DOMAIN,
	    path: path,
	    method: requestMethod,
	    headers: requestHeaders
	};

	const authResponse: HTTP_RESPONSE = await requestAsync(options);
	assert.equal(authResponse.statusCode, 302);
	const first_redirect_to = authResponse.headers['location'];
	requestHeaders['cookie'] = authResponse.headers['set-cookie'];
	console.log(`first_redirect_to ${first_redirect_to}`);
	const firstRedirect: HTTP_RESPONSE = await doRedirect(requestHeaders, first_redirect_to);
	assert.equal(firstRedirect.statusCode, 302);
	const second_redirect_to = firstRedirect.headers['location'];
	requestHeaders['cookie'] = firstRedirect.headers['set-cookie'];
	console.log(`second_redirect_to ${second_redirect_to}`);
	const secondRedirect: HTTP_RESPONSE = await doRedirect(requestHeaders, second_redirect_to);
	console.log(secondRedirect.statusCode);
	console.log(secondRedirect.headers['location']);
    });
});
