export class JwtDecoder {
    /**
     * Decodes a JWT token and returns the payload.
     * @param token - The JWT token to decode.
     * @returns The decoded payload of the JWT token.
     */

    decode(token: string): any {
        const base64Url = token.split('.')[1];
        if (!base64Url) {
            throw new Error('Invalid JWT token');
        }
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    }

    calculateDuration(res: any): number {
        if (res === null || res === undefined) {
            throw new Error("Token payload is null or undefined.");
          }
          const exp = res.exp;
          if (!exp) {
            throw new Error("Expiration time (exp) not found in the token payload.");
          }
        
          const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        
          const remainingDuration = exp - currentTime;
          return remainingDuration;
        }
}