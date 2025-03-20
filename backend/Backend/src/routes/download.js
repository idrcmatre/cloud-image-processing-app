const express = require('express');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();
const s3Client = new S3Client({ region: process.env.AWS_REGION });

router.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log(`Attempting to download file: ${filename}`);

        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
        });

        console.log(`Generating pre-signed URL for bucket: ${process.env.S3_BUCKET_NAME}`);
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log(`Pre-signed URL generated: ${url}`);

        console.log('Fetching file from S3...');
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`S3 fetch failed with status: ${response.status}`);
            throw new Error(`Failed to fetch file from S3: ${response.statusText}`);
        }

        console.log('File fetched successfully, sending to client...');
        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.byteLength);

        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error in download process:', error);
        res.status(500).json({ error: error.message || 'Failed to download file' });
    }
});

module.exports = router;