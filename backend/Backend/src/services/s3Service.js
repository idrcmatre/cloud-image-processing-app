const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { loadConfig } = require('../../config');

let s3Client;
let config;

async function initializeS3Client() {
    if (!config) {
        config = await loadConfig();
    }
    s3Client = new S3Client({
        region: config.AWS_REGION,
    });
}

function getS3Key(fileName) {
    if (fileName.startsWith('enhanced_')) {
        return `enhanced/${fileName}`;
    }
    return `originals/${fileName}`;
}

async function generatePresignedUploadUrl(fileName, contentType) {
    await initializeS3Client();
    const key = getS3Key(fileName);
    console.log('Generating upload URL for key:', key);
    const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType
    });
    try {
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
    } catch (error) {
        console.error('Error generating pre-signed upload URL:', error);
        throw new Error('Failed to generate pre-signed upload URL');
    }
}

function getPublicUrl(fileName) {
    const key = getS3Key(fileName);
    return `https://${config.CLOUDFRONT_DOMAIN}/${key}`;
}

async function generatePresignedDownloadUrl(fileName) {
    await initializeS3Client();
    const key = getS3Key(fileName);
    return `https://${config.CLOUDFRONT_DOMAIN}/${key}?response-content-disposition=attachment%3B%20filename%3D${encodeURIComponent(fileName)}`;
}

async function getFileFromS3(fileName) {
    await initializeS3Client();
    const key = getS3Key(fileName);
    console.log('Getting file from S3:', key);
    if (!fileName) {
        throw new Error('File name is undefined or empty');
    }
    const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key
    });
    try {
        const { Body } = await s3Client.send(command);
        return Body.transformToByteArray();
    } catch (error) {
        console.error('Error getting file from S3:', error);
        throw error;
    }
}

// Export all functions at once
module.exports = {
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    getFileFromS3,
    getPublicUrl,
    getS3Key
};