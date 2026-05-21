// Utilitaires GMAO - v2.1.0

// ============================================
// FORMATAGE DE DATES
// ============================================

/**
 * Formater une date (JJ/MM/AAAA)
 * @param {string|Date} date - Date à formater
 * @returns {string} Date formatée
 */
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

/**
 * Formater une date et heure (JJ/MM/AAAA HH:MM)
 * @param {string|Date} date - Date à formater
 * @returns {string} Date et heure formatées
 */
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

/**
 * Formater une heure seulement (HH:MM)
 * @param {string|Date} date - Date à formater
 * @returns {string} Heure formatée
 */
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

/**
 * Temps écoulé depuis une date
 * @param {string|Date} date - Date de référence
 * @returns {string} Temps écoulé (ex: "il y a 5 min")
 */
function timeAgo(date) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
        
        if (seconds < 10) return 'à l\'instant';
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

/**
 * Calculer la durée entre deux dates
 * @param {string|Date} start - Date de début
 * @param {string|Date} end - Date de fin
 * @returns {string} Durée formatée (ex: "2h 30min")
 */
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

/**
 * Formater un prix en FCFA
 * @param {number} price - Prix à formater
 * @returns {string} Prix formaté
 */
function formatPrice(price) {
    if (price === null || price === undefined) return '0 FCFA';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '0 FCFA';
    return num.toLocaleString('fr-FR') + ' FCFA';
}

/**
 * Formater un nombre avec séparateur de milliers
 * @param {number} number - Nombre à formater
 * @returns {string} Nombre formaté
 */
function formatNumber(number) {
    if (number === null || number === undefined) return '0';
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
}

/**
 * Formater un pourcentage
 * @param {number} value - Valeur (0-1 ou 0-100)
 * @param {boolean} isDecimal - Si la valeur est en décimal (0-1)
 * @returns {string} Pourcentage formaté
 */
function formatPercent(value, isDecimal = false) {
    if (value === null || value === undefined) return '0%';
    let percent = isDecimal ? value * 100 : value;
    if (isNaN(percent)) return '0%';
    return Math.round(percent) + '%';
}

// ============================================
// BADGES ET STATUTS
// ============================================

/**
 * Obtenir le badge de statut d'équipement
 * @param {string} statut - Statut de l'équipement
 * @returns {string} HTML du badge
 */
function getStatusBadge(statut) {
    const statusMap = {
        'FONCTIONNEL': '<span class="badge badge-success">✅ Fonctionnel</span>',
        'EN_PANNE': '<span class="badge badge-danger">❌ En panne</span>',
        'EN_MAINTENANCE': '<span class="badge badge-warning">🔧 En maintenance</span>',
        'HORS_SERVICE': '<span class="badge badge-dark">⚠️ Hors service</span>',
        'OPERATIONNEL': '<span class="badge badge-success">✅ Opérationnel</span>'
    };
    return statusMap[statut] || `<span class="badge">${statut}</span>`;
}

/**
 * Obtenir le badge de priorité
 * @param {string} priorite - Niveau de priorité
 * @returns {string} HTML du badge
 */
function getPriorityBadge(priorite) {
    const priorityMap = {
        'CRITIQUE': '<span class="badge badge-danger">🔴 Critique</span>',
        'HAUTE': '<span class="badge badge-warning">🟠 Haute</span>',
        'MOYENNE': '<span class="badge badge-info">🟡 Moyenne</span>',
        'BASSE': '<span class="badge badge-success">🟢 Basse</span>',
        'NORMALE': '<span class="badge badge-info">🔵 Normale</span>'
    };
    return priorityMap[priorite] || `<span class="badge">${priorite}</span>`;
}

/**
 * Obtenir le texte du statut d'équipement
 * @param {string} statut - Statut de l'équipement
 * @returns {string} Texte du statut
 */
function getStatusText(statut) {
    const statusMap = {
        'FONCTIONNEL': 'Fonctionnel',
        'EN_PANNE': 'En panne',
        'EN_MAINTENANCE': 'En maintenance',
        'HORS_SERVICE': 'Hors service'
    };
    return statusMap[statut] || statut;
}

