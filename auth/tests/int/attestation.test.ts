import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LoggingDriver } from "../driver/logging.driver"
import { LambdaClient, InvokeCommand, LogType } from "@aws-sdk/client-lambda";
import { testConfig } from "../common/config";
import { repeatedlyRequestEndpoint } from "../driver/waf.driver";
import axios from "axios";
import { DescribeAlarmsCommand, DescribeAlarmsOutput, SetAlarmStateCommand } from "@aws-sdk/client-cloudwatch";
import { TestLambdaDriver } from "../driver/testLambda.driver";

const driver = new TestLambdaDriver();
const loggingDriver = new LoggingDriver(driver);
const startTime = Date.now() - 1000 * 60 * 2; // 5 minutes ago

const event = require("../fixtures/authProxyEvent.json")

describe
    ("attestation lambda", () => {
        const client = new LambdaClient({
            region: testConfig.region
        });

        describe("when the lambda is invoked", () => {
            beforeAll(async () => {
                const command = new InvokeCommand({
                    FunctionName: testConfig.authProxyFunctionName,
                    Payload: JSON.stringify(event),
                    LogType: LogType.None,
                });
                await client.send(command);
            })

            it("should create a log in cloudwatch", async () => {
                const response = await loggingDriver.findLogMessageWithRetries({
                    logGroupName: testConfig.authProxyLogGroup,
                    searchString: 'ATTESTATION_STARTED',
                    startTime,
                    delayMs: 3000
                })

                expect(response).toBeDefined()
            })
        })

        describe.skip("waf", () => {
            const numRequests = 301;
            const responseCodes = [];
            const requestFn = async () => {
                const response = await axios.post(`${testConfig.authProxyUrl}/oauth2/token`)
                return response
            }

            beforeAll(async () => {
                await repeatedlyRequestEndpoint(numRequests, requestFn, responseCodes, 2000);
            });

            it("should respond with 429 error code when rate limit is exceeded", async () => {
                expect(responseCodes).toContain(429);
            });
        });

        describe.skipIf(!testConfig.isLocalEnvironment)
            ('cloudwatch', () => {
                const alarmOKState = "OK";
                const inAlarmState = "ALARM";
                describe.each([
                    ['given a high number of failed lambda invocations', testConfig.attestationLambdaErrorRateAlarmName],
                    ['given a low proportion of 200 responses from attestation endpoint', testConfig.attestationLow200ResponseProportionAlarmName],
                    ['given a low number of completed attestation requests', testConfig.attestationLowCompletionAlarmName],
                ])
                    ('%s', (_, alarmName) => {
                        beforeAll(async () => {
                            await driver.performAction({
                                command: new SetAlarmStateCommand({
                                    AlarmName: alarmName,
                                    StateValue: inAlarmState,
                                    StateReason: "Testing alarm state transition",
                                }),
                                service: 'CloudWatchClient',
                                action: 'SetAlarmStateCommand'
                            });
                        })

                        afterAll(async () => {
                            await driver.performAction({
                                command: new SetAlarmStateCommand({
                                    AlarmName: alarmName,
                                    StateValue: alarmOKState,
                                    StateReason: "Testing alarm state transition",
                                }),
                                service: 'CloudWatchClient',
                                action: 'SetAlarmStateCommand'
                            });
                        })

                        it('should trigger an alarm', async () => {
                            const { MetricAlarms: updatedMetricAlarms } = await driver.performAction<DescribeAlarmsOutput>({
                                command: new DescribeAlarmsCommand({
                                    AlarmNames: [
                                        alarmName
                                    ]
                                }),
                                service: 'CloudWatchClient',
                                action: 'DescribeAlarmsCommand'
                            });
                            expect(updatedMetricAlarms?.[0]?.StateValue).toBe(inAlarmState);
                        })
                    })
            });
    })

describe('api gateway', () => {
    it('should generate api gateway logs', async () => {
        await fetch(`${testConfig.authProxyUrl}/oauth2/token`, {
            method: "POST"
        });

        const response = await loggingDriver.findLogMessageWithRetries({
            logGroupName: testConfig.attestationProxyApiLogGroupName,
            searchString: '',
            delayMs: 3000,
            startTime,
        });

        expect(response).toBeDefined()

        const parsedLogs = JSON.parse(response);

        const expectedKeys = [
            "integrationStatus",
            "status",
            "path",
            "errorResponseType"
        ];
        expect(expectedKeys.every(key => Object.keys(parsedLogs).includes(key))).toBe(true)
    })
})