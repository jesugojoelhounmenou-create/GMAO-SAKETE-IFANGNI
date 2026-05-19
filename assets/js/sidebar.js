// sidebar.js - Charge la sidebar sur toutes les pages
function loadSidebar() {
    fetch('/components/sidebar.html')
        .then(response => response.text())
        .then(data => {
            // Créer un conteneur pour la sidebar
            let sidebarContainer = document.getElementById('sidebar-container');
            if (!sidebarContainer) {
                sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'sidebar-container';
                document.body.insertBefore(sidebarContainer, document.body.firstChild);
            }
            sidebarContainer.innerHTML = data;
        });
}

// Exécuter au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
} else {
    loadSidebar();
}