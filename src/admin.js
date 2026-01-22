import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let fabrics = [];
let selectedFabricId = null;

// DOM Elements
const fabricsList = document.getElementById('fabricsList');
const colorsPanel = document.getElementById('colorsPanel');
const emptyState = document.getElementById('emptyState');
const selectedFabricTitle = document.getElementById('selectedFabricTitle');
const colorsGrid = document.getElementById('colorsGrid');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth - simple check for now
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
        return;
    }

    // Basic Admin Check (Client Side Only - RLS handles Real Security)
    const ADMIN_EMAILS = ['paolo@polarisdigital.it', 'admin@polarisdigital.it']; // Add your email here
    if (!ADMIN_EMAILS.includes(session.user.email)) {
        alert('Accesso negato. Area riservata agli amministratori.');
        window.location.href = '/';
        return;
    }

    loadFabrics();
});

// Load Fabrics
async function loadFabrics() {
    fabricsList.innerHTML = '<div class="text-center p-4">Caricamento...</div>';

    const { data, error } = await supabase
        .from('fabrics')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        alert('Errore caricamento tessuti');
        console.error(error);
        return;
    }

    fabrics = data;
    renderFabrics();
}

function renderFabrics() {
    fabricsList.innerHTML = '';
    fabrics.forEach(fabric => {
        const div = document.createElement('div');
        div.className = `fabric-item ${selectedFabricId === fabric.id ? 'active' : ''}`;
        div.innerHTML = `
            <div>
                <div class="font-bold">${fabric.name}</div>
                <div class="text-xs text-secondary">${fabric.description || ''}</div>
            </div>
            <div>›</div>
        `;
        div.onclick = () => selectFabric(fabric);
        fabricsList.appendChild(div);
    });
}

function selectFabric(fabric) {
    selectedFabricId = fabric.id;
    renderFabrics();

    emptyState.style.display = 'none';
    colorsPanel.style.display = 'block';
    selectedFabricTitle.textContent = `Colori: ${fabric.name}`;

    loadColors(fabric.id);
    hideAddColorForm();
}

