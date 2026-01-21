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

// Add Fabric
document.getElementById('newFabricForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fabricName').value;
    const description = document.getElementById('fabricDesc').value;

    const { error } = await supabase.from('fabrics').insert({ name, description });

    if (error) alert('Errore creazione tessuto');
    else {
        hideAddFabricForm();
        loadFabrics();
        document.getElementById('newFabricForm').reset();
    }
});

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
        .from('fabric-textures')
        .upload(fileName, file);

    if (uploadError) {
        alert('Errore upload immagine: ' + uploadError.message);
        return;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('fabric-textures')
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