/**
 * Obtenir la classe CSS pour le statut
 * @param {string} statut - Statut de l'équipement
 * @returns {string} Classe CSS
 */
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
# NOTIFICATIONS
============================================

/**
 * Afficher une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification (success, error, warning, info)
 * @param {number} duration - Durée d'affichage en ms
 */
function showToast(message, type = 'success', duration = 3000) {
    // Supprimer les toasts existants
    const existingToasts = document.querySelectorAll('.gmao-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `gmao-toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
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
            <span>${icons[type] || 'ℹ️'}</span>
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

/**
 * Afficher une boîte de dialogue de confirmation
 * @param {string} message - Message de confirmation
 * @param {Function} callback - Fonction à exécuter si confirmé
 * @param {string} title - Titre de la confirmation
 */
function confirmAction(message, callback, title = 'Confirmation') {
    if (confirm(`${title}\n\n${message}`)) {
        if (callback && typeof callback === 'function') {
            callback();
        }
        return true;
    }
    return false;
}

/**
 * Afficher une boîte de dialogue personnalisée
 * @param {object} options - Options de la boîte de dialogue
 */
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
# CHARGEMENT DE DONNÉES
============================================

/**
 * Charger les options d'un select via API
 * @param {string} selectId - ID du select
 * @param {string} url - URL de l'API
 * @param {string} valueField - Champ pour la valeur
 * @param {string} textField - Champ pour le texte
 * @param {string} placeholder - Texte par défaut
 */
async function loadSelectOptions(selectId, url, valueField, textField, placeholder = 'Sélectionner') {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select #${selectId} non trouvé`);
        return;
    }
    
    select.innerHTML = `<option value="">📋 ${placeholder}</option>`;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Token non trouvé');
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
        select.innerHTML = `<option value="">❌ Erreur de chargement</option>`;
    }
}

/**
 * Charger les données d'un tableau via API
 * @param {string} url - URL de l'API
 * @param {Function} renderRow - Fonction pour rendre une ligne
 * @param {string} containerId - ID du conteneur
 */
async function loadTableData(url, renderRow, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement...</div>';
    
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Non authentifié');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.data || data.items || []);
        
        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Aucune donnée disponible</div>';
            return;
        }
        
        container.innerHTML = items.map(renderRow).join('');
    } catch (error) {
        console.error('Erreur chargement:', error);
        container.innerHTML = '<div class="empty-state">❌ Erreur de chargement</div>';
    }
}

// ============================================
# VALIDATION
============================================

/**
 * Valider une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} true si valide
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valider un numéro de téléphone (Bénin)
 * @param {string} phone - Téléphone à valider
 * @returns {boolean} true si valide
 */
function isValidPhone(phone) {
    const regex = /^(\+229|0)[0-9]{8,9}$/;
    return regex.test(phone);
}

/**
 * Tronquer un texte
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte tronqué
 */
function truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Échapper les caractères HTML
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
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
# GÉNÉRATION DE CODES
============================================

/**
 * Générer un code aléatoire
 * @param {number} length - Longueur du code
 * @returns {string} Code généré
 */
function generateCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Générer un matricule
 * @param {string} prefix - Préfixe (ex: 'HZSI')
 * @returns {string} Matricule généré
 */
function generateMatricule(prefix = 'HZSI') {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}-${random}`;
}

// ============================================
# EXPORTATION
============================================

// Export pour ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Dates
        formatDate,
        formatDateTime,
        formatTime,
        timeAgo,
        formatDuration,
        // Nombres
        formatPrice,
        formatNumber,
        formatPercent,
        // Badges
        getStatusBadge,
        getPriorityBadge,
        getStatusText,
        getStatusClass,
        // Notifications
        showToast,
        confirmAction,
        showDialog,
        // Chargement
        loadSelectOptions,
        loadTableData,
        // Validation
        isValidEmail,
        isValidPhone,
        truncate,
        escapeHtml,
        // Génération
        generateCode,
        generateMatricule
    };
}

// Export global
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
