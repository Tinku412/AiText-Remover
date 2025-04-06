// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeWatermarkBtn = document.getElementById('removeWatermarkBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultContainer = document.getElementById('resultContainer');
const originalImage = document.getElementById('originalImage');
const processedImage = document.getElementById('processedImage');
const downloadBtn = document.getElementById('downloadBtn');
const errorMessage = document.getElementById('errorMessage');
const analysisContainer = document.getElementById('analysisContainer');
const analysisText = document.getElementById('analysisText');

// Handle file upload via drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('active');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Handle file upload via click
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
    }
});

// Handle the selected file
function handleFile(file) {
    if (!file.type.match('image.*')) {
        showError('Please select an image file.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        imagePreview.style.display = 'block';
        resultContainer.style.display = 'none';
        analysisContainer.style.display = 'none';
        errorMessage.style.display = 'none';
    };
    
    reader.readAsDataURL(file);
}

// Remove watermark button click handler
removeWatermarkBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) {
        showError('Please select an image first.');
        return;
    }
    
    // Show loading indicator
    loadingIndicator.style.display = 'block';
    removeWatermarkBtn.disabled = true;
    errorMessage.style.display = 'none';
    
    try {
        // Create form data for the file upload
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        
        // Send the image to the server for processing
        const response = await fetch('/remove-watermark', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process image');
        }
        
        const data = await response.json();
        
        // Display results
        originalImage.src = data.originalImage;
        processedImage.src = data.processedImage;
        resultContainer.style.display = 'flex';
        
        // Display analysis if available
        if (data.analysis) {
            analysisText.textContent = data.analysis;
            analysisContainer.style.display = 'block';
        }
        
        // Setup download button
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = data.processedImage;
            a.download = 'watermark_removed.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
        removeWatermarkBtn.disabled = false;
    }
});

// Helper function to show error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
} 

// Add these event listeners after your other DOM content loaded code
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing code ...
    
    // Try Again button - performs same action as Remove Watermark
    document.getElementById('tryAgainBtn').addEventListener('click', function() {
        // Call the same function that removeWatermarkBtn calls
        document.getElementById('removeWatermarkBtn').click();
    });
    
    // Reset button - refreshes the page
    document.getElementById('resetBtn').addEventListener('click', function() {
        window.location.reload();
    });
});

// Function to handle file selection
function handleFileSelect(file) {
    // Your existing file handling code...
    
    // Hide the example gallery when an image is selected
    document.getElementById('exampleGallery').style.display = 'none';
}

// When resetting or trying again, show the gallery again
document.getElementById('resetBtn').addEventListener('click', function() {
    // Your existing reset code...
    document.getElementById('exampleGallery').style.display = 'block';
}); 

// Add this to your existing file input event listener
document.getElementById('fileInput').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        // Hide the example gallery when an image is selected
        document.getElementById('exampleGallery').style.display = 'none';
        
        // Your existing code for handling the file...
    }
});

// Also hide gallery when files are dropped
document.getElementById('uploadArea').addEventListener('drop', function(e) {
    // Your existing drop handling code...
    
    // Hide the example gallery
    document.getElementById('exampleGallery').style.display = 'none';
});

// Show gallery again when reset button is clicked
document.getElementById('resetBtn').addEventListener('click', function() {
    // Show the gallery again
    document.getElementById('exampleGallery').style.display = 'block';
    
    // Your existing reset code or page reload...
}); 