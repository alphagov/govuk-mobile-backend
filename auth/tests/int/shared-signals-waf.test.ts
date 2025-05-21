import { beforeAll, expect, it, describe } from "vitest";
import { testConfig } from "../common/config";
import { LoggingDriver } from "../driver/logging.driver";
import axios from "axios";
import { WafDriver } from "../driver/waf.driver";

const callReceiverEndpoint = async () => {
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
    return response;
}

describe("Shared Signals WAF", () => {
    const loggingDriver = new LoggingDriver();
    const wafDriver = new WafDriver();
    const sharedSignalsWafRateLimit = 31;

    beforeAll(async () => {
        await wafDriver.runWafTest(
            sharedSignalsWafRateLimit,
            1000,
            callReceiverEndpoint
        )
    })

    it("should respond with 429 error code when rate limit is exceeded", async () => {
        expect(wafDriver.hasResponseCode(429)).toBe(true);
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