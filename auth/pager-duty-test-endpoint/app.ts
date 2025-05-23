import type { SNSEvent } from "aws-lambda";

export const lambdaHandler = (event: SNSEvent): void => {
  const space = 2;
  console.log("SNS event for test Pager Duty:", JSON.stringify(event, null, space));
};


