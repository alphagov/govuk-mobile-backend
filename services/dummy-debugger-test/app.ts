import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Simple dummy Lambda handler for testing lambda-live-debugger
 * 
 * This function performs basic arithmetic operations based on the request body.
 * It's designed to be simple enough for testing but complex enough to benefit from debugging.
 * @param event
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { operation, a, b } = body;

    if (!operation || a === undefined || b === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: operation, a, and b',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Division by zero is not allowed' }),
            headers: {
              'Content-Type': 'application/json',
            },
          };
        }
        result = a / b;
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `Unsupported operation: ${operation}`,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        operation,
        a,
        b,
        result,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};

// Export as 'handler' for lambda-live-debugger compatibility
// The template.yaml uses app.lambdaHandler, but lambda-live-debugger
// expects a default export or 'handler' export when running locally
export const handler = lambdaHandler;

