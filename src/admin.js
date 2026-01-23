// FabricAI Admin - Gallery Management
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentFolderId = 'all';
let folders = [];
let images = [];

// DOM Elements
const els = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    const session = await getSession();
    if (!session?.user) {
        window.location.href = '/login.html';
        return;
    }

    // Admin check
    const ADMIN_EMAILS = ['paolo@polarisdigital.it', 'admin@polarisdigital.it'];
    if (!ADMIN_EMAILS.includes(session.user.email)) {
        alert('Accesso non autorizzato');
        window.location.href = '/';
        return;
    }

    // Initialize DOM elements
    els.foldersList = document.getElementById('foldersList');
    els.imagesGrid = document.getElementById('imagesGrid');
    els.emptyGallery = document.getElementById('emptyGallery');
    els.currentFolderName = document.getElementById('currentFolderName');
    els.totalCount = document.getElementById('totalCount');
    els.addFolderBtn = document.getElementById('addFolderBtn');
    els.createFolderForm = document.getElementById('createFolderForm');
    els.newFolderInput = document.getElementById('newFolderInput');
    els.confirmNewFolder = document.getElementById('confirmNewFolder');
    els.cancelNewFolder = document.getElementById('cancelNewFolder');
    els.deleteFolderBtn = document.getElementById('deleteFolderBtn');
    els.lightbox = document.getElementById('lightbox');
    els.lightboxImg = document.getElementById('lightboxImg');
    els.closeLightbox = document.querySelector('.close-lightbox');

    // Setup event listeners
    setupEventListeners();

    // Load data
    await loadFolders();
    await loadImages();
});

function setupEventListeners() {
    // Add folder button
    els.addFolderBtn.addEventListener('click', () => {
        els.createFolderForm.classList.add('active');
        els.newFolderInput.focus();
    });

    // Confirm new folder
    els.confirmNewFolder.addEventListener('click', createFolder);
    els.newFolderInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    // Cancel new folder
    els.cancelNewFolder.addEventListener('click', () => {
        els.createFolderForm.classList.remove('active');
        els.newFolderInput.value = '';
    });

    // Delete folder
    els.deleteFolderBtn.addEventListener('click', deleteCurrentFolder);

    // Lightbox
    els.closeLightbox.addEventListener('click', () => {
        els.lightbox.classList.remove('active');
    });

    // "All images" folder click
    document.querySelector('[data-folder-id="all"]').addEventListener('click', () => {
        selectFolder('all');
    });
}

// Load folders from database
async function loadFolders() {
    try {
        const { data, error } = await supabase
            .from('folders')
            .select('*, saved_images(count)')
            .order('name');

        if (error) throw error;

        folders = data || [];
        renderFolders();
    } catch (err) {
        console.error('Error loading folders:', err);
    }
}

// Render folders list
function renderFolders() {
    els.foldersList.innerHTML = folders.map(folder => {
        const count = folder.saved_images?.[0]?.count || 0;
        return `
            <div class="folder-item ${currentFolderId === folder.id ? 'active' : ''}" 
                 data-folder-id="${folder.id}">
                <span class="folder-icon">📁</span>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-count">${count}</span>
            </div>
        `;
    }).join('');

    // Add click listeners
    document.querySelectorAll('.folder-item[data-folder-id]').forEach(item => {
        if (item.dataset.folderId !== 'all') {
            item.addEventListener('click', () => {
                selectFolder(item.dataset.folderId);
            });
        }
    });
}

// Select folder
async function selectFolder(folderId) {
    currentFolderId = folderId;

    // Update UI
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.toggle('active', item.dataset.folderId === folderId);
    });

    // Update header
    if (folderId === 'all') {
        els.currentFolderName.textContent = 'Tutte le immagini';
        els.deleteFolderBtn.style.display = 'none';
    } else {
        const folder = folders.find(f => f.id === folderId);
        els.currentFolderName.textContent = folder?.name || 'Cartella';
        els.deleteFolderBtn.style.display = 'flex';
    }

    await loadImages();
}

// Load images
async function loadImages() {
    try {
        let query = supabase
            .from('saved_images')
            .select('*')
            .order('created_at', { ascending: false });

        if (currentFolderId !== 'all') {
            query = query.eq('folder_id', currentFolderId);
        }

        const { data, error } = await query;

        if (error) throw error;

        images = data || [];
        renderImages();

        // Update total count
        const { count } = await supabase
            .from('saved_images')
            .select('*', { count: 'exact', head: true });
        els.totalCount.textContent = count || 0;

    } catch (err) {
        console.error('Error loading images:', err);
    }
}

// Render images grid
function renderImages() {
    if (images.length === 0) {
        els.imagesGrid.innerHTML = '';
        els.emptyGallery.style.display = 'block';
        return;
    }

    els.emptyGallery.style.display = 'none';
    els.imagesGrid.innerHTML = images.map(img => {
        const date = new Date(img.created_at).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return `
            <div class="image-card" data-image-id="${img.id}">
                <img src="${img.image_url}" alt="${img.name}" onclick="openLightbox('${img.image_url}')">
                <div class="image-card-info">
                    <div class="image-card-name">${img.name}</div>
                    <div class="image-card-date">${date}</div>
                    <div class="image-card-actions">
                        <button class="btn-icon" onclick="downloadImage('${img.image_url}', '${img.name}')" title="Download">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="deleteImage('${img.id}')" title="Elimina">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Create new folder
async function createFolder() {
    const name = els.newFolderInput.value.trim();
    if (!name) return;

    try {
        const session = await getSession();
        const { error } = await supabase
            .from('folders')
            .insert({ name, created_by: session.user.email });

        if (error) throw error;

        els.newFolderInput.value = '';
        els.createFolderForm.classList.remove('active');
        await loadFolders();
    } catch (err) {
        console.error('Error creating folder:', err);
        alert('Errore nella creazione della cartella');
    }
}

// Delete current folder
async function deleteCurrentFolder() {
    if (currentFolderId === 'all') return;

    const folder = folders.find(f => f.id === currentFolderId);
    if (!confirm(`Eliminare la cartella "${folder?.name}" e tutte le sue immagini?`)) return;

    try {
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', currentFolderId);

        if (error) throw error;

        currentFolderId = 'all';
        await loadFolders();
        await loadImages();
        selectFolder('all');
    } catch (err) {
        console.error('Error deleting folder:', err);
        alert('Errore nell\'eliminazione della cartella');
    }
}

// Global functions for inline onclick handlers
window.openLightbox = (imageUrl) => {
    els.lightboxImg.src = imageUrl;
    els.lightbox.classList.add('active');
};

window.downloadImage = async (imageUrl, imageName) => {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${imageName}.jpg`;
        link.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error downloading:', err);
    }
};

window.deleteImage = async (imageId) => {
    if (!confirm('Eliminare questa immagine?')) return;

    try {
        const { error } = await supabase
            .from('saved_images')
            .delete()
            .eq('id', imageId);

        if (error) throw error;

        await loadImages();
        await loadFolders(); // Update counts
    } catch (err) {
        console.error('Error deleting image:', err);
        alert('Errore nell\'eliminazione dell\'immagine');
    }
};
