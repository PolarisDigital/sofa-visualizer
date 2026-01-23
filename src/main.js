// FabricAI Pro V2 - Main Application Logic
// Dual Image Upload: Sofa + Fabric Texture
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- State Management (V2: Dual Images) ---
const state = {
    sofaImage: null,         // Data URL for display
    sofaImageBase64: null,   // Base64 for API
    fabricImage: null,       // Data URL for display
    fabricImageBase64: null, // Base64 for API
    outputMode: 'ambientato',
    user: null
};

// --- DOM Elements ---
let els = {};

// --- ACCORDION TOGGLE (must be global for inline onclick) ---
window.toggleAccordion = (id) => {
    const section = document.getElementById(id);
    if (section) section.classList.toggle('open');
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements AFTER page is loaded
    els = {
        userMenu: document.getElementById('userMenu'),
        // V2: Dual Upload Widgets
        sofaImageInput: document.getElementById('sofaImageInput'),
        sofaImageThumb: document.getElementById('sofaImageThumb'),
        uploadWidgetSofa: document.getElementById('uploadWidgetSofa'),
        fabricImageInput: document.getElementById('fabricImageInput'),
        fabricImageThumb: document.getElementById('fabricImageThumb'),
        uploadWidgetFabric: document.getElementById('uploadWidgetFabric'),
        // Controls
        generateBtn: document.getElementById('generateBtn'),
        resetBtn: document.getElementById('resetBtn'),
        toggleOptions: document.querySelectorAll('.toggle-option'),
        // Canvas
        imageWrapper: document.getElementById('imageWrapper'),
        canvasViewer: document.getElementById('canvasViewer'),
        canvasLoading: document.getElementById('canvasLoading'),
        mainImage: document.getElementById('mainImage'),
        emptyState: document.getElementById('emptyState'), // V2: Empty state element
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
        // Lightbox
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        closeLightbox: document.querySelector('.close-lightbox')
    };

    await initAuth();
    loadCompanySettings();
    setupEventListeners();
});

// --- Auth System ---
async function initAuth() {
    const session = await getSession();
    state.user = session?.user;

    if (state.user) {
        const initial = state.user.email.charAt(0).toUpperCase();
        const username = state.user.email.split('@')[0];

        // Admin Check
        const ADMIN_EMAILS = ['paolo@polarisdigital.it', 'admin@polarisdigital.it'];
        const isAdmin = ADMIN_EMAILS.includes(state.user.email);

        const adminBtn = isAdmin ? `
            <a href="/admin.html" class="btn-logout-mini" title="Admin Dashboard" style="margin-right:4px; text-decoration:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06 .06a2 2 0 0 1 0 2.83 2 2 0 0 1 -2.83 0l-.06 -.06a1.65 1.65 0 0 0 -1.82 -.33 1.65 1.65 0 0 0 -1 1.51v.1a2 2 0 0 1 -2 2 2 2 0 0 1 -2 -2v-.1a1.65 1.65 0 0 0 -1 -1.51 1.65 1.65 0 0 0 -1.82 .33l-.06 .06a2 2 0 0 1 -2.83 0 2 2 0 0 1 0 -2.83l.06 -.06a1.65 1.65 0 0 0 .33 -1.82 1.65 1.65 0 0 0 -1.51 -1h-.1a2 2 0 0 1 -2 -2 2 2 0 0 1 2 -2h.1a1.65 1.65 0 0 0 1.51 -1 1.65 1.65 0 0 0 -.33 -1.82l-.06 -.06a2 2 0 0 1 0 -2.83 2 2 0 0 1 2.83 0l.06 .06a1.65 1.65 0 0 0 1.82 .33h.1a1.65 1.65 0 0 0 1 -1.51v-.1a2 2 0 0 1 2 -2 2 2 0 0 1 2 2v.1a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82 -.33l.06 -.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06 .06a1.65 1.65 0 0 0 -.33 1.82v.1a1.65 1.65 0 0 0 1.51 1h.1a2 2 0 0 1 2 2 2 2 0 0 1 -2 2h-.1a1.65 1.65 0 0 0 -1.51 1z"></path>
                </svg>
            </a>
        ` : '';

        els.userMenu.innerHTML = `
            <div class="user-profile-widget">
                <div class="user-avatar">${initial}</div>
                <div class="user-info-text">${username}</div>
                ${adminBtn}
                <button class="btn-logout-mini" id="logoutBtn" title="Esci">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        `;
        document.getElementById('logoutBtn').onclick = async () => {
            await signOut();
            window.location.reload();
        };
    } else {
        els.userMenu.innerHTML = `
            <a href="/login.html" style="color: var(--accent); font-size: 0.85rem; font-weight: 500; text-decoration: none;">Accedi / Registrati</a>
        `;
    }
}

