"""
Semantic Evaluator using BERT/Sentence-BERT for quiz answer evaluation
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import torch

try:
    from sentence_transformers import SentenceTransformer
    from transformers import AutoTokenizer, AutoModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logging.warning("Transformers not available. Using fallback evaluation.")

from utils.logger import setup_logger

logger = setup_logger(__name__)

class SemanticEvaluator:
    """
    Semantic evaluator for descriptive quiz answers using BERT-based models
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._loaded = False
        
        logger.info(f"Initializing SemanticEvaluator with model: {model_name}")
        logger.info(f"Using device: {self.device}")
    
    async def load_model(self):
        """Load the semantic similarity model"""
        try:
            if not TRANSFORMERS_AVAILABLE:
                logger.warning("Transformers not available. Using fallback mode.")
                self._loaded = True
                return
            
            logger.info(f"Loading model: {self.model_name}")
            
            # Use SentenceTransformer for better semantic similarity
            self.model = SentenceTransformer(self.model_name, device=self.device)
            
            # Test the model with a simple example
            test_sentences = ["This is a test.", "This is another test."]
            embeddings = self.model.encode(test_sentences)
            logger.info(f"Model loaded successfully. Embedding dimension: {embeddings.shape[1]}")
            
            self._loaded = True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.info("Falling back to simple text matching")
            self._loaded = True  # Mark as loaded to use fallback methods
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._loaded
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings"""
        if self.model and hasattr(self.model, 'get_sentence_embedding_dimension'):
            return self.model.get_sentence_embedding_dimension()
        return 384  # Default for all-MiniLM-L6-v2
    
    async def reload_model(self):
        """Reload the model"""
        self._loaded = False
        self.model = None
        await self.load_model()
    
    async def evaluate(
        self,
        question: str,
        correct_answer: str,
        user_answer: str,
        max_marks: int = 5,
        criteria: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a user's answer against the correct answer
        
        Args:
            question: The quiz question
            correct_answer: The expected correct answer
            user_answer: The student's answer
            max_marks: Maximum marks for this question
            criteria: Specific evaluation criteria
            
        Returns:
            Dictionary containing score, confidence, feedback, and analysis
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Handle empty answers
        if not user_answer.strip():
            return {
                'score': 0.0,
                'confidence': 100.0,
                'feedback': 'No answer provided.',
                'semantic_similarity': 0.0,
                'detailed_analysis': {
                    'length_analysis': 'Empty answer',
                    'keyword_coverage': 0.0,
                    'semantic_coherence': 0.0
                }
            }
        
        try:
            if TRANSFORMERS_AVAILABLE and self.model:
                return await self._evaluate_with_bert(
                    question, correct_answer, user_answer, max_marks, criteria
                )
            else:
                return await self._evaluate_fallback(
                    question, correct_answer, user_answer, max_marks, criteria
                )
        except Exception as e:
            logger.error(f"Error during evaluation: {e}")
            # Fallback to simple evaluation
            return await self._evaluate_fallback(
                question, correct_answer, user_answer, max_marks, criteria
            )
    
    async def _evaluate_with_bert(
        self,
        question: str,
        correct_answer: str,
        user_answer: str,
        max_marks: int,
        criteria: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Evaluate using BERT-based semantic similarity"""
        
        # Generate embeddings
        texts = [correct_answer, user_answer]
        embeddings = self.model.encode(texts, convert_to_tensor=True)
        
        # Calculate semantic similarity
        similarity_matrix = cosine_similarity(
            embeddings[0].cpu().numpy().reshape(1, -1),
            embeddings[1].cpu().numpy().reshape(1, -1)
        )
        semantic_similarity = float(similarity_matrix[0][0])
        
        # Analyze answer components
        analysis = await self._analyze_answer_components(
            question, correct_answer, user_answer
        )
        
        # Calculate final score
        score = self._calculate_final_score(
            semantic_similarity, analysis, criteria
        )
        
        # Generate feedback
        feedback = self._generate_feedback(
            score, semantic_similarity, analysis
        )
        
        # Calculate confidence based on various factors
        confidence = self._calculate_confidence(
            semantic_similarity, analysis, len(user_answer)
        )
        
        return {
            'score': score,
            'confidence': confidence,
            'feedback': feedback,
            'semantic_similarity': semantic_similarity,
            'detailed_analysis': analysis
        }
    
    async def _evaluate_fallback(
        self,
        question: str,
        correct_answer: str,
        user_answer: str,
        max_marks: int,
        criteria: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Fallback evaluation using simple text matching"""
        
        # Simple keyword-based evaluation
        correct_words = set(correct_answer.lower().split())
        user_words = set(user_answer.lower().split())
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'}
        correct_words = correct_words - stop_words
        user_words = user_words - stop_words
        
        # Calculate word overlap
        if len(correct_words) == 0:
            word_overlap = 0.0
        else:
            common_words = correct_words.intersection(user_words)
            word_overlap = len(common_words) / len(correct_words)
        
        # Simple length-based scoring
        length_ratio = min(len(user_answer) / max(len(correct_answer), 1), 1.0)
        
        # Combine scores
        semantic_similarity = (word_overlap * 0.7 + length_ratio * 0.3)
        
        # Basic analysis
        analysis = {
            'length_analysis': f"Answer length: {len(user_answer)} chars (expected ~{len(correct_answer)})",
            'keyword_coverage': word_overlap,
            'semantic_coherence': semantic_similarity,
            'word_overlap': len(correct_words.intersection(user_words)),
            'total_keywords': len(correct_words)
        }
        
        # Calculate score
        score = min(semantic_similarity, 1.0)
        
        # Generate feedback
        if score >= 0.8:
            feedback = "Excellent answer! Shows comprehensive understanding."
        elif score >= 0.6:
            feedback = "Good answer with most key concepts covered."
        elif score >= 0.4:
            feedback = "Fair answer but missing some important points."
        else:
            feedback = "Answer needs significant improvement. Please review the topic."
        
        # Confidence is lower for fallback method
        confidence = min(score * 80, 85)  # Cap at 85% for fallback
        
        return {
            'score': score,
            'confidence': confidence,
            'feedback': feedback,
            'semantic_similarity': semantic_similarity,
            'detailed_analysis': analysis
        }
    
    async def _analyze_answer_components(
        self,
        question: str,
        correct_answer: str,
        user_answer: str
    ) -> Dict[str, Any]:
        """Analyze various components of the answer"""
        
        analysis = {}
        
        # Length analysis
        correct_length = len(correct_answer)
        user_length = len(user_answer)
        length_ratio = user_length / max(correct_length, 1)
        
        if length_ratio < 0.3:
            length_analysis = "Answer is too short"
        elif length_ratio > 2.0:
            length_analysis = "Answer is too long"
        else:
            length_analysis = "Answer length is appropriate"
        
        analysis['length_analysis'] = length_analysis
        analysis['length_ratio'] = length_ratio
        
        # Keyword coverage
        correct_keywords = self._extract_keywords(correct_answer)
        user_keywords = self._extract_keywords(user_answer)
        
        if correct_keywords:
            keyword_coverage = len(correct_keywords.intersection(user_keywords)) / len(correct_keywords)
        else:
            keyword_coverage = 0.0
        
        analysis['keyword_coverage'] = keyword_coverage
        analysis['keywords_found'] = list(correct_keywords.intersection(user_keywords))
        analysis['keywords_missing'] = list(correct_keywords - user_keywords)
        
        # Semantic coherence (simplified)
        sentences = user_answer.split('.')
        coherence_score = min(len([s for s in sentences if len(s.strip()) > 10]) / max(len(sentences), 1), 1.0)
        analysis['semantic_coherence'] = coherence_score
        
        return analysis
    
    def _extract_keywords(self, text: str) -> set:
        """Extract important keywords from text"""
        words = text.lower().split()
        
        # Remove stop words and short words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        
        keywords = {word for word in words if len(word) > 2 and word not in stop_words}
        return keywords
    
    def _calculate_final_score(
        self,
        semantic_similarity: float,
        analysis: Dict[str, Any],
        criteria: Optional[List[str]]
    ) -> float:
        """Calculate the final score based on multiple factors"""
        
        # Base score from semantic similarity
        score = semantic_similarity
        
        # Adjust based on keyword coverage
        keyword_coverage = analysis.get('keyword_coverage', 0.0)
        score = score * 0.7 + keyword_coverage * 0.3
        
        # Adjust based on length appropriateness
        length_ratio = analysis.get('length_ratio', 1.0)
        if length_ratio < 0.3:
            score *= 0.8  # Penalize very short answers
        elif length_ratio > 3.0:
            score *= 0.9  # Slightly penalize very long answers
        
        # Adjust based on semantic coherence
        coherence = analysis.get('semantic_coherence', 1.0)
        score = score * 0.9 + coherence * 0.1
        
        # Apply criteria-specific adjustments if provided
        if criteria:
            # This would be expanded based on specific criteria
            pass
        
        return min(score, 1.0)
    
    def _generate_feedback(
        self,
        score: float,
        semantic_similarity: float,
        analysis: Dict[str, Any]
    ) -> str:
        """Generate detailed feedback for the student"""
        
        feedback_parts = []
        
        # Overall assessment
        if score >= 0.9:
            feedback_parts.append("Excellent answer! You demonstrate a thorough understanding of the concept.")
        elif score >= 0.7:
            feedback_parts.append("Good answer! You show a solid grasp of the main ideas.")
        elif score >= 0.5:
            feedback_parts.append("Fair answer. You understand some key concepts but could improve.")
        else:
            feedback_parts.append("Your answer needs improvement. Please review the topic more carefully.")
        
        # Specific feedback based on analysis
        keyword_coverage = analysis.get('keyword_coverage', 0.0)
        if keyword_coverage < 0.5:
            missing_keywords = analysis.get('keywords_missing', [])
            if missing_keywords:
                feedback_parts.append(f"Consider including these important concepts: {', '.join(missing_keywords[:3])}.")
        
        length_ratio = analysis.get('length_ratio', 1.0)
        if length_ratio < 0.3:
            feedback_parts.append("Your answer could be more detailed and comprehensive.")
        elif length_ratio > 2.5:
            feedback_parts.append("Try to be more concise while maintaining the key points.")
        
        # Semantic similarity feedback
        if semantic_similarity < 0.4:
            feedback_parts.append("Your answer doesn't closely match the expected response. Review the question and try again.")
        
        return " ".join(feedback_parts)
    
    def _calculate_confidence(
        self,
        semantic_similarity: float,
        analysis: Dict[str, Any],
        answer_length: int
    ) -> float:
        """Calculate confidence in the evaluation"""
        
        # Base confidence from semantic similarity
        confidence = semantic_similarity * 80
        
        # Adjust based on answer length
        if answer_length < 10:
            confidence *= 0.7  # Lower confidence for very short answers
        elif answer_length > 1000:
            confidence *= 0.9  # Slightly lower confidence for very long answers
        
        # Adjust based on keyword coverage
        keyword_coverage = analysis.get('keyword_coverage', 0.0)
        confidence = confidence * 0.8 + keyword_coverage * 20
        
        # Cap confidence for BERT-based evaluation
        if TRANSFORMERS_AVAILABLE and self.model:
            confidence = min(confidence, 95)
        else:
            confidence = min(confidence, 85)  # Lower cap for fallback
        
        return max(confidence, 10)  # Minimum 10% confidence
    
    async def batch_evaluate(
        self,
        evaluations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Evaluate multiple answers in batch for efficiency"""
        
        results = []
        
        for eval_data in evaluations:
            result = await self.evaluate(
                question=eval_data['question'],
                correct_answer=eval_data['correct_answer'],
                user_answer=eval_data['user_answer'],
                max_marks=eval_data.get('max_marks', 5),
                criteria=eval_data.get('criteria')
            )
            results.append(result)
        
        return results
