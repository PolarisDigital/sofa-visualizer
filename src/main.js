// State
let uploadedImage = null;
let uploadedImageBase64 = null;
let apiKey = localStorage.getItem('openrouter_api_key');

// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const optionsSection = document.getElementById('optionsSection');
const resultSection = document.getElementById('resultSection');
const loadingOverlay = document.getElementById('loadingOverlay');
const apiKeyModal = document.getElementById('apiKeyModal');
const colorSelect = document.getElementById('colorSelect');
const colorPreview = document.getElementById('colorPreview');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateColorPreview();

    // Check for API key
    if (!apiKey) {
        apiKeyModal.style.display = 'flex';
    }
});

// Event Listeners
imageInput.addEventListener('change', handleImageUpload);
colorSelect.addEventListener('change', updateColorPreview);

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = 'var(--primary)';
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.borderColor = 'var(--border)';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = 'var(--border)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

// Functions
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

async function processImage(file) {
    let processedFile = file;

    // Check if file is HEIC and convert it
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            // Dynamically import heic2any
            const heic2any = (await import('heic2any')).default;

            // Show loading state
            uploadBox.innerHTML = '<div class="upload-content"><p>Conversione HEIC in corso...</p></div>';

            // Convert HEIC to JPEG blob
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            });

            // Create a new File from the blob
            processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
                type: 'image/jpeg'
            });

            // Restore upload box content
            uploadBox.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">📷</div>
                    <p>Scatta una foto o carica un'immagine del divano</p>
                    <button class="btn btn-primary" onclick="document.getElementById('imageInput').click()">
                        Seleziona Immagine
                    </button>
                </div>
            `;
        } catch (err) {
            console.error('HEIC conversion error:', err);
            alert('Errore nella conversione HEIC. Prova a esportare l\'immagine come JPEG dal tuo dispositivo.');
            // Restore upload box
            uploadBox.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">📷</div>
                    <p>Scatta una foto o carica un'immagine del divano</p>
                    <button class="btn btn-primary" onclick="document.getElementById('imageInput').click()">
                        Seleziona Immagine
                    </button>
                </div>
            `;
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // Try to load and convert image
        const img = new Image();
        img.onload = () => {
            try {
                // Resize image to max 1024px to avoid CUDA memory errors
                const MAX_SIZE = 1024;
                let width = img.width;
                let height = img.height;

                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height / width) * MAX_SIZE);
                        width = MAX_SIZE;
                    } else {
                        width = Math.round((width / height) * MAX_SIZE);
                        height = MAX_SIZE;
                    }
                    console.log(`Resized image from ${img.width}x${img.height} to ${width}x${height}`);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG data URL
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                uploadedImage = jpegDataUrl;
                uploadedImageBase64 = jpegDataUrl.split(',')[1];
                previewImage.src = jpegDataUrl;
                uploadBox.style.display = 'none';
                previewContainer.style.display = 'block';
                optionsSection.style.display = 'flex';
                resultSection.style.display = 'none';
            } catch (err) {
                console.error('Error converting image:', err);
                alert('Errore nella conversione dell\'immagine. Prova con un formato diverso (JPG o PNG).');
            }
        };
        img.onerror = () => {
            console.error('Cannot decode image format');
            alert('⚠️ Impossibile caricare questa immagine.\n\nIl formato potrebbe non essere supportato. Prova a convertirla in JPG o PNG.');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        alert('Errore nella lettura del file.');
    };
    reader.readAsDataURL(processedFile);
}

function resetUpload() {
    uploadedImage = null;
    uploadedImageBase64 = null;
    imageInput.value = '';
    uploadBox.style.display = 'block';
    previewContainer.style.display = 'none';
    optionsSection.style.display = 'none';
    resultSection.style.display = 'none';
}

function updateColorPreview() {
    const selectedOption = colorSelect.options[colorSelect.selectedIndex];
    const color = selectedOption.dataset.color;
    colorPreview.style.backgroundColor = color;
}

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('openrouter_api_key', key);
        apiKeyModal.style.display = 'none';
    }
}

async function generateImage() {
    if (!uploadedImage) {
        alert('Per favore, carica prima un\'immagine del divano.');
        return;
    }

    if (!apiKey) {
        apiKeyModal.style.display = 'flex';
        return;
    }

    const fabric = document.getElementById('fabricSelect').value;
    const color = colorSelect.value;

    // Build the prompt
    const prompt = buildPrompt(fabric, color);

    loadingOverlay.style.display = 'flex';

    try {
        const result = await callGeminiAPI(prompt);

        if (result) {
            document.getElementById('originalThumb').src = uploadedImage;
            document.getElementById('resultImage').src = result;
            resultSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Errore nella generazione: ' + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function buildPrompt(fabric, color) {
    const fabricDescriptions = {
        'microfiber': 'microfiber fabric',
        'velvet': 'velvet fabric',
        'leather': 'leather',
        'linen': 'linen fabric',
        'cotton': 'cotton fabric',
        'eco-leather': 'eco-leather',
        'chenille': 'chenille fabric',
        'bouclé': 'bouclé fabric'
    };

    const fabricDesc = fabricDescriptions[fabric] || fabric;

    // Instruction-style prompt for pix2pix
    return `Change the sofa upholstery to ${color} ${fabricDesc}. Keep the exact same sofa shape and background.`;
}

async function callGeminiAPI(prompt) {
    // Use deployed backend URL or localhost for development
    const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3001';

    const response = await fetch(`${BACKEND_URL}/api/gemini/edit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            apiKey: apiKey,
            imageBase64: uploadedImageBase64,
            prompt: prompt
        })
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Image editing failed');
    }

    console.log('Gemini result received');
    return data.image;
}

async function pollForResult(predictionId) {
    const PROXY_URL = 'http://localhost:3001';
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const response = await fetch(`${PROXY_URL}/api/predictions/${predictionId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        const prediction = await response.json();

        if (prediction.status === 'succeeded') {
            return prediction.output[0] || prediction.output;
        } else if (prediction.status === 'failed') {
            throw new Error(prediction.error || 'Generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    throw new Error('Timeout waiting for result');
}

function downloadResult() {
    const resultImage = document.getElementById('resultImage');
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'sofa-visualizer-result.png';
    link.click();
}

function tryAgain() {
    resultSection.style.display = 'none';
    optionsSection.scrollIntoView({ behavior: 'smooth' });
}

// Expose functions to window for onclick handlers
window.resetUpload = resetUpload;
window.generateImage = generateImage;
window.downloadResult = downloadResult;
window.tryAgain = tryAgain;
window.saveApiKey = saveApiKey;
