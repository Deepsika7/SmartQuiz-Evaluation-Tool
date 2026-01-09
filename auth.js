/**
 * Authentication Module
 * Handles user login, logout, and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.baseURL = 'http://localhost:3000/api';
        
        // Check for existing session on load
        this.checkExistingSession();
    }
    
    /**
     * Check for existing session in localStorage
     */
    checkExistingSession() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            try {
                this.token = token;
                this.currentUser = JSON.parse(user);
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                this.logout();
            }
        }
    }
    
    /**
     * Login user with email and password
     */
    async login(email, password, role) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, role })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                
                // Store in localStorage
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                
                this.updateUIForLoggedInUser();
                this.showMessage('Login successful!', 'success');
                
                return { success: true, user: this.currentUser };
            } else {
                this.showMessage(data.message || 'Login failed', 'error');
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Demo mode fallback
            if (this.isDemoCredentials(email, password, role)) {
                return this.handleDemoLogin(email, role);
            }
            
            this.showMessage('Network error. Please try again.', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    /**
     * Check if credentials are demo credentials
     */
    isDemoCredentials(email, password, role) {
        const demoCredentials = {
            'student@demo.com': { password: 'password123', role: 'student' },
            'instructor@demo.com': { password: 'password123', role: 'instructor' }
        };
        
        return demoCredentials[email] && 
               demoCredentials[email].password === password && 
               demoCredentials[email].role === role;
    }
    
    /**
     * Handle demo login when backend is not available
     */
    handleDemoLogin(email, role) {
        const demoUser = {
            id: role === 'student' ? 'demo_student_1' : 'demo_instructor_1',
            email: email,
            name: role === 'student' ? 'Demo Student' : 'Demo Instructor',
            role: role
        };
        
        const demoToken = 'demo_token_' + Date.now();
        
        this.token = demoToken;
        this.currentUser = demoUser;
        
        // Store in localStorage
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        
        this.updateUIForLoggedInUser();
        this.showMessage('Demo login successful!', 'success');
        
        return { success: true, user: this.currentUser };
    }
    
    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('Registration successful! Please login.', 'success');
                return { success: true };
            } else {
                this.showMessage(data.message || 'Registration failed', 'error');
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Network error. Please try again.', 'error');
            return { success: false, message: 'Network error' };
        }
    }
    
    /**
     * Logout user
     */
    logout() {
        this.token = null;
        this.currentUser = null;
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Stop distraction monitoring if active
        if (window.distractionAnalyzer && window.distractionAnalyzer.isActive) {
            window.distractionAnalyzer.stopMonitoring();
        }
        
        this.updateUIForLoggedOutUser();
        this.showMessage('Logged out successfully', 'success');
    }
    
    /**
     * Update UI for logged in user
     */
    updateUIForLoggedInUser() {
        // Hide login page
        document.getElementById('login-page').style.display = 'none';
        
        // Show navigation
        document.getElementById('navbar').style.display = 'block';
        
        // Update user info in navigation
        const usernameElement = document.getElementById('username');
        const userRoleElement = document.getElementById('user-role');
        const userInfoElement = document.getElementById('user-info');
        
        if (usernameElement && this.currentUser) {
            usernameElement.textContent = this.currentUser.name || this.currentUser.email;
        }
        
        if (userRoleElement && this.currentUser) {
            userRoleElement.textContent = this.currentUser.role;
            userRoleElement.className = `role-badge role-${this.currentUser.role}`;
        }
        
        if (userInfoElement) {
            userInfoElement.style.display = 'flex';
        }
        
        // Show appropriate create quiz button for instructors
        const createQuizBtn = document.getElementById('create-quiz-btn');
        if (createQuizBtn && this.currentUser && this.currentUser.role === 'instructor') {
            createQuizBtn.style.display = 'inline-flex';
        }
        
        // Show dashboard by default
        showPage('dashboard');
        
        // Load user-specific data
        this.loadUserData();
    }
    
    /**
     * Update UI for logged out user
     */
    updateUIForLoggedOutUser() {
        // Show login page
        document.getElementById('login-page').style.display = 'block';
        
        // Hide navigation
        document.getElementById('navbar').style.display = 'none';
        
        // Hide all other pages
        const pages = document.querySelectorAll('.page:not(#login-page)');
        pages.forEach(page => {
            page.style.display = 'none';
        });
        
        // Hide user info
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.style.display = 'none';
        }
    }
    
    /**
     * Load user-specific data
     */
    async loadUserData() {
        try {
            // Load dashboard stats
            await this.loadDashboardStats();
            
            // Load quizzes
            await this.loadQuizzes();
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            // For demo mode, use mock data
            if (this.token.startsWith('demo_token_')) {
                this.updateDashboardWithMockData();
                return;
            }
            
            const response = await fetch(`${this.baseURL}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                this.updateDashboardStats(stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.updateDashboardWithMockData();
        }
    }
    
    /**
     * Update dashboard with mock data for demo
     */
    updateDashboardWithMockData() {
        const mockStats = {
            totalQuizzes: this.currentUser.role === 'student' ? 5 : 12,
            averageScore: this.currentUser.role === 'student' ? 85 : null,
            timeSpent: this.currentUser.role === 'student' ? 4.5 : null,
            focusScore: this.currentUser.role === 'student' ? 92 : null,
            totalStudents: this.currentUser.role === 'instructor' ? 45 : null,
            totalAttempts: this.currentUser.role === 'instructor' ? 156 : null
        };
        
        this.updateDashboardStats(mockStats);
    }
    
    /**
     * Update dashboard statistics in UI
     */
    updateDashboardStats(stats) {
        const elements = {
            'total-quizzes': stats.totalQuizzes || 0,
            'average-score': stats.averageScore ? `${stats.averageScore}%` : 'N/A',
            'time-spent': stats.timeSpent ? `${stats.timeSpent}h` : 'N/A',
            'focus-score': stats.focusScore ? `${stats.focusScore}%` : 'N/A'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    /**
     * Load quizzes for current user
     */
    async loadQuizzes() {
        try {
            // For demo mode, use mock data
            if (this.token.startsWith('demo_token_')) {
                this.updateQuizzesWithMockData();
                return;
            }
            
            const response = await fetch(`${this.baseURL}/quizzes`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const quizzes = await response.json();
                this.updateQuizzesList(quizzes);
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            this.updateQuizzesWithMockData();
        }
    }
    
    /**
     * Update quizzes with mock data for demo
     */
    updateQuizzesWithMockData() {
        const mockQuizzes = [
            {
                id: 'quiz_1',
                title: 'JavaScript Fundamentals',
                description: 'Test your knowledge of JavaScript basics',
                timeLimit: 30,
                questionCount: 10,
                createdBy: 'Demo Instructor',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                status: this.currentUser.role === 'student' ? 'available' : 'published'
            },
            {
                id: 'quiz_2',
                title: 'React Components',
                description: 'Understanding React component lifecycle and hooks',
                timeLimit: 45,
                questionCount: 15,
                createdBy: 'Demo Instructor',
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                status: this.currentUser.role === 'student' ? 'completed' : 'published'
            },
            {
                id: 'quiz_3',
                title: 'Database Design',
                description: 'SQL and database normalization concepts',
                timeLimit: 60,
                questionCount: 20,
                createdBy: 'Demo Instructor',
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                status: this.currentUser.role === 'student' ? 'available' : 'draft'
            }
        ];
        
        this.updateQuizzesList(mockQuizzes);
    }
    
    /**
     * Update quizzes list in UI
     */
    updateQuizzesList(quizzes) {
        const quizGrid = document.getElementById('quiz-grid');
        if (!quizGrid) return;
        
        quizGrid.innerHTML = '';
        
        quizzes.forEach(quiz => {
            const quizCard = this.createQuizCard(quiz);
            quizGrid.appendChild(quizCard);
        });
    }
    
    /**
     * Create quiz card element
     */
    createQuizCard(quiz) {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        
        const statusClass = quiz.status === 'completed' ? 'completed' : 
                           quiz.status === 'available' ? 'available' : 'draft';
        
        card.innerHTML = `
            <h3>${quiz.title}</h3>
            <p>${quiz.description}</p>
            <div class="quiz-meta">
                <span><i class="fas fa-clock"></i> ${quiz.timeLimit} min</span>
                <span><i class="fas fa-question-circle"></i> ${quiz.questionCount} questions</span>
                <span class="quiz-status ${statusClass}">${quiz.status}</span>
            </div>
            <div class="quiz-actions">
                ${this.getQuizActions(quiz)}
            </div>
        `;
        
        return card;
    }
    
    /**
     * Get appropriate actions for quiz based on user role and quiz status
     */
    getQuizActions(quiz) {
        if (this.currentUser.role === 'instructor') {
            return `
                <button class="btn btn-primary" onclick="editQuiz('${quiz.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" onclick="viewQuizAnalytics('${quiz.id}')">
                    <i class="fas fa-chart-bar"></i> Analytics
                </button>
            `;
        } else {
            if (quiz.status === 'available') {
                return `
                    <button class="btn btn-primary" onclick="startQuiz('${quiz.id}')">
                        <i class="fas fa-play"></i> Start Quiz
                    </button>
                `;
            } else if (quiz.status === 'completed') {
                return `
                    <button class="btn btn-secondary" onclick="viewResults('${quiz.id}')">
                        <i class="fas fa-chart-line"></i> View Results
                    </button>
                `;
            } else {
                return `<span class="text-muted">Not available</span>`;
            }
        }
    }
    
    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;
        
        // Insert at top of current page
        const currentPage = document.querySelector('.page:not([style*="display: none"])');
        if (currentPage) {
            const container = currentPage.querySelector('.container') || currentPage;
            container.insertBefore(messageDiv, container.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Get current token
     */
    getToken() {
        return this.token;
    }
    
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.token !== null && this.currentUser !== null;
    }
    
    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
