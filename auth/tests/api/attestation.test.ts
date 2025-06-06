import { describe, expect, it } from 'vitest';
import axios, { AxiosError } from 'axios';
import { testConfig } from '../common/config';

describe('POST /oauth2/token', () => {
    const baseUrl = testConfig.authProxyUrl;
    const tokenUrl = `${baseUrl}/oauth2/token`

	it('should satisfy OpenAPI spec', async () => {
		await axios.post(tokenUrl, {}, {
			headers: {
				'Cotent-Type': 'application/json'
			}
		})
			.catch((e: AxiosError) => {
				expect(e.response?.status).toBe(400)
				expect(e.response?.data).toEqual({
					message: "Invalid request body",
				})
			})
	});
});