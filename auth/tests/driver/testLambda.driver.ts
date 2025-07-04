import { LambdaClient, InvokeCommand, InvocationType } from "@aws-sdk/client-lambda";
import { testConfig } from "../common/config";



interface TestLambdaPerformActionInput {
    service: string
    action: string
    command: any
}

/**
 * This driver is responsible for interfacing between the test and the lambda that invokes the underlying AWS command.
 */
export class TestLambdaDriver {
    client: LambdaClient;
    constructor(){
        this.client = new LambdaClient({
            region: testConfig.region
        });
    }

    async performAction(payload: TestLambdaPerformActionInput) {
        const response = await this.client.send(new InvokeCommand({
            FunctionName: testConfig.testLambdaFunctionName,
            Payload: JSON.stringify(payload),
            InvocationType: InvocationType.RequestResponse
        }));

         const decoder = new TextDecoder('utf-8');
        const responseString = decoder.decode(response.Payload);

        // Parse the JSON string to get the actual response object
        const finalResponse = JSON.parse(responseString);

        return finalResponse;
    }
}