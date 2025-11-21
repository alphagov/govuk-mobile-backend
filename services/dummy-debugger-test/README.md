# Dummy Debugger Test Service

A simple dummy Lambda function project for testing [lambda-live-debugger](https://github.com/ServerlessLife/lambda-live-debugger).

## Overview

This service provides a simple calculator Lambda function that performs basic arithmetic operations (add, subtract, multiply, divide). It's designed to be simple enough for testing but complex enough to benefit from debugging capabilities.

## Project Structure

```
services/dummy-debugger-test/
├── app.ts                    # Lambda handler function
├── template.yaml            # SAM template
├── project.json             # Nx project configuration
├── lldebugger.config.ts     # lambda-live-debugger configuration
├── tsconfig.json            # TypeScript configuration
└── tests/
    ├── unit/                # Unit tests (TDD)
    │   └── app.unit.test.ts
    └── feature/             # BDD feature tests
        └── calculator.feature.test.ts
```

## Features

- Simple arithmetic operations (add, subtract, multiply, divide)
- Error handling for invalid inputs and division by zero
- Full test coverage with unit and BDD tests
- Configured for lambda-live-debugger remote debugging

## Prerequisites

- Node.js >= 22.0.0
- AWS CLI configured with appropriate credentials
- SAM CLI installed
- Nx CLI (optional, for monorepo management)

## Installation

1. Install dependencies (from project root):
```bash
npm install
```

2. Install lambda-live-debugger globally or locally:
```bash
npm install -g lambda-live-debugger
# OR
npm install --save-dev lambda-live-debugger
```

## Running Tests

From the project root:
```bash
# Run unit tests
nx test:unit dummy-debugger-test

# Run all tests
npm run test
```

## Building and Deploying

```bash
# Build the SAM application
nx sam:build dummy-debugger-test

# Deploy to AWS
nx sam:deploy dummy-debugger-test
```

## Using lambda-live-debugger

### Setup

1. Navigate to the service directory:
```bash
cd services/dummy-debugger-test
```

2. Update `lldebugger.config.ts` with your AWS region and stack name

3. Start the debugger:
```bash
lld
# OR if installed locally
npx lld
```

The debugger will:
- Detect your Lambda function from the SAM template
- Attach a debugging layer to your Lambda
- Set up IoT Core for communication
- Configure your IDE for debugging

### Debugging

1. Set breakpoints in `app.ts` in your IDE (VS Code, WebStorm, etc.)

2. Invoke the Lambda function:
   - Via API Gateway endpoint (if deployed)
   - Via AWS Console
   - Via AWS CLI: `aws lambda invoke --function-name ps-dummy-debugger-test-dummy-calculator --payload '{"body":"{\"operation\":\"add\",\"a\":5,\"b\":3}"}' response.json`

3. The execution will pause at your breakpoints, allowing you to:
   - Inspect variables
   - Step through code
   - Evaluate expressions
   - Modify variables

### Cleanup

When you're done debugging, remove the debugger:

```bash
lld -r
```

This detaches the layer from your Lambda. To also remove the layer:

```bash
lld -r=all
```

**Important:** Always remove the debugger after use to avoid unnecessary IoT message costs.

## Example Requests

### Addition
```bash
curl -X POST https://<api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":10,"b":5}'
```

### Subtraction
```bash
curl -X POST https://<api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"subtract","a":10,"b":5}'
```

### Multiplication
```bash
curl -X POST https://<api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"multiply","a":10,"b":5}'
```

### Division
```bash
curl -X POST https://<api-endpoint>/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"divide","a":10,"b":5}'
```

## Development Notes

- This project follows TDD (Test-Driven Development) principles
- BDD (Behavior-Driven Development) feature tests are included
- Domain-Driven Design principles are applied in the handler structure

## Troubleshooting

### Debugger not connecting
- Ensure your AWS credentials are configured correctly
- Check that the Lambda function name matches the SAM template
- Verify IoT Core permissions are set up correctly

### Breakpoints not working
- Ensure the debugger is running (`lld`)
- Check that your IDE is configured for debugging (see `.vscode/launch.json` if using VS Code)
- Verify the code path in `lldebugger.config.ts` matches your source files

### High costs
- Always remove the debugger when not in use (`lld -r`)
- Use Observability Mode (`observable: true`) in high-traffic environments
- Consider using a dedicated development environment

## References

- [lambda-live-debugger GitHub](https://github.com/ServerlessLife/lambda-live-debugger)
- [lambda-live-debugger Documentation](https://www.lldebugger.com/)

