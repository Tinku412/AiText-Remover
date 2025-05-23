const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');

// Initialize Express app
const app = express();
let port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API key for Gemini
const API_KEY = 'AIzaSyCFaxdXkeSugvh1XEfvy5OK-DE7TiYGcHw';
const genAI = new GoogleGenerativeAI(API_KEY);

// Endpoint to process image
app.post('/remove-watermark', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    // Read the file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Prepare the content parts
    const contents = [
      { text: "Just remove all text from this entire image, and return the clean image without any text or watermarks. Dont change the image in any way, just remove the text." },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      }
    ];

    // Set responseModalities to include "Image" so the model can generate an image
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ['Text', 'Image']
      },
    });
    
    console.log("Sending request to Gemini API...");
    
    const response = await model.generateContent(contents);
    console.log("API Response received");
    
    let processedImageData = null;
    let responseText = "";
    
    // Process each part of the response
    if (response.response.candidates && 
        response.response.candidates[0] && 
        response.response.candidates[0].content && 
        response.response.candidates[0].content.parts) {
      
      for (const part of response.response.candidates[0].content.parts) {
        // Based on the part type, either collect the text or save the image
        if (part.text) {
          responseText += part.text;
          console.log("Text response:", part.text);
        } else if (part.inlineData) {
          processedImageData = part.inlineData;
          console.log("Image found in response");
        }
      }
    }
    
    if (processedImageData) {
      // Save the processed image from the API
      const processedImagePath = `uploads/processed_${path.basename(imagePath)}`;
      fs.writeFileSync(processedImagePath, Buffer.from(processedImageData.data, 'base64'));
      
      // Return the paths to both images
      return res.json({
        originalImage: `/${imagePath}`,
        processedImage: `/${processedImagePath}`,
        source: "Generated by Gemini 2.0 Flash Exp Image Generation",
        text: responseText
      });
    } else {
      throw new Error("No image found in the response");
    }
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing the image'
    });
  }
});

// Function to apply watermark removal based on AI analysis
async function applyWatermarkRemoval(inputPath, outputPath, analysis) {
  // Parse the analysis to determine watermark characteristics
  const hasTransparentWatermark = analysis.toLowerCase().includes('transparent') || 
                                 analysis.toLowerCase().includes('translucent');
  const hasTextWatermark = analysis.toLowerCase().includes('text') || 
                          analysis.toLowerCase().includes('logo');
  const hasCornerWatermark = analysis.toLowerCase().includes('corner') || 
                            analysis.toLowerCase().includes('bottom') || 
                            analysis.toLowerCase().includes('top');
  
  // Start with the base image
  let imageProcessor = sharp(inputPath);
  
  // Apply different techniques based on analysis
  if (hasTransparentWatermark) {
    // For transparent watermarks, adjust contrast and brightness
    imageProcessor = imageProcessor.modulate({
      brightness: 1.05,
      saturation: 1.1
    }).gamma(1.1);
  }
  
  if (hasTextWatermark) {
    // For text watermarks, apply slight blur and then sharpen
    imageProcessor = imageProcessor.blur(0.5).sharpen();
  }
  
  if (hasCornerWatermark) {
    // For corner watermarks, we could apply more targeted processing
    // This is simplified for demonstration
    imageProcessor = imageProcessor.sharpen({
      sigma: 1.2,
      m1: 0.5,
      m2: 0.5
    });
  }
  
  // Apply general enhancements
  imageProcessor = imageProcessor
    .normalize() // Normalize the image to improve contrast
    .sharpen(); // Final sharpening
  
  // Save the processed image
  await imageProcessor.toFile(outputPath);
}

// Function to start the server and try different ports if needed
function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`Server running at http://localhost:${portToUse}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToUse} is busy, trying port ${portToUse + 1}`);
      startServer(portToUse + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// Start the server with the initial port
startServer(port); 