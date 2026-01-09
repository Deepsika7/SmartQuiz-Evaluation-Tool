"""
Smart Quiz Tool - NLP Service
FastAPI application for semantic evaluation of descriptive answers
"""

import os
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

from models.semantic_evaluator import SemanticEvaluator
from utils.text_processor import TextProcessor
from utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)

# Global variables for models
semantic_evaluator: Optional[SemanticEvaluator] = None
text_processor: Optional[TextProcessor] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - load models on startup"""
    global semantic_evaluator, text_processor
    
    logger.info("Starting NLP Service...")
    
    try:
        # Initialize text processor
        text_processor = TextProcessor()
        logger.info("Text processor initialized")
        
        # Initialize semantic evaluator
        semantic_evaluator = SemanticEvaluator()
        await semantic_evaluator.load_model()
        logger.info("Semantic evaluator model loaded")
        
        logger.info("NLP Service startup complete")
        
    except Exception as e:
        logger.error(f"Failed to initialize NLP service: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down NLP Service...")

# Create FastAPI app
app = FastAPI(
    title="Smart Quiz Tool - NLP Service",
    description="Semantic evaluation service for descriptive quiz answers using BERT-based models",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class EvaluationRequest(BaseModel):
    question: str = Field(..., description="The quiz question")
    correctAnswer: str = Field(..., description="The expected correct answer")
    userAnswer: str = Field(..., description="The student's answer")
    maxMarks: int = Field(default=5, ge=1, le=100, description="Maximum marks for this question")
    evaluationCriteria: Optional[List[str]] = Field(default=None, description="Specific criteria to evaluate")

class EvaluationResponse(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized score (0-1)")
    confidence: float = Field(..., ge=0.0, le=100.0, description="Confidence percentage")
    feedback: str = Field(..., description="Detailed feedback for the student")
    keywordsMatched: List[str] = Field(default=[], description="Keywords found in the answer")
    suggestions: List[str] = Field(default=[], description="Suggestions for improvement")
    semanticSimilarity: float = Field(..., ge=0.0, le=1.0, description="Semantic similarity score")
    detailedAnalysis: Dict[str, Any] = Field(default={}, description="Detailed analysis breakdown")

class BatchEvaluationRequest(BaseModel):
    evaluations: List[EvaluationRequest] = Field(..., description="List of evaluations to process")

class BatchEvaluationResponse(BaseModel):
    results: List[EvaluationResponse] = Field(..., description="List of evaluation results")
    summary: Dict[str, Any] = Field(..., description="Summary statistics")

class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    uptime: float

# Dependency to get evaluator
async def get_evaluator() -> SemanticEvaluator:
    if semantic_evaluator is None:
        raise HTTPException(status_code=503, detail="Semantic evaluator not initialized")
    return semantic_evaluator

# Dependency to get text processor
async def get_text_processor() -> TextProcessor:
    if text_processor is None:
        raise HTTPException(status_code=503, detail="Text processor not initialized")
    return text_processor

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Smart Quiz Tool - NLP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "evaluate": "/evaluate",
            "batch_evaluate": "/batch-evaluate",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    import time
    import psutil
    
    return HealthResponse(
        status="healthy" if semantic_evaluator is not None else "initializing",
        version="1.0.0",
        model_loaded=semantic_evaluator is not None,
        uptime=time.time() - psutil.Process().create_time()
    )

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(
    request: EvaluationRequest,
    evaluator: SemanticEvaluator = Depends(get_evaluator),
    processor: TextProcessor = Depends(get_text_processor)
):
    """
    Evaluate a single descriptive answer using semantic similarity
    """
    try:
        logger.info(f"Evaluating answer for question: {request.question[:50]}...")
        
        # Preprocess texts
        processed_question = processor.preprocess(request.question)
        processed_correct = processor.preprocess(request.correctAnswer)
        processed_user = processor.preprocess(request.userAnswer)
        
        # Perform semantic evaluation
        result = await evaluator.evaluate(
            question=processed_question,
            correct_answer=processed_correct,
            user_answer=processed_user,
            max_marks=request.maxMarks,
            criteria=request.evaluationCriteria
        )
        
        # Extract keywords
        keywords_matched = processor.extract_keywords(
            request.userAnswer, 
            request.correctAnswer
        )
        
        # Generate suggestions
        suggestions = processor.generate_suggestions(
            request.userAnswer,
            request.correctAnswer,
            result['score']
        )
        
        response = EvaluationResponse(
            score=result['score'],
            confidence=result['confidence'],
            feedback=result['feedback'],
            keywordsMatched=keywords_matched,
            suggestions=suggestions,
            semanticSimilarity=result['semantic_similarity'],
            detailedAnalysis=result.get('detailed_analysis', {})
        )
        
        logger.info(f"Evaluation completed. Score: {result['score']:.2f}")
        return response
        
    except Exception as e:
        logger.error(f"Error during evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.post("/batch-evaluate", response_model=BatchEvaluationResponse)
async def batch_evaluate_answers(
    request: BatchEvaluationRequest,
    evaluator: SemanticEvaluator = Depends(get_evaluator),
    processor: TextProcessor = Depends(get_text_processor)
):
    """
    Evaluate multiple descriptive answers in batch
    """
    try:
        logger.info(f"Batch evaluating {len(request.evaluations)} answers")
        
        results = []
        total_score = 0.0
        total_confidence = 0.0
        
        for eval_request in request.evaluations:
            # Process individual evaluation
            processed_question = processor.preprocess(eval_request.question)
            processed_correct = processor.preprocess(eval_request.correctAnswer)
            processed_user = processor.preprocess(eval_request.userAnswer)
            
            result = await evaluator.evaluate(
                question=processed_question,
                correct_answer=processed_correct,
                user_answer=processed_user,
                max_marks=eval_request.maxMarks,
                criteria=eval_request.evaluationCriteria
            )
            
            keywords_matched = processor.extract_keywords(
                eval_request.userAnswer, 
                eval_request.correctAnswer
            )
            
            suggestions = processor.generate_suggestions(
                eval_request.userAnswer,
                eval_request.correctAnswer,
                result['score']
            )
            
            eval_response = EvaluationResponse(
                score=result['score'],
                confidence=result['confidence'],
                feedback=result['feedback'],
                keywordsMatched=keywords_matched,
                suggestions=suggestions,
                semanticSimilarity=result['semantic_similarity'],
                detailedAnalysis=result.get('detailed_analysis', {})
            )
            
            results.append(eval_response)
            total_score += result['score']
            total_confidence += result['confidence']
        
        # Calculate summary statistics
        avg_score = total_score / len(results) if results else 0
        avg_confidence = total_confidence / len(results) if results else 0
        
        summary = {
            "total_evaluations": len(results),
            "average_score": avg_score,
            "average_confidence": avg_confidence,
            "score_distribution": {
                "excellent": len([r for r in results if r.score >= 0.8]),
                "good": len([r for r in results if 0.6 <= r.score < 0.8]),
                "fair": len([r for r in results if 0.4 <= r.score < 0.6]),
                "poor": len([r for r in results if r.score < 0.4])
            }
        }
        
        logger.info(f"Batch evaluation completed. Average score: {avg_score:.2f}")
        
        return BatchEvaluationResponse(
            results=results,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Error during batch evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Batch evaluation failed: {str(e)}")

@app.get("/models/info")
async def get_model_info(evaluator: SemanticEvaluator = Depends(get_evaluator)):
    """Get information about loaded models"""
    return {
        "model_name": evaluator.model_name,
        "model_loaded": evaluator.is_loaded(),
        "supported_languages": ["en"],  # Add more as needed
        "max_sequence_length": 512,
        "embedding_dimension": evaluator.get_embedding_dimension()
    }

@app.post("/models/reload")
async def reload_models(evaluator: SemanticEvaluator = Depends(get_evaluator)):
    """Reload the semantic evaluation model"""
    try:
        await evaluator.reload_model()
        logger.info("Model reloaded successfully")
        return {"status": "success", "message": "Model reloaded successfully"}
    except Exception as e:
        logger.error(f"Error reloading model: {e}")
        raise HTTPException(status_code=500, detail=f"Model reload failed: {str(e)}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500}
    )

if __name__ == "__main__":
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    log_level = os.getenv("LOG_LEVEL", "info")
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level=log_level,
        reload=os.getenv("ENVIRONMENT") == "development"
    )
