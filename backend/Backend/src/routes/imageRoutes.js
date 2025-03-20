const express = require('express');
const multer = require('multer');
const path = require('path');
const { isAuthenticated, refreshTokenIfNeeded } = require('../middlewares/authMiddleware');
const { generatePresignedUploadUrl, generatePresignedDownloadUrl } = require('../services/s3Service');
const { processAndEnhanceImage, processAndEnhanceImages } = require('../services/imageProcessing');
const { encodeFileName, decodeFileName } = require('../utils/fileNameUtils');
const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

router.post('/get-s3-upload-url', isAuthenticated, refreshTokenIfNeeded, async (req, res) => {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType are required' });
    }
    try {
        const uploadUrl = await generatePresignedUploadUrl(fileName, contentType);
        res.json({ uploadUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

router.get('/get-download-url/:fileName', isAuthenticated, refreshTokenIfNeeded, async (req, res) => {
    const { fileName } = req.params;
    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }
    try {
        const downloadUrl = await generatePresignedDownloadUrl(fileName);
        res.json({ downloadUrl });
    } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

// Single image processing
router.post('/process', isAuthenticated, refreshTokenIfNeeded, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const result = await processAndEnhanceImage(req.file, req.user['cognito:username']);
        res.json(result);
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: 'Processing failed', details: error.message, stack: error.stack });
    }
});

router.post('/process-bulk', isAuthenticated, refreshTokenIfNeeded, async (req, res) => {
    console.log('Received request to /process-bulk');
    const { fileNames } = req.body;
    if (!fileNames || fileNames.length === 0) {
        console.log('No file names provided');
        return res.status(400).json({ error: 'No file names provided' });
    }
    console.log('Received file names for processing:', fileNames);
    try {
        const cognitoUsername = req.user['cognito:username'];
        const dynamoUsername = cognitoUsername.toLowerCase();
        console.log('Processing images for user:', dynamoUsername);
        const { results, updatedUserInfo } = await processAndEnhanceImages(fileNames, dynamoUsername);
        console.log('Processed results:', { results, updatedUserInfo });
        if (!updatedUserInfo) {
            console.warn('Warning: updatedUserInfo is undefined');
        }
        res.json({ results, updatedUserInfo });
    } catch (error) {
        console.error('Bulk processing error:', error);
        if (error.message.includes('Daily image processing limit')) {
            res.status(403).json({ error: 'Daily limit reached', details: error.message });
        } else {
            res.status(500).json({ error: 'Bulk processing failed', details: error.message });
        }
    }
});

// Update your apiKeyAuth middleware
const apiKeyAuth = async (req, res, next) => {
    const { loadConfig } = require('../../config');  // Adjust path if needed
    const config = await loadConfig();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const apiKey = authHeader.split(' ')[1];
    // Log for debugging (remove in production)
    console.log('Received API key:', apiKey);
    console.log('Expected API key:', config.API_LAMBDA_KEY);

    if (apiKey !== config.API_LAMBDA_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
};

// Change this in your /lambda-process route
router.post('/lambda-process', apiKeyAuth, async (req, res) => {
    console.log('Received Lambda processing request');
    const { fileName } = req.body;

    if (!fileName) {
        console.log('No fileName provided');
        return res.status(400).json({ error: 'fileName is required' });
    }

    console.log('Processing file from Lambda trigger:', fileName);

    try {
        // Add debug logging
        const lambdaUsername = 'lambda-processor';
        console.log('Using lambda username:', lambdaUsername);

        // Add this debug line
        const { results } = await processAndEnhanceImages([fileName], lambdaUsername);

        // Add more debug logging
        console.log('Processing completed:', results);

        res.json({
            message: 'Processing completed',
            results,
            fileName
        });
    } catch (error) {
        console.error('Lambda processing error:', error);
        // Add more detailed error logging
        console.error('Full error object:', JSON.stringify(error, null, 2));
        res.status(500).json({
            error: 'Processing failed',
            details: error.message,
            fileName
        });
    }
});

module.exports = router;