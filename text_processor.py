"""
Text Processing Utilities for NLP Service
"""

import re
import string
from typing import List, Set, Dict, Any
import logging

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.stem import PorterStemmer
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    logging.warning("NLTK not available. Using basic text processing.")

try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False
    logging.warning("TextBlob not available. Spell checking disabled.")

from utils.logger import setup_logger

logger = setup_logger(__name__)

class TextProcessor:
    """
    Text processing utilities for quiz answer evaluation
    """
    
    def __init__(self):
        self.stemmer = None
        self.stop_words = set()
        
        if NLTK_AVAILABLE:
            try:
                # Download required NLTK data
                nltk.download('punkt', quiet=True)
                nltk.download('stopwords', quiet=True)
                
                self.stemmer = PorterStemmer()
                self.stop_words = set(stopwords.words('english'))
                logger.info("NLTK initialized successfully")
            except Exception as e:
                logger.warning(f"NLTK initialization failed: {e}")
                NLTK_AVAILABLE = False
        
        # Fallback stop words if NLTK not available
        if not self.stop_words:
            self.stop_words = {
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
                'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
                'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
                'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
                'its', 'our', 'their'
            }
    
    def preprocess(self, text: str, remove_stopwords: bool = False) -> str:
        """
        Preprocess text for evaluation
        
        Args:
            text: Input text to preprocess
            remove_stopwords: Whether to remove stop words
            
        Returns:
            Preprocessed text
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:-]', '', text)
        
        # Normalize punctuation
        text = re.sub(r'[.,!?;:-]+', ' ', text)
        
        # Remove stop words if requested
        if remove_stopwords:
            words = text.split()
            words = [word for word in words if word not in self.stop_words]
            text = ' '.join(words)
        
        return text.strip()
    
    def extract_keywords(self, user_answer: str, correct_answer: str) -> List[str]:
        """
        Extract keywords that appear in both user and correct answers
        
        Args:
            user_answer: Student's answer
            correct_answer: Expected correct answer
            
        Returns:
            List of matched keywords
        """
        # Preprocess both texts
        user_processed = self.preprocess(user_answer, remove_stopwords=True)
        correct_processed = self.preprocess(correct_answer, remove_stopwords=True)
        
        # Extract words
        user_words = set(user_processed.split())
        correct_words = set(correct_processed.split())
        
        # Find common words (keywords)
        keywords = user_words.intersection(correct_words)
        
        # Filter out very short words
        keywords = [word for word in keywords if len(word) > 2]
        
        # Sort by length (longer words first, as they're likely more important)
        keywords.sort(key=len, reverse=True)
        
        return keywords
    
    def extract_important_terms(self, text: str) -> List[str]:
        """
        Extract important terms from text (nouns, technical terms, etc.)
        
        Args:
            text: Input text
            
        Returns:
            List of important terms
        """
        if not text:
            return []
        
        # Preprocess text
        processed = self.preprocess(text)
        
        # Extract words
        words = processed.split()
        
        # Filter important terms
        important_terms = []
        
        for word in words:
            # Skip if too short or is stop word
            if len(word) <= 2 or word in self.stop_words:
                continue
            
            # Include words that:
            # 1. Are longer than 4 characters
            # 2. Contain uppercase letters (likely proper nouns/technical terms)
            # 3. Are not common words
            if (len(word) > 4 or 
                any(c.isupper() for c in word) or
                word not in self._get_common_words()):
                important_terms.append(word)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_terms = []
        for term in important_terms:
            if term not in seen:
                seen.add(term)
                unique_terms.append(term)
        
        return unique_terms[:10]  # Return top 10 terms
    
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate simple text similarity using word overlap
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0 and 1
        """
        if not text1 or not text2:
            return 0.0
        
        # Preprocess texts
        processed1 = self.preprocess(text1, remove_stopwords=True)
        processed2 = self.preprocess(text2, remove_stopwords=True)
        
        # Get word sets
        words1 = set(processed1.split())
        words2 = set(processed2.split())
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def generate_suggestions(self, user_answer: str, correct_answer: str, score: float) -> List[str]:
        """
        Generate improvement suggestions based on the answer and score
        
        Args:
            user_answer: Student's answer
            correct_answer: Expected correct answer
            score: Evaluation score
            
        Returns:
            List of suggestions for improvement
        """
        suggestions = []
        
        if not user_answer.strip():
            suggestions.append("Provide a complete answer to the question.")
            return suggestions
        
        # Length-based suggestions
        user_length = len(user_answer)
        correct_length = len(correct_answer)
        
        if user_length < correct_length * 0.3:
            suggestions.append("Provide more detailed explanation with examples.")
        elif user_length > correct_length * 2.5:
            suggestions.append("Try to be more concise while keeping key points.")
        
        # Content-based suggestions
        user_keywords = set(self.preprocess(user_answer, remove_stopwords=True).split())
        correct_keywords = set(self.preprocess(correct_answer, remove_stopwords=True).split())
        
        missing_keywords = correct_keywords - user_keywords
        if missing_keywords and len(missing_keywords) > 0:
            # Get most important missing keywords (longer ones first)
            important_missing = sorted(
                [word for word in missing_keywords if len(word) > 3],
                key=len, reverse=True
            )[:3]
            
            if important_missing:
                suggestions.append(f"Consider including these concepts: {', '.join(important_missing)}")
        
        # Score-based suggestions
        if score < 0.3:
            suggestions.append("Review the fundamental concepts of this topic.")
            suggestions.append("Make sure you understand what the question is asking.")
        elif score < 0.6:
            suggestions.append("You have the basic idea, but add more specific details.")
            suggestions.append("Include examples or explanations to support your points.")
        elif score < 0.8:
            suggestions.append("Good understanding! Add a bit more depth to your explanation.")
        
        # Grammar and structure suggestions
        if self._has_grammar_issues(user_answer):
            suggestions.append("Check your grammar and sentence structure.")
        
        # Remove duplicates
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion not in unique_suggestions:
                unique_suggestions.append(suggestion)
        
        return unique_suggestions[:5]  # Return top 5 suggestions
    
    def spell_check(self, text: str) -> Dict[str, Any]:
        """
        Perform spell checking on text
        
        Args:
            text: Input text to check
            
        Returns:
            Dictionary with spell check results
        """
        if not TEXTBLOB_AVAILABLE:
            return {
                'corrected_text': text,
                'corrections': [],
                'confidence': 1.0
            }
        
        try:
            blob = TextBlob(text)
            corrected = blob.correct()
            
            # Find differences
            original_words = text.split()
            corrected_words = str(corrected).split()
            
            corrections = []
            for i, (orig, corr) in enumerate(zip(original_words, corrected_words)):
                if orig != corr:
                    corrections.append({
                        'original': orig,
                        'corrected': corr,
                        'position': i
                    })
            
            return {
                'corrected_text': str(corrected),
                'corrections': corrections,
                'confidence': 1.0 - (len(corrections) / max(len(original_words), 1))
            }
        
        except Exception as e:
            logger.warning(f"Spell check failed: {e}")
            return {
                'corrected_text': text,
                'corrections': [],
                'confidence': 1.0
            }
    
    def analyze_readability(self, text: str) -> Dict[str, Any]:
        """
        Analyze text readability
        
        Args:
            text: Input text
            
        Returns:
            Dictionary with readability metrics
        """
        if not text:
            return {
                'word_count': 0,
                'sentence_count': 0,
                'avg_words_per_sentence': 0,
                'complexity': 'low'
            }
        
        # Count words and sentences
        words = len(text.split())
        
        if NLTK_AVAILABLE:
            try:
                sentences = len(sent_tokenize(text))
            except:
                sentences = len([s for s in text.split('.') if s.strip()])
        else:
            sentences = len([s for s in text.split('.') if s.strip()])
        
        avg_words_per_sentence = words / max(sentences, 1)
        
        # Determine complexity
        if avg_words_per_sentence < 10:
            complexity = 'low'
        elif avg_words_per_sentence < 20:
            complexity = 'medium'
        else:
            complexity = 'high'
        
        return {
            'word_count': words,
            'sentence_count': sentences,
            'avg_words_per_sentence': round(avg_words_per_sentence, 1),
            'complexity': complexity
        }
    
    def _get_common_words(self) -> Set[str]:
        """Get set of common English words"""
        return {
            'about', 'after', 'again', 'against', 'all', 'also', 'any', 'because',
            'been', 'before', 'being', 'between', 'both', 'but', 'came', 'can',
            'come', 'could', 'did', 'each', 'even', 'every', 'first', 'from',
            'get', 'got', 'had', 'has', 'have', 'here', 'how', 'into', 'just',
            'like', 'made', 'make', 'many', 'may', 'more', 'most', 'new', 'now',
            'only', 'other', 'over', 'said', 'same', 'see', 'some', 'such',
            'take', 'than', 'them', 'through', 'time', 'two', 'up', 'use',
            'very', 'want', 'water', 'way', 'well', 'went', 'were', 'what',
            'when', 'where', 'which', 'while', 'who', 'why', 'work', 'would'
        }
    
    def _has_grammar_issues(self, text: str) -> bool:
        """
        Simple grammar check
        
        Args:
            text: Input text
            
        Returns:
            True if potential grammar issues detected
        """
        # Simple heuristics for grammar issues
        issues = 0
        
        # Check for repeated words
        words = text.lower().split()
        for i in range(len(words) - 1):
            if words[i] == words[i + 1]:
                issues += 1
        
        # Check for missing capitalization at sentence start
        sentences = text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and not sentence[0].isupper():
                issues += 1
        
        # Check for very long sentences (potential run-on)
        for sentence in sentences:
            if len(sentence.split()) > 30:
                issues += 1
        
        return issues > 2
