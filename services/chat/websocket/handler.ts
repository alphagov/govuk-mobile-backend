import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface WebSocketEvent extends APIGatewayProxyEvent {
  requestContext: {
    routeKey: string;
    connectionId: string;
    domainName: string;
    stage: string;
  };
}

// Simple logging function - no external API calls needed
const logConnection = (connectionId: string, action: string): void => {
  console.log(`WebSocket ${action}: ${connectionId} at ${new Date().toISOString()}`);
};

// Simulate streaming by logging each word (no external API calls)
const simulateStreaming = (connectionId: string, text: string): void => {
  const words = text.split(' ');
  console.log(`Starting streaming simulation for ${connectionId}`);
  
  words.forEach((word, index) => {
    const isLastWord = index === words.length - 1;
    console.log(`Streaming word ${index + 1}/${words.length}: "${word}"${isLastWord ? ' [END]' : ''}`);
  });
  
  console.log(`Streaming simulation completed for ${connectionId}`);
};

export const lambdaHandler = async (
  event: WebSocketEvent,
): Promise<APIGatewayProxyResult> => {
  const { routeKey, connectionId } = event.requestContext;
  
  console.log(`WebSocket event: ${routeKey}, connectionId: ${connectionId}`);
  console.log('Event body:', event.body);

  try {
    switch (routeKey) {
      case '$connect':
        logConnection(connectionId, 'CONNECTED');
        console.log('✅ WebSocket connection established');
        break;

      case '$disconnect':
        logConnection(connectionId, 'DISCONNECTED');
        console.log('❌ WebSocket connection closed');
        break;

      case '$default':
        // Handle incoming messages
        let body;
        try {
          body = JSON.parse(event.body || '{}');
        } catch (parseError) {
          console.error('Failed to parse body:', parseError);
          break;
        }
        
        console.log('Received message:', body);

        if (body.action === 'stream') {
          const responseText = `Welcome to the GOV.UK Mobile Backend WebSocket Streaming Demo!

This demonstrates WebSocket connection handling. In a real implementation, this would stream tokens back to the client in real-time.

Key advantages of WebSocket streaming:
• True real-time streaming (no buffering)
• Low latency token delivery
• Persistent connection for multiple messages
• Bidirectional communication
• Better user experience for chat applications

This is how a real chat application with an LLM would work - each token streams to the client as soon as it's generated, providing immediate feedback and a much better user experience.

The WebSocket approach is ideal for:
- Real-time chat applications
- Live data streaming
- Interactive user experiences
- Any application requiring immediate feedback

Thank you for testing the WebSocket functionality!`;

          // Simulate streaming by logging each word
          simulateStreaming(connectionId, responseText);
        } else {
          console.log('Send {"action": "stream"} to start streaming demo');
        }
        break;

      default:
        console.log('Unknown route:', routeKey);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
