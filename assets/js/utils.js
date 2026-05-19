// Utilitaires GMAO

// Formater la date
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
}

function formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR');
}

// Formater le temps écoulé
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'à l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
}

// Formater le prix
function formatPrice(price) {
    if (!price) return '0 FCFA';
    return price.toLocaleString() + ' FCFA';
}

// Statut équipement
function getStatusBadge(statut) {
    const statusMap = {
        'FONCTIONNEL': '✅ Fonctionnel',
        'EN_PANNE': '❌ En panne',
        'EN_MAINTENANCE': '🔧 En maintenance',
        'HORS_SERVICE': '⚠️ Hors service'
    };
    return statusMap[statut] || statut;
}

// Priorité
function getPriorityBadge(priorite) {
    const priorityMap = {
        'CRITIQUE': '🔴 Critique',
        'HAUTE': '🟠 Haute',
        'MOYENNE': '🟡 Moyenne',
        'BASSE': '🟢 Basse'
    };
    return priorityMap[priorite] || priorite;
}

// Afficher une notification toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        padding: 12px 24px;
        border-radius: 40px;
        z-index: 2000;
        font-size: 14px;
        animation: fadeInOut 3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Confirmation
function confirmAction(message, callback) {
    if (confirm(message)) callback();
}

// Charger les options d'un select
async function loadSelectOptions(selectId, url, valueField, textField) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        select.innerHTML = '<option value="">Sélectionner</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement select:', error);
    }
}

export {
    formatDate,
    formatDateTime,
    timeAgo,
    formatPrice,
    getStatusBadge,
    getPriorityBadge,
    showToast,
    confirmAction,
    loadSelectOptions
};