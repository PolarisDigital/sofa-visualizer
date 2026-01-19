// FabricAI - Main Application
import { getSession, signOut, getRemainingGenerations, canGenerate, getUser } from './supabase.js';

// State
let uploadedImage = null;
let uploadedImageBase64 = null;
let selectedColor = 'blu navy';
let selectedColorName = 'Blu Navy';
let currentUser = null;

// DOM Elements
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const optionsSection = document.getElementById('optionsSection');
const resultSection = document.getElementById('resultSection');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initColorSwatches();
    await checkAuth();
    setupLogout();
});

// Auth check
async function checkAuth() {
    try {
        const session = await getSession();
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const generationsBadge = document.getElementById('generationsBadge');
        const loginRequired = document.getElementById('loginRequired');
        const uploadContent = document.getElementById('uploadContent');

        if (session?.user) {
            currentUser = session.user;
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';

            // Show upload, hide login required
            if (loginRequired) loginRequired.style.display = 'none';
            if (uploadContent) uploadContent.style.display = 'block';

            // Update generations badge
            try {
                const remaining = await getRemainingGenerations(currentUser.id);
                if (remaining === -1) {
                    generationsBadge.textContent = '∞ gen';
                } else {
                    generationsBadge.textContent = `${remaining} gen`;
                }
            } catch (e) {
                generationsBadge.textContent = '3 gen';
            }
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';

            // Show login required, hide upload
            if (loginRequired) loginRequired.style.display = 'block';
            if (uploadContent) uploadContent.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut();
            window.location.reload();
        });
    }
}

// Event Listeners
imageInput.addEventListener('change', handleImageUpload);

// Drag and drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

// Color Swatches
function initColorSwatches() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            selectedColor = swatch.dataset.name.toLowerCase();
            selectedColorName = swatch.dataset.name;
        });
    });
}

// Functions
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

async function processImage(file) {
    let processedFile = file;

    // Check for HEIC format
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            const heic2any = (await import('heic2any')).default;
            uploadBox.innerHTML = '<div class="upload-content"><div class="spinner" style="width:40px;height:40px;margin:0 auto 16px;"></div><p>Conversione...</p></div>';

            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            });

            processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
                type: 'image/jpeg'
            });

            uploadBox.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">📷</div>
                    <p>Carica una foto del tuo divano</p>
                    <button class="btn btn-primary" onclick="document.getElementById('imageInput').click()">
                        Seleziona immagine
                    </button>
                </div>
            `;
        } catch (err) {
            console.error('HEIC conversion error:', err);
            alert('Impossibile convertire l\'immagine. Prova un altro formato.');
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            try {
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
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                uploadedImage = jpegDataUrl;
                uploadedImageBase64 = jpegDataUrl.split(',')[1];
                previewImage.src = jpegDataUrl;
                uploadBox.style.display = 'none';
                previewContainer.style.display = 'block';
                optionsSection.style.display = 'flex';
                resultSection.style.display = 'none';
            } catch (err) {
                console.error('Error processing image:', err);
                alert('Errore nel processare l\'immagine.');
            }
        };
        img.onerror = () => alert('Formato immagine non supportato.');
        img.src = e.target.result;
    };
    reader.onerror = () => alert('Errore nella lettura del file.');
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

async function generateImage() {
    if (!uploadedImage) {
        alert('Carica prima un\'immagine.');
        return;
    }

    // Check if user is logged in
    if (!currentUser) {
        if (!confirm('Per generare, devi avere un account. Vuoi accedere?')) return;
        window.location.href = '/login.html';
        return;
    }

    // Check generation limits
    try {
        const canGen = await canGenerate(currentUser.id);
        if (!canGen) {
            alert('Hai esaurito le generazioni mensili. Passa a un piano superiore!');
            return;
        }
    } catch (error) {
        console.log('Limit check skipped:', error);
    }

    const fabric = document.getElementById('fabricSelect').value;
    const prompt = buildPrompt(fabric, selectedColorName);

    loadingOverlay.style.display = 'flex';

    try {
        const result = await callGeminiAPI(prompt);

        if (result) {
            document.getElementById('originalThumb').src = uploadedImage;
            document.getElementById('resultImage').src = result;
            resultSection.style.display = 'block';

            // Refresh generation count
            await checkAuth();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Errore: ' + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function buildPrompt(fabric, color) {
    const fabricDescriptions = {
        'velvet': 'luxurious velvet fabric',
        'leather': 'genuine leather',
        'linen': 'natural linen fabric',
        'microfiber': 'soft microfiber fabric',
        'cotton': 'high-quality cotton fabric',
        'bouclé': 'textured bouclé fabric'
    };

    const fabricDesc = fabricDescriptions[fabric] || fabric;
    return `Change the sofa upholstery to ${color} ${fabricDesc}. Keep the exact same sofa shape and background.`;
}

async function callGeminiAPI(prompt) {
    const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3001';

    const response = await fetch(`${BACKEND_URL}/api/gemini/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageBase64: uploadedImageBase64,
            prompt: prompt,
            userId: currentUser?.id
        })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Generazione fallita');
    return data.image;
}

function downloadResult() {
    const resultImage = document.getElementById('resultImage');
    const link = document.createElement('a');
    link.download = 'fabricai-result.jpg';
    link.href = resultImage.src;
    link.click();
}

function tryAgain() {
    resultSection.style.display = 'none';
    optionsSection.style.display = 'flex';
}

// Make functions available globally
window.generateImage = generateImage;
window.resetUpload = resetUpload;
window.downloadResult = downloadResult;
window.tryAgain = tryAgain;
