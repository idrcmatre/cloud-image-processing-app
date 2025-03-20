const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const tf = require('@tensorflow/tfjs-node');
const { generatePresignedUploadUrl, generatePresignedDownloadUrl, getFileFromS3, getS3Key, getPublicUrl } = require('./s3Service');
const dynamoDBService = require('./dynamoDBService');
const cognitoService = require('./cognitoService');
const IMAGENET_CLASSES = require('../utils/imagenetClasses');
const cacheService = require('./cacheService');
const { storeAvgProcessingTime } = require('./postgresService');
const { loadConfig } = require('../../config');
const { encodeFileName, decodeFileName } = require('../utils/fileNameUtils');

const fetch = require('node-fetch');

let io;
try {
    io = require('../../server').io;
} catch (error) {
    console.warn('Warning: Socket.io not initialized. Progress updates will not be sent.');
}

let config;
let enhancedDir, analysisDir, metadataDir;

async function initialize() {
    config = await loadConfig();
    enhancedDir = path.join(__dirname, '../../uploads/enhanced');
    analysisDir = path.join(__dirname, '../../uploads/analysis');
    metadataDir = path.join(__dirname, '../../uploads/metadata');

    await fs.mkdir(enhancedDir, { recursive: true });
    await fs.mkdir(analysisDir, { recursive: true });
    await fs.mkdir(metadataDir, { recursive: true });
}

initialize();

let model;
async function loadModel() {
    model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
    console.log('MobileNet model loaded');
}
loadModel();

function safeEmit(userId, event, data) {
    if (io && io.to) {
        io.to(userId).emit(event, data);
    } else {
        console.log(`Progress update (${event}):`, data);
    }
}

async function saveMetadataToFile(metadata, filename) {
    const metadataPath = path.join(metadataDir, `${filename}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Metadata saved to file: ${metadataPath}`);
}

async function preprocessImage(imageBuffer) {
    const image = await sharp(imageBuffer)
        .resize(224, 224)
        .toBuffer();
    const decodedImage = tf.node.decodeImage(image, 3);
    const expandedImage = decodedImage.expandDims(0);
    const normalizedImage = expandedImage.toFloat().div(tf.scalar(255));
    return normalizedImage;
}

