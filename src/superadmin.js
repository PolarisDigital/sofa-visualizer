// Super Admin Dashboard - Usage Tracking
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getSession, signOut } from './supabase.js';
import { showAlert } from './modal.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin emails that can access this page
const ADMIN_EMAILS = ['paolo@polarisdigital.it', 'admin@polarisdigital.it'];

// API base URL
const API_BASE = import.meta.env.PROD
    ? 'https://sofa-visualizer-production.up.railway.app'
    : 'http://localhost:3001';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    const session = await getSession();
    if (!session?.user) {
        window.location.href = '/login.html';
        return;
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(session.user.email)) {
        window.location.href = '/admin.html';
        return;
    }

    // Load data
    await loadStats();

    // Setup event listeners
    document.getElementById('saveLimitsBtn').addEventListener('click', saveLimits);
});

// Load statistics from API
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/usage/stats`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        const stats = data.stats;

        // Update stat cards
        document.getElementById('statToday').textContent = stats.today;
        document.getElementById('statWeek').textContent = stats.thisWeek;
        document.getElementById('statMonth').textContent = stats.thisMonth;
        document.getElementById('statTotal').textContent = stats.total;

        // Update costs
        document.getElementById('costToday').textContent = `$${stats.costToday.toFixed(3)}`;
        document.getElementById('costWeek').textContent = `$${stats.costThisWeek.toFixed(3)}`;
        document.getElementById('costMonth').textContent = `$${stats.costThisMonth.toFixed(3)}`;

        // Update limit inputs
        document.getElementById('dailyLimitInput').value = stats.dailyLimit || '';
        document.getElementById('weeklyLimitInput').value = stats.weeklyLimit || '';
        document.getElementById('costPerImageInput').value = stats.costPerImage || 0.003;

        // Update limit status indicators
        updateLimitStatus('daily', stats.today, stats.dailyLimit);
        updateLimitStatus('weekly', stats.thisWeek, stats.weeklyLimit);

        // Render chart
        renderChart(stats.usageByDate);

        // Show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('loadingState').innerHTML =
            `<span style="color: #ef4444;">Errore: ${error.message}</span>`;
    }
}

// Update limit status indicator
function updateLimitStatus(type, current, limit) {
    const statusEl = document.getElementById(`${type}Status`);
    const progressEl = document.getElementById(`${type}Progress`);

    if (!limit) {
        progressEl.textContent = 'Nessun limite';
        statusEl.classList.remove('warning', 'danger');
        return;
    }

    const percentage = (current / limit) * 100;
    progressEl.textContent = `${current} / ${limit}`;

    statusEl.classList.remove('warning', 'danger');
    if (percentage >= 100) {
        statusEl.classList.add('danger');
    } else if (percentage >= 80) {
        statusEl.classList.add('warning');
    }
}

// Render usage chart
function renderChart(usageByDate) {
    const container = document.getElementById('usageChart');

    if (!usageByDate || Object.keys(usageByDate).length === 0) {
        container.innerHTML = '<div class="chart-empty">Nessun dato disponibile</div>';
        return;
    }

    // Generate last 30 days
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
    }

    // Find max for scaling
    const values = days.map(d => usageByDate[d] || 0);
    const maxValue = Math.max(...values, 1);

    // Render bars
    container.innerHTML = days.map((date, index) => {
        const value = values[index];
        const height = Math.max(4, (value / maxValue) * 180);
        const dateObj = new Date(date);
        const label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}: ${value} img`;

        return `<div class="chart-bar" style="height: ${height}px" data-tooltip="${label}"></div>`;
    }).join('');
}

// Save limits
async function saveLimits() {
    const btn = document.getElementById('saveLimitsBtn');
    const originalText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = 'Salvataggio...';

        const dailyLimit = document.getElementById('dailyLimitInput').value;
        const weeklyLimit = document.getElementById('weeklyLimitInput').value;
        const costPerImage = document.getElementById('costPerImageInput').value;

        const response = await fetch(`${API_BASE}/api/admin/usage/limits`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                daily_limit: dailyLimit ? parseInt(dailyLimit) : null,
                weekly_limit: weeklyLimit ? parseInt(weeklyLimit) : null,
                cost_per_image: costPerImage ? parseFloat(costPerImage) : 0.003
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        showAlert('Limiti salvati con successo!', 'success');

        // Reload stats to reflect changes
        await loadStats();

    } catch (error) {
        console.error('Error saving limits:', error);
        showAlert('Errore nel salvataggio: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
