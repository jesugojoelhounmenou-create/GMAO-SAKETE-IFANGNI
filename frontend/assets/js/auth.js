// Gestion de l'authentification

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
}

function isAuthenticated() {
    const token = localStorage.getItem('token');
    return token !== null;
}

function getUserRole() {
    return localStorage.getItem('userRole');
}

function getUserName() {
    return localStorage.getItem('userName');
}

function checkAccess(allowedRoles) {
    const role = getUserRole();
    if (!role || (allowedRoles && !allowedRoles.includes(role))) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Redirection après connexion
function redirectAfterLogin(role) {
    if (role === 'TECHNICIEN') {
        window.location.href = '/technicien/dashboard.html';
    } else {
        window.location.href = '/soignant/dashboard.html';
    }
}

export { logout, isAuthenticated, getUserRole, getUserName, checkAccess, redirectAfterLogin };