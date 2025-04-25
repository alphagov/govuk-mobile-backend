import { it, describe, beforeAll } from "vitest";
import { CloudWatchLogsClient, StartLiveTailCommand } from "@aws-sdk/client-cloudwatch-logs";

let client;
let receivedEvents = [];

async function handleResponseAsync(response) {
    try {
      for await (const event of response.responseStream) {
        if (event.sessionStart !== undefined) {
          console.log(event.sessionStart);
        } else if (event.sessionUpdate !== undefined) {
          for (const logEvent of event.sessionUpdate.sessionResults) {
	    receivedEvents.push({ timestamp: logEvent.timestamp, date: new Date(logEvent.timestamp), message: logEvent.message });
            const timestamp = logEvent.timestamp;
            const date = new Date(timestamp);
            console.log("[" + date + "] " + logEvent.message);
          } 
        } else {
            console.error("Unknown event type");
        }
      }
    } catch (err) {  
        // On-stream exceptions are captured here
        console.error(err)
    }
}

describe("", () => {
  beforeAll(async () => {
    client = new CloudWatchLogsClient();
    const command = new StartLiveTailCommand({
      logGroupIdentifiers: [process.env.CDN_LOG_GROUP],
      logStreamNames: logStreamNames,
        logEventFilterPattern: filterPattern
    });
    const response = await client.send(command);
    handleResponseAsync(response);
  });
  it("should create entry in CloudWatch for failed login attempt", () => {
    
  });
});
