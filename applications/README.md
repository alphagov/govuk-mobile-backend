# Applications
This directory contains CDK-based serverless applications.

## Prerequisites

* You need the classic Node / NPM setup - `brew install node` should get you started
* Install the CDK cli (alternatively you should be able to use `npx`) - see the [CDK docs](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
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

## Running functions locally

You can use the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) to run functions locally.

AWS SAM (Serverless Application Model) is an alternative way of provisioning serverless applications on AWS. It is effectively a set of syntactic sugar over CloudFormation, and uses YAML files to define high-level concepts like an API Gateway endpoint backed by a Lambda. Digital Identity (DI) use SAM to provision their AWS resources. In this case we are not using SAM to provision resources, but just the CLI's capability to run functions locally.

Here are the steps you need to follow:

* First run a `cdk synth` - this generates a CloudFormation template from the CDK code, which we can pass to SAM. The template will be located in the `cdk.out` directory
* Make sure we have an example event that invokes the function correctly - an example is in `functions/events/example.json`
* You can then invoke it using `sam local invoke HelloWorldHandler -t cdk.out/GovukMobileBackendStack.template.json -e functions/events/example.json`

## Creating a new serverless endpoint

1. Create a new TypeScript file in the 'lib/services' directory. This file will contain the CDK code that defines the infrastructure for the endpoint
1. Within the service, get a reference to the existing Rest API (which is defined with Terraform, and the values for which are stored in Parameter Store)
1. Create a new resource on that API and connect it to a Lambda function
1. The code for the Lambda function should be defined in the 'functions' directory: Create a new subdirectory and an `index.js` file. This file will contain your handler code. There is a handler builder function available which allows you to hook up different request methods coming from API Gateway
