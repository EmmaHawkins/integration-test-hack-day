# Sitemap Generator Service

A serverless AWS application for generating XML sitemaps, built for exploring integration testing approaches in AWS environments.

## 🎯 What This App Does

The Sitemap Generator Service provides a REST API that:

1. **Generates XML Sitemaps** - Accepts a list of URLs and creates a valid sitemap.xml file
2. **Stores Sitemaps in S3** - Uploads generated sitemaps to an S3 bucket for retrieval
3. **Tracks Job Status** - Records generation jobs in DynamoDB with status tracking
4. **Provides Status API** - Query the status and details of sitemap generation jobs

**Architecture:**
```
API Gateway (REST API)
    ↓
Lambda Functions
    ├── Generate Sitemap (POST /sitemap/generate)
    └── Get Status (GET /sitemap/status/{jobId})
    ↓
AWS Services
    ├── S3 (stores sitemap.xml files)
    └── DynamoDB (tracks job records)
```

**Use Case:** This service demonstrates a typical AWS serverless architecture perfect for learning and testing integration testing strategies.

---

## 📋 Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials

---

## 🔐 Connecting Your AWS Account

### Step 1: Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Other platforms:** Follow [AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Step 2: Configure AWS Credentials

Run the AWS configuration command:
```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID:** Your access key (from AWS IAM)
- **AWS Secret Access Key:** Your secret key
- **Default region:** `eu-west-1` (or your preferred region)
- **Default output format:** `json`

**Where to get credentials:**
1. Log in to AWS Console
2. Navigate to **IAM** → **Users** → Your username
3. Go to **Security credentials** tab
4. Click **Create access key**
5. Download and save the credentials securely

### Step 3: Verify Connection

```bash
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/yourname"
}
```

### Step 4: Required IAM Permissions

Your AWS user/role needs permissions for:
- **CloudFormation** - Create/update/delete stacks
- **Lambda** - Create and manage functions
- **API Gateway** - Create REST APIs
- **S3** - Create buckets and upload objects
- **DynamoDB** - Create tables
- **IAM** - Create roles for Lambda execution
- **CloudWatch Logs** - Create log groups

**Recommended:** Use `AdministratorAccess` policy for development/testing, or create a custom policy with these services.

---

## 🚀 Deployment Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build TypeScript

```bash
npm run build
```

### Step 3: Bootstrap CDK (First Time Only)

If this is your first time using AWS CDK in this account/region:

```bash
npx cdk bootstrap
```

**What this does:** Creates an S3 bucket and supporting resources in your AWS account for CDK deployments.

### Step 4: Review What Will Be Deployed

```bash
npx cdk synth
```

This generates the CloudFormation template without deploying. Check the output to see what resources will be created.

### Step 5: Deploy to AWS

```bash
npm run deploy
```

**Deployment time:** ~1-2 minutes

**Expected output:**
```
✅  SitemapsGeneratorStack

Outputs:
SitemapsGeneratorStack.ApiUrl = https://abc123xyz.execute-api.eu-west-1.amazonaws.com/dev/
SitemapsGeneratorStack.BucketName = sitemap-generator-123456789-eu-west-1
SitemapsGeneratorStack.TableName = sitemap-jobs
```

**⚠️ Save the `ApiUrl` - you'll need it for testing!**

---

## 🧪 Testing the Application

### Option 1: Quick Test with curl

**Set your API URL:**
```bash
API_URL="https://YOUR-API-ID.execute-api.eu-west-1.amazonaws.com/dev"
```

**Test 1: Generate a Sitemap**
```bash
curl -X POST "$API_URL/sitemap/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "example-com",
    "urls": [
      "https://example.com",
      "https://example.com/about",
      "https://example.com/contact"
    ],
    "changefreq": "daily",
    "priority": 0.8
  }'
```

**Expected response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "websiteId": "example-com",
  "status": "complete",
  "s3Url": "https://sitemap-generator-....s3.amazonaws.com/example-com/.../sitemap.xml",
  "urlCount": 3
}
```

