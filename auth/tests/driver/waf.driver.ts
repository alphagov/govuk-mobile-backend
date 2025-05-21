
export class WafDriver {
    responses: number[];

    constructor() {
        this.responses = [];
    }

    public async runWafTest(
        numRequests: number,
        delayMs: number,
        request: () => Promise<{
            status: number;
        }>
    ): Promise<number[]> {
        const responses: number[] = [];
        await this.repeatedlyRequest(numRequests, delayMs, request);
        return responses;
    }

    private async repeatedlyRequest(
        numRequests: number,
        delayMs: number,
        request: () => Promise<{
            status: number;
        }>
    ): Promise<void> {
        for (let i = 0; i < numRequests; i++) {
            const { status } = await request();
            this.responses.push(status);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    public hasResponseCode(
        responseCode: number,
    ): boolean {
        return this.responses.includes(responseCode);
    }
}
