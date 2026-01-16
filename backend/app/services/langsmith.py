"""LangSmith integration for tracing and evaluation."""

import json
import os
from typing import Optional
from langsmith import Client
from langsmith.run_helpers import traceable
from langchain.schema import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LangSmithService:
    """Service for LangSmith tracing and evaluation."""

    def __init__(self):
        if settings.LANGSMITH_API_KEY:
            os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
            os.environ["LANGCHAIN_TRACING_V2"] = str(settings.LANGCHAIN_TRACING_V2).lower()
            os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT
            
            self.client = Client()
            logger.info("langsmith_initialized", project=settings.LANGSMITH_PROJECT)
        else:
            self.client = None
            logger.warning("langsmith_not_configured")

        self._judge_llm = None

    def _get_judge_llm(self):
        """Get or create the LLM used for LLM-as-judge scoring."""
        if self._judge_llm is not None:
            return self._judge_llm

        if settings.LLM_PROVIDER == "openai":
            self._judge_llm = ChatOpenAI(
                model=settings.LLM_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.0,
            )
        else:
            # Default to Gemini
            self._judge_llm = ChatGoogleGenerativeAI(
                model=settings.LLM_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.0,
                convert_system_message_to_human=True,
            )

        return self._judge_llm

    @staticmethod
    def _truncate(text: str, max_chars: int) -> str:
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "\n\n[TRUNCATED]"

    @staticmethod
    def _coerce_score(value: object) -> float:
        try:
            score = float(value)  # type: ignore[arg-type]
        except Exception:
            return 0.0
        if score < 0.0:
            return 0.0
        if score > 1.0:
            return 1.0
        return score

    @traceable(name="rag_query")
    async def trace_rag_query(
        self,
        query: str,
        response: str,
        sources: list,
        latency_ms: float,
        metadata: Optional[dict] = None,
    ):
        """Trace RAG query for evaluation."""
        if not self.client:
            return
        
        try:
            # Log run to LangSmith
            logger.info(
                "rag_query_traced",
                query=query[:100],
                latency_ms=latency_ms,
                sources=len(sources),
            )
        except Exception as e:
            logger.error("langsmith_tracing_failed", error=str(e))

    @traceable(name="llm_as_judge")
    async def evaluate_response_quality(self, query: str, response: str, context: str) -> float:
        """
        Evaluate response quality using LLM-as-judge.
        
        Returns a score between 0 and 1.
        """
        if not self.client:
            return 0.0
        
        try:
            llm = self._get_judge_llm()

            # Keep prompt sizes bounded (judge doesn't need full docs).
            trimmed_query = self._truncate(query, max_chars=2_000)
            trimmed_answer = self._truncate(response, max_chars=8_000)
            trimmed_context = self._truncate(context, max_chars=12_000)

            system_prompt = (
                "You are a strict LLM-as-judge for RAG answers.\n"
                "Your job is to score the ANSWER for:\n"
                "1) Grounding: claims supported by the provided CONTEXT (no hallucinations)\n"
                "2) Relevance: directly answers the QUESTION\n"
                "3) Completeness: covers the key parts of the QUESTION\n"
                "4) Clarity: well-structured and understandable\n\n"
                "Return ONLY valid JSON with this schema:\n"
                "{\n"
                '  "score": number,   // 0.0 to 1.0 (float)\n'
                '  "rationale": string,\n'
                '  "grounding": number, "relevance": number, "completeness": number, "clarity": number\n'
                "}\n"
                "Be conservative: if the answer contains unsupported claims, penalize grounding heavily."
            )

            user_prompt = (
                f"QUESTION:\n{trimmed_query}\n\n"
                f"CONTEXT:\n{trimmed_context}\n\n"
                f"ANSWER:\n{trimmed_answer}\n"
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]

            result = await llm.ainvoke(messages)
            raw = (result.content or "").strip()

            # Best-effort parse (handle accidental code-fences).
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(raw)
            score = self._coerce_score(parsed.get("score"))

            logger.info(
                "quality_evaluated",
                score=score,
                grounding=self._coerce_score(parsed.get("grounding")),
                relevance=self._coerce_score(parsed.get("relevance")),
                completeness=self._coerce_score(parsed.get("completeness")),
                clarity=self._coerce_score(parsed.get("clarity")),
            )

            return score
            
        except Exception as e:
            logger.error("quality_evaluation_failed", error=str(e))
            return 0.0

