export type CookieAttributes = {
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

function setProp<T, K extends keyof T> (obj: T, prop: K, value: T[K]) { obj[prop] = value };

const cookie_str_splitter = /[:](?=\s*[a-zA-Z0-9_\-]+\s*[=])/g;

export class Cookie {
    private cookie: Map<string, CookieAttributes>;

    constructor(cookieHeader?: string) {
	this.cookie = new Map<string, CookieAttributes>();
    }

    static tryParse(cookieHeader: string): Map<string, CookieAttributes> | void {
	if (!cookieHeader) return;
	const cookie = new Map<string, CookieAttributes>();
	try {

	    const pairs = cookieHeader.split(/;\s*/);
	    
	    for (const pair of pairs) {

		const separatorIndex = pair.indexOf('=');
		if (separatorIndex === -1) {
		    cookie.set(pair, true);
		    continue;
		}

		const key = decodeURIComponent(pair.substring(0, separatorIndex).trim());
		const value = decodeURIComponent(pair.substring(separatorIndex + 1).trim());

		if (key) {
		    cookie.set(key, value);
		}
		
	    }

	    return cookie;
	} catch (e) {
	    console.log(e);
	}
    }
}

