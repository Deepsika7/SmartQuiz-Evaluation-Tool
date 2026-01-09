/**
 * Quiz Management Module
 * Handles quiz taking, creation, and evaluation
 */

class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.currentAttempt = null;
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.baseURL = 'http://localhost:3000/api';
        this.isSubmitting = false;
    }
    
    /**
     * Start a quiz attempt
     */
    async startQuiz(quizId) {
        try {
            // Load quiz data
            const quiz = await this.loadQuiz(quizId);
            if (!quiz) {
                alert('Failed to load quiz. Please try again.');
                return;
            }
            
            this.currentQuiz = quiz;
            this.currentQuestionIndex = 0;
            this.answers = {};
            this.timeRemaining = quiz.timeLimit * 60; // Convert to seconds
            
            // Create attempt
            this.currentAttempt = {
                id: 'attempt_' + Date.now(),
                quizId: quizId,
                userId: window.authManager.getCurrentUser().id,
                startTime: Date.now(),
                answers: {},
                status: 'in_progress'
            };
            
            // Start distraction monitoring
            if (window.distractionAnalyzer) {
                window.distractionAnalyzer.startMonitoring(this.currentAttempt.id);
            }
            
            // Show quiz attempt page
            showPage('quiz-attempt');
            
            // Initialize quiz UI
            this.initializeQuizUI();
            
            // Start timer
            this.startTimer();
            
            // Show first question
            this.showQuestion(0);
            
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to start quiz. Please try again.');
        }
    }
    
    /**
     * Load quiz data
     */
    async loadQuiz(quizId) {
        try {
            // For demo mode, return mock quiz data
            if (window.authManager.getToken().startsWith('demo_token_')) {
                return this.getMockQuiz(quizId);
            }
            
            const response = await fetch(`${this.baseURL}/quizzes/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to load quiz');
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            return this.getMockQuiz(quizId);
        }
    }
    
    /**
     * Get mock quiz data for demo
     */
    getMockQuiz(quizId) {
        const mockQuizzes = {
            'quiz_1': {
                id: 'quiz_1',
                title: 'JavaScript Fundamentals',
                description: 'Test your knowledge of JavaScript basics',
                timeLimit: 30,
                questions: [
                    {
                        id: 'q1',
                        type: 'mcq',
                        question: 'What is the correct way to declare a variable in JavaScript?',
                        options: [
                            'var myVar = 5;',
                            'variable myVar = 5;',
                            'v myVar = 5;',
                            'declare myVar = 5;'
                        ],
                        correctAnswer: 0,
                        marks: 2
                    },
                    {
                        id: 'q2',
                        type: 'true_false',
                        question: 'JavaScript is a statically typed language.',
                        correctAnswer: false,
                        marks: 1
                    },
                    {
                        id: 'q3',
                        type: 'fill_blank',
                        question: 'The _____ method is used to add an element to the end of an array.',
                        correctAnswer: 'push',
                        marks: 2
                    },
                    {
                        id: 'q4',
                        type: 'short_answer',
                        question: 'What is the difference between == and === in JavaScript?',
                        correctAnswer: '== compares values with type coercion, === compares values and types without coercion',
                        marks: 3
                    },
                    {
                        id: 'q5',
                        type: 'descriptive',
                        question: 'Explain the concept of closures in JavaScript with an example.',
                        correctAnswer: 'A closure is a function that has access to variables in its outer scope even after the outer function has returned. Example: function outer() { let x = 10; return function inner() { console.log(x); }; }',
                        marks: 5
                    }
                ]
            },
            'quiz_2': {
                id: 'quiz_2',
                title: 'React Components',
                description: 'Understanding React component lifecycle and hooks',
                timeLimit: 45,
                questions: [
                    {
                        id: 'q1',
                        type: 'mcq',
                        question: 'Which hook is used to manage state in functional components?',
                        options: [
                            'useEffect',
                            'useState',
                            'useContext',
                            'useReducer'
                        ],
                        correctAnswer: 1,
                        marks: 2
                    },
                    {
                        id: 'q2',
                        type: 'descriptive',
                        question: 'Explain the useEffect hook and its dependency array.',
                        correctAnswer: 'useEffect is used for side effects in functional components. The dependency array controls when the effect runs - empty array runs once, no array runs on every render, array with values runs when those values change.',
                        marks: 5
                    }
                ]
            }
        };
        
        return mockQuizzes[quizId] || mockQuizzes['quiz_1'];
    }
    
    /**
     * Initialize quiz UI
     */
    initializeQuizUI() {
        const quizTitle = document.getElementById('quiz-title');
        const questionCounter = document.getElementById('question-counter');
        
        if (quizTitle) {
            quizTitle.textContent = this.currentQuiz.title;
        }
        
        if (questionCounter) {
            questionCounter.textContent = `Question 1 of ${this.currentQuiz.questions.length}`;
        }
        
        // Update navigation buttons
        this.updateNavigationButtons();
    }
    
    /**
     * Start quiz timer
     */
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.submitQuiz(true); // Auto-submit when time runs out
            }
        }, 1000);
    }
    
    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timeRemainingElement = document.getElementById('time-remaining');
        if (timeRemainingElement) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            timeRemainingElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is running low
            if (this.timeRemaining <= 300) { // 5 minutes
                timeRemainingElement.style.background = '#dc3545';
            } else if (this.timeRemaining <= 600) { // 10 minutes
                timeRemainingElement.style.background = '#ffc107';
                timeRemainingElement.style.color = '#000';
            }
        }
    }
    
    /**
     * Show specific question
     */
    showQuestion(index) {
        if (index < 0 || index >= this.currentQuiz.questions.length) {
            return;
        }
        
        this.currentQuestionIndex = index;
        const question = this.currentQuiz.questions[index];
        const container = document.getElementById('question-container');
        
        if (!container) return;
        
        container.innerHTML = this.generateQuestionHTML(question, index);
        
        // Update question counter
        const questionCounter = document.getElementById('question-counter');
        if (questionCounter) {
            questionCounter.textContent = `Question ${index + 1} of ${this.currentQuiz.questions.length}`;
        }
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Restore previous answer if exists
        this.restorePreviousAnswer(question.id);
    }
    
    /**
     * Generate HTML for question based on type
     */
    generateQuestionHTML(question, index) {
        let html = `
            <div class="question" data-question-id="${question.id}">
                <h3>Question ${index + 1} (${question.marks} marks)</h3>
                <p>${question.question}</p>
        `;
        
        switch (question.type) {
            case 'mcq':
                html += '<div class="options">';
                question.options.forEach((option, optionIndex) => {
                    html += `
                        <div class="option" onclick="selectOption(${optionIndex})">
                            <input type="radio" name="question_${question.id}" value="${optionIndex}" id="option_${optionIndex}">
                            <label for="option_${optionIndex}">${option}</label>
                        </div>
                    `;
                });
                html += '</div>';
                break;
                
            case 'true_false':
                html += `
                    <div class="options">
                        <div class="option" onclick="selectOption(true)">
                            <input type="radio" name="question_${question.id}" value="true" id="option_true">
                            <label for="option_true">True</label>
                        </div>
                        <div class="option" onclick="selectOption(false)">
                            <input type="radio" name="question_${question.id}" value="false" id="option_false">
                            <label for="option_false">False</label>
                        </div>
                    </div>
                `;
                break;
                
            case 'fill_blank':
                html += `
                    <div class="form-group">
                        <input type="text" id="answer_${question.id}" placeholder="Enter your answer" 
                               onchange="saveAnswer('${question.id}', this.value)" class="fill-blank-input">
                    </div>
                `;
                break;
                
            case 'short_answer':
                html += `
                    <div class="form-group">
                        <textarea id="answer_${question.id}" rows="3" placeholder="Enter your answer" 
                                  onchange="saveAnswer('${question.id}', this.value)" class="short-answer-input"></textarea>
                    </div>
                `;
                break;
                
            case 'descriptive':
                html += `
                    <div class="form-group">
                        <textarea id="answer_${question.id}" rows="6" placeholder="Provide a detailed answer" 
                                  onchange="saveAnswer('${question.id}', this.value)" class="descriptive-answer-input"></textarea>
                        <small class="text-muted">This answer will be evaluated using AI for semantic similarity.</small>
                    </div>
                `;
                break;
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Select option for MCQ/True-False questions
     */
    selectOption(value) {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        this.saveAnswer(question.id, value);
        
        // Update UI
        const options = document.querySelectorAll('.option');
        options.forEach(option => option.classList.remove('selected'));
        
        const selectedInput = document.querySelector(`input[value="${value}"]`);
        if (selectedInput) {
            selectedInput.checked = true;
            selectedInput.closest('.option').classList.add('selected');
        }
    }
    
    /**
     * Save answer for current question
     */
    saveAnswer(questionId, answer) {
        this.answers[questionId] = {
            questionId: questionId,
            answer: answer,
            timestamp: Date.now(),
            timeSpent: Date.now() - (this.answers[questionId]?.startTime || Date.now())
        };
        
        console.log('Answer saved:', questionId, answer);
    }
    
    /**
     * Restore previous answer for question
     */
    restorePreviousAnswer(questionId) {
        const savedAnswer = this.answers[questionId];
        if (!savedAnswer) return;
        
        const question = this.currentQuiz.questions.find(q => q.id === questionId);
        if (!question) return;
        
        switch (question.type) {
            case 'mcq':
            case 'true_false':
                const radioInput = document.querySelector(`input[value="${savedAnswer.answer}"]`);
                if (radioInput) {
                    radioInput.checked = true;
                    radioInput.closest('.option').classList.add('selected');
                }
                break;
                
            case 'fill_blank':
            case 'short_answer':
            case 'descriptive':
                const textInput = document.getElementById(`answer_${questionId}`);
                if (textInput) {
                    textInput.value = savedAnswer.answer;
                }
                break;
        }
    }
    
    /**
     * Navigate to previous question
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.showQuestion(this.currentQuestionIndex - 1);
        }
    }
    
    /**
     * Navigate to next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.showQuestion(this.currentQuestionIndex + 1);
        }
    }
    
    /**
     * Update navigation buttons
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        if (prevBtn) {
            prevBtn.style.display = this.currentQuestionIndex > 0 ? 'inline-flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.currentQuestionIndex < this.currentQuiz.questions.length - 1 ? 'inline-flex' : 'none';
        }
        
        if (submitBtn) {
            submitBtn.style.display = this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ? 'inline-flex' : 'none';
        }
    }
    
    /**
     * Submit quiz
     */
    async submitQuiz(autoSubmit = false) {
        if (this.isSubmitting) return;
        
        if (!autoSubmit) {
            const confirmSubmit = confirm('Are you sure you want to submit your quiz? You cannot change your answers after submission.');
            if (!confirmSubmit) return;
        }
        
        this.isSubmitting = true;
        
        try {
            // Stop timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            
            // Stop distraction monitoring
            if (window.distractionAnalyzer && window.distractionAnalyzer.isActive) {
                window.distractionAnalyzer.stopMonitoring();
            }
            
            // Prepare submission data
            const submissionData = {
                attemptId: this.currentAttempt.id,
                quizId: this.currentQuiz.id,
                answers: this.answers,
                endTime: Date.now(),
                duration: Date.now() - this.currentAttempt.startTime,
                autoSubmit: autoSubmit
            };
            
            // Submit to server
            const result = await this.submitToServer(submissionData);
            
            // Show results
            this.showResults(result);
            
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Failed to submit quiz. Please try again.');
            this.isSubmitting = false;
        }
    }
    
    /**
     * Submit quiz to server
     */
    async submitToServer(submissionData) {
        try {
            // For demo mode, simulate server response
            if (window.authManager.getToken().startsWith('demo_token_')) {
                return this.simulateQuizEvaluation(submissionData);
            }
            
            const response = await fetch(`${this.baseURL}/quizzes/${this.currentQuiz.id}/attempt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                body: JSON.stringify(submissionData)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to submit quiz');
            }
        } catch (error) {
            console.error('Error submitting to server:', error);
            return this.simulateQuizEvaluation(submissionData);
        }
    }
    
    /**
     * Simulate quiz evaluation for demo mode
     */
    simulateQuizEvaluation(submissionData) {
        const results = {
            attemptId: submissionData.attemptId,
            quizId: submissionData.quizId,
            totalMarks: 0,
            obtainedMarks: 0,
            percentage: 0,
            questionResults: [],
            distractionAnalysis: window.distractionAnalyzer ? window.distractionAnalyzer.generateSummary() : null,
            submittedAt: Date.now()
        };
        
        // Evaluate each question
        this.currentQuiz.questions.forEach(question => {
            const userAnswer = submissionData.answers[question.id];
            const questionResult = {
                questionId: question.id,
                question: question.question,
                userAnswer: userAnswer ? userAnswer.answer : null,
                correctAnswer: question.correctAnswer,
                marks: question.marks,
                obtainedMarks: 0,
                feedback: ''
            };
            
            results.totalMarks += question.marks;
            
            if (userAnswer && userAnswer.answer !== null && userAnswer.answer !== '') {
                switch (question.type) {
                    case 'mcq':
                        if (parseInt(userAnswer.answer) === question.correctAnswer) {
                            questionResult.obtainedMarks = question.marks;
                            questionResult.feedback = 'Correct!';
                        } else {
                            questionResult.feedback = `Incorrect. Correct answer: ${question.options[question.correctAnswer]}`;
                        }
                        break;
                        
                    case 'true_false':
                        const userBool = userAnswer.answer === 'true' || userAnswer.answer === true;
                        if (userBool === question.correctAnswer) {
                            questionResult.obtainedMarks = question.marks;
                            questionResult.feedback = 'Correct!';
                        } else {
                            questionResult.feedback = `Incorrect. Correct answer: ${question.correctAnswer}`;
                        }
                        break;
                        
                    case 'fill_blank':
                        if (userAnswer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
                            questionResult.obtainedMarks = question.marks;
                            questionResult.feedback = 'Correct!';
                        } else {
                            questionResult.obtainedMarks = Math.floor(question.marks * 0.5); // Partial credit
                            questionResult.feedback = `Partially correct. Expected: ${question.correctAnswer}`;
                        }
                        break;
                        
                    case 'short_answer':
                        // Simple keyword matching for demo
                        const keywords = question.correctAnswer.toLowerCase().split(' ');
                        const userWords = userAnswer.answer.toLowerCase().split(' ');
                        const matchCount = keywords.filter(keyword => userWords.some(word => word.includes(keyword))).length;
                        const similarity = matchCount / keywords.length;
                        
                        questionResult.obtainedMarks = Math.floor(question.marks * similarity);
                        questionResult.feedback = `Semantic similarity: ${Math.floor(similarity * 100)}%`;
                        break;
                        
                    case 'descriptive':
                        // Simulate NLP evaluation
                        const descKeywords = question.correctAnswer.toLowerCase().split(' ');
                        const descUserWords = userAnswer.answer.toLowerCase().split(' ');
                        const descMatchCount = descKeywords.filter(keyword => 
                            descUserWords.some(word => word.includes(keyword))
                        ).length;
                        const descSimilarity = Math.min(descMatchCount / descKeywords.length, 1);
                        
                        questionResult.obtainedMarks = Math.floor(question.marks * (0.6 + descSimilarity * 0.4));
                        questionResult.feedback = `AI Evaluation - Semantic similarity: ${Math.floor(descSimilarity * 100)}%. Good understanding demonstrated.`;
                        break;
                }
            } else {
                questionResult.feedback = 'No answer provided';
            }
            
            results.obtainedMarks += questionResult.obtainedMarks;
            results.questionResults.push(questionResult);
        });
        
        results.percentage = Math.round((results.obtainedMarks / results.totalMarks) * 100);
        
        return results;
    }
    
    /**
     * Show quiz results
     */
    showResults(results) {
        showPage('results');
        
        const resultsContainer = document.getElementById('results-container');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="result-summary">
                <h2>Quiz Completed!</h2>
                <div class="score-display">${results.percentage}%</div>
                <p>You scored ${results.obtainedMarks} out of ${results.totalMarks} marks</p>
            </div>
            
            <div class="result-details">
                <div class="result-item">
                    <h4>Total Questions</h4>
                    <p>${this.currentQuiz.questions.length}</p>
                </div>
                <div class="result-item">
                    <h4>Time Taken</h4>
                    <p>${this.formatDuration(results.submittedAt - this.currentAttempt.startTime)}</p>
                </div>
                <div class="result-item">
                    <h4>Focus Score</h4>
                    <p>${results.distractionAnalysis ? results.distractionAnalysis.focusScore : 100}%</p>
                </div>
                <div class="result-item">
                    <h4>Tab Switches</h4>
                    <p>${results.distractionAnalysis ? results.distractionAnalysis.tabSwitchCount : 0}</p>
                </div>
            </div>
            
            <div class="question-breakdown">
                <h3>Question Breakdown</h3>
                ${results.questionResults.map((result, index) => `
                    <div class="question-result">
                        <h4>Question ${index + 1} (${result.obtainedMarks}/${result.marks} marks)</h4>
                        <p><strong>Question:</strong> ${result.question}</p>
                        <p><strong>Your Answer:</strong> ${result.userAnswer || 'No answer provided'}</p>
                        <p><strong>Feedback:</strong> ${result.feedback}</p>
                    </div>
                `).join('')}
            </div>
            
            <div class="result-actions">
                <button class="btn btn-primary" onclick="showPage('dashboard')">Back to Dashboard</button>
                <button class="btn btn-secondary" onclick="showPage('quizzes')">Take Another Quiz</button>
            </div>
        `;
        
        // Reset quiz state
        this.currentQuiz = null;
        this.currentAttempt = null;
        this.answers = {};
        this.isSubmitting = false;
    }
    
    /**
     * Format duration in readable format
     */
    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Create new quiz (for instructors)
     */
    async createQuiz(quizData) {
        try {
            const response = await fetch(`${this.baseURL}/quizzes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                body: JSON.stringify(quizData)
            });
            
            if (response.ok) {
                const newQuiz = await response.json();
                alert('Quiz created successfully!');
                return newQuiz;
            } else {
                throw new Error('Failed to create quiz');
            }
        } catch (error) {
            console.error('Error creating quiz:', error);
            alert('Failed to create quiz. Please try again.');
            return null;
        }
    }
}

// Create global instance
window.quizManager = new QuizManager();

// Global functions for HTML onclick handlers
window.selectOption = (value) => window.quizManager.selectOption(value);
window.saveAnswer = (questionId, answer) => window.quizManager.saveAnswer(questionId, answer);
window.previousQuestion = () => window.quizManager.previousQuestion();
window.nextQuestion = () => window.quizManager.nextQuestion();
window.submitQuiz = () => window.quizManager.submitQuiz();
window.startQuiz = (quizId) => window.quizManager.startQuiz(quizId);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizManager;
}
