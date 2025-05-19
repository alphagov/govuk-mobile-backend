export interface CookieAttributes {
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

export class Cookie {
    private cookies: Map<string, CookieAttributes>;
    constructor(cookieHeader?: string) {
	this.cookies = new Map<string, CookieAttributes>();
    }

    static tryParse(cookieHeader: string, domain?: string, path: string = '/'): Map<string, CookieAttributes> | void {
	if (!cookieHeader) return;
	const cookies = new Map<string, CookieAttributes>();
	try {
	    const pairs = cookieHeader.split(/;\s*/);

	    for (const pair of pairs) {
		const separatorIndex = pair.indexOf('=');
		if (separatorIndex === -1) continue;

		const key = decodeURIComponent(pair.substring(0, separatorIndex).trim());
		const value = decodeURIComponent(pair.substring(separatorIndex + 1).trim());

		if (key) {
		    cookies.set(key, {
			value,
			domain,
			path
		    });
		}
		return cookies;
	    }
	} catch (e) {
	    console.log(e);
	}
    }
}

