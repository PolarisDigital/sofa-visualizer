// FabricAI Pro - Main Application Logic
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const DEFAULT_FABRICS = [
    { id: 'f_velvet', name: 'Velluto' },
    { id: 'f_leather', name: 'Pelle' },
    { id: 'f_linen', name: 'Lino' },
    { id: 'f_boucle', name: 'Bouclé' },
    { id: 'f_cotton', name: 'Cotone' }
];

const DEFAULT_COLORS = {
    'f_velvet': [
        { id: 'c_v_navy', name: 'Blu Navy', hex_value: '#1B365D' },
        { id: 'c_v_emerald', name: 'Smeraldo', hex_value: '#50C878' },
        { id: 'c_v_ruby', name: 'Rubino', hex_value: '#E0115F' },
        { id: 'c_v_gold', name: 'Oro', hex_value: '#FFD700' }
    ],
    'f_leather': [
        { id: 'c_l_brown', name: 'Marrone', hex_value: '#8B4513' },
        { id: 'c_l_black', name: 'Nero', hex_value: '#000000' },
        { id: 'c_l_tan', name: 'Cuoio', hex_value: '#D2B48C' }
    ],
    'f_linen': [
        { id: 'c_li_beige', name: 'Beige', hex_value: '#F5F5DC' },
        { id: 'c_li_grey', name: 'Grigio', hex_value: '#808080' },
        { id: 'c_li_white', name: 'Bianco', hex_value: '#FFFFFF' }
    ],
    'default': [
        { id: 'c_d_navy', name: 'Blu', hex_value: '#000080' },
        { id: 'c_d_grey', name: 'Grigio', hex_value: '#808080' },
        { id: 'c_d_beige', name: 'Beige', hex_value: '#F5F5DC' },
        { id: 'c_d_black', name: 'Nero', hex_value: '#000000' }
    ]
};

// --- State Management ---
const state = {
    uploadedImage: null,
    uploadedImageBase64: null,
    selectedFabric: null,
    selectedColor: null,
    outputMode: 'ambientato',
    user: null,
    fabrics: [],
    colors: []
};

// --- DOM Elements (initialized after DOM ready) ---
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
        imageInput: document.getElementById('imageInput'),
        uploadWidget: document.getElementById('uploadWidget'),
        uploadThumb: document.getElementById('usersImageThumb'),
        fabricsGrid: document.getElementById('fabricsGrid'),
        colorsGrid: document.getElementById('colorsGrid'),
        generateBtn: document.getElementById('generateBtn'),
        resetBtn: document.getElementById('resetBtn'), // Reset Button
        toggleOptions: document.querySelectorAll('.toggle-option'),
        imageWrapper: document.getElementById('imageWrapper'),
        canvasViewer: document.getElementById('canvasViewer'),
        canvasLoading: document.getElementById('canvasLoading'),
        mainImage: document.getElementById('mainImage'),
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        closeLightbox: document.querySelector('.close-lightbox')
    };

    await initAuth();
    await loadFabrics();
    loadCompanySettings();
    setupEventListeners();
});

