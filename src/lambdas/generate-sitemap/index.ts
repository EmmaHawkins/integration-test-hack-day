import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid4 } from 'uuid';
import { GenerateSitemapRequest, SitemapJob } from "../../shared/types";
import { SitemapBuilder } from "../../shared/sitemap-builder";

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Recieved event:', JSON.stringify(event, null, 2));

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const request: GenerateSitemapRequest = JSON.parse(event.body);

    if (!request.websiteId || !request.urls || request.urls.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'websiteId and urls array are required' })
      };
    }

    const invalidUrls = request.urls.filter(url => !SitemapBuilder.isValidUrl(url));
    if (invalidUrls.length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalise URLs detected',
          invalidUrls
        })
      };
    }

    const jobId = uuid4();
    const now = new Date().toISOString();

    const job: SitemapJob = {
      jobId,
      websiteId: request.websiteId,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
      urlCount: request.urls.length
    };

    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: job
    }));

    const sitemapUrls = request.urls.map(url => ({
      loc: url,
      lastmod: now.split('T')[0],
      changefreq: request.changefreq || 'weekly',
      priority: request.priority || 0.5
    }));

    const sitemapXml = SitemapBuilder.buildSitemapXml(sitemapUrls);

    const s3Key = `${request.websiteId}/${job}/sitemap.xml`;

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: sitemapXml,
      ContentType: 'application/json',
      Metadata: {
        websiteId: request.websiteId,
        jobId: jobId,
        urlCount: String(request.urls.length)
      }
    }));

    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

    await dynamoClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { jobId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, s3Key = :s3Key, s3Url = :s3Url',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'complete',
        ':updatedAt': new Date().toISOString(),
        ':s3Key': s3Key,
        ':s3Url': s3Url
      }
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        websiteId: request.websiteId,
        status: 'complete',
        s3Url,
        urlCount: request.urls.length
      })
    };
  } catch (error) {
    console.error('Error processing sitemap generation:' , error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};