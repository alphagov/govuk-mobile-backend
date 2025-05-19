import { SNSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SNSEvent): Promise<void> => {
  console.log("SNS event for test Pager Duty:", JSON.stringify(event, null, 2));
};
