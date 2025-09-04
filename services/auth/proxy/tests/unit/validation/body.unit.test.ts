import { expect, it, describe } from 'vitest';
import { RequestBody, grantUnionSchema } from '../../../validation/body';
import { ZodError } from 'zod/v4';

describe('validation', () => {
  const getValidAuthorizationGrantBody = (overrides?: any): RequestBody => ({
    grant_type: 'authorization_code',
    client_id: '1aaa111aaa1aaaaaa1111aaaaa',
    redirect_uri: 'govuk://govuk/login-auth-callback',
    code: '2b57eu0w-3333-1111-992d-a623afdd7b73',
    code_verifier: '1AAaA1AaAAAAaaAAA1aAaA1AaAaaaa1AaaAAaAaa1Aa', // pragma: allowlist-secret
    scope: 'openid email',
    ...overrides,
  });

  const getValidRefreshGrantBody = (overrides?: any): RequestBody => ({
    grant_type: 'refresh_token',
    client_id: '1aaa111aaa1aaaaaa1111aaaaa',
    refresh_token: 'eyJjdH',
    ...overrides,
  });

  it.each([getValidAuthorizationGrantBody(), getValidRefreshGrantBody()])(
    'should perform validation based on the grant type in the request',
    async (body) => {
      await expect(grantUnionSchema.parseAsync(body)).resolves.toEqual(body);
    },
  );

  it.each([undefined, null, ''])(
    'should throw an error if body is missing',
    async (body) => {
      await expect(grantUnionSchema.parseAsync(body)).rejects.toThrowError(
        ZodError,
      );
    },
  );

  it.each([
    getValidAuthorizationGrantBody({
      malicious_content: 'foobar',
    }),
    getValidRefreshGrantBody({
      malicious_content: 'foobar',
    }),
  ])('should ignore extra fields', async (body) => {
    const result = await grantUnionSchema.parseAsync(body);
    expect(result).not.toHaveProperty('malicious_content');
  });

  it.each([
    ['implicit', getValidAuthorizationGrantBody()],
    ['client_credentials', getValidAuthorizationGrantBody()],
    [null, getValidAuthorizationGrantBody()],
    [undefined, getValidAuthorizationGrantBody()],
    ['', getValidAuthorizationGrantBody()],
    // refresh
    ['implicit', getValidRefreshGrantBody()],
    ['client_credentials', getValidRefreshGrantBody()],
    [null, getValidRefreshGrantBody()],
    [undefined, getValidRefreshGrantBody()],
    ['', getValidRefreshGrantBody()],
  ])(
    'should throw an error if grant type is not known grant type',
    async (grantType, body) => {
      await expect(
        grantUnionSchema.parseAsync({
          ...body,
          grant_type: grantType,
        }),
      ).rejects.toThrowError(ZodError);
    },
  );

  it('should throw an exception if body is not valid query string', async () => {
    // Not a query string: object
    await expect(
      grantUnionSchema.parseAsync({ foo: 'bar' } as any),
    ).rejects.toThrowError(ZodError);

    // Not a query string: array
    await expect(
      grantUnionSchema.parseAsync(['foo=bar'] as any),
    ).rejects.toThrowError(ZodError);

    // Not a query string: malformed string
    await expect(
      grantUnionSchema.parseAsync('not-a-query-string'),
    ).rejects.toThrowError(ZodError);

    // Not a query string: random string
    await expect(
      grantUnionSchema.parseAsync('foo=bar&baz'),
    ).rejects.toThrowError(ZodError);
  });

  describe('authorization grant type', () => {
    it('should allow valid body', async () => {
      const body = getValidAuthorizationGrantBody();
      await expect(grantUnionSchema.parseAsync(body)).resolves.toEqual(body);
    });

    it.each(['grant_type', 'client_id', 'redirect_uri', 'code', 'scope'])(
      'should throw an error if required field %s is missing',
      async (field) => {
        const bodyCopy = {
          ...getValidAuthorizationGrantBody(),
        };
        delete bodyCopy[field];

        await expect(grantUnionSchema.parseAsync(bodyCopy)).rejects.toThrow(
          ZodError,
        );
      },
    );

    it.each(['', 'a'.repeat(101)])(
      'should throw an error if client id is wrong length',
      async (clientId) => {
        await expect(
          grantUnionSchema.parseAsync(
            getValidAuthorizationGrantBody({
              client_id: clientId,
            }),
          ),
        ).rejects.toThrowError(ZodError);
      },
    );

    it.each(['', 'a'.repeat(2001)])(
      'should throw an error if redirect_uri is too long',
      async (redirectUri) => {
        await expect(
          grantUnionSchema.parseAsync(
            getValidAuthorizationGrantBody({
              redirect_uri: redirectUri,
            }),
          ),
        ).rejects.toThrow(ZodError);
      },
    );

    it.each(['a', 'a'.repeat(513)])(
      'should throw an error if authorization code is wrong length',
      async (code) => {
        await expect(
          grantUnionSchema.parseAsync(
            getValidAuthorizationGrantBody({
              code,
            }),
          ),
        ).rejects.toThrow(ZodError);
      },
    );

    it.each(['', 'a'.repeat(129)])(
      'should throw an error if code verifier is wrong length',
      async (codeVerifier) => {
        await expect(
          grantUnionSchema.parseAsync(
            getValidAuthorizationGrantBody({
              code_verifier: codeVerifier,
            }),
          ),
        ).rejects.toThrow(ZodError);
      },
    );
  });

  describe('refresh token grant type', () => {
    it.each(['grant_type', 'client_id', 'refresh_token'])(
      'should throw an error if required field %s is missing',
      async (field) => {
        const bodyCopy = {
          ...getValidRefreshGrantBody(),
        };
        delete bodyCopy[field];

        await expect(grantUnionSchema.parseAsync(bodyCopy)).rejects.toThrow(
          ZodError,
        );
      },
    );

    it.each(['', 'a'.repeat(101)])(
      'should throw an error if client id is wrong length',
      async (clientId) => {
        await expect(
          grantUnionSchema.parseAsync(
            getValidRefreshGrantBody({
              client_id: clientId,
            }),
          ),
        ).rejects.toThrowError(ZodError);
      },
    );

    it('should throw an error if refresh_token is too short', async () => {
      await expect(
        grantUnionSchema.parseAsync(
          getValidRefreshGrantBody({
            refresh_token: '',
          }),
        ),
      ).rejects.toThrow(ZodError);
    });
  });
});