// --- V2: Update Generate Button ---
function updateGenerateButton() {
    // V2: Ready when BOTH images are uploaded
    const ready = state.sofaImageBase64 && state.fabricImageBase64;
    els.generateBtn.disabled = !ready;
    if (ready) {
        els.generateBtn.classList.add('pulse');
    } else {
        els.generateBtn.classList.remove('pulse');
    }
}

// --- Company Settings (Logo) ---
function loadCompanySettings() {
    const customLogo = localStorage.getItem('company_logo');
    if (customLogo) {
        const logoContainer = document.getElementById('logoContainer');
        if (logoContainer) {
            logoContainer.innerHTML = `<img src="${customLogo}" alt="Company Logo" class="custom-logo">`;
        }
    }
}

// --- Reset ---
function resetApp() {
    if (confirm('Vuoi davvero cancellare tutto e ricominciare?')) {
        window.location.reload();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Sofa Image Upload
    if (els.sofaImageInput) {
        els.sofaImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageUpload(file, 'sofa');
        });
    }

    // Fabric Image Upload
    if (els.fabricImageInput) {
        els.fabricImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageUpload(file, 'fabric');
        });
    }

    // Reset Button - with event prevention to ensure confirm dialog works
    if (els.resetBtn) {
        els.resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetApp();
        });
    }

    // Output Mode Toggle
    if (els.toggleOptions) {
        els.toggleOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                els.toggleOptions.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.outputMode = btn.dataset.mode;
            });
        });
    }

    // Generate
    if (els.generateBtn) els.generateBtn.addEventListener('click', generateImage);

    // Lightbox
    if (els.imageWrapper) {
        els.imageWrapper.addEventListener('click', () => {
            if (els.mainImage.src) {
                els.lightboxImg.src = els.mainImage.src;
                els.lightbox.classList.add('active');
            }
        });
    }

    if (els.closeLightbox) {
        els.closeLightbox.addEventListener('click', () => els.lightbox.classList.remove('active'));
    }

    // Download
    if (els.downloadBtn) {
        els.downloadBtn.addEventListener('click', () => {
            if (els.mainImage.src) {
                const link = document.createElement('a');
                link.href = els.mainImage.src;
                link.download = `fabricai-${Date.now()}.jpg`;
                link.click();
            }
        });
    }

    // Share
    if (els.shareBtn) {
        els.shareBtn.addEventListener('click', async () => {
            if (navigator.share && els.mainImage.src) {
                const blob = await (await fetch(els.mainImage.src)).blob();
                const file = new File([blob], 'design.jpg', { type: 'image/jpeg' });
                navigator.share({
                    title: 'Il mio nuovo divano',
                    text: 'Guarda questo divano con il nuovo tessuto!',
                    files: [file]
                });
            } else {
                alert('Condivisione non supportata su questo dispositivo');
            }
        });
    }
}

