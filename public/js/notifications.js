// Notification system for better user experience
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `toast ${type} transform translate-x-full transition-transform duration-300 ease-in-out`;
        
        const iconMap = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const colorMap = {
            success: 'bg-green-50 border-green-200 text-green-800',
            error: 'bg-red-50 border-red-200 text-red-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
        };

        notification.innerHTML = `
            <div class="flex items-center p-4 rounded-lg border ${colorMap[type]} shadow-lg max-w-sm">
                <span class="text-lg mr-3">${iconMap[type]}</span>
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button onclick="notificationSystem.remove(this.closest('.toast'))" class="ml-3 text-gray-400 hover:text-gray-600">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        return notification;
    }

    remove(notification) {
        notification.classList.remove('show');
        notification.classList.add('translate-x-full');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }
}

// Initialize notification system
const notificationSystem = new NotificationSystem();

// Loading overlay system
class LoadingSystem {
    constructor() {
        this.overlay = this.createOverlay();
        document.body.appendChild(this.overlay);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
                <div class="loading-spinner"></div>
                <span class="text-gray-700 dark:text-gray-300">Carregando...</span>
            </div>
        `;
        return overlay;
    }

    show(message = 'Carregando...') {
        const textElement = this.overlay.querySelector('span');
        textElement.textContent = message;
        this.overlay.classList.remove('hidden');
    }

    hide() {
        this.overlay.classList.add('hidden');
    }
}

// Initialize loading system
const loadingSystem = new LoadingSystem();

// Enhanced form submission with loading and notifications
function enhanceForm(formId, options = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const action = form.action;
        const method = form.method || 'POST';

        // Show loading
        loadingSystem.show(options.loadingMessage || 'Enviando...');

        fetch(action, {
            method: method,
            body: formData
        })
        .then(response => {
            loadingSystem.hide();
            
            if (response.ok) {
                notificationSystem.success(options.successMessage || 'Operação realizada com sucesso!');
                if (options.onSuccess) {
                    options.onSuccess(response);
                }
            } else {
                notificationSystem.error(options.errorMessage || 'Erro ao processar solicitação.');
            }
        })
        .catch(error => {
            loadingSystem.hide();
            notificationSystem.error('Erro de conexão. Verifique sua internet.');
            console.error('Error:', error);
        });
    });
}

// Auto-enhance forms when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Enhance forgot password form
    enhanceForm('forgotPasswordForm', {
        loadingMessage: 'Enviando email...',
        successMessage: 'Se o email estiver cadastrado, você receberá as instruções.',
        errorMessage: 'Erro ao enviar email. Tente novamente.'
    });

    // Enhance reset password form
    enhanceForm('resetPasswordForm', {
        loadingMessage: 'Redefinindo senha...',
        successMessage: 'Senha redefinida com sucesso!',
        errorMessage: 'Erro ao redefinir senha.'
    });

    // Enhance login form
    enhanceForm('loginForm', {
        loadingMessage: 'Fazendo login...',
        successMessage: 'Login realizado com sucesso!',
        errorMessage: 'Credenciais inválidas.'
    });

    // Add floating back to top button
    const backToTop = document.createElement('button');
    backToTop.className = 'fab bg-gray-600 hover:bg-gray-700 text-white';
    backToTop.innerHTML = '↑';
    backToTop.style.display = 'none';
    backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(backToTop);

    // Show/hide back to top button
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'flex';
        } else {
            backToTop.style.display = 'none';
        }
    });

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('[id$="Alert"]');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 500);
            }
        }, 5000);
    });
});

// Utility functions
const utils = {
    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR');
    },

    // Copy to clipboard
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            notificationSystem.success('Copiado para a área de transferência!');
        }).catch(() => {
            notificationSystem.error('Erro ao copiar texto.');
        });
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Generate random ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// Export for global use
window.notificationSystem = notificationSystem;
window.loadingSystem = loadingSystem;
window.utils = utils;
