import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import path = require('path');

export class HelloWorld extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const pApiGatewayId = process.env.TF_VAR_param_api_gateway_id;
        const pApiGatewayRootResourceId = process.env.TF_VAR_param_api_gateway_root_resource_id;

        if (!pApiGatewayId || !pApiGatewayRootResourceId) {
            console.error('Need to specify parameter refs - try `source ../parameters.sh`');
            process.exit(1);
        }

        const apiGatewayId = ssm.StringParameter.valueForStringParameter(this, pApiGatewayId);
        const apiGatewayRootResourceId = ssm.StringParameter.valueForStringParameter(this, pApiGatewayRootResourceId);

        const restApi = apigw.RestApi.fromRestApiAttributes(this, 'MainApi', {
            restApiId: apiGatewayId,
            rootResourceId: apiGatewayRootResourceId,
        });

        const lambdaFunction = new NodejsFunction(this, 'HelloWorldHandler', {
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '..', '..', 'functions', 'src', 'hello-world', 'index.ts'),
            handler: 'index.handler'
        })

        const helloResource = restApi.root.addResource('hello')
        const integration = new apigw.LambdaIntegration(lambdaFunction)
        helloResource.addMethod('GET', integration)

        const deployment = new apigw.Deployment(this, 'MainApiDeployment', {
            api: restApi,
            stageName: this.node.tryGetContext('govuk_environment'),
            retainDeployments: true, // keep old deployments
        });
    }
}