async function classifyImage(imageTensor) {
    const predictions = await model.predict(imageTensor).data();
    const top5 = Array.from(predictions)
        .map((p, i) => ({ probability: p, className: IMAGENET_CLASSES[i] }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5);
    return top5;
}

async function enhanceImage(imageBuffer, enhancementLevel) {
    const enhancedImageBuffer = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside' })
        .modulate({ brightness: 1 + (0.1 * enhancementLevel), saturation: 1 + (0.1 * enhancementLevel) })
        .sharpen(enhancementLevel * 0.5)
        .toBuffer();
    return enhancedImageBuffer;
}

async function analyzeImageColor(imageBuffer) {
    try {
        const image = sharp(imageBuffer);
        const { width, height } = await image.metadata();
        const totalPixels = width * height;

        const colorCounts = {};

        const pixelData = await image.raw().toBuffer();
        for (let i = 0; i < pixelData.length; i += 3) {
            const r = Math.floor(pixelData[i] / 16) * 16;
            const g = Math.floor(pixelData[i + 1] / 16) * 16;
            const b = Math.floor(pixelData[i + 2] / 16) * 16;
            const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([color, count]) => ({
                color,
                percentage: ((count / totalPixels) * 100).toFixed(2)
            }));

        console.log('Color analysis result:', { dominantColors: sortedColors, width, height });

        return {
            dominantColors: sortedColors,
            width,
            height
        };
    } catch (error) {
        console.error('Error analyzing image color:', error);
        return {
            dominantColors: [],
            width: 0,
            height: 0,
            error: error.message
        };
    }
}

exports.processAndEnhanceImage = async (fileName, username, progressCallback) => {
    try {
        console.log('Processing image:', fileName);
        if (!fileName) {
            throw new Error('File name is undefined or empty');
        }
        const startTime = Date.now();

        const encodedFileName = encodeFileName(fileName);

        const updateProgress = async (progress, stage) => {
            const progressData = { progress, stage };
            await cacheService.setProgress(username, progressData);
            safeEmit(username, 'progress', progressData);
            if (progressCallback) progressCallback(progress);
        };
        await updateProgress(0, 'Starting processing');

        const user = await cacheService.cachedFetch(
            `user:${username}`,
            async () => await dynamoDBService.getUser(username),
            3600 // Cache user data for 1 hour
        );



        if (!user) {
            throw new Error('User not found');
        }

        const today = new Date().toISOString().split('T')[0];
        if (user.lastProcessedDate !== today) {
            user.imagesProcessed = 0;
        }

        //if (user.imagesProcessed >= user.dailyLimit) {
          //  throw new Error(`Daily image processing limit of ${user.dailyLimit} reached`);
        //}

        const enhancementLevel = user.settings.enhancementLevel;
        const preferredAnalysis = user.settings.preferredAnalysis;

        console.log('User settings:', { enhancementLevel, preferredAnalysis });

        await updateProgress(20, 'Enhancing image');

        // Get the file from S3
        const originalImageBuffer = await getFileFromS3(fileName);

        const enhancedImageBuffer = await enhanceImage(originalImageBuffer, enhancementLevel);
        console.log('Enhanced image created');

        await updateProgress(40, 'Analyzing image');
        const originalImage = await preprocessImage(originalImageBuffer);
        const enhancedImageTensor = await preprocessImage(enhancedImageBuffer);

        let analysis = {};
        if (preferredAnalysis === 'color' || preferredAnalysis === 'both') {
            analysis.colorAnalysis = await analyzeImageColor(originalImageBuffer);
            console.log('Color analysis result:', analysis.colorAnalysis);
        }
        if (preferredAnalysis === 'object' || preferredAnalysis === 'both') {
            const [originalClassification, enhancedClassification] = await Promise.all([
                classifyImage(originalImage),
                classifyImage(enhancedImageTensor)
            ]);
            analysis.originalClassification = originalClassification;
            analysis.enhancedClassification = enhancedClassification;
            console.log('Classification results:', { originalClassification, enhancedClassification });
        }

        await updateProgress(60, 'Saving results');
        const enhancedFileName = `enhanced_${fileName}`;

        // Generate pre-signed URLs for the original and enhanced images
        const originalImageUrl = await generatePresignedDownloadUrl(fileName);
        const enhancedImageUrl = await generatePresignedDownloadUrl(enhancedFileName);

        // Upload the enhanced image to S3
        const enhancedUploadUrl = await generatePresignedUploadUrl(enhancedFileName, 'image/jpeg');
        await uploadToS3WithPresignedUrl(enhancedUploadUrl, enhancedImageBuffer);

        console.log('S3 upload complete:', { originalImageUrl, enhancedImageUrl });

        await updateProgress(80, 'Saving metadata');
        const metadata = {
            userId: username,
            originalFilename: fileName,
            originalImageUrl: getPublicUrl(fileName),
            enhancedImageUrl: getPublicUrl(enhancedFileName),
            analysis,
            userSettings: {
                enhancementLevel: user.settings.enhancementLevel,
                preferredAnalysis: user.settings.preferredAnalysis
            }
            // processedAt and processCount are handled in saveImageMetadata
        };

        try {
            const savedMetadata = await dynamoDBService.saveImageMetadata(metadata);
            console.log('Metadata saved/updated in DynamoDB:', savedMetadata);
        } catch (error) {
            console.error('Error saving/updating metadata in DynamoDB:', error);
            // Continue processing even if metadata save fails
        }

        // Cache metadata
        await cacheService.set(`image:${encodedFileName}`, metadata, 3600); //cache for 1 hour

        try {
            await dynamoDBService.saveImageMetadata(metadata);
            console.log('Metadata saved to DynamoDB');
        } catch (error) {
            console.error('Error saving metadata to DynamoDB:', error);
            // Continue processing even if metadata save fails
        }

        // Update user's imagesProcessed count
        let updatedUser;
        try {
            updatedUser = await dynamoDBService.updateUserImagesProcessed(username);

            // Since we're not updating Cognito, we can proceed without that call

            // Calculate remaining uploads
            const remainingUploads = Math.max(0, updatedUser.dailyLimit - updatedUser.imagesProcessed);

            const updatedUserInfo = {
                imagesProcessed: updatedUser.imagesProcessed,
                dailyLimit: updatedUser.dailyLimit,
                remainingUploads: remainingUploads
            };

            await updateProgress(100, 'Processing complete');
            const processingTime = Date.now() - startTime;
            await storeAvgProcessingTime('image_processing', processingTime);
            console.log('Returning result with updatedUserInfo:', { ...metadata, updatedUserInfo, remainingUploads });
            return { ...metadata, updatedUserInfo, remainingUploads };

        } catch (error) {
            console.error('Error updating user data:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
};

exports.processAndEnhanceImages = async (fileNames, username) => {
    try {
        const user = await cacheService.cachedFetch(
            `user:${username}`,
            async () => await dynamoDBService.getUser(username),
            3600 // Cache user data for 1 hour
        );
        // Add these debug lines
        console.log('Retrieved user:', JSON.stringify(user, null, 2));
        console.log('User settings:', user?.settings);

        if (!user) {
            throw new Error('User not found');
        }

        const results = [];
        const totalFiles = fileNames.length;
        let overallProgress = 0;

        const updateProgress = (fileProgress) => {
            const fileContribution = fileProgress / totalFiles;
            overallProgress += fileContribution;
            const roundedProgress = Math.round(overallProgress);
            safeEmit(username, 'progress', { progress: roundedProgress, stage: `Processing file ${results.length + 1} of ${totalFiles}` });
        };

        let updatedUserInfo;

        for (let i = 0; i < totalFiles; i++) {
          //  if (user.imagesProcessed >= user.dailyLimit) {
            //    throw new Error(`Daily image processing limit of ${user.dailyLimit} reached`);
            //}

            const fileName = fileNames[i];
            const result = await exports.processAndEnhanceImage(fileName, username, (progress) => {
                updateProgress(progress / 100);
            });
            results.push(result);
            updatedUserInfo = result.updatedUserInfo; // Save the latest updatedUserInfo
        }

        safeEmit(username, 'progress', { progress: 100, stage: 'Processing complete' });

        console.log('Final results:', { results, updatedUserInfo });

        return { results, updatedUserInfo };
    } catch (error) {
        console.error('Error processing images:', error);
        safeEmit(username, 'progress', { progress: 0, stage: 'error', error: error.message });
        throw error;
    }
};

async function uploadToS3WithPresignedUrl(url, data) {
    try {
        const response = await fetch(url, {
            method: 'PUT',
            body: data,
            headers: {
                'Content-Type': 'image/jpeg'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error uploading to S3 with pre-signed URL:', error);
        throw error;
    }
}

exports.getImageMetadata = async (filename) => {
    const encodedFileName = encodeFileName(filename);
    return await cacheService.cachedFetch(
        `image:${encodedFileName}`,
        async () => await dynamoDBService.getImageMetadata(filename),
        3600 // Cache for 1 hour
    );
};

module.exports = exports;