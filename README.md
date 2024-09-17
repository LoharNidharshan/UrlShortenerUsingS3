# URL Shortener with S3 and Lambda
## Overview
This project demonstrates how to build a URL shortener using AWS Lambda and S3. The architecture is serverless, and it allows users to shorten URLs and retrieve the original URLs via API Gateway endpoints.

## Features
### URL Shortening: 
A POST API that generates a short URL for the provided long URL.
### Redirection: 
A GET API that redirects the short URL to the original long URL.
### AWS S3: 
Used to store the mapping between short URLs and long URLs.
### Serverless Framework: 
Built with AWS Lambda and API Gateway using AWS SAM.
## Architecture
### Lambda Functions: 
Two Lambda functions handle the URL shortening and redirection logic.
### S3 Bucket: 
Stores the mappings between the short URL keys and the original URLs.
### API Gateway: 
Provides API endpoints to interact with the Lambda functions.
## SAM Template
The SAM template defines the resources for the project, including the Lambda functions, API Gateway, and S3 bucket.

## SAM Template
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  URLShortenerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.shortenHandler
      Runtime: nodejs20.x
      CodeUri: ./src
      Environment:
        Variables:
          BUCKET_NAME: !Ref URLShortenerBucket
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref URLShortenerBucket
      Events:
        ApiShorten:
          Type: Api
          Properties:
            Path: /shorten
            Method: post

  URLRedirectionFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.RedirectHandler
      Runtime: nodejs20.x
      CodeUri: ./src
      Environment:
        Variables:
          BUCKET_NAME: !Ref URLShortenerBucket
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref URLShortenerBucket
      Events:
        ApiRedirect:
          Type: Api
          Properties:
            Path: /{shortKey}
            Method: get

  URLShortenerBucket:
    Type: AWS::S3::Bucket
```
## Lambda Function Code
### URL Shortening Function (shortenHandler)
This function takes a long URL and returns a shortened URL.

```javascript
import AWS from 'aws-sdk';
import crypto from 'crypto';

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;

export const shortenHandler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    const requestBody = JSON.parse(event.body);
    const originalUrl = requestBody.url;

    if (!originalUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'URL is required' }),
        };
    }

    // Generate a short URL key
    const shortKey = crypto.randomBytes(4).toString('hex'); // 8-character hex key

    try {
        // Save the mapping to S3
        const params = {
            Bucket: bucketName,
            Key: shortKey,
            Body: originalUrl,
            ContentType: 'text/plain',
        };
        await s3.putObject(params).promise();

        // Return the shortened URL
        const shortUrl = `https://${bucketName}.s3.amazonaws.com/${shortKey}`;
        return {
            statusCode: 200,
            body: JSON.stringify({ shortUrl: shortUrl }),
        };
    } catch (error) {
        console.error('Error storing URL:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
```
## URL Redirection Function (RedirectHandler)
This function retrieves the original URL from the S3 bucket and redirects the request.

```javascript
import AWS from 'aws-sdk';

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;

export const RedirectHandler = async (event) => {
    const shortKey = event.pathParameters.shortKey;

    try {
        // Retrieve the original URL from S3
        const params = {
            Bucket: bucketName,
            Key: shortKey,
        };
        const data = await s3.getObject(params).promise();
        const originalUrl = data.Body.toString('utf-8');

        // Redirect to the original URL
        return {
            statusCode: 302,
            headers: {
                Location: originalUrl,
            },
        };
    } catch (error) {
        console.error('Error retrieving URL:', error);
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Short URL not found' }),
        };
    }
};
```
## API Endpoints
POST /shorten: Shortens a given URL.

## Example Request:
```json
{
  "url": "https://example.com"
}
```
## Example Response:
```json
{
  "shortUrl": "https://your-bucket-name.s3.amazonaws.com/abcd1234"
}
```
GET /{shortKey}: Redirects to the original URL for the given short key.

## Example Request:
```bash
GET /abcd1234
```
## Example Response:
Status Code: 302 (Redirect to original URL)

If the short URL is not found, a 404 error is returned.

## Setup & Deployment
### Prerequisites
### AWS Account: 
You need an AWS account with permissions to create Lambda functions, S3 buckets, and API Gateway resources.
### Node.js: 
Ensure Node.js is installed for local development.
### AWS SAM CLI: 
Install the AWS SAM CLI to build and deploy the application.
## Steps to Deploy
### Build the application:
```bash
sam build
```
### Deploy the application:
```bash
sam deploy --guided
```
Follow the prompts to specify parameters like stack name, region, etc.

Invoke the APIs: Once deployed, you can access the POST and GET API endpoints to shorten URLs and retrieve the original URLs.
