import {
  SUPPORTED_AWS_SDK_CLIENTS,
  SUPPORTED_AWS_SDK_COMMANDS,
} from './clients';

export const lambdaHandler = async (event: any): Promise<any> => {
  const { service, action, command, region } = event;

  // 1. Input Validation
  if (!service || !action || !command || typeof command.input === 'undefined') {
    console.error(
      'Validation Error: Missing required fields in event payload.',
    );
    return {
      error: 'InvalidInput',
      message:
        'Event payload must contain "service", "action", and "command.input".',
      receivedEvent: event,
    };
  }

  // 2. Validate and Instantiate AWS SDK Client
  const ClientConstructor = SUPPORTED_AWS_SDK_CLIENTS[service];
  if (!ClientConstructor) {
    console.error(`Error: Unsupported AWS service requested: ${service}`);
    return {
      error: 'UnsupportedService',
      message: `The requested AWS service '${service}' is not supported by this Lambda function.`,
      availableServices: Object.keys(SUPPORTED_AWS_SDK_CLIENTS),
    };
  }

  // Instantiate the client with a default region (or get from environment variables)
  // It's good practice to get the region from environment variables or configure it.
  const client = new ClientConstructor({
    region: region || process.env.AWS_REGION || 'us-east-1',
  });

  // 3. Validate and Instantiate AWS SDK Command
  const CommandConstructor = SUPPORTED_AWS_SDK_COMMANDS[service]?.[action];
  if (!CommandConstructor) {
    console.error(
      `Error: Unsupported action '${action}' for service '${service}'.`,
    );
    return {
      error: 'UnsupportedAction',
      message: `The action '${action}' is not supported for service '${service}'.`,
      availableActions: Object.keys(SUPPORTED_AWS_SDK_COMMANDS[service] || {}),
    };
  }

  const sdkCommand = new CommandConstructor(command.input);

  let response;
  try {
    // 4. Execute the AWS SDK Command
    console.log(
      `Executing AWS SDK command: ${service}.${action} with input:`,
      JSON.stringify(command.input, null, 2),
    );
    response = await client.send(sdkCommand);

    console.log('Command executed successfully. Returning response.');
    // For direct invocation, return the raw SDK response object.
    console.log(response);
    return response;
  } catch (error: any) {
    // 5. Handle Errors
    console.error('Error during AWS SDK command execution:', error);
    return {
      errorType: error.name || 'LambdaExecutionError',
      errorMessage: error.message,
      stackTrace: error.stack,
      sdkMetadata: error.$metadata || {}, // AWS SDK errors often include $metadata
    };
  }
};