// --- V2: Image Upload Handler (supports both slots) ---
async function handleImageUpload(file, imageType) {
    if (file.size > 20 * 1024 * 1024) return alert('File troppo grande (max 20MB)');

    // Determine which widget we're working with
    const issofa = imageType === 'sofa';
    const widget = issofa ? els.uploadWidgetSofa : els.uploadWidgetFabric;
    const thumbEl = issofa ? els.sofaImageThumb : els.fabricImageThumb;
    const inputId = issofa ? 'sofaImageInput' : 'fabricImageInput';
    const icon = issofa ? '🛋️' : '🧵';
    const label = issofa ? 'Carica Foto Divano' : 'Carica Foto Tessuto';

    let processedFile = file;

    // Check for HEIC format and convert if needed
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            // Show loading state
            widget.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="spinner-large"></div><p style="margin-top: 10px; font-size: 0.8rem;">Conversione HEIC...</p></div>';

            const heic2any = (await import('heic2any')).default;
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.95
            });

            processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
                type: 'image/jpeg'
            });

            // Restore upload widget
            widget.innerHTML = `
                <input type="file" id="${inputId}" accept="image/*" hidden>
                <div class="upload-placeholder" onclick="document.getElementById('${inputId}').click()">
                    <div class="icon-camera">${icon}</div>
                    <span>${label}</span>
                </div>
                <img id="${issofa ? 'sofaImageThumb' : 'fabricImageThumb'}" class="upload-thumb" style="display: none;">
            `;
            // Re-attach event listener
            document.getElementById(inputId).addEventListener('change', (e) => {
                const newFile = e.target.files[0];
                if (newFile) handleImageUpload(newFile, imageType);
            });
            // Update els reference
            if (issofa) {
                els.sofaImageThumb = document.getElementById('sofaImageThumb');
                els.sofaImageInput = document.getElementById('sofaImageInput');
            } else {
                els.fabricImageThumb = document.getElementById('fabricImageThumb');
                els.fabricImageInput = document.getElementById('fabricImageInput');
            }
        } catch (err) {
            console.error('HEIC conversion error:', err);
            alert('Errore nella conversione HEIC. Prova a salvare l\'immagine come JPG prima di caricarla.');
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            try {
                // Resize if too large (2500px max for high quality)
                const MAX_SIZE = 2500;
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

                // Draw to canvas and convert to JPEG
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // High quality JPEG
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.98);
                const base64Data = jpegDataUrl.split(',')[1];

                // Store in appropriate state slot
                if (issofa) {
                    state.sofaImage = jpegDataUrl;
                    state.sofaImageBase64 = base64Data;

                    // Update thumb
                    const thumb = document.getElementById('sofaImageThumb');
                    if (thumb) {
                        thumb.src = jpegDataUrl;
                        thumb.style.display = 'block';
                    }
                    if (widget) widget.style.borderStyle = 'solid';

                    // Show sofa in main canvas
                    const mainImg = document.getElementById('mainImage');
                    const imgWrapper = document.getElementById('imageWrapper');
                    const emptyState = document.querySelector('.empty-state');

                    if (mainImg) {
                        mainImg.src = jpegDataUrl;
                        els.mainImage = mainImg;
                    }
                    if (imgWrapper) {
                        imgWrapper.style.display = 'block';
                        els.imageWrapper = imgWrapper;
                    }
                    if (emptyState) emptyState.style.display = 'none';
                } else {
                    state.fabricImage = jpegDataUrl;
                    state.fabricImageBase64 = base64Data;

                    // Update thumb
                    const thumb = document.getElementById('fabricImageThumb');
                    if (thumb) {
                        thumb.src = jpegDataUrl;
                        thumb.style.display = 'block';
                    }
                    if (widget) widget.style.borderStyle = 'solid';
                }

                // Show Reset Button when any image is uploaded
                if (els.resetBtn) els.resetBtn.style.display = 'block';

                updateGenerateButton();

            } catch (err) {
                console.error('Image processing error:', err);
                alert('Errore nel processare l\'immagine');
            }
        };
        img.onerror = () => {
            alert('Impossibile caricare questa immagine. Prova un altro formato (JPG, PNG).');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        alert('Errore nella lettura del file');
    };
    reader.readAsDataURL(processedFile);
}

// --- V2: Generation Logic ---
async function generateImage() {
    if (!state.sofaImageBase64 || !state.fabricImageBase64) return;

    // UI Loading
    els.canvasLoading.style.display = 'flex';
    els.generateBtn.disabled = true;
    els.generateBtn.querySelector('.btn-text').textContent = 'Generazione...';

    try {
        console.log('Starting V2 generation with:', {
            sofaImageLength: state.sofaImageBase64?.length,
            fabricImageLength: state.fabricImageBase64?.length,
            outputMode: state.outputMode,
            userId: state.user?.id
        });

        // Add timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${window.BACKEND_URL}/api/gemini/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sofaImageBase64: state.sofaImageBase64,
                fabricImageBase64: state.fabricImageBase64,
                userId: state.user?.id || 'guest',
                outputMode: state.outputMode
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Success
        const resultSrc = `data:image/jpeg;base64,${data.image}`;
        els.mainImage.src = resultSrc;

        // Enable actions
        els.downloadBtn.disabled = false;
        els.shareBtn.disabled = false;

    } catch (error) {
        console.error(error);
        if (error.name === 'AbortError') {
            alert('La generazione ha impiegato troppo tempo. Riprova.');
        } else {
            alert('Errore generazione: ' + error.message);
        }
    } finally {
        els.canvasLoading.style.display = 'none';
        els.generateBtn.disabled = false;
        els.generateBtn.querySelector('.btn-text').textContent = 'Genera';
        updateGenerateButton();
    }
}
