#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GovukMobileBackendStack } from '../lib/govuk-mobile-backend-stack';

const app = new cdk.App();
new GovukMobileBackendStack(app, 'GovukMobileBackendStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-west-2' },
    tags: {
        Product: "GOV.UK App",
        System: "GOV.UK App",
        Environment: app.node.tryGetContext('govuk_environment'),
        Owner: "govuk-app-engineering@digital.cabinet-office.gov.uk",
        project: "GOV.UK App",
        repository: "govuk-mobile-backend"
    }
});
