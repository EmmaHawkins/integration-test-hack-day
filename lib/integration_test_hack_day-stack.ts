import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

export class IntegrationTestHackDayStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly bucket:s3.Bucket;
  public readonly table: dynamodb.Table;


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, 'SitemapBucket', {
      bucketName: `sitemap-${this.account}-${this.region}-${Date.now()}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*']
        }
      ],
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
    });

    this.table = new dynamodb.Table(this, 'SitemapJobsTable', {
      tableName: `sitemap-jobs-${this.stackName.toLowerCase()}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false
    });

    this.table.addGlobalSecondaryIndex({
      indexName: 'websiteId-index',
      partitionKey: { name: 'websiteId', type: dynamodb.AttributeType.STRING },
      sortKey:{ name: 'createdAt', type: dynamodb.AttributeType.STRING }
    });

    const generateSitemapFn = new lambdaNodejs.NodejsFunction(this, 'GenerateSitemap', {
      functionName: `sitemap-generator-${this.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../src/lambdas/generate-sitemap/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        BUCKET_NAME: this.bucket.bucketName,
        TABLE_NAME: this.table.tableName
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*']
      }
    });

    const getStatusFn = new lambdaNodejs.NodejsFunction(this, 'GetStatus', {
      functionName: `sitemap-get-status-${this.stackName.toLowerCase()}`,
      entry: path.join(__dirname, '../src/lambdas/get-status/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: this.table.tableName
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*']
      }
    });

    this.bucket.grantReadWrite(generateSitemapFn);
    this.table.grantReadWriteData(generateSitemapFn);
    this.table.grantReadWriteData(getStatusFn);

    this.api = new apigateway.RestApi(this, 'SitemapApi', {
      restApiName: 'Sitemap Generator API',
      description: 'API for generating and retrieving sitemaps',
      deployOptions: {
        stageName: 'dev',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    const sitemap = this.api.root.addResource('sitemap');

    const generate = sitemap.addResource('generate');
    generate.addMethod('POST', new apigateway.LambdaIntegration(generateSitemapFn));

    const status = sitemap.addResource('status');
    const statusJob = status.addResource('{jobId}');
    statusJob.addMethod('GET', new apigateway.LambdaIntegration(getStatusFn));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `SitemapApiUrl-${this.stackName}`
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket for sitemaps',
      exportName: `SitemapBucketName-${this.stackName}`
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table for job tracking',
      exportName: `SitemapTableName-${this.stackName}`
    });
  }
}
