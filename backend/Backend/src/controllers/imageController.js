const { processAndEnhanceImage, processAndEnhanceImages } = require('../services/imageProcessing');
const { getUserImageMetadata } = require('../services/dynamoDBService');

exports.processImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        console.log('Processing single image:', req.file.originalname);
        const result = await processAndEnhanceImage(req.file, req.user.username);
        console.log('Image processed successfully:', result);
        res.json(result);
    } catch (error) {
        console.error('Processing error:', error.message);
        res.status(500).json({ error: 'Processing failed', details: error.message });
    }
};

exports.processBulkImages = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    try {
        console.log(`Processing ${req.files.length} images...`);
        const results = await processAndEnhanceImages(req.files, req.user.username);
        console.log('All images processed successfully.');
        res.json(results);
    } catch (error) {
        console.error('Bulk processing error:', error.message);
        res.status(500).json({ error: 'Bulk processing failed', details: error.message });
    }
};

exports.getUserImages = async (req, res) => {
    try {
        const images = await getUserImageMetadata(req.user.username);
        res.json(images);
    } catch (error) {
        console.error('Error fetching user images:', error);
        res.status(500).json({ error: 'Failed to fetch user images', details: error.message });
    }
};