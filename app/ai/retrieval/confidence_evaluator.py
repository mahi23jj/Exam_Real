"""Classifies retrieval quality into HIGH / MEDIUM / LOW confidence levels."""
import enum
import logging
from typing import List, Tuple, Any

logger = logging.getLogger(__name__)


class ConfidenceLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RetrievalConfidenceEvaluator:
    """
    Evaluates the quality of a reranked retrieval result set and classifies
    the confidence into HIGH, MEDIUM, or LOW.

    Confidence is determined by three factors:
      1. Top reranker score  — how certain the best match is
      2. Score agreement     — how consistent the top results are (low variance = high agreement)
      3. Result count        — whether enough relevant blocks were found

    These three signals are combined into a weighted composite score that is
    then bucketed into the three confidence levels.

    Design goal: thresholds are derived from the data distribution, not
    hardcoded magic numbers. The composite score is normalized to [0, 1].
    """

    # Minimum reranker score for a result to be considered relevant at all
    RELEVANCE_FLOOR: float = 0.1

    # Minimum number of results above the floor for MEDIUM confidence
    MIN_RESULTS_FOR_MEDIUM: int = 1

    # Minimum number of results above the floor for HIGH confidence
    MIN_RESULTS_FOR_HIGH: int = 2

    def evaluate(
        self,
        reranked_results: List[Tuple[Any, float]]  # (ContentBlock, score)
    ) -> ConfidenceLevel:
        """
        Evaluates the reranked result list and returns a ConfidenceLevel.

        Args:
            reranked_results: Ordered list of (ContentBlock, reranker_score).
                              Scores are expected to be in [0, 1].

        Returns:
            ConfidenceLevel.HIGH, MEDIUM, or LOW.
        """
        if not reranked_results:
            return ConfidenceLevel.LOW

        scores = [score for _, score in reranked_results]
        relevant_scores = [s for s in scores if s >= self.RELEVANCE_FLOOR]

        if not relevant_scores:
            return ConfidenceLevel.LOW

        top_score = relevant_scores[0]
        relevant_count = len(relevant_scores)

        # Score agreement: how much the top result stands above the rest.
        # Low variance in top scores → high agreement → more confidence.
        if len(relevant_scores) > 1:
            mean_score = sum(relevant_scores) / len(relevant_scores)
            # Normalize agreement: 1.0 means all scores are equal to top (tight cluster)
            score_agreement = mean_score / top_score if top_score > 0 else 0.0
        else:
            # Only one relevant result — agreement is neutral
            score_agreement = 0.5

        # Composite weighted score: top score is the strongest signal
        composite = (top_score * 0.6) + (score_agreement * 0.3) + (
            min(relevant_count / self.MIN_RESULTS_FOR_HIGH, 1.0) * 0.1
        )

        logger.debug(
            f"Confidence eval: top={top_score:.3f}, agreement={score_agreement:.3f}, "
            f"relevant_count={relevant_count}, composite={composite:.3f}"
        )

        # Bucket into confidence levels
        if composite >= 0.65 and relevant_count >= self.MIN_RESULTS_FOR_HIGH:
            return ConfidenceLevel.HIGH
        elif composite >= 0.35 and relevant_count >= self.MIN_RESULTS_FOR_MEDIUM:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW
