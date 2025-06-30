import { beforeAll, describe, expect, it } from "vitest";
import { LoggingDriver } from "../driver/logging.driver"
import { testConfig } from "../common/config";
import axios from "axios";
import querystring from "querystring";
import jsonwebtoken from "jsonwebtoken";

describe('account-level data protection log policies', () => {
    const startTime = Date.now() - 1 * 60 * 1000;
    const loggingDriver = new LoggingDriver();

    describe('attestation api', () => {
        let logMessages;

        const fakeJwt = jsonwebtoken.sign({
            foo: 'bar'
        }, "fake-signing-key");

        const unmaskedBody = {
            grant_type: 'refresh_token',
            client_id: 'some-secure-id',
            refresh_token: fakeJwt,
            email: 'foo@bar.com',
            access_token: fakeJwt,
            id_token: fakeJwt,
            jwt: fakeJwt,
            secret: 'fake-secret', // pragma: allowlist-secret
            name: 'sensitive',
            address: 'more sensitive',
        }

        const randomId = crypto.randomUUID()
        const unmaskedHeaders = {
            'X-Attestation-Token': fakeJwt,
            'Authorization': `Bearer ${fakeJwt}`,
            'test': randomId
        }

        beforeAll(async () => {
            await axios.post(
                `${testConfig.authProxyUrl}/oauth2/token`,
                querystring.stringify(unmaskedBody),
                {
                    headers: {
                        ...unmaskedHeaders,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            ).catch(e => console.log("error expected"))

            const message = await loggingDriver.findLogMessageWithRetries({
                logGroupName: testConfig.authProxyWafLogGroupName,
                searchString: 'test',
                startTime,
                delayMs: 1000
            })

            logMessages = JSON.parse(message)
        })

        it('should generate logs when attestation service is called', async () => {
            expect(logMessages).toBeDefined()
        })

        describe('data protection', () => {
            it('should redact sensitive body information', () => {
                expect(logMessages.httpRequest.body).toBeUndefined()
            })

            it('should redact sensitive token related information in the headers', () => {
                Object.entries(unmaskedHeaders)
                    .forEach(([k, v]) => {
                        const header = logMessages.httpRequest.headers.find((h) => h.name === k)
                        expect(v).not.equal(header.value)
                    })
            })
        })
    })

    describe('cognito', () => {
        let logMessages;

        const fakeJwt = jsonwebtoken.sign({
            foo: 'bar'
        }, "fake-signing-key");

        const unmakedQueryParams = {
            response_type: 'code',
            client_id: 'some-secure-id',
            redirect_uri: 'some-domain.com',
            scope: 'email',
            email: 'foo@bar.com',
            access_token: fakeJwt,
            id_token: fakeJwt,
            jwt: fakeJwt,
            secret: 'fake-secret', // pragma: allowlist-secret
            name: 'sensitive',
            address: 'more sensitive',
        }

        const randomId = crypto.randomUUID()
        const unmaskedHeaders = {
            // cognito waf logs are lowercased
            'authorization': `Bearer ${fakeJwt}`,
            'test': randomId
        }

        beforeAll(async () => {
            await axios.get(
                `https://${testConfig.cognitoUrl}/oauth2/authorize?${querystring.stringify(unmakedQueryParams)}`,
                {
                    headers: {
                        ...unmaskedHeaders,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            ).catch(e => {
                console.log("error expected")
            })

            const message = await loggingDriver.findLogMessageWithRetries({
                logGroupName: testConfig.cognitoWafLogGroupName,
                searchString: 'authorize',
                startTime,
                delayMs: 3000
            })

            logMessages = JSON.parse(message)
        })

        it('should generate logs when attestation service is called', async () => {
            expect(logMessages).toBeDefined()
        })

        describe('data protection', () => {
            it('should redact sensitive body information', () => {
                const parsedQuery = querystring.parse(logMessages.httpRequest.args);
                expect(parsedQuery).toEqual({
                    response_type: "code",
                    client_id: "some-secure-id",
                    redirect_uri: "some-domain.com",
                    scope: "REDACTED",
                    email: "REDACTED",
                    access_token: "REDACTED",
                    id_token: "REDACTED",
                    jwt: "*************************************************************************************************************************",
                    secret: "fake-secret", // pragma: allowlist-secret
                    name: "REDACTED",
                    address: "more sensitive",
                })
            })

            it('should redact sensitive token related information in the headers', () => {
                Object.entries(unmaskedHeaders)
                    .forEach(([k, v]) => {
                        const header = logMessages.httpRequest.headers.find((h) => h.name === k)
                        expect(v).not.equal(header.value)
                    })
            })
        })
    })
})