# Applications
This directory contains CDK-based serverless applications.

## Prerequisites

* Either install esbuild (`npm install -g esbuild`); otherwise the build process will default to using Docker images which requires Docker to be installed and running locally. Note that esbuild is _much_ faster than Docker
* You may need to run `cdk bootstrap` before provisioning infrastructure

## Useful commands

You may need to run `source ../parameters.sh` beforehand.

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Creating a new serverless endpoint

1. Create a new TypeScript file in the 'lib/services' directory. This file will contain the CDK code that defines the infrastructure for the endpoint
1. Within the service, get a reference to the existing Rest API (which is defined with Terraform, and the values for which are stored in Parameter Store)
1. Create a new resource on that API and connect it to a Lambda function
1. The code for the Lambda function should be defined in the 'functions' directory: Create a new subdirectory and an `index.js` file. This file will contain your handler code. There is a handler builder function available which allows you to hook up different request methods coming from API Gateway
