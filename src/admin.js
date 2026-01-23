// FabricAI Admin - Gallery Management
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';
import { showAlert, showConfirm } from './modal.js';

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

    // Check if user is admin (for hiding admin-only features)
    const ADMIN_EMAILS = ['paolo@polarisdigital.it', 'admin@polarisdigital.it'];
    const isAdmin = ADMIN_EMAILS.includes(session.user.email);

    // Hide admin-only sections for venditori
    if (!isAdmin) {
        // Hide logo upload section
        const logoSection = document.querySelector('.setting-item:has(#logoInput)');
        if (logoSection) logoSection.style.display = 'none';

        // Hide user management link
        const usersLink = document.querySelector('a[href="/users.html"]');
        if (usersLink) usersLink.parentElement.style.display = 'none';
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
    els.editFolderBtn = document.getElementById('editFolderBtn');
    els.lightbox = document.getElementById('lightbox');
    els.lightboxImg = document.getElementById('lightboxImg');
    els.closeLightbox = document.querySelector('.close-lightbox');

    // Setup event listeners
    setupEventListeners();

    // Load data
    await loadFolders();
    await loadImages();
    await loadLogo();
});

// Logo DOM elements (added after main init)
let logoEls = {};

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

    // Edit/Rename folder
    if (els.editFolderBtn) {
        els.editFolderBtn.addEventListener('click', renameCurrentFolder);
    }

    // Lightbox
    els.closeLightbox.addEventListener('click', () => {
        els.lightbox.classList.remove('active');
    });

    // "All images" folder click
    document.querySelector('[data-folder-id="all"]').addEventListener('click', () => {
        selectFolder('all');
    });

    // Logo upload
    logoEls = {
        logoInput: document.getElementById('logoInput'),
        uploadLogoBtn: document.getElementById('uploadLogoBtn'),
        currentLogo: document.getElementById('currentLogo'),
        logoPlaceholder: document.getElementById('logoPlaceholder')
    };

    if (logoEls.uploadLogoBtn) {
        logoEls.uploadLogoBtn.addEventListener('click', () => {
            logoEls.logoInput.click();
        });
    }

    if (logoEls.logoInput) {
        logoEls.logoInput.addEventListener('change', uploadLogo);
    }
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
    const folderSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`;

    els.foldersList.innerHTML = folders.map(folder => {
        const count = folder.saved_images?.[0]?.count || 0;
        return `
            <div class="folder-item ${currentFolderId === folder.id ? 'active' : ''}" 
                 data-folder-id="${folder.id}">
                <span class="folder-icon">${folderSvg}</span>
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
        if (els.editFolderBtn) els.editFolderBtn.style.display = 'none';
    } else {
        const folder = folders.find(f => f.id === folderId);
        els.currentFolderName.textContent = folder?.name || 'Cartella';
        els.deleteFolderBtn.style.display = 'flex';
        if (els.editFolderBtn) els.editFolderBtn.style.display = 'flex';
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
        showAlert('Errore nella creazione della cartella', 'error');
    }
}

// Delete current folder
async function deleteCurrentFolder() {
    if (currentFolderId === 'all') return;

    const folder = folders.find(f => f.id === currentFolderId);
    const confirmed = await showConfirm(
        `Eliminare la cartella "${folder?.name}" e tutte le sue immagini?`,
        {
            confirmText: 'Elimina',
            cancelText: 'Annulla',
            danger: true
        }
    );
    if (!confirmed) return;

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
        showAlert('Errore nell\'eliminazione della cartella', 'error');
    }
}

// Rename current folder
async function renameCurrentFolder() {
    if (currentFolderId === 'all') return;

    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) return;

    const { showPrompt } = await import('./modal.js');
    const newName = await showPrompt(
        'Rinomina cartella',
        {
            placeholder: 'Nuovo nome...',
            defaultValue: folder.name,
            confirmText: 'Rinomina',
            cancelText: 'Annulla'
        }
    );

    if (!newName || newName.trim() === '' || newName === folder.name) return;

    try {
        const { error } = await supabase
            .from('folders')
            .update({ name: newName.trim() })
            .eq('id', currentFolderId);

        if (error) throw error;

        // Refresh
        await loadFolders();
        els.currentFolderName.textContent = newName.trim();
        showAlert('Cartella rinominata', 'success');
    } catch (err) {
        console.error('Error renaming folder:', err);
        showAlert('Errore nel rinominare la cartella', 'error');
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
    const confirmed = await showConfirm('Eliminare questa immagine?', {
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        danger: true
    });
    if (!confirmed) return;

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
        showAlert('Errore nell\'eliminazione dell\'immagine', 'error');
    }
};

// ============================================
// Logo Management Functions
// ============================================

async function loadLogo() {
    try {
        // Try to get logo from storage bucket
        const { data } = supabase.storage
            .from('generated-images')
            .getPublicUrl('company-logo.png');

        // Check if file exists by making a HEAD request
        const response = await fetch(data.publicUrl, { method: 'HEAD' });

        if (response.ok && logoEls.currentLogo) {
            logoEls.currentLogo.src = data.publicUrl + '?t=' + Date.now();
            logoEls.currentLogo.style.display = 'block';
            if (logoEls.logoPlaceholder) {
                logoEls.logoPlaceholder.style.display = 'none';
            }
        }
    } catch (err) {
        console.log('No logo found or error loading:', err);
    }
}

async function uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showAlert('Seleziona un\'immagine valida', 'error');
        return;
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
        showAlert('Il logo deve essere al massimo 2MB', 'error');
        return;
    }

    try {
        logoEls.uploadLogoBtn.textContent = 'Caricamento...';
        logoEls.uploadLogoBtn.disabled = true;

        // Upload new logo (upsert will replace if exists)
        const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload('company-logo.png', file, {
                contentType: file.type,
                upsert: true,
                cacheControl: '0' // No cache to ensure fresh logo
            });

        if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage
            .from('generated-images')
            .getPublicUrl('company-logo.png');

        // Update preview
        logoEls.currentLogo.src = data.publicUrl + '?t=' + Date.now();
        logoEls.currentLogo.style.display = 'block';
        logoEls.logoPlaceholder.style.display = 'none';

        showAlert('Logo aggiornato con successo!', 'success');

    } catch (err) {
        console.error('Error uploading logo:', err);
        showAlert('Errore nel caricamento del logo', 'error');
    } finally {
        logoEls.uploadLogoBtn.textContent = 'Carica Logo';
        logoEls.uploadLogoBtn.disabled = false;
        logoEls.logoInput.value = '';
    }
}
