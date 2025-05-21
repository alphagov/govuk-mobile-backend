import { beforeAll, expect, it, describe } from "vitest";
import { testConfig } from "../common/config";
import { LoggingDriver } from "../driver/logging.driver";
import axios from "axios";

const _callReceiverEndpoint = async () => {
    const endpoint = testConfig.sharedSignalsEndpoint;
    const response = await axios.post(`${endpoint}/receiver`, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            signal: "test-signal",
            data: {
                message: "Hello, world!",
            },
        }),
        validateStatus: () => true,
    })
    return response.status;
}

const triggerRateLimit = async () => {
    const sharedSignalsWafRateLimit = 6001;
    const apiCalls = [...Array(sharedSignalsWafRateLimit)].map(() => _callReceiverEndpoint())
    return await Promise.all(apiCalls)
}

describe("Shared Signals WAF", () => {
    const loggingDriver = new LoggingDriver();
    let responses: number[] = [];

    beforeAll(async () => {
        responses = await triggerRateLimit();
    })

    it("should respond with 429 error code when rate limit is exceeded", async () => {
        expect(responses).toContain(429);
    });

    it("should write to CloudWatch when rate limit is exceeded", async () => {
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;

        const logMessage = await loggingDriver.findLogMessageWithRetries({
            logGroupName: testConfig.sharedSignalsWafLogGroupName,
            searchString: "429",
            filterPattern: '"RateLimitRule"',
            startTime: tenMinutesAgo,
            endTime: now,
        });

        expect(logMessage).toBeDefined();
    });
})