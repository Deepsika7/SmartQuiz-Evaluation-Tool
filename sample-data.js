/**
 * MongoDB Sample Data
 * Inserts sample quizzes and attempts into MongoDB
 */

const mongoose = require("mongoose");
const connectMongoDB = require("../../backend/config/mongodb");

// Import Mongoose models (defined in quiz.js and activity.js for simplicity)
const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    createdBy: { type: String, required: true }, // User ID
    timeLimit: { type: Number, required: true }, // in minutes
    questions: [{
        id: { type: String, required: true },
        type: { 
            type: String, 
            required: true,
            enum: ["mcq", "true_false", "fill_blank", "short_answer", "descriptive"]
        },
        question: { type: String, required: true },
        options: [String], // For MCQ
        correctAnswer: mongoose.Schema.Types.Mixed, // String, Number, or Boolean
        marks: { type: Number, required: true, min: 1 }
    }],
    settings: {
        shuffleQuestions: { type: Boolean, default: false },
        shuffleOptions: { type: Boolean, default: false },
        negativeMarking: { type: Boolean, default: false },
        showResults: { type: Boolean, default: true },
        allowReview: { type: Boolean, default: true }
    },
    status: { 
        type: String, 
        enum: ["draft", "published", "archived"], 
        default: "draft" 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const AttemptSchema = new mongoose.Schema({
    quizId: { type: String, required: true },
    userId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    answers: [{
        questionId: { type: String, required: true },
        answer: mongoose.Schema.Types.Mixed,
        timeSpent: { type: Number }, // in milliseconds
        timestamp: { type: Date, default: Date.now }
    }],
    status: { 
        type: String, 
        enum: ["in_progress", "completed", "abandoned"], 
        default: "in_progress" 
    },
    score: {
        total: { type: Number, default: 0 },
        obtained: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    evaluation: {
        objective: [{
            questionId: String,
            correct: Boolean,
            marks: Number
        }],
        descriptive: [{
            questionId: String,
            score: Number,
            confidence: Number,
            feedback: String
        }]
    },
    submittedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const Quiz = mongoose.model("Quiz", QuizSchema);
const Attempt = mongoose.model("Attempt", AttemptSchema);

const sampleQuizzes = [
    {
        _id: "6527d7d3c9a2e7b0f1e2a3b4", // Example ID
        title: "JavaScript Fundamentals Quiz",
        description: "A quiz to test your basic knowledge of JavaScript.",
        createdBy: "demo_instructor_1", // Corresponds to instructor@demo.com
        timeLimit: 30,
        questions: [
            {
                id: "js_q1",
                type: "mcq",
                question: "Which keyword is used to declare a variable in JavaScript?",
                options: ["var", "let", "const", "All of the above"],
                correctAnswer: 3,
                marks: 10
            },
            {
                id: "js_q2",
                type: "true_false",
                question: "JavaScript is a case-sensitive language.",
                correctAnswer: true,
                marks: 10
            },
            {
                id: "js_q3",
                type: "fill_blank",
                question: "The \"typeof\" operator returns the _____ of a variable.",
                correctAnswer: "type",
                marks: 15
            },
            {
                id: "js_q4",
                type: "short_answer",
                question: "What is the purpose of the `addEventListener` method?",
                correctAnswer: "The addEventListener method attaches an event handler to the specified element without overwriting existing event handlers.",
                marks: 20
            },
            {
                id: "js_q5",
                type: "descriptive",
                question: "Explain the concept of 'hoisting' in JavaScript.",
                correctAnswer: "Hoisting is a JavaScript mechanism where variable and function declarations are moved to the top of their containing scope during compilation phase. This means you can use variables and functions before they are declared.",
                marks: 45
            }
        ],
        settings: {
            shuffleQuestions: true,
            shuffleOptions: true,
            showResults: true
        },
        status: "published",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    },
    {
        _id: "6527d7d3c9a2e7b0f1e2a3b5", // Example ID
        title: "React Basics Quiz",
        description: "Fundamental concepts of React.js.",
        createdBy: "demo_instructor_1",
        timeLimit: 45,
        questions: [
            {
                id: "react_q1",
                type: "mcq",
                question: "What is React.js primarily used for?",
                options: ["Backend development", "Database management", "Building user interfaces", "Mobile app development"],
                correctAnswer: 2,
                marks: 10
            },
            {
                id: "react_q2",
                type: "descriptive",
                question: "Describe the concept of 'Virtual DOM' in React and its benefits.",
                correctAnswer: "The Virtual DOM is a lightweight copy of the actual DOM. React uses it to improve performance by first updating the Virtual DOM, then efficiently calculating the minimal changes needed to update the real DOM, reducing direct manipulation of the slower browser DOM.",
                marks: 40
            }
        ],
        status: "published",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
        _id: "6527d7d3c9a2e7b0f1e2a3b6", // Example ID
        title: "Advanced Node.js Concepts",
        description: "Test your knowledge on advanced Node.js topics.",
        createdBy: "demo_instructor_1",
        timeLimit: 60,
        questions: [
            {
                id: "node_q1",
                type: "mcq",
                question: "Which module is used for creating HTTP servers in Node.js?",
                options: ["fs", "path", "http", "url"],
                correctAnswer: 2,
                marks: 10
            }
        ],
        status: "draft", // Draft quiz
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
];

const sampleAttempts = [
    {
        _id: "6527d7d3c9a2e7b0f1e2a3c0",
        quizId: "6527d7d3c9a2e7b0f1e2a3b4", // JavaScript Fundamentals Quiz
        userId: "demo_student_1", // Corresponds to student@demo.com
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000), // 2 days ago, 30 mins before end
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        answers: [
            { questionId: "js_q1", answer: 3, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 25 * 60 * 1000) },
            { questionId: "js_q2", answer: true, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 20 * 60 * 1000) },
            { questionId: "js_q3", answer: "type", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000) },
            { questionId: "js_q4", answer: "The addEventListener method is used to attach an event handler to an element.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000) },
            { questionId: "js_q5", answer: "Hoisting means that variable and function declarations are moved to the top of their scope.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000) }
        ],
        status: "completed",
        score: { total: 100, obtained: 80, percentage: 80 },
        evaluation: {
            objective: [
                { questionId: "js_q1", correct: true, marks: 10 },
                { questionId: "js_q2", correct: true, marks: 10 },
                { questionId: "js_q3", correct: true, marks: 15 }
            ],
            descriptive: [
                { questionId: "js_q4", score: 18, confidence: 90, feedback: "Good answer." },
                { questionId: "js_q5", score: 27, confidence: 70, feedback: "Partial understanding." }
            ]
        },
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
];

async function insertSampleData() {
    await connectMongoDB();
    
    try {
        console.log("Inserting sample quizzes...");
        for (const quizData of sampleQuizzes) {
            const existingQuiz = await Quiz.findById(quizData._id);
            if (!existingQuiz) {
                await Quiz.create(quizData);
                console.log(`Inserted quiz: ${quizData.title}`);
            } else {
                console.log(`Quiz already exists, skipping: ${quizData.title}`);
            }
        }
        
        console.log("Inserting sample attempts...");
        for (const attemptData of sampleAttempts) {
            const existingAttempt = await Attempt.findById(attemptData._id);
            if (!existingAttempt) {
                await Attempt.create(attemptData);
                console.log(`Inserted attempt for quiz: ${attemptData.quizId}`);
            } else {
                console.log(`Attempt already exists, skipping: ${attemptData.quizId}`);
            }
        }
        
        console.log("Sample data insertion complete.");
    } catch (error) {
        console.error("Error inserting sample data:", error);
    } finally {
        mongoose.connection.close();
    }
}

if (require.main === module) {
    insertSampleData();
}

