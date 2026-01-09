/**
 * Main Application Module
 * Coordinates all other modules and handles page navigation
 */

class App {
    constructor() {
        this.currentPage = 'login';
        this.isInitialized = false;
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }
    
    /**
     * Handle DOM ready event
     */
    onDOMReady() {
        console.log('Smart Quiz Tool - Application Starting');
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Check authentication status
        this.checkAuthenticationStatus();
        
        // Initialize page routing
        this.initializeRouting();
        
        this.isInitialized = true;
        console.log('Smart Quiz Tool - Application Initialized');
    }
    
    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Create quiz form
        const createQuizForm = document.getElementById('create-quiz-form');
        if (createQuizForm) {
            createQuizForm.addEventListener('submit', (e) => this.handleCreateQuiz(e));
        }
        
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('onclick')?.match(/showPage\('(.+)'\)/)?.[1];
                if (page) {
                    this.showPage(page);
                }
            });
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.showPage(e.state.page, false);
            }
        });
        
        // Handle page visibility change for distraction analysis
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - potential distraction detected');
            } else {
                console.log('Page visible - user returned');
            }
        });
        
        // Prevent accidental page refresh during quiz
        window.addEventListener('beforeunload', (e) => {
            if (window.quizManager && window.quizManager.currentQuiz && !window.quizManager.isSubmitting) {
                e.preventDefault();
                e.returnValue = 'You have an active quiz. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    /**
     * Check authentication status on app start
     */
    checkAuthenticationStatus() {
        if (window.authManager && window.authManager.isLoggedIn()) {
            console.log('User already logged in:', window.authManager.getCurrentUser());
            this.showPage('dashboard');
        } else {
            console.log('User not logged in, showing login page');
            this.showPage('login');
        }
    }
    
    /**
     * Initialize routing
     */
    initializeRouting() {
        // Get initial page from URL hash
        const hash = window.location.hash.substring(1);
        if (hash && window.authManager && window.authManager.isLoggedIn()) {
            this.showPage(hash);
        }
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const role = formData.get('role');
        
        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.innerHTML = '<span class="loading"></span> Logging in...';
        submitButton.disabled = true;
        
        try {
            const result = await window.authManager.login(email, password, role);
            
            if (result.success) {
                console.log('Login successful:', result.user);
                this.showPage('dashboard');
            } else {
                console.error('Login failed:', result.message);
            }
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            // Restore button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }
    
    /**
     * Handle create quiz form submission
     */
    async handleCreateQuiz(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const quizData = {
            title: formData.get('quiz-title'),
            description: formData.get('quiz-description'),
            timeLimit: parseInt(formData.get('time-limit')),
            questions: [] // Would be populated in a more complete implementation
        };
        
        try {
            const result = await window.quizManager.createQuiz(quizData);
            if (result) {
                this.closeCreateQuiz();
                // Refresh quizzes list
                if (window.authManager) {
                    await window.authManager.loadQuizzes();
                }
            }
        } catch (error) {
            console.error('Error creating quiz:', error);
        }
    }
    
    /**
     * Show specific page
     */
    showPage(pageName, updateHistory = true) {
        console.log('Navigating to page:', pageName);
        
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.style.display = 'none';
        });
        
        // Show target page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageName;
            
            // Update URL hash
            if (updateHistory) {
                window.location.hash = pageName;
                history.pushState({ page: pageName }, '', `#${pageName}`);
            }
            
            // Handle page-specific logic
            this.handlePageSpecificLogic(pageName);
        } else {
            console.error('Page not found:', pageName);
        }
    }
    
    /**
     * Handle page-specific logic
     */
    handlePageSpecificLogic(pageName) {
        switch (pageName) {
            case 'login':
                // Focus on email input
                const emailInput = document.getElementById('email');
                if (emailInput) {
                    setTimeout(() => emailInput.focus(), 100);
                }
                break;
                
            case 'dashboard':
                // Refresh dashboard data
                if (window.authManager && window.authManager.isLoggedIn()) {
                    window.authManager.loadDashboardStats();
                }
                break;
                
            case 'quizzes':
                // Refresh quizzes list
                if (window.authManager && window.authManager.isLoggedIn()) {
                    window.authManager.loadQuizzes();
                }
                break;
                
            case 'quiz-attempt':
                // Quiz attempt page is handled by QuizManager
                break;
                
            case 'results':
                // Results page is handled by QuizManager
                break;
        }
    }
    
    /**
     * Show create quiz modal
     */
    showCreateQuiz() {
        const modal = document.getElementById('create-quiz-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Focus on title input
            const titleInput = document.getElementById('quiz-title-input');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
        }
    }
    
    /**
     * Close create quiz modal
     */
    closeCreateQuiz() {
        const modal = document.getElementById('create-quiz-modal');
        if (modal) {
            modal.style.display = 'none';
            
            // Reset form
            const form = document.getElementById('create-quiz-form');
            if (form) {
                form.reset();
            }
        }
    }
    
    /**
     * Logout user
     */
    logout() {
        if (window.authManager) {
            window.authManager.logout();
        }
        this.showPage('login');
    }
    
    /**
     * Edit quiz (for instructors)
     */
    editQuiz(quizId) {
        console.log('Edit quiz:', quizId);
        // This would open a quiz editor modal or page
        alert('Quiz editing feature would be implemented here');
    }
    
    /**
     * View quiz analytics (for instructors)
     */
    viewQuizAnalytics(quizId) {
        console.log('View analytics for quiz:', quizId);
        // This would show detailed analytics for the quiz
        alert('Quiz analytics feature would be implemented here');
    }
    
    /**
     * View results for a completed quiz
     */
    viewResults(quizId) {
        console.log('View results for quiz:', quizId);
        // This would load and display previous results
        alert('View previous results feature would be implemented here');
    }
    
    /**
     * Handle errors globally
     */
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'An unexpected error occurred';
        this.showNotification(errorMessage, 'error');
    }
    
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    }
    
    /**
     * Check if app is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Global functions for HTML onclick handlers
window.showPage = (pageName) => {
    if (window.app) {
        window.app.showPage(pageName);
    }
};

window.logout = () => {
    if (window.app) {
        window.app.logout();
    }
};

window.showCreateQuiz = () => {
    if (window.app) {
        window.app.showCreateQuiz();
    }
};

window.closeCreateQuiz = () => {
    if (window.app) {
        window.app.closeCreateQuiz();
    }
};

window.editQuiz = (quizId) => {
    if (window.app) {
        window.app.editQuiz(quizId);
    }
};

window.viewQuizAnalytics = (quizId) => {
    if (window.app) {
        window.app.viewQuizAnalytics(quizId);
    }
};

window.viewResults = (quizId) => {
    if (window.app) {
        window.app.viewResults(quizId);
    }
};

// Initialize app when script loads
window.app = new App();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}

// Add some additional CSS for notifications
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    color: white;
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: 400px;
    animation: slideInRight 0.3s ease;
}

.notification-info {
    background: #17a2b8;
}

.notification-success {
    background: #28a745;
}

.notification-error {
    background: #dc3545;
}

.notification-warning {
    background: #ffc107;
    color: #000;
}

.notification button {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`;

// Inject notification styles
document.head.insertAdjacentHTML('beforeend', notificationStyles);
