import { beforeAll, describe, expect, it } from "vitest";
import { LoggingDriver } from "../driver/logging.driver"
import { LambdaClient, InvokeCommand, LogType } from "@aws-sdk/client-lambda";
import { testConfig } from "../common/config";
const event = require("../fixtures/authProxyEvent.json")

describe("attestation lambda", () => {
    const client = new LambdaClient({
        region: 'eu-west-2',
    });
    const loggingDriver = new LoggingDriver();

    describe("when the lambda is invoked", () => {
        const startTime = Date.now() - 1000 * 60 * 2; // 5 minutes ago
        const endTime = Date.now(); // current time

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
                searchString: 'Calling auth proxy',
                startTime,
                endTime,
            })

            expect(response).toBeDefined()
        })

        it("should access the client secret from secrets manager", async () => {
            const response = await loggingDriver.findLogMessageWithRetries({
                logGroupName: testConfig.authProxyLogGroup,
                searchString: "client secret",
                startTime,
                endTime,
            })

            expect(response).toBeDefined()
        })
    })
})
