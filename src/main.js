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
        fabricCount: document.getElementById('fabricCount'),
        colorCount: document.getElementById('colorCount'),
        generateBtn: document.getElementById('generateBtn'),
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
    setupEventListeners();
});

// --- Auth System ---
async function initAuth() {
    const session = await getSession();
    state.user = session?.user;

    if (state.user) {
        els.userMenu.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">${state.user.email}</span>
                <button class="btn-generate" style="padding: 6px 12px; font-size: 0.75rem; width: auto;" id="logoutBtn">Esci</button>
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
        const response = await supabase.from('fabrics').select('*').order('created_at');
        if (response.data) data = response.data;
    } catch (e) { console.error('Supabase error', e); }

    // Merge or use defaults if empty
    if (data.length === 0) {
        state.fabrics = DEFAULT_FABRICS;
    } else {
        state.fabrics = [...data, ...DEFAULT_FABRICS.filter(df => !data.find(d => d.name === df.name))];
    }

    els.fabricCount.textContent = state.fabrics.length;
    renderFabrics();
}

async function loadColors(fabricId) {
    els.colorsGrid.innerHTML = '<div class="skeleton-loader"></div>';

    let dbColors = [];
    if (!fabricId.startsWith('f_')) { // checking if it's a real DB ID (uuid) or our static ID
        try {
            const { data } = await supabase.from('colors').select('*').eq('fabric_id', fabricId);
            if (data) dbColors = data;
        } catch (e) { console.error(e); }
    }

    // Get defaults based on fabric ID mapping or generic defaults
    let defaultColors = DEFAULT_COLORS[fabricId] || DEFAULT_COLORS['default'];

    // Special handling: if fabric is one of our static ones, lookup by ID
    const fabricIsStatic = DEFAULT_FABRICS.find(f => f.id === fabricId);
    if (fabricIsStatic) {
        defaultColors = DEFAULT_COLORS[fabricId] || DEFAULT_COLORS['default'];
    }

    state.colors = [...dbColors, ...defaultColors];

    els.colorCount.textContent = state.colors.length;
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
            <div style="height: 80px; width: 100%; position: relative; overflow: hidden; border-radius: 4px;">
               ${content}
            </div>
            <div class="fabric-name mt-2">${f.name}</div>
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
        // Fallback: Use hex color if no image
        const style = !c.preview_url && c.hex_value
            ? `background-color: ${c.hex_value};`
            : 'background-color: #3f3f46;'; // Default gray

        const content = c.preview_url
            ? `<img src="${c.preview_url}" alt="${c.name}">`
            : '';

        return `
        <div class="color-item ${state.selectedColor?.id === c.id ? 'selected' : ''}" data-id="${c.id}" title="${c.name}" style="${style}">
            ${content}
        </div>
    `}).join('');

    document.querySelectorAll('.color-item').forEach(item => {
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
}

function selectColor(color) {
    state.selectedColor = color;
    renderColors();
    updateGenerateButton();
}

function updateGenerateButton() {
    const ready = state.uploadedImage && state.selectedFabric && state.selectedColor;
    els.generateBtn.disabled = !ready;
    if (ready) els.generateBtn.classList.add('pulse');
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

    // Upload - Auth check removed (was blocking logged-in users)
    els.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    // Output Mode Toggle
    els.toggleOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            els.toggleOptions.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.outputMode = btn.dataset.mode;
        });
    });

    // Generate
    els.generateBtn.addEventListener('click', generateImage);

    // Lightbox
    els.imageWrapper.addEventListener('click', () => {
        if (els.mainImage.src) {
            els.lightboxImg.src = els.mainImage.src;
            els.lightbox.classList.add('active');
        }
    });

    els.closeLightbox.addEventListener('click', () => els.lightbox.classList.remove('active'));

    // Download / Share
    els.downloadBtn.addEventListener('click', () => {
        if (els.mainImage.src) {
            const link = document.createElement('a');
            link.href = els.mainImage.src;
            link.download = `fabricai-${Date.now()}.jpg`;
            link.click();
        }
    });

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

function handleImageUpload(file) {
    if (file.size > 10 * 1024 * 1024) return alert('File troppo grande (max 10MB)');

    const reader = new FileReader();
    reader.onload = (e) => {
        state.uploadedImage = e.target.result;
        state.uploadedImageBase64 = e.target.result.split(',')[1];

        // Update Thumb in sidebar
        els.uploadThumb.src = e.target.result;
        els.uploadThumb.style.display = 'block';
        els.uploadWidget.style.borderStyle = 'solid';

        // Show in main canvas immediately
        els.mainImage.src = e.target.result;
        els.imageWrapper.style.display = 'block';
        document.querySelector('.empty-state').style.display = 'none';

        updateGenerateButton();
    };
    reader.readAsDataURL(file);
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
        const promptText = `Change the sofa upholstery to ${state.selectedColor.name} ${state.selectedFabric.name}. ${state.selectedColor.texture_prompt || ''}`;

        const response = await fetch(`${window.BACKEND_URL}/api/gemini/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: state.uploadedImageBase64,
                prompt: promptText,
                userId: state.user.id,
                outputMode: state.outputMode
            })
        });

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
