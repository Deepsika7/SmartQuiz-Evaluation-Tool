# Smart Quiz Evaluation Tool

## 📌 Project Title

**Smart Quiz Evaluation Tool**

## 🎯 Aim

To design and develop a Smart Quiz Evaluation Tool that functions as a complete online quiz platform supporting multiple question formats, integrating **Natural Language Processing (NLP)** for descriptive answer evaluation, and **Distraction Analysis** for monitoring student focus.

## ✅ Features

*   **Quiz Types Supported**: MCQs, True/False, Fill-in-the-blanks, Short answers, Descriptive answers.
*   **Evaluation**: Automated instant scoring for objective questions; AI/NLP-powered semantic scoring for descriptive answers using BERT or Sentence-BERT.
*   **Distraction Analysis**: Detects tab switches, idle time, window focus/blur, and activity tracking, logging events to the backend for analytics.
*   **Feedback & Analytics**: Instant results and descriptive answer feedback for students; dashboard with performance analytics, distraction reports, and fairness scoring for teachers.
*   **Scalability**: Designed to support both small classroom quizzes and large online exams.

## ⚙️ Tech Stack

*   **Frontend**: HTML, CSS, JavaScript.
*   **Backend**: Node.js (Express).
*   **NLP Service**: FastAPI (Python) with BERT/Sentence-BERT for semantic similarity.
*   **Database**: 
    *   **MongoDB**: For quizzes, questions, activity logs, and submissions.
    *   **PostgreSQL**: For users, roles, and results summaries.
*   **Tools**: VS Code, GitHub, Postman, Docker (optional).

## 🚀 Getting Started

Follow these steps to set up and run the Smart Quiz Evaluation Tool locally.

### 📋 Prerequisites

Ensure you have the following installed:

*   **Node.js** (v16.x or higher) & **npm** (v8.x or higher)
*   **Python** (v3.9 or higher) & **pip**
*   **MongoDB** (Community Server or Atlas account)
*   **PostgreSQL** (v12 or higher)
*   **Git**

### 📦 Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/smart-quiz-tool.git
    cd smart-quiz-tool
    ```

2.  **Backend Setup (Node.js/Express):**

    ```bash
    cd backend
    npm install
    ```

    Create a `.env` file in the `backend/` directory by copying `.env.example` and filling in the details:

    ```bash
    cp .env.example .env
    ```

    **`.env` Configuration (backend):**

    ```ini
    NODE_ENV=development
    PORT=3000
    FRONTEND_URL=http://localhost:8080

    JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
    JWT_EXPIRE=7d

    MONGODB_URI=mongodb://localhost:27017/smart_quiz_tool

    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432
    POSTGRES_DB=smart_quiz_tool
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=password

    NLP_SERVICE_URL=http://localhost:8000
    ```

3.  **NLP Service Setup (FastAPI/Python):**

    ```bash
    cd ../nlp-service
    pip install -r requirements.txt
    ```

    Create a `.env` file in the `nlp-service/` directory by copying `.env.example` and filling in the details:

    ```bash
    cp .env.example .env
    ```

    **`.env` Configuration (NLP Service):**

    ```ini
    HOST=0.0.0.0
    PORT=8000
    ENVIRONMENT=development
    LOG_LEVEL=info
    MODEL_NAME=all-MiniLM-L6-v2
    ```

4.  **Frontend Setup (HTML/CSS/JS):**

    The frontend is a static HTML/CSS/JS application. No `npm install` is needed for the frontend itself, but ensure the `FRONTEND_URL` in your backend `.env` matches where you will serve it (e.g., `http://localhost:8080`).

### ⚙️ Database Setup

1.  **Start MongoDB and PostgreSQL servers.**

2.  **Initialize PostgreSQL Schema and Demo Users:**

    The backend will automatically create the necessary tables (`users`, `results_summary`, `quiz_stats`) and insert demo user credentials when it starts for the first time. Ensure your PostgreSQL server is running and accessible with the credentials provided in `backend/.env`.

3.  **Insert MongoDB Sample Data:**

    Navigate to the `database/mongodb` directory and run the script to insert sample quizzes and attempts:

    ```bash
    cd ../database/mongodb
    node sample-data.js
    ```

    This will populate your MongoDB with example quizzes and a completed attempt for the demo student.

### ▶️ Running the Application

1.  **Start the NLP Service:**

    Open a new terminal, navigate to the `nlp-service/` directory, and run:

    ```bash
    cd nlp-service
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```

    You should see output indicating the FastAPI server is running.

2.  **Start the Backend Server:**

    Open another new terminal, navigate to the `backend/` directory, and run:

    ```bash
    cd backend
    npm run dev
    ```

    You should see output indicating the Express server is running and connected to both databases.

3.  **Open the Frontend:**

    Open your web browser and navigate to the `frontend/index.html` file. You can do this by opening the file directly or by using a simple local web server (e.g., `python3 -m http.server 8080` from the `frontend/` directory).

    ```bash
    cd frontend
    python3 -m http.server 8080
    ```

    Then open your browser to `http://localhost:8080`.

## 🔑 Example User Credentials for Testing

Use these credentials to log in to the frontend application:

| Role        | Email             | Password      |
| :---------- | :---------------- | :------------ |
| **Student** | `student@demo.com`  | `password123` |
| **Instructor** | `instructor@demo.com` | `password123` |

## 📂 Project Structure

```
smart-quiz-tool/
├── frontend/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── distraction.js
│   │   └── quiz.js
│   ├── assets/ (for images, etc.)
│   └── index.html
├── backend/
│   ├── config/
│   │   ├── mongodb.js
│   │   └── postgresql.js
│   ├── controllers/ (empty, for future expansion)
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/ (Mongoose schemas are defined in routes/quiz.js for simplicity)
│   ├── routes/
│   │   ├── activity.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── evaluation.js
│   │   └── quiz.js
│   ├── utils/ (empty, for future expansion)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── nlp-service/
│   ├── models/
│   │   ├── __init__.py
│   │   └── semantic_evaluator.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   └── text_processor.py
│   ├── .env.example
│   ├── main.py
│   └── requirements.txt
├── database/
│   ├── mongodb/
│   │   └── sample-data.js
│   ├── postgresql/
│   │   └── schema.sql
│   └── sample-data/ (empty, for future expansion)
└── README.md
```

## 📝 Notes

*   The NLP service uses `sentence-transformers` which will download a pre-trained model (`all-MiniLM-L6-v2`) on its first run. This might take some time depending on your internet connection.
*   For descriptive answer evaluation, the NLP service provides semantic similarity scoring. The current implementation uses a placeholder for BERT/Sentence-BERT due to sandbox limitations in directly downloading and running large models. In a real-world scenario, the `semantic_evaluator.py` would fully leverage these models.
*   The frontend uses mock data for quizzes and dashboard statistics if the backend is not running or if demo tokens are used. This allows for basic UI testing without a fully operational backend.
*   The distraction analysis feature logs events to the backend. Instructors can view these logs and analytics on their dashboard.

Enjoy using the Smart Quiz Evaluation Tool!
