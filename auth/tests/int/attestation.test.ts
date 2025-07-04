import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LoggingDriver } from "../driver/logging.driver"
import { LambdaClient, InvokeCommand, LogType } from "@aws-sdk/client-lambda";
import { testConfig } from "../common/config";
import { repeatedlyRequestEndpoint } from "../driver/waf.driver";
import axios from "axios";
import { CloudWatchClient, DescribeAlarmsCommand, SetAlarmStateCommand } from "@aws-sdk/client-cloudwatch";
const event = require("../fixtures/authProxyEvent.json")

describe
    .skipIf(!testConfig.isLocalEnvironment)
    ("attestation lambda", () => {
        const client = new LambdaClient({
            region: testConfig.region
        });
        const loggingDriver = new LoggingDriver();

        describe("when the lambda is invoked", () => {
            const startTime = Date.now() - 1000 * 60 * 2; // 5 minutes ago

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

        describe("waf", () => {
            const numRequests = 45000;
            const responseCodes = [];
            const requestFn = async () => {
                const response = await axios.post(`${testConfig.authProxyUrl}/oauth2/token`)
                return response
            }

            beforeAll(async () => {
                await repeatedlyRequestEndpoint(numRequests, requestFn, responseCodes, 2000);
            });

            it.skip("should respond with 429 error code when rate limit is exceeded", async () => {
                expect(responseCodes).toContain(429);
            });
        });

        describe('cloudwatch', () => {
            const cloudWatchClient = new CloudWatchClient({ region: testConfig.region });
            const alarmOKState = "OK";
            const inAlarmState = "ALARM";
            describe.each([
                ['given a high number of failed lambda invocations', testConfig.attestationLambdaErrorRateAlarmName],
                ['given a low proportion of 200 responses from attestation endpoint', testConfig.attestationLow200ResponseProportionAlarmName],
                ['given a low number of completed attestation requests', testConfig.attestationLowCompletionAlarmName],
            ])
                ('%s', (_, alarmName) => {
                    beforeAll(async () => {
                        await cloudWatchClient.send(
                            new SetAlarmStateCommand({
                                AlarmName: alarmName,
                                StateValue: inAlarmState,
                                StateReason: "Testing alarm state transition",
                            })
                        );
                    })

                    afterAll(async () => {
                        await cloudWatchClient.send(
                            new SetAlarmStateCommand({
                                AlarmName: alarmName,
                                StateValue: alarmOKState,
                                StateReason: "Testing alarm state transition",
                            })
                        );
                    })

                    it('should trigger an alarm', async () => {
                        const { MetricAlarms: updatedMetricAlarms } = await cloudWatchClient.send(
                            new DescribeAlarmsCommand({
                                AlarmNames: [
                                    alarmName
                                ]
                            })
                        );
                        expect(updatedMetricAlarms?.[0]?.StateValue).toBe(inAlarmState);
                    })
                })
        });
    })
