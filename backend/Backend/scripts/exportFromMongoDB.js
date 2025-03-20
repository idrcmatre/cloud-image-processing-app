const mongoose = require('mongoose');
const fs = require('fs').promises;
const User = require('./src/models/User');
const ImageMetadata = require('./src/models/ImageMetadata');

mongoose.connect('mongodb://localhost:27017/image_processor', { useNewUrlParser: true, useUnifiedTopology: true });

const qutUsername = "n11484209@qut.edu.au";

async function exportUsers() {
  const users = await User.find({});
  const formattedUsers = users.map(user => ({
    "qut-username": qutUsername,
    username: user.username,
    password: user.password,
    role: user.role,
    imagesProcessed: user.imagesProcessed,
    dailyLimit: user.dailyLimit,
    settings: {
      enhancementLevel: user.settings.enhancementLevel,
      preferredAnalysis: user.settings.preferredAnalysis
    }
  }));
  
  await fs.writeFile('users-export.json', JSON.stringify(formattedUsers, null, 2));
  console.log(`Exported ${users.length} users to users-export.json`);
}

async function exportImageMetadata() {
  const metadata = await ImageMetadata.find({});
  const formattedMetadata = metadata.map(item => {
    let analysis = item.analysis;
    
    // Check if analysis is a string, if so, try to parse it
    if (typeof analysis === 'string') {
      try {
        analysis = JSON.parse(analysis);
      } catch (error) {
        console.error(`Error parsing analysis for item ${item._id}:`, error);
        analysis = { colorAnalysis: null, originalClassification: [], enhancedClassification: [] };
      }
    }

    // If analysis is not an object or parsing failed, set default values
    if (typeof analysis !== 'object' || analysis === null) {
      analysis = { colorAnalysis: null, originalClassification: [], enhancedClassification: [] };
    }

    return {
      "qut-username": qutUsername,
      originalFilename: item.originalFilename,
      userId: item.userId.toString(),
      originalImageUrl: item.originalImageUrl,
      enhancedImageUrl: item.enhancedImageUrl,
      colorAnalysis: analysis.colorAnalysis,
      originalClassification: analysis.originalClassification,
      enhancedClassification: analysis.enhancedClassification,
      userSettings: item.userSettings,
      processedAt: item.processedAt.getTime()
    };
  });
  
  await fs.writeFile('image-metadata-export.json', JSON.stringify(formattedMetadata, null, 2));
  console.log(`Exported ${metadata.length} image metadata items to image-metadata-export.json`);
}

async function runExport() {
  try {
    await exportUsers();
    await exportImageMetadata();
    console.log('Export completed successfully');
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

runExport();
