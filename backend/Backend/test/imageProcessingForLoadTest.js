// imageProcessingForLoadTest.js
const sharp = require('sharp');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const IMAGENET_CLASSES = require('../src/utils/imagenetClasses');

// Load the MobileNet model
let model;
async function loadModel() {
    if (!model) {
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        console.log('MobileNet model loaded for load testing');
    }
}

// Image enhancement
async function enhanceImage(imageBuffer, enhancementLevel) {
    const enhancedImageBuffer = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside' })
        .modulate({ brightness: 1 + (0.1 * enhancementLevel), saturation: 1 + (0.1 * enhancementLevel) })
        .sharpen(enhancementLevel * 0.5)
        .toBuffer();
    return enhancedImageBuffer;
}

// Preprocess image for model prediction
async function preprocessImage(imageBuffer) {
    const image = await sharp(imageBuffer)
        .resize(224, 224)
        .toBuffer();
    const decodedImage = tf.node.decodeImage(image, 3);
    const expandedImage = decodedImage.expandDims(0);
    const normalizedImage = expandedImage.toFloat().div(tf.scalar(255));
    return normalizedImage;
}

// Image classification
async function classifyImage(imageTensor) {
    // Ensure model is loaded
    if (!model) {
        await loadModel();
    }
    const predictions = await model.predict(imageTensor).data();
    const top5 = Array.from(predictions)
        .map((p, i) => ({ probability: p, className: IMAGENET_CLASSES[i] }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5);
    return top5;
}

// Color analysis
async function analyzeImageColor(imageBuffer) {
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

    return {
        dominantColors: sortedColors,
        width,
        height
    };
}

// Main function for processing an image
async function processAndEnhanceImage(input, enhancementLevel = 1) {
    try {
        // Check if input is a buffer
        const imageBuffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);

        // Enhance the image
        const enhancedImageBuffer = await enhanceImage(imageBuffer, enhancementLevel);

        // Analyze original and enhanced image
        const originalImage = await preprocessImage(imageBuffer);
        const enhancedImageTensor = await preprocessImage(enhancedImageBuffer);

        const colorAnalysis = await analyzeImageColor(imageBuffer);
        const originalClassification = await classifyImage(originalImage);
        const enhancedClassification = await classifyImage(enhancedImageTensor);

        return {
            enhancedImageBuffer,
            colorAnalysis,
            originalClassification,
            enhancedClassification
        };
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

module.exports = { processAndEnhanceImage };
