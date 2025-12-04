import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IntegrationTestHackDayStack } from '../lib/integration_test_hack_day-stack';
import { Project } from 'aws-cdk-lib/aws-codebuild';
import { Environment } from 'aws-cdk-lib/aws-appconfig';

const app = new cdk.App();

new IntegrationTestHackDayStack(app, 'SitemapsGeneratorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULTREGION || 'eu-west-1'
  },
  description: 'Sitemap Generator Service for Integration Testing Hack Day',
  tags: {
    Project: 'IntegrationTestHackDay',
    Environment: 'Development'
  }
});

app.synth();