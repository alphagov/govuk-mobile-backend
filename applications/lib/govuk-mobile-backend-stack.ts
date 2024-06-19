import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HelloWorld } from './services/hello-world';

export class GovukMobileBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new HelloWorld(this, 'HelloWorldApplication');
    }
}