**Test 2: Check Job Status**
```bash
# Use the jobId from the previous response
curl "$API_URL/sitemap/status/123e4567-e89b-12d3-a456-426614174000"
```

**Expected response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "websiteId": "example-com",
  "status": "complete",
  "createdAt": "2025-12-04T12:00:00.000Z",
  "updatedAt": "2025-12-04T12:00:01.000Z",
  "s3Key": "example-com/123e4567.../sitemap.xml",
  "s3Url": "https://...",
  "urlCount": 3
}
```

**Test 3: Download the Sitemap**
```bash
# Use the s3Url from the response
curl "https://sitemap-generator-....s3.amazonaws.com/example-com/.../sitemap.xml"
```

**Expected XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com</loc>
    <lastmod>2025-12-04</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  ...
</urlset>
```

### Option 2: Test with Postman

1. Create a new **POST** request
2. URL: `https://YOUR-API-ID.execute-api.eu-west-1.amazonaws.com/dev/sitemap/generate`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "websiteId": "test-site",
     "urls": ["https://example.com"]
   }
   ```
5. Send request
6. Copy `jobId` from response
7. Create **GET** request to `/sitemap/status/{jobId}`

### Option 3: Test in Browser

You can test the GET endpoint directly in your browser:
```
https://YOUR-API-ID.execute-api.eu-west-1.amazonaws.com/dev/sitemap/status/{jobId}
```

(You'll need a valid `jobId` from a POST request first)

---

## 📖 API Reference

### POST `/sitemap/generate`

Generate a new sitemap from a list of URLs.

**Request Body:**
```json
{
  "websiteId": "string (required)",
  "urls": ["string (required, must be valid URLs)"],
  "priority": "number (optional, 0.0-1.0, default: 0.5)",
  "changefreq": "string (optional, default: weekly)"
}
```

**Valid changefreq values:** `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never`

**Response (200 OK):**
```json
{
  "jobId": "uuid",
  "websiteId": "string",
  "status": "complete",
  "s3Url": "string",
  "urlCount": "number"
}
```

**Error Responses:**
- `400` - Invalid request (missing fields, invalid URLs)
- `500` - Internal server error

### GET `/sitemap/status/{jobId}`

Retrieve the status and details of a sitemap generation job.

**Path Parameters:**
- `jobId` - UUID of the job

**Response (200 OK):**
```json
{
  "jobId": "uuid",
  "websiteId": "string",
  "status": "complete|processing|pending|failed",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "s3Key": "string",
  "s3Url": "string",
  "urlCount": "number"
}
```

**Error Responses:**
- `404` - Job not found
- `500` - Internal server error

---

## 🔍 Verifying AWS Resources

### Check Lambda Functions
```bash
aws lambda list-functions --region eu-west-1 --query 'Functions[?starts_with(FunctionName, `sitemap`)].FunctionName'
```

**Expected:**
- `sitemap-generator`
- `sitemap-get-status`

### Check S3 Bucket
```bash
aws s3 ls | grep sitemap-generator
```

### List Sitemaps in S3
```bash
aws s3 ls s3://sitemap-generator-ACCOUNT-REGION/ --recursive
```

### Check DynamoDB Table
```bash
aws dynamodb describe-table --table-name sitemap-jobs --region eu-west-1 --query 'Table.TableName'
```

### Query DynamoDB for Jobs
```bash
aws dynamodb scan --table-name sitemap-jobs --region eu-west-1
```

### View Lambda Logs
```bash
# View recent logs for generate function
aws logs tail /aws/lambda/sitemap-generator --region eu-west-1 --follow

