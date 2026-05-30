// Utilitaires GMAO - v2.1.0

// ============================================
// FORMATAGE DE DATES
// ============================================

function formatDate(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
}

function formatDateTime(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
}

function formatTime(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
}

function timeAgo(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
        
        if (seconds < 10) return 'a l\'instant';
        if (seconds < 60) return `il y a ${seconds} sec`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `il y a ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `il y a ${hours} h`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `il y a ${days} j`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `il y a ${weeks} sem`;
        
        return formatDate(date);
    } catch {
        return '-';
    }
}

function formatDuration(start, end) {
    if (!start || !end) return '-';
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-';
        
        const diffMinutes = Math.floor((endDate - startDate) / 60000);
        
        if (diffMinutes < 0) return '-';
        
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        if (hours === 0) return `${minutes} min`;
        if (minutes === 0) return `${hours} h`;
        return `${hours} h ${minutes} min`;
    } catch {
        return '-';
    }
}

// ============================================
// FORMATAGE DE NOMBRES
// ============================================

function formatPrice(price) {
    if (price === null || price === undefined) return '0 FCFA';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '0 FCFA';
    return num.toLocaleString('fr-FR') + ' FCFA';
}

function formatNumber(number) {
    if (number === null || number === undefined) return '0';
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
}

function formatPercent(value, isDecimal = false) {
    if (value === null || value === undefined) return '0%';
    let percent = isDecimal ? value * 100 : value;
    if (isNaN(percent)) return '0%';
    return Math.round(percent) + '%';
}

// ============================================
// BADGES ET STATUTS
// ============================================

function getStatusBadge(statut) {
    const statusMap = {
        'FONCTIONNEL': '<span class="badge badge-success">Fonctionnel</span>',
        'EN_PANNE': '<span class="badge badge-danger">En panne</span>',
        'EN_MAINTENANCE': '<span class="badge badge-warning">En maintenance</span>',
        'HORS_SERVICE': '<span class="badge badge-dark">Hors service</span>',
        'OPERATIONNEL': '<span class="badge badge-success">Operationnel</span>'
    };
    return statusMap[statut] || `<span class="badge">${statut}</span>`;
}

function getPriorityBadge(priorite) {
    const priorityMap = {
        'CRITIQUE': '<span class="badge badge-danger">Critique</span>',
        'HAUTE': '<span class="badge badge-warning">Haute</span>',
        'MOYENNE': '<span class="badge badge-info">Moyenne</span>',
        'BASSE': '<span class="badge badge-success">Basse</span>',
        'NORMALE': '<span class="badge badge-info">Normale</span>'
    };
    return priorityMap[priorite] || `<span class="badge">${priorite}</span>`;
}

function getStatusText(statut) {
    const statusMap = {
        'FONCTIONNEL': 'Fonctionnel',
        'EN_PANNE': 'En panne',
        'EN_MAINTENANCE': 'En maintenance',
        'HORS_SERVICE': 'Hors service'
    };
    return statusMap[statut] || statut;
}

function getStatusClass(statut) {
    const statusMap = {
        'FONCTIONNEL': 'success',
        'EN_PANNE': 'danger',
        'EN_MAINTENANCE': 'warning',
        'HORS_SERVICE': 'dark'
    };
    return statusMap[statut] || 'secondary';
}

// ============================================
// NOTIFICATIONS
// ============================================

function showToast(message, type = 'success', duration = 3000) {
    const existingToasts = document.querySelectorAll('.gmao-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `gmao-toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✗';
    else if (type === 'warning') icon = '⚠';
    else icon = 'ℹ';
    
    toast.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUpFade 0.3s ease;
        ">
            <span>${icon}</span>
            <span>${message}</span>
        </div>
        <style>
            @keyframes slideUpFade {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        </style>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function confirmAction(message, callback, title = 'Confirmation') {
    if (confirm(`${title}\n\n${message}`)) {
        if (callback && typeof callback === 'function') {
            callback();
        }
        return true;
    }
    return false;
}

function showDialog(options) {
    const {
        title = 'Information',
        message = '',
        confirmText = 'OK',
        cancelText = 'Annuler',
        showCancel = false,
        onConfirm = null,
        onCancel = null
    } = options;
    
    if (showCancel) {
        return confirmAction(message, onConfirm, title);
    } else {
        alert(message);
        if (onConfirm) onConfirm();
    }
}

// ============================================
// CHARGEMENT DE DONNEES
// ============================================

async function loadSelectOptions(selectId, url, valueField, textField, placeholder = 'Selectionner') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select ${selectId} non trouve`);
        return;
    }
    
    select.innerHTML = `<option value="">${placeholder}</option>`;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Token non trouve');
            return;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.data || data.items || []);
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement select:', error);
        select.innerHTML = `<option value="">Erreur de chargement</option>`;
    }
}

async function loadTableData(url, renderRow, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement...</div>';
    
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Non authentifie');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.data || data.items || []);
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune donnee disponible</div>';
            return;
        }
        
        container.innerHTML = items.map(renderRow).join('');
    } catch (error) {
        console.error('Erreur chargement:', error);
        container.innerHTML = '<div class="empty-state">Erreur de chargement</div>';
    }
}

// ============================================
// VALIDATION
// ============================================

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidPhone(phone) {
    const regex = /^(\+229|0)[0-9]{8,9}$/;
    return regex.test(phone);
}

function truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// GENERATION DE CODES
// ============================================

function generateCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateMatricule(prefix = 'HZSI') {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}-${random}`;
}

// ============================================
// EXPORTATION
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        formatDateTime,
        formatTime,
        timeAgo,
        formatDuration,
        formatPrice,
        formatNumber,
        formatPercent,
        getStatusBadge,
        getPriorityBadge,
        getStatusText,
        getStatusClass,
        showToast,
        confirmAction,
        showDialog,
        loadSelectOptions,
        loadTableData,
        isValidEmail,
        isValidPhone,
        truncate,
        escapeHtml,
        generateCode,
        generateMatricule
    };
}

if (typeof window !== 'undefined') {
    window.Utils = {
        formatDate,
        formatDateTime,
        formatTime,
        timeAgo,
        formatDuration,
        formatPrice,
        formatNumber,
        formatPercent,
        getStatusBadge,
        getPriorityBadge,
        getStatusText,
        getStatusClass,
        showToast,
        confirmAction,
        showDialog,
        loadSelectOptions,
        loadTableData,
        isValidEmail,
        isValidPhone,
        truncate,
        escapeHtml,
        generateCode,
        generateMatricule
    };
}