// --- Auth System ---
async function initAuth() {
    const session = await getSession();
    state.user = session?.user;

    if (state.user) {
        // Get initial from email
        const initial = state.user.email.charAt(0).toUpperCase();
        // Get username (part before @)
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

// --- Data Fetching ---
// --- Data Fetching ---
async function loadFabrics() {
    let data = [];
    try {
        // Fetch only active fabrics
        const response = await supabase.from('fabrics')
            .select('*')
            .eq('is_active', true) // Only active
            .order('created_at');

        if (response.data) data = response.data;
    } catch (e) { console.error('Supabase error', e); }

    // If DB has data, use ONLY DB data. Otherwise fallback to defaults.
    if (data.length > 0) {
        state.fabrics = data;
    } else {
        console.log('No fabrics in DB, using defaults');
        state.fabrics = DEFAULT_FABRICS;
    }

    renderFabrics();
}

async function loadColors(fabricId) {
    els.colorsGrid.innerHTML = '<div class="skeleton-loader"></div>';

    let dbColors = [];

    // Only try to fetch from DB if it looks like a UUID (not starting with f_)
    // OR if we decide to fetch anyway (maybe we migrate defaults to DB later)
    // Actually, checking if fabricId exists in DB is safer.

    try {
        const { data } = await supabase.from('colors').select('*').eq('fabric_id', fabricId);
        if (data && data.length > 0) {
            dbColors = data;
        }
    } catch (e) { console.error(e); }

    if (dbColors.length > 0) {
        state.colors = dbColors;
    } else {
        // Fallback to static defaults if nothing in DB for this fabric
        state.colors = DEFAULT_COLORS[fabricId] || DEFAULT_COLORS['default'];
    }

    renderColors();
}

// --- Rendering ---
// Rendering
function renderFabrics() {
    els.fabricsGrid.innerHTML = state.fabrics.map(f => {
        // Fallback or Image for fabric
        const content = f.preview_url
            ? `<img src="${f.preview_url}" alt="${f.name}">`
            : `<div style="height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #3f3f46;">🧵</div>`;

        return `
        <div class="fabric-card ${state.selectedFabric?.id === f.id ? 'selected' : ''}" data-id="${f.id}" title="${f.name}">
            <div class="content-box">
               ${content}
            </div>
            <div class="fabric-name">${f.name}</div>
        </div>
    `}).join('');

    // Attach events
    document.querySelectorAll('.fabric-card').forEach(card => {
        card.addEventListener('click', () => {
            const fabric = state.fabrics.find(f => f.id === card.dataset.id);
            selectFabric(fabric);
        });
    });
}

function renderColors() {
    if (!state.colors.length) {
        els.colorsGrid.innerHTML = '<div class="empty-hint">Nessun colore disponibile</div>';
        return;
    }

    els.colorsGrid.innerHTML = state.colors.map(c => {
        // Fallback hex or image logic handled cleaner
        let previewStyle = '';
        if (!c.preview_url && c.hex_value) {
            previewStyle = `background-color: ${c.hex_value};`;
        }

        const imgContent = c.preview_url
            ? `<img src="${c.preview_url}" alt="${c.name}">`
            : '';

        return `
        <div class="color-card ${state.selectedColor?.id === c.id ? 'selected' : ''}" data-id="${c.id}" title="${c.name}">
            <div class="color-preview-box" style="${previewStyle}">
                ${imgContent}
            </div>
            <div class="color-name">${c.name}</div>
        </div>
    `}).join('');

    document.querySelectorAll('.color-card').forEach(item => {
        item.addEventListener('click', () => {
            const color = state.colors.find(c => c.id === item.dataset.id);
            selectColor(color);
        });
    });
}

// --- Interactions ---
function selectFabric(fabric) {
    state.selectedFabric = fabric;
    state.selectedColor = null; // Reset color
    renderFabrics(); // Re-render to update selected UI
    loadColors(fabric.id);
    updateGenerateButton();

    // Auto-open Colors Accordion
    const colorsSection = document.getElementById('colorsSection');
    if (colorsSection && !colorsSection.classList.contains('open')) {
        setTimeout(() => colorsSection.classList.add('open'), 300); // Small delay for UX
    }
}

function selectColor(color) {
    state.selectedColor = color;
    renderColors();
    updateGenerateButton();

    // Auto-open Style Accordion
    const styleSection = document.getElementById('styleSection');
    if (styleSection && !styleSection.classList.contains('open')) {
        setTimeout(() => styleSection.classList.add('open'), 300);
    }
}

function updateGenerateButton() {
    const ready = state.uploadedImage && state.selectedFabric && state.selectedColor;
    els.generateBtn.disabled = !ready;
    if (ready) els.generateBtn.classList.add('pulse');
}

// --- Company Settings (Logo) ---
function loadCompanySettings() {
    // Check local storage for custom logo (simulating admin setting)
    const customLogo = localStorage.getItem('company_logo');
    if (customLogo) {
        const logoContainer = document.getElementById('logoContainer');
        if (logoContainer) {
            logoContainer.innerHTML = `<img src="${customLogo}" alt="Company Logo" class="custom-logo">`;
        }
    }
}

// --- Interactions ---

function resetApp() {
    if (confirm('Vuoi davvero cancellare tutto e ricominciare?')) {
        window.location.reload();
    }
}

// --- Image Handling ---
function setupEventListeners() {
    // Check Auth before actions
    const checkAuthAction = () => {
        if (!state.user) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    };

    // Upload
    if (els.imageInput) {
        els.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageUpload(file);
        });
    }

    // Reset Button
    if (els.resetBtn) els.resetBtn.addEventListener('click', resetApp);

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

    if (els.closeLightbox) els.closeLightbox.addEventListener('click', () => els.lightbox.classList.remove('active'));

    // Download / Share
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

    if (els.shareBtn) {
        els.shareBtn.addEventListener('click', async () => {
            if (navigator.share && els.mainImage.src) {
                const blob = await (await fetch(els.mainImage.src)).blob();
                const file = new File([blob], 'design.jpg', { type: 'image/jpeg' });
                navigator.share({
                    title: 'Il mio nuovo divano',
                    text: `Guarda questo divano in ${state.selectedFabric.name} ${state.selectedColor.name}!`,
                    files: [file]
                });
            } else {
                alert('Condivisione non supportata su questo dispositivo');
            }
        });
    }
}

async function handleImageUpload(file) {
    if (file.size > 20 * 1024 * 1024) return alert('File troppo grande (max 20MB)');

    let processedFile = file;

    // Check for HEIC format and convert if needed
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            // Show loading state
            els.uploadWidget.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="spinner-large"></div><p style="margin-top: 10px; font-size: 0.8rem;">Conversione HEIC...</p></div>';

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
            els.uploadWidget.innerHTML = `
                <input type="file" id="imageInput" accept="image/*" hidden>
                <div class="upload-placeholder" onclick="document.getElementById('imageInput').click()">
                    <div class="icon-camera">📷</div>
                    <span>Carica Foto</span>
                </div>
                <img id="usersImageThumb" class="upload-thumb" style="display: none;">
            `;
            // Re-attach event listener
            document.getElementById('imageInput').addEventListener('change', (e) => {
                const newFile = e.target.files[0];
                if (newFile) handleImageUpload(newFile);
            });
            // Update els reference
            els.uploadThumb = document.getElementById('usersImageThumb');
            els.imageInput = document.getElementById('imageInput');
        } catch (err) {
            console.error('HEIC conversion error:', err);
            alert('Errore nella conversione HEIC. Prova a salvare l\'immagine come JPG prima di caricarla.');
            return;
        }
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        // Create an Image object to process through canvas
        const img = new Image();
        img.onload = () => {
            try {
                // Resize if too large
                // Increased to 2500px for 8K quality inputs
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

                // Increased quality to 0.98 for maximum fidelity
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.98);

                // Store processed image
                state.uploadedImage = jpegDataUrl;
                state.uploadedImageBase64 = jpegDataUrl.split(',')[1];

                // Update Thumb in sidebar
                if (els.uploadThumb) {
                    els.uploadThumb.src = jpegDataUrl;
                    els.uploadThumb.style.display = 'block';
                }
                if (els.uploadWidget) {
                    els.uploadWidget.style.borderStyle = 'solid';
                }

                // Show in main canvas - get fresh reference
                const mainImg = document.getElementById('mainImage');
                const imgWrapper = document.getElementById('imageWrapper');
                const emptyState = document.querySelector('.empty-state');

                if (mainImg) {
                    console.log('Setting mainImg.src, dataUrl length:', jpegDataUrl.length);
                    mainImg.src = jpegDataUrl;
                    els.mainImage = mainImg; // Update reference
                } else {
                    console.error('mainImg not found!');
                }
                if (imgWrapper) {
                    console.log('Setting imgWrapper display to block');
                    imgWrapper.style.display = 'block';
                    els.imageWrapper = imgWrapper;
                }

                // Show Reset Button
                if (els.resetBtn) els.resetBtn.style.display = 'block';

                updateGenerateButton();
                if (emptyState) {
                    emptyState.style.display = 'none';
                }

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

// --- Generation Logic ---
async function generateImage() {
    if (!state.uploadedImage || !state.selectedColor) return;

    // UI Loading
    els.canvasLoading.style.display = 'flex';
    els.generateBtn.disabled = true;

    try {
        // Construct intelligent prompt using DB Data
        // Combine fabric name + color name + optional texture prompt
        let promptText = `Change the sofa upholstery to ${state.selectedColor.name} ${state.selectedFabric.name}`;

        // Append custom AI prompt if exists in FABRIC definition
        if (state.selectedFabric.texture_prompt) {
            promptText += `. ${state.selectedFabric.texture_prompt}`;
        }

        console.log('Starting generation with:', {
            prompt: promptText,
            imageLength: state.uploadedImageBase64?.length,
            userId: state.user?.id
        });

        // Add timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const response = await fetch(`${window.BACKEND_URL}/api/gemini/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: state.uploadedImageBase64,
                prompt: promptText,
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
        alert('Errore generazione: ' + error.message);
    } finally {
        els.canvasLoading.style.display = 'none';
        els.generateBtn.disabled = false;
    }
}