# View logs for status function
aws logs tail /aws/lambda/sitemap-get-status --region eu-west-1 --follow
```

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch for changes and recompile |
| `npm run test` | Run Jest unit tests |
| `npm run synth` | Generate CloudFormation template |
| `npm run diff` | Compare deployed stack with local changes |
| `npm run deploy` | Deploy stack to AWS |
| `npm run destroy` | Delete all AWS resources |

---

## 🧹 Cleanup (Delete All Resources)

**⚠️ Warning:** This will permanently delete all sitemaps, job records, and AWS resources.

```bash
npm run destroy
```

Or manually:
```bash
npx cdk destroy
```

**Confirm deletion when prompted.** This will:
- Delete the S3 bucket (and all sitemap files)
- Delete the DynamoDB table (and all job records)
- Delete Lambda functions
- Delete API Gateway
- Delete IAM roles and CloudWatch logs

**Estimated deletion time:** ~1-2 minutes

---

## 📁 Project Structure

```
integration_test_hack_day/
├── bin/
│   └── integration_test_hack_day.ts    # CDK app entry point
├── lib/
│   └── integration_test_hack_day-stack.ts  # Infrastructure definition
├── src/
│   ├── lambdas/
│   │   ├── generate-sitemap/
│   │   │   └── index.ts                # POST /sitemap/generate handler
│   │   └── get-status/
│   │       └── index.ts                # GET /sitemap/status/:id handler
│   └── shared/
│       ├── types.ts                    # Shared TypeScript types
│       └── sitemap-builder.ts          # XML generation utility
├── test/
│   └── integration_test_hack_day.test.ts   # Unit tests
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

---

## 🐛 Troubleshooting

### Issue: "Missing Authentication Token" Error

**Problem:** Clicking the API URL in browser shows this error.

**Cause:** You're accessing the root path `/` which has no route defined.

**Solution:** Use the correct endpoint paths:
- `/sitemap/generate` (POST only)
- `/sitemap/status/{jobId}` (GET)

### Issue: Deployment Fails with "Access Denied"

**Problem:** CDK deploy fails with IAM permission errors.

**Solution:**
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Ensure your IAM user has necessary permissions
3. Try with `AdministratorAccess` policy for testing

### Issue: Lambda Function Not Working

**Problem:** API returns 500 errors.

**Check CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/sitemap-generator --region eu-west-1 --since 10m
```

**Common causes:**
- Missing environment variables (`BUCKET_NAME`, `TABLE_NAME`)
- IAM permission issues (Lambda can't access S3/DynamoDB)
- Code bugs (check stack traces in logs)

### Issue: S3 URL Returns "Access Denied"

**Problem:** Can't download sitemap from S3 URL.

**Cause:** S3 bucket blocks public access by default.

**Solution:** This is expected behavior. In production, you'd use:
- S3 pre-signed URLs
- CloudFront distribution
- Application-level access control

For testing, you can download via AWS CLI:
```bash
aws s3 cp s3://BUCKET-NAME/website-id/job-id/sitemap.xml ./sitemap.xml
```

### Issue: `npm run deploy` Hangs

**Problem:** Deployment seems stuck.

**Possible causes:**
1. CloudFormation stack is waiting for manual approval (use `--require-approval never`)
2. Lambda bundling is slow (first deployment takes longer)
3. Network issues

**Solution:**
- Press Ctrl+C and try: `npx cdk deploy --require-approval never --verbose`
- Check CloudFormation console for stack status

---

## 💰 Cost Estimate

**Monthly costs (approximate) for moderate usage:**

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Lambda | 10,000 requests/month @ 512MB | $0.20 |
| API Gateway | 10,000 requests/month | $0.04 |
| DynamoDB | 10,000 writes, 10,000 reads | $1.25 |
| S3 | 1GB storage, 10,000 PUTs | $0.03 |
| CloudWatch Logs | 1GB logs | $0.50 |
| **Total** | | **~$2.00/month** |

**AWS Free Tier (first 12 months):**
- Lambda: 1M requests/month free
- API Gateway: 1M requests/month free
- DynamoDB: 25GB storage + 25 RCU/WCU free
- S3: 5GB storage free

**For hack day testing:** Costs will be negligible (~$0.10-0.50)

---

## 🎓 Learning Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway REST API Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)

---

## 📝 License

This project is for educational purposes as part of an integration testing workshop.

---

## 🤝 Support

For issues or questions during the hack day, refer to the test scenarios document or consult with your team lead.

**Happy Testing!** 🚀
