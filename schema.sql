-- PostgreSQL Schema for Smart Quiz Evaluation Tool

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'student',
        'instructor',
        'admin'
    )),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: results_summary
CREATE TABLE IF NOT EXISTS results_summary (
    id SERIAL PRIMARY KEY,
    attempt_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    quiz_id VARCHAR(255) NOT NULL,
    total_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    time_taken INTEGER NOT NULL, -- in seconds
    focus_score DECIMAL(5,2) DEFAULT 100.00,
    tab_switches INTEGER DEFAULT 0,
    idle_time INTEGER DEFAULT 0, -- in seconds
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: quiz_stats
CREATE TABLE IF NOT EXISTS quiz_stats (
    id SERIAL PRIMARY KEY,
    quiz_id VARCHAR(255) UNIQUE NOT NULL,
    total_attempts INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    highest_score DECIMAL(5,2) DEFAULT 0.00,
    lowest_score DECIMAL(5,2) DEFAULT 0.00,
    average_time INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results_summary(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_graded_at ON results_summary(graded_at);
CREATE INDEX IF NOT EXISTS idx_quiz_stats_quiz_id ON quiz_stats(quiz_id);
