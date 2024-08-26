import AWS from 'aws-sdk'
// const crypto = require('crypto');
import crypto from 'crypto'
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
            ContentType: 'text/plain'
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

// const bucketName = process.env.BUCKET_NAME;

export const RedirectHandler = async (event) => {
    const shortKey = event.pathParameters.shortKey;

    try {
        // Retrieve the original URL from S3
        const params = {
            Bucket: bucketName,
            Key: shortKey
        };
        const data = await s3.getObject(params).promise();
        const originalUrl = data.Body.toString('utf-8');

        // Redirect to the original URL
        return {
            statusCode: 302,
            headers: {
                Location: originalUrl
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