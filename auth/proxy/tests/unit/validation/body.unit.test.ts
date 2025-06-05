import { describe } from "node:test";
import querystring from 'querystring';
import { expect, it } from "vitest";
import { RequestBody, validateRequestBodyOrThrow } from "../../../validation/body"
import { ZodError } from "zod/v4";

describe('validation', () => {
    const getValidAuthorizationGrantBody = (overrides?: any): RequestBody => ({
        grant_type: "authorization_code",
        client_id: "1aaa111aaa1aaaaaa1111aaaaa",
        redirect_uri: "govuk://govuk/login-auth-callback",
        code: "2b57eu0w-3333-1111-992d-a623afdd7b73",
        code_verifier: "1AAaA1AaAAAAaaAAA1aAaA1AaAaaaa1AaaAAaAaa1Aa", // pragma: allowlist-secret
        scope: "openid email",
        ...overrides
    })

    const getValidRefreshGrantBody = (overrides?: any): RequestBody => ({
        grant_type: "refresh_token",
        client_id: "1aaa111aaa1aaaaaa1111aaaaa",
        refresh_token: 'eyJjdH',
        ...overrides
    })

    it.each([
        getValidAuthorizationGrantBody(),
        getValidRefreshGrantBody(),
    ])
        ('should perform validation based on the grant type in the request', async (body) => {
            await expect(validateRequestBodyOrThrow(querystring.stringify(body)))
                .resolves
                .toEqual(body)
        })

    it.each([
        undefined,
        null,
        ""
    ])
        ('should throw an error if body is missing', async (body) => {
            await expect(validateRequestBodyOrThrow(body))
                .rejects
                .toThrowError(expect.objectContaining({
                    name: 'ZodError',
                    message: expect.stringContaining("Invalid input: body is undefined")
                }))
        })

    it.each([
        getValidAuthorizationGrantBody({
            malicious_content: 'foobar'
        }),
        getValidRefreshGrantBody({
            malicious_content: 'foobar'
        }),
    ])('should ignore extra fields', async (body) => {
        const result = await validateRequestBodyOrThrow(querystring.stringify(body));
        expect(result).not.toHaveProperty('malicious_content');
    })

    it.each([
        ["implicit", getValidAuthorizationGrantBody()],
        ["client_credentials", getValidAuthorizationGrantBody()],
        [null, getValidAuthorizationGrantBody()],
        [undefined, getValidAuthorizationGrantBody()],
        ["", getValidAuthorizationGrantBody()],
        // refresh
        ["implicit", getValidRefreshGrantBody()],
        ["client_credentials", getValidRefreshGrantBody()],
        [null, getValidRefreshGrantBody()],
        [undefined, getValidRefreshGrantBody()],
        ["", getValidRefreshGrantBody()],
    ])
        ('should throw an error if grant type is not known grant type', async (grantType, body) => {
            await expect(validateRequestBodyOrThrow(querystring.stringify({
                ...body,
                grant_type: grantType
            })))
                .rejects
                .toThrowError(ZodError)
        })

    it('should throw an exception if body is not valid query string', async () => {
        // Not a query string: object
        await expect(validateRequestBodyOrThrow({ foo: "bar" } as any))
            .rejects
            .toThrowError(ZodError);

        // Not a query string: array
        await expect(validateRequestBodyOrThrow(["foo=bar"] as any))
            .rejects
            .toThrowError(ZodError);

        // Not a query string: malformed string
        await expect(validateRequestBodyOrThrow("not-a-query-string"))
            .rejects
            .toThrowError(ZodError);

        // Not a query string: random string
        await expect(validateRequestBodyOrThrow("foo=bar&baz"))
            .rejects
            .toThrowError(ZodError);
    })

    describe('authorization grant type', () => {
        it('should allow valid body', async () => {
            const stringifiedBody = querystring.stringify(getValidAuthorizationGrantBody())
            await expect(validateRequestBodyOrThrow(stringifiedBody))
                .resolves
                .toEqual(querystring.parse(stringifiedBody))
        })

        it.each([
            "grant_type",
            "client_id",
            "redirect_uri",
            "code",
            "scope",
        ])
            ('should throw an error if required field %s is missing', async (field) => {
                const bodyCopy = {
                    ...getValidAuthorizationGrantBody()
                }
                delete bodyCopy[field]

                await expect(validateRequestBodyOrThrow(querystring.stringify(bodyCopy)))
                    .rejects
                    .toThrow(ZodError)
            })

        it.each([
            "",
            "a".repeat(101),
        ])
            ('should throw an error if client id is wrong length', async (clientId) => {
                await expect(validateRequestBodyOrThrow(querystring.stringify(
                    getValidAuthorizationGrantBody({
                        client_id: clientId
                    })
                )))
                    .rejects
                    .toThrowError(ZodError)
            })

        it.each([
            "",
            "a".repeat(2001),
        ])('should throw an error if redirect_uri is too long', async (redirectUri) => {
            await expect(validateRequestBodyOrThrow(querystring.stringify(
                getValidAuthorizationGrantBody({
                    redirect_uri: redirectUri
                })
            )))
                .rejects
                .toThrow(ZodError)
        })

        it.each([
            "a",
            "a".repeat(513),
        ])
            ('should throw an error if authorization code is wrong length', async (code) => {
                await expect(validateRequestBodyOrThrow(querystring.stringify(
                    getValidAuthorizationGrantBody({
                        code
                    })
                )))
                    .rejects
                    .toThrow(ZodError)
            })

        it.each([
            "",
            "a".repeat(129),
        ])
            ('should throw an error if code verifier is wrong length', async (codeVerifier) => {
                await expect(validateRequestBodyOrThrow(querystring.stringify(
                    getValidAuthorizationGrantBody({
                        code_verifier: codeVerifier
                    })
                )))
                    .rejects
                    .toThrow(ZodError)
            })
    })

    describe('refresh token grant type', () => {
        it('should allow valid body', async () => {
            const stringifiedBody = querystring.stringify(getValidRefreshGrantBody())
            await expect(validateRequestBodyOrThrow(stringifiedBody))
                .resolves
                .toEqual(querystring.parse(stringifiedBody))
        })

        it.each([
            "grant_type",
            "client_id",
            "refresh_token",
        ])
            ('should throw an error if required field %s is missing', async (field) => {
                const bodyCopy = {
                    ...getValidRefreshGrantBody()
                }
                delete bodyCopy[field]

                await expect(validateRequestBodyOrThrow(querystring.stringify(bodyCopy)))
                    .rejects
                    .toThrow(ZodError)
            })

        it.each([
            "",
            "a".repeat(101),
        ])
            ('should throw an error if client id is wrong length', async (clientId) => {
                await expect(validateRequestBodyOrThrow(querystring.stringify(getValidRefreshGrantBody({
                    client_id: clientId
                }))))
                    .rejects
                    .toThrowError(ZodError)
            })

        it('should throw an error if refresh_token is too short', async () => {
            await expect(validateRequestBodyOrThrow(querystring.stringify(getValidRefreshGrantBody({
                refresh_token: ""
            }))))
                .rejects
                .toThrow(ZodError)
        })
    })


})