// Load Colors
async function loadColors(fabricId) {
    colorsGrid.innerHTML = '<div>Caricamento...</div>';

    const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('fabric_id', fabricId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    renderColors(data);
}

function renderColors(colors) {
    colorsGrid.innerHTML = '';

    if (colors.length === 0) {
        colorsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px dashed var(--border-light);">
                <div style="font-size: 2rem; margin-bottom: 8px;">🎨</div>
                <p>Nessun colore per questo tessuto.</p>
                <p style="font-size: 0.9rem;">Clicca su "+ Aggiungi Colore" in alto a destra per iniziare.</p>
            </div>
        `;
        return;
    }

    colors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-card';
        div.innerHTML = `
            <img src="${color.preview_url}" class="color-img">
            <div class="color-info">
                <div class="color-name">${color.name}</div>
            </div>
            <button class="btn btn-secondary btn-small w-full" onclick="deleteColor('${color.id}')">Elimina</button>
        `;
        colorsGrid.appendChild(div);
    });
}

let allFabrics = []; // Store for access

// Load Fabrics
async function loadFabrics() {
    fabricsList.innerHTML = '<div class="text-center p-4">Caricamento...</div>';
    const { data, error } = await supabase.from('fabrics').select('*').order('created_at');

    if (error) {
        fabricsList.innerHTML = '<div class="text-center p-4 text-error">Errore caricamento</div>';
        return;
    }

    allFabrics = data; // Store global
    fabricsList.innerHTML = '';

    if (data.length === 0) {
        fabricsList.innerHTML = '<div class="text-center p-4">Nessun tessuto</div>';
        return;
    }

    data.forEach(fabric => {
        const div = document.createElement('div');
        div.className = `fabric-item ${selectedFabricId === fabric.id ? 'active' : ''}`;
        div.innerHTML = `
            <div onclick="selectFabric('${fabric.id}')" style="flex:1;">
                <div style="font-weight:600;">${fabric.name}</div>
                <div class="text-secondary" style="font-size:0.85rem; margin-top:4px;">
                    ${fabric.description ? fabric.description.substring(0, 50) + '...' : ''}
                </div>
            </div>
            <button class="edit-btn" onclick="editFabric('${fabric.id}')" title="Modifica" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px;">✏️</button>
        `;
        fabricsList.appendChild(div);
    });
}

// Modal Handling
window.openFabricModal = () => {
    document.getElementById('newFabricForm').reset();
    document.getElementById('fabricId').value = '';
    document.getElementById('fabricFormTitle').innerText = 'Nuovo Tessuto';
    document.getElementById('fabricPreviewImg').style.display = 'none';
    document.getElementById('fabricUploadPlaceholder').style.display = 'block';

    document.getElementById('fabricFormModal').style.display = 'flex';
};

window.hideFabricForm = () => {
    document.getElementById('fabricFormModal').style.display = 'none';
};

window.editFabric = (id) => {
    // Stop propagation handled by layout but good to be safe
    const fabric = allFabrics.find(f => f.id === id);
    if (!fabric) return;

    document.getElementById('fabricId').value = fabric.id;
    document.getElementById('fabricName').value = fabric.name;
    document.getElementById('fabricDesc').value = fabric.description || '';
    document.getElementById('fabricPrompt').value = fabric.texture_prompt || '';

    // Preview image handling
    if (fabric.preview_url) {
        document.getElementById('fabricPreviewImg').src = fabric.preview_url;
        document.getElementById('fabricPreviewImg').style.display = 'block';
        document.getElementById('fabricUploadPlaceholder').style.display = 'none';
    } else {
        document.getElementById('fabricPreviewImg').style.display = 'none';
        document.getElementById('fabricUploadPlaceholder').style.display = 'block';
    }

    document.getElementById('fabricFormTitle').innerText = 'Modifica Tessuto';
    document.getElementById('fabricFormModal').style.display = 'flex';
};

// Add/Update Fabric Submit
document.getElementById('newFabricForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('fabricId').value;
    const name = document.getElementById('fabricName').value;
    const description = document.getElementById('fabricDesc').value;
    const prompt = document.getElementById('fabricPrompt').value;
    const file = document.getElementById('fabricPreview').files[0];

    // Identify if Creating or Updating
    const isUpdate = !!id;

    let previewUrl = isUpdate ? (allFabrics.find(f => f.id === id)?.preview_url) : null;

    if (file) {
        const fileName = `fabric_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await supabase.storage
            .from('textures')
            .upload(fileName, file);

        if (uploadError) {
            alert('Errore upload: ' + uploadError.message);
            return;
        }

        const { data } = supabase.storage.from('textures').getPublicUrl(fileName);
        previewUrl = data.publicUrl;
    }

    let error;

    const payload = {
        name,
        description,
        preview_url: previewUrl,
        texture_prompt: prompt
    };

    if (isUpdate) {
        const { error: dbError } = await supabase.from('fabrics').update(payload).eq('id', id);
        error = dbError;
    } else {
        const { error: dbError } = await supabase.from('fabrics').insert(payload);
        error = dbError;
    }

    if (error) alert('Errore salvataggio: ' + error.message);
    else {
        hideFabricForm();
        loadFabrics(); // Reload list

        // If we updated the currently selected fabric, refresh colors or header?
        if (isUpdate && id === selectedFabricId) {
            document.getElementById('selectedFabricTitle').innerText = `Colori: ${name}`;
        }
    }
});

// Helper for fabric preview
window.previewFabric = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('fabricPreviewImg');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('fabricUploadPlaceholder').style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Add Color
document.getElementById('newColorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFabricId) return;

    const name = document.getElementById('colorName').value;
    const hex = document.getElementById('colorHex').value;
    const file = document.getElementById('colorTexture').files[0];

    if (!file) {
        alert('Seleziona una foto del tessuto');
        return;
    }

    // Upload image
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('textures')
        .upload(fileName, file);

    if (uploadError) {
        alert('Errore upload immagine: ' + uploadError.message);
        return;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('textures')
        .getPublicUrl(fileName);

    // Save to DB
    const { error: dbError } = await supabase.from('colors').insert({
        fabric_id: selectedFabricId,
        name,
        hex_value: hex,
        preview_url: publicUrl
    });

    if (dbError) alert('Errore salvataggio: ' + dbError.message);
    else {
        hideAddColorForm();
        loadColors(selectedFabricId);
        document.getElementById('newColorForm').reset();
        document.getElementById('texturePreview').style.display = 'none';
        document.getElementById('uploadPlaceholder').style.display = 'block';
    }
});

// Helpers
window.previewTexture = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('texturePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

window.showAddFabricForm = () => document.getElementById('addFabricForm').style.display = 'block';
window.hideAddFabricForm = () => document.getElementById('addFabricForm').style.display = 'none';
window.showAddColorForm = () => document.getElementById('addColorForm').style.display = 'block';
window.hideAddColorForm = () => document.getElementById('addColorForm').style.display = 'none';

window.deleteColor = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo colore?')) return;
    await supabase.from('colors').delete().eq('id', id);
    loadColors(selectedFabricId);
}
