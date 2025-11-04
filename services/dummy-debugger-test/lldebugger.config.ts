// @ts-expect-error - lambda-live-debugger types may not be properly exported
import type { LldConfigTs } from 'lambda-live-debugger';

/**
 * Configuration file for lambda-live-debugger with Terraform
 * 
 * This enables remote debugging of the dummy calculator Lambda function using Terraform.
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
  framework: 'terraform',
  region: 'eu-west-2', // Change to your preferred region
  observable: false, // Set to true for observability mode (non-blocking)
  verbose: true, // Enable verbose logging to help debug issues
  // Provide Lambda information explicitly for Terraform
  getLambdas: (
    foundLambdas: unknown[] | null | undefined,
    configParam: Record<string, unknown>,
  ): { functionName: string; codePath: string }[] => {
    // If lambdas were found by framework detection, use them
    const EMPTY_ARRAY_LENGTH = 0;
    if (foundLambdas && foundLambdas.length > EMPTY_ARRAY_LENGTH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return foundLambdas as any;
    }
    
    // Manually provide Lambda configuration
    // Update these values to match your Terraform-defined Lambda function
    const codePath = 'app.ts';
    const functionName = 'ps-dummy-debugger-test-dummy-calculator'; // Match your Terraform function_name
    
    return [
      {
        functionName: functionName,
        codePath: codePath,
      },
    ];
  },
};

// Config file must use default export for lambda-live-debugger
// eslint-disable-next-line unicorn/prefer-module
export default config;

