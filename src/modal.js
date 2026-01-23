// ============================================
// FabricAI Custom Modal System
// Replaces native browser confirm/alert with glass-style modals
// ============================================

// Create modal container on DOM ready
let modalContainer = null;

function ensureModalContainer() {
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'customModalContainer';
        document.body.appendChild(modalContainer);
    }
    return modalContainer;
}

/**
 * Show a custom alert modal (replaces window.alert)
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @returns {Promise<void>}
 */
export function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const container = ensureModalContainer();

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal-glass">
                <div class="custom-modal-body">
                    <div class="custom-modal-icon">${icons[type] || icons.info}</div>
                    <p class="custom-modal-message">${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="btn-primary custom-modal-ok">OK</button>
                </div>
            </div>
        `;

        container.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        const close = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                resolve();
            }, 200);
        };

        modal.querySelector('.custom-modal-ok').addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        // Focus button for keyboard accessibility
        modal.querySelector('.custom-modal-ok').focus();
    });
}

/**
 * Show a custom confirm modal (replaces window.confirm)
 * @param {string} message - Message to display
 * @param {object} options - { confirmText, cancelText, danger }
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, options = {}) {
    const {
        confirmText = 'Conferma',
        cancelText = 'Annulla',
        danger = false,
        title = null
    } = options;

    return new Promise((resolve) => {
        const container = ensureModalContainer();

        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal-glass">
                ${title ? `<div class="custom-modal-header"><h3>${title}</h3></div>` : ''}
                <div class="custom-modal-body">
                    <p class="custom-modal-message">${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button class="btn-secondary custom-modal-cancel">${cancelText}</button>
                    <button class="btn-primary ${danger ? 'btn-danger' : ''} custom-modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;

        container.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        const close = (result) => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 200);
        };

        modal.querySelector('.custom-modal-confirm').addEventListener('click', () => close(true));
        modal.querySelector('.custom-modal-cancel').addEventListener('click', () => close(false));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close(false);
        });

        // Keyboard support
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close(false);
            if (e.key === 'Enter') close(true);
        });

        modal.querySelector('.custom-modal-confirm').focus();
    });
}

/**
 * Show a custom prompt modal (replaces window.prompt)
 * @param {string} message - Message to display
 * @param {object} options - { defaultValue, placeholder, confirmText, cancelText, inputType }
 * @returns {Promise<string|null>}
 */
export function showPrompt(message, options = {}) {
    const {
        defaultValue = '',
        placeholder = '',
        confirmText = 'Conferma',
        cancelText = 'Annulla',
        inputType = 'text',
        title = null,
        minLength = 0
    } = options;

    return new Promise((resolve) => {
        const container = ensureModalContainer();

        const modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal-glass">
                ${title ? `<div class="custom-modal-header"><h3>${title}</h3></div>` : ''}
                <div class="custom-modal-body">
                    <p class="custom-modal-message">${message}</p>
                    <input type="${inputType}" class="custom-modal-input" value="${defaultValue}" placeholder="${placeholder}">
                    ${minLength > 0 ? `<p class="custom-modal-hint">Minimo ${minLength} caratteri</p>` : ''}
                </div>
                <div class="custom-modal-footer">
                    <button class="btn-secondary custom-modal-cancel">${cancelText}</button>
                    <button class="btn-primary custom-modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;

        container.appendChild(modal);

        const input = modal.querySelector('.custom-modal-input');
        const confirmBtn = modal.querySelector('.custom-modal-confirm');

        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('active');
            input.focus();
            input.select();
        });

        const close = (result) => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 200);
        };

        const submit = () => {
            const value = input.value.trim();
            if (minLength > 0 && value.length < minLength) {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 300);
                return;
            }
            close(value || null);
        };

        confirmBtn.addEventListener('click', submit);
        modal.querySelector('.custom-modal-cancel').addEventListener('click', () => close(null));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close(null);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') close(null);
        });
    });
}
