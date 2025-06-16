import { describe, expect, it } from 'vitest';
import axios, { AxiosError } from 'axios';
import { testConfig } from '../common/config';

describe('POST /oauth2/token', () => {
	const baseUrl = testConfig.authProxyUrl;
	const tokenUrl = `${baseUrl}/oauth2/token`

	it.each([
		[{}, {}],
		[{
			'Content-Type': 'application/json',
		}, {}],
		[
			{
				'Content-Type': 'application/json',
			},
			{
				grant_type: 'authorization_code',
			}
		],
		[
			{
				'Content-Type': 'application/json',
			},
			{
				grant_type: 'authorization_code',
				refresh_token: 'foobar',
				client_id: 'test-client-id',
			}
		],
		[
			{
				'Content-Type': 'application/json',
			},
			{
				grant_type: 'refresh_token',
				refresh_token: 'foobar',
			}
		],
	])
		('should validate the request body and headers', async (headers, body) => {
			await axios.post(tokenUrl, body, {
				headers
			})
				.catch((e: AxiosError) => {
					expect(e.response?.status).toBe(400)
					expect(e.response?.data).toEqual({
						message: "Invalid request body",
					})
				})
		});
});