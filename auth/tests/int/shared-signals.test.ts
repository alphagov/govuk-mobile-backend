import { describe, expect, it } from "vitest";
import { testConfig } from "../common/config";

describe.skip("shared signals", () => { // Skip this test suite for now, need to set up correct authorizer token
    it('should expose a receiver endpoint', async () => {
        const response = await fetch(`${testConfig.sharedSignalsEndpoint}/receiver`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signal: "test-signal",
                data: {
                    message: "Hello, world!",
                },
            }),
        })

        expect(response.ok).toBe(true);
        expect(response.status).toBe(202);
    })

    it('should only accept POST requests', async () => {
        const response = await fetch(`${testConfig.sharedSignalsEndpoint}/receiver`, {
            method: 'GET',
        })

        expect(response.ok).toBe(false);
        expect(response.status).toBe(403);
    })
})