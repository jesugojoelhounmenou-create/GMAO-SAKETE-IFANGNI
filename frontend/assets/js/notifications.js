// Gestion des notifications push - GMAO Sakete v2.1.0

// ============================================
// CONFIGURATION
// ============================================

const API_URL = 'https://gmao-sakete-ifangni-1.onrender.com/api';

const VAPID_PUBLIC_KEY = 'BEl62iUYxuUjZJqZxjfFm-OqxW5QJ9EEr-rpz3DQv5nL0w4YwZ5yR6x7s8t9u0v1w2x3y4z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y10Z';

// ============================================
// UTILITAIRES
// ============================================

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function isNotificationSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
}

async function isServiceWorkerActive() {
    if (!('serviceWorker' in navigator)) return false;
    
    const registration = await navigator.serviceWorker.getRegistration();
    return registration && registration.active;
}

// ============================================
// PERMISSIONS
// ============================================

async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        console.warn('Notifications non supportees par ce navigateur');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        console.log('Permission deja accordee');
        await registerPushSubscription();
        return true;
    }
    
    if (Notification.permission === 'denied') {
        console.warn('Permission refusee par l\'utilisateur');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Permission accordee pour les notifications');
            await registerPushSubscription();
            return true;
        } else {
            console.log('Permission refusee');
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la demande de permission:', error);
        return false;
    }
}

// ============================================
// SUBSCRIPTION PUSH
// ============================================

async function registerPushSubscription() {
    try {
        const swReady = await isServiceWorkerActive();
        if (!swReady) {
            console.warn('Service worker non pret');
            return false;
        }
        
        const sw = await navigator.serviceWorker.ready;
        
        let subscription = await sw.pushManager.getSubscription();
        
        if (!subscription) {
            subscription = await sw.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Utilisateur non authentifie');
            return false;
        }
        
        const response = await fetch(`${API_URL}/notifications/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
                platform: getPlatform()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('Push subscription enregistree avec succes');
        return true;
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement push:', error);
        return false;
    }
}

async function unregisterPushSubscription() {
    try {
        const sw = await navigator.serviceWorker.ready;
        const subscription = await sw.pushManager.getSubscription();
        
        if (subscription) {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_URL}/notifications/unregister`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                });
            }
            
            await subscription.unsubscribe();
            console.log('Push subscription desenregistree');
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors du desenregistrement push:', error);
        return false;
    }
}

// ============================================
// AFFICHAGE DES NOTIFICATIONS
// ============================================

function showLocalNotification(title, body, options = {}) {
    if (!('Notification' in window)) {
        console.warn('Notification API non supportee');
        return null;
    }
    
    if (Notification.permission !== 'granted') {
        console.warn('Permission non accordee');
        return null;
    }
    
    const defaultOptions = {
        icon: '/assets/images/icons/icon-192.png',
        badge: '/assets/images/icons/icon-72.png',
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: false,
        tag: Date.now().toString(),
        data: { url: '/' }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: finalOptions.icon,
            badge: finalOptions.badge,
            vibrate: finalOptions.vibrate,
            silent: finalOptions.silent,
            requireInteraction: finalOptions.requireInteraction,
            tag: finalOptions.tag,
            data: finalOptions.data
        });
        
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            
            const url = finalOptions.data?.url || '/';
            window.location.href = url;
            notification.close();
        };
        
        setTimeout(() => {
            if (notification) notification.close();
        }, 10000);
        
        return notification;
    } catch (error) {
        console.error('Erreur lors de l\'affichage de la notification:', error);
        return null;
    }
}

// ============================================
// TYPES DE NOTIFICATIONS
// ============================================

const NOTIFICATION_TYPES = {
    NOUVELLE_PANNE: {
        title: 'Nouvelle panne signalee',
        icon: '/assets/images/icons/alert.png',
        level: 'high',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
    },
    INTERVENTION_TERMINEE: {
        title: 'Panne resolue',
        icon: '/assets/images/icons/success.png',
        level: 'normal',
        requireInteraction: false
    },
    MAINTENANCE_PREVENTIVE: {
        title: 'Maintenance preventive',
        icon: '/assets/images/icons/calendar.png',
        level: 'normal',
        requireInteraction: false
    },
    STOCK_FAIBLE: {
        title: 'Stock faible',
        icon: '/assets/images/icons/stock.png',
        level: 'medium',
        requireInteraction: true
    },
    ALERTE_CRITIQUE: {
        title: 'Alerte critique',
        icon: '/assets/images/icons/critical.png',
        level: 'urgent',
        requireInteraction: true,
        vibrate: [300, 150, 300, 150, 300]
    },
    EQUIPEMENT_ECHEC: {
        title: 'Equipement hors service',
        icon: '/assets/images/icons/error.png',
        level: 'high',
        requireInteraction: true
    },
    RAPPORT_MENSUEL: {
        title: 'Rapport mensuel disponible',
        icon: '/assets/images/icons/report.png',
        level: 'normal',
        requireInteraction: false
    },
    UTILISATEUR_VALIDE: {
        title: 'Compte valide',
        icon: '/assets/images/icons/success.png',
        level: 'normal',
        requireInteraction: false
    }
};

function sendNotificationByType(type, data = {}) {
    const config = NOTIFICATION_TYPES[type];
    if (!config) {
        console.warn(`Type de notification inconnu: ${type}`);
        return null;
    }
    
    let body = '';
    let url = '/';
    
    switch(type) {
        case 'NOUVELLE_PANNE':
            body = `${data.equipementNom || 'Un equipement'} - ${data.service || 'Service inconnu'} necessite une intervention ${data.priorite ? `(Priorite: ${data.priorite})` : ''}`;
            url = `/technicien/maintenances.html${data.interventionId ? `?id=${data.interventionId}` : ''}`;
            break;
            
        case 'INTERVENTION_TERMINEE':
            body = `L'intervention sur ${data.equipementNom || "l'equipement"} est terminee et ${data.satisfaction ? `notee ${data.satisfaction}/5` : 'validee'}`;
            url = `/soignant/historique.html`;
            break;
            
        case 'MAINTENANCE_PREVENTIVE':
            body = `${data.equipementNom || 'Un equipement'} - Maintenance ${data.type || 'preventive'} a realiser pour le ${new Date(data.date).toLocaleDateString() || 'prochainement'}`;
            url = `/technicien/preventive.html?id=${data.maintenanceId || ''}`;
            break;
            
        case 'STOCK_FAIBLE':
            body = `La piece ${data.pieceDesignation || 'reference inconnue'} n'a plus que ${data.quantite || 0} unite(s) en stock (seuil: ${data.seuil || 5})`;
            url = `/technicien/stock.html`;
            break;
            
        case 'ALERTE_CRITIQUE':
            body = data.message || 'Une alerte critique necessite votre attention immediate';
            url = `/technicien/alertes.html`;
            break;
            
        case 'EQUIPEMENT_ECHEC':
            body = `${data.equipementNom || 'Un equipement'} est hors service. Intervention requise en urgence.`;
            url = `/technicien/maintenances.html`;
            break;
            
        case 'RAPPORT_MENSUEL':
            body = `Le rapport ${data.mois || 'mensuel'} est disponible. Taux de disponibilite: ${data.disponibilite || 0}%`;
            url = `/technicien/codir-rapports.html`;
            break;
            
        case 'UTILISATEUR_VALIDE':
            body = `Votre compte a ete valide. Vous pouvez maintenant vous connecter.`;
            url = `/login.html`;
            break;
            
        default:
            body = data.message || 'Nouvelle notification GMAO';
    }
    
    return showLocalNotification(config.title, body, {
        icon: config.icon,
        vibrate: config.vibrate,
        requireInteraction: config.requireInteraction,
        data: { url: url, type: type, level: config.level }
    });
}

// ============================================
// SERVICE WORKER COMMUNICATION
// ============================================

function listenToServiceWorkerMessages() {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'SHOW_NOTIFICATION':
                showLocalNotification(data.title, data.body, {
                    icon: data.icon,
                    data: { url: data.url }
                });
                break;
                
            case 'NOTIFICATION_CLICK':
                console.log('Notification cliquee:', data);
                if (data.url) {
                    window.location.href = data.url;
                }
                break;
                
            default:
                console.log('Message du service worker:', data);
        }
    });
}

// ============================================
// INITIALISATION
// ============================================

function getPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
}

async function initNotifications() {
    if (!isNotificationSupported()) {
        console.warn('Notifications non supportees par ce navigateur');
        return false;
    }
    
    const swReady = await isServiceWorkerActive();
    if (!swReady) {
        console.warn('Service worker non actif, attente...');
        
        navigator.serviceWorker.ready.then(() => {
            initNotifications();
        });
        return false;
    }
    
    listenToServiceWorkerMessages();
    
    if (Notification.permission === 'default') {
        setTimeout(() => {
            requestNotificationPermission();
        }, 5000);
    } else if (Notification.permission === 'granted') {
        await registerPushSubscription();
    }
    
    return true;
}

// ============================================
// UTILITAIRES DE DEBUG
// ============================================

function testNotification() {
    if (Notification.permission !== 'granted') {
        console.warn('Permission non accordee. Appelez requestNotificationPermission() d\'abord.');
        return false;
    }
    
    showLocalNotification(
        'Test GMAO',
        'Les notifications fonctionnent correctement sur votre appareil !',
        {
            icon: '/assets/images/icons/icon-192.png',
            requireInteraction: true,
            data: { url: '/' }
        }
    );
    
    return true;
}

function testAllNotificationTypes() {
    const types = Object.keys(NOTIFICATION_TYPES);
    let index = 0;
    
    function showNext() {
        if (index >= types.length) return;
        
        const type = types[index];
        sendNotificationByType(type, {
            equipementNom: 'Test Equipement',
            service: 'Test Service',
            pieceDesignation: 'Test Piece',
            quantite: 3,
            seuil: 5
        });
        
        index++;
        setTimeout(showNext, 2000);
    }
    
    showNext();
}

// ============================================
// EXPORTATION
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isNotificationSupported,
        requestNotificationPermission,
        registerPushSubscription,
        unregisterPushSubscription,
        showLocalNotification,
        sendNotificationByType,
        initNotifications,
        testNotification,
        testAllNotificationTypes,
        NOTIFICATION_TYPES
    };
}

if (typeof window !== 'undefined') {
    window.Notifications = {
        isSupported: isNotificationSupported,
        requestPermission: requestNotificationPermission,
        register: registerPushSubscription,
        unregister: unregisterPushSubscription,
        show: showLocalNotification,
        sendByType: sendNotificationByType,
        init: initNotifications,
        test: testNotification,
        testAll: testAllNotificationTypes,
        TYPES: NOTIFICATION_TYPES
    };
}
