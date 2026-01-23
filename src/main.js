// FabricAI Pro V2 - Main Application Logic
// Dual Image Upload: Sofa + Fabric Texture
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';
import { showAlert, showConfirm } from './modal.js';

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
        emptyState: document.getElementById('emptyState'),
        saveBtn: document.getElementById('saveBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        shareBtn: document.getElementById('shareBtn'),
        // Save Modal
        saveModal: document.getElementById('saveModal'),
        closeSaveModal: document.getElementById('closeSaveModal'),
        imageName: document.getElementById('imageName'),
        folderSelect: document.getElementById('folderSelect'),
        newFolderBtn: document.getElementById('newFolderBtn'),
        newFolderGroup: document.getElementById('newFolderGroup'),
        newFolderName: document.getElementById('newFolderName'),
        cancelSaveBtn: document.getElementById('cancelSaveBtn'),
        confirmSaveBtn: document.getElementById('confirmSaveBtn'),
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

        // Gallery access button for all authenticated users
        const galleryBtn = `
            <a href="/admin.html" class="btn-logout-mini" title="Gestisci Galleria" style="margin-right:4px; text-decoration:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </a>
        `;

        els.userMenu.innerHTML = `
            <div class="user-profile-widget">
                <div class="user-avatar">${initial}</div>
                <div class="user-info-text">${username}</div>
                ${galleryBtn}
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
async function loadCompanySettings() {
    const logoContainer = document.getElementById('logoContainer');

    try {
        // Load logo from Supabase Storage
        const { data } = supabase.storage
            .from('generated-images')
            .getPublicUrl('company-logo.png');

        // Check if logo file exists
        const response = await fetch(data.publicUrl, { method: 'HEAD' });

        if (response.ok) {
            if (logoContainer) {
                // Add cache buster to prevent stale logos
                logoContainer.innerHTML = `<img src="${data.publicUrl}?t=${Date.now()}" alt="Company Logo" class="custom-logo">`;
            }
        }
    } catch (err) {
        console.log('No custom logo found, using default');
    } finally {
        // Always show logo container with fade-in
        if (logoContainer) {
            logoContainer.style.opacity = '1';
        }
    }
}

// --- Reset ---
async function resetApp() {
    const confirmed = await showConfirm('Vuoi davvero cancellare tutto e ricominciare?', {
        confirmText: 'Sì, ricomincia',
        cancelText: 'Annulla',
        danger: true
    });
    if (confirmed) {
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
                showAlert('Condivisione non supportata su questo dispositivo', 'warning');
            }
        });
    }

    // Save Modal handlers
    if (els.saveBtn) {
        els.saveBtn.addEventListener('click', openSaveModal);
    }
    if (els.closeSaveModal) {
        els.closeSaveModal.addEventListener('click', closeSaveModal);
    }
    if (els.cancelSaveBtn) {
        els.cancelSaveBtn.addEventListener('click', closeSaveModal);
    }
    if (els.saveModal) {
        els.saveModal.addEventListener('click', (e) => {
            if (e.target === els.saveModal) closeSaveModal();
        });
    }
    if (els.newFolderBtn) {
        els.newFolderBtn.addEventListener('click', toggleNewFolderInput);
    }
    if (els.confirmSaveBtn) {
        els.confirmSaveBtn.addEventListener('click', saveImageToGallery);
    }
}

// --- V2: Image Upload Handler (supports both slots) ---
async function handleImageUpload(file, imageType) {
    if (file.size > 20 * 1024 * 1024) {
        showAlert('File troppo grande (max 20MB)', 'error');
        return;
    }

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
            showAlert('Errore nella conversione HEIC. Prova a salvare l\'immagine come JPG prima di caricarla.', 'error');
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
                showAlert('Errore nel processare l\'immagine', 'error');
            }
        };
        img.onerror = () => {
            showAlert('Impossibile caricare questa immagine. Prova un altro formato (JPG, PNG).', 'error');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showAlert('Errore nella lettura del file', 'error');
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
        els.saveBtn.disabled = false;
        els.downloadBtn.disabled = false;
        els.shareBtn.disabled = false;

    } catch (error) {
        console.error(error);
        if (error.name === 'AbortError') {
            showAlert('La generazione ha impiegato troppo tempo. Riprova.', 'warning');
        } else {
            showAlert('Errore generazione: ' + error.message, 'error');
        }
    } finally {
        els.canvasLoading.style.display = 'none';
        els.generateBtn.disabled = false;
        els.generateBtn.querySelector('.btn-text').textContent = 'Genera';
        updateGenerateButton();
    }
}

// ============================================
// Save Modal Functions
// ============================================

async function openSaveModal() {
    if (!state.user) {
        await showAlert('Devi accedere per salvare le immagini', 'warning');
        window.location.href = '/login.html';
        return;
    }

    // Reset form
    els.imageName.value = '';
    els.newFolderName.value = '';
    els.newFolderGroup.style.display = 'none';

    // Load folders
    await loadFoldersForModal();

    // Show modal
    els.saveModal.style.display = 'flex';
}

function closeSaveModal() {
    els.saveModal.style.display = 'none';
}

async function loadFoldersForModal() {
    try {
        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .order('name');

        if (error) throw error;

        // Populate dropdown
        els.folderSelect.innerHTML = '<option value="">Seleziona cartella...</option>';
        data.forEach(folder => {
            els.folderSelect.innerHTML += `<option value="${folder.id}">${folder.name}</option>`;
        });
    } catch (err) {
        console.error('Error loading folders:', err);
    }
}

function toggleNewFolderInput() {
    const isVisible = els.newFolderGroup.style.display !== 'none';
    els.newFolderGroup.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        els.newFolderName.focus();
    }
}

async function saveImageToGallery() {
    const imageName = els.imageName.value.trim();
    const selectedFolderId = els.folderSelect.value;
    const newFolderName = els.newFolderName.value.trim();

    // Validation
    if (!imageName) {
        showAlert('Inserisci un nome per l\'immagine', 'warning');
        return;
    }

    if (!selectedFolderId && !newFolderName) {
        showAlert('Seleziona una cartella o creane una nuova', 'warning');
        return;
    }

    // Disable button during save
    els.confirmSaveBtn.disabled = true;
    els.confirmSaveBtn.textContent = 'Salvataggio...';

    try {
        let folderId = selectedFolderId;

        // Create new folder if needed
        if (newFolderName) {
            const { data: newFolder, error: folderError } = await supabase
                .from('folders')
                .insert({ name: newFolderName, created_by: state.user.email })
                .select()
                .single();

            if (folderError) throw folderError;
            folderId = newFolder.id;
        }

        // Convert base64 to blob for upload
        const mainImageSrc = els.mainImage.src;
        const base64Data = mainImageSrc.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        // Generate unique filename
        const fileName = `${Date.now()}-${imageName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);

        // Save record to database
        const { error: dbError } = await supabase
            .from('saved_images')
            .insert({
                name: imageName,
                folder_id: folderId,
                image_url: urlData.publicUrl,
                created_by: state.user.email
            });

        if (dbError) throw dbError;

        // Success
        closeSaveModal();
        showAlert('Immagine salvata con successo!', 'success');

    } catch (err) {
        console.error('Error saving image:', err);
        showAlert('Errore nel salvataggio: ' + err.message, 'error');
    } finally {
        els.confirmSaveBtn.disabled = false;
        els.confirmSaveBtn.textContent = 'Salva';
    }
}
