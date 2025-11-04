// @ts-expect-error - lambda-live-debugger types may not be properly exported
import type { LldConfigTs } from 'lambda-live-debugger';

/**
 * Configuration file for lambda-live-debugger
 * 
 * This enables remote debugging of the dummy calculator Lambda function.
 * 
 * IMPORTANT: Run `lld` from this directory (services/dummy-debugger-test/)
 * 
 * Usage:
 *   1. cd services/dummy-debugger-test
 *   2. Run `lld` to start the debugger
 *   3. Set breakpoints in your IDE
 *   4. Invoke the Lambda function via API Gateway or AWS Console
 *   5. The execution will pause at your breakpoints
 *   6. Run `lld -r` to remove the debugger when done
 */
const config: LldConfigTs = {
  framework: 'sam',
//   samConfigFile: 'samconfig.toml',
  samTemplateFile: 'template.yaml', // Relative path - run lld from service directory
  samStackName: 'ps-dummy-debugger-test',
  region: 'eu-west-2', // Change to your preferred region
  observable: false, // Set to true for observability mode (non-blocking)
  verbose: true, // Enable verbose logging to help debug issues
  // Explicitly provide Lambda information since framework detection might fail in monorepo
  getLambdas: (
    foundLambdas: unknown[] | null | undefined,
    configParam: { samStackName?: string },
  ): { functionName: string; codePath: string }[] => {
    // If lambdas were found by framework detection, use them
    const EMPTY_ARRAY_LENGTH = 0;
    if (foundLambdas && foundLambdas.length > EMPTY_ARRAY_LENGTH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return foundLambdas as any;
    }
    
    // Fallback: Manually provide Lambda configuration
    // The code path should point to the TypeScript source file (relative to this config file)
    const codePath = 'app.ts';
    const stackName = configParam.samStackName ?? 'ps-dummy-debugger-test';

    return [
      {
        // Function name will be resolved from the deployed stack
        // Format: ${StackName}-dummy-calculator
        functionName: `${stackName}-dummy-calculator`,
        codePath: codePath,
        // Explicitly specify the handler name to match template.yaml: Handler: app.lambdaHandler
      },
    ];
  },
};

// Config file must use default export for lambda-live-debugger
// eslint-disable-next-line unicorn/prefer-module
export default config;

