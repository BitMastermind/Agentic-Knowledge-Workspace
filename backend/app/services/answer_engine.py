"""Professional answer engine service for RAG responses."""

from typing import List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class AnswerEngineService:
    """
    Professional answer engine that formats responses similar to Google/Perplexity.
    
    Features:
    - Clean, concise paragraph-style answers
    - Sparse inline citations [1], [2], etc.
    - No messy metadata or raw excerpts
    - Professional, neutral tone
    - 3-6 short paragraphs maximum
    """

    SYSTEM_PROMPT = r"""You are a professional answer engine that writes COMPLETE, well-structured responses similar to high-quality Google or Perplexity search results.

CRITICAL RULES FOR COMPLETENESS:

1. COMPREHENSIVE COVERAGE:
   - Identify ALL key aspects of the question and address each one
   - Use information from MULTIPLE sources when available to give a complete picture
   - Don't leave important sub-questions unanswered
   - If the question has multiple parts, answer ALL parts
   - Include relevant context, examples, or details that enhance understanding

2. ANSWER STRUCTURE:
   - Write 3-6 fluent paragraphs that thoroughly cover the topic
   - Start with 1-2 sentences that directly answer the main question
   - Follow with paragraphs that cover different aspects or provide depth
   - Use neutral, professional English
   - No bullet points unless they significantly improve readability
   - No headings unless specifically requested
   - Use proper markdown formatting when appropriate

3. MATHEMATICAL EQUATIONS & LATEX:
   - For inline math, use single dollar signs: $E = mc^2$
   - For display/block math, use double dollar signs on separate lines:
     $$
     \int_{a}^{b} f(x) dx = F(b) - F(a)
     $$
   - Always use LaTeX syntax for mathematical expressions, formulas, and equations
   - Ensure LaTeX is properly formatted and will render correctly
   - Use \frac{}{} for fractions, \sum for summations, \int for integrals, etc.
   - Example inline: "The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$"
   - Example block: Use $$ on separate lines for complex equations

4. CITATIONS:
   - Add bracket citations [1], [2], [3] etc. after sentences that use retrieved context
   - Place citations at the END of sentences, before the period
   - Use citations from MULTIPLE sources to show comprehensive coverage
   - Multiple sources can be cited together like [1,2]
   - Citations refer to the numbered context chunks provided

5. WHAT TO AVOID:
   - NEVER show filenames like "book.pdf" or "document.docx"
   - NEVER show page numbers or chunk IDs in your answer
   - NEVER repeat long excerpts - always paraphrase
   - NEVER say "According to the context..." or "The document states..."
   - NEVER output a separate "Sources:" list - use inline citations only
   - NEVER show raw metadata or technical artifacts
   - NEVER give incomplete or partial answers when more information is available
   - NEVER use plain text for mathematical expressions - always use LaTeX

6. INSUFFICIENT CONTEXT:
   - If context is insufficient for a complete answer, say so briefly
   - Still provide what CAN be answered with proper citations
   - Suggest what additional information might be helpful

7. EXAMPLE OUTPUT STYLE:

Question: "What is photosynthesis and why is it important?"

Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose [1]. This fundamental biological process is essential for life on Earth as it produces the oxygen we breathe and forms the base of most food chains [2].

The process occurs primarily in the chloroplasts of plant cells and consists of two main stages [1,3]. Light-dependent reactions take place in the thylakoid membranes, where solar energy is captured and converted into ATP and NADPH [3]. These energy-carrying molecules then power the second stage.

The light-independent reactions, known as the Calvin cycle, occur in the stroma and use ATP and NADPH to convert carbon dioxide into glucose [2,4]. This sugar serves as the primary energy source for the plant and, through the food chain, for animals and humans [4].

Beyond producing food and oxygen, photosynthesis plays a crucial role in regulating Earth's climate by absorbing carbon dioxide from the atmosphere [2]. This makes it essential for combating climate change and maintaining ecological balance [4].

Question with math: "What is Einstein's mass-energy equivalence?"

Einstein's mass-energy equivalence is expressed by the famous equation $E = mc^2$, where $E$ represents energy, $m$ is mass, and $c$ is the speed of light in vacuum [1]. This equation demonstrates that mass and energy are interchangeable and that even a small amount of mass can be converted into a tremendous amount of energy [2].

The full equation in special relativity is:

$$
E^2 = (mc^2)^2 + (pc)^2
$$

where $p$ is momentum [1]. For an object at rest ($p = 0$), this simplifies to the familiar $E = mc^2$ [3].

Remember: Be COMPLETE, cite from multiple sources, use LaTeX for all math, cover all aspects of the question."""

    def __init__(self):
        """Initialize the answer engine with LLM."""
        self.llm = None

    def _get_llm(self) -> ChatGoogleGenerativeAI:
        """Get or create LLM instance."""
        if not self.llm:
            self.llm = ChatGoogleGenerativeAI(
                model=settings.LLM_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.5,  # Lower for more consistent formatting
            )
        return self.llm

    def _is_conversational_query(self, query: str) -> bool:
        """
        Detect if query is conversational/generic (greetings, small talk, etc.).
        
        Returns True if query should be answered conversationally without document retrieval.
        """
        query_lower = query.lower().strip()
        
        # Common conversational patterns
        conversational_patterns = [
            # Greetings
            r'^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)[\s!.,]*$',
            # Small talk
            r'^(how are you|what\'?s up|how\'?s it going|how do you do)[\s?]*$',
            # Generic thanks
            r'^(thanks|thank you|thx|appreciate it)[\s!.,]*$',
            # Generic questions
            r'^(what can you do|who are you|what are you|help|help me)[\s?]*$',
        ]
        
        import re
        for pattern in conversational_patterns:
            if re.match(pattern, query_lower):
                return True
        
        # Very short queries (1-2 words) that aren't questions
        words = query_lower.split()
        if len(words) <= 2 and not any(q in query_lower for q in ['?', 'what', 'who', 'when', 'where', 'why', 'how', 'which']):
            return True
        
        return False

    def _chunks_are_relevant(self, chunks: List[Dict], min_score: float = 0.4) -> bool:
        """
        Check if retrieved chunks are actually relevant based on similarity scores.
        
        Args:
            chunks: Retrieved chunks with scores
            min_score: Minimum average score threshold for relevance
        
        Returns:
            True if chunks are relevant enough to use
        """
        if not chunks:
            return False
        
        # Check if top chunk scores are above threshold
        top_scores = [chunk.get("score", 0) for chunk in chunks[:3]]
        avg_top_score = sum(top_scores) / len(top_scores) if top_scores else 0
        
        return avg_top_score >= min_score

    def _format_context(self, chunks: List[Dict]) -> str:
        """
        Format retrieved chunks for the LLM context.
        
        Each chunk gets a clean citation number [1], [2], etc.
        """
        context_parts = []
        for idx, chunk in enumerate(chunks, 1):
            # Clean format without exposing metadata to LLM
            context_parts.append(f"[{idx}] {chunk['content']}")
        
        return "\n\n".join(context_parts)

    async def generate_answer(
        self,
        query: str,
        chunks: List[Dict],
        streaming: bool = False,
    ) -> str:
        """
        Generate a professional answer from query and retrieved chunks.
        
        Args:
            query: User's question
            chunks: Retrieved context chunks with content and metadata
            streaming: Whether to stream the response (for future use)
        
        Returns:
            Professional formatted answer with inline citations
        """
        try:
            # Check if query is conversational/generic
            if self._is_conversational_query(query):
                return self._generate_conversational_response(query)
            
            # Check if chunks are actually relevant
            if not chunks or not self._chunks_are_relevant(chunks):
                # Try to answer conversationally if no relevant context
                if self._is_conversational_query(query) or len(query.strip().split()) <= 3:
                    return self._generate_conversational_response(query)
                else:
                    return "I couldn't find any relevant information in your documents to answer this question. Please try uploading more documents or rephrasing your query."
            
            # Format context with citation numbers
            context = self._format_context(chunks)
            
            # Build user prompt
            user_prompt = f"""Context from retrieved documents:

{context}

User Question: {query}

Provide a professional, well-structured answer using the format specified in your instructions. Remember to cite sources with [1], [2], etc. when using information from the context."""

            # Generate answer
            llm = self._get_llm()
            messages = [
                SystemMessage(content=self.SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
            
            response = await llm.ainvoke(messages)
            answer = response.content
            
            # Basic post-processing to remove common artifacts
            answer = self._clean_answer(answer)
            
            logger.info(
                "answer_generated",
                query_length=len(query),
                chunks_used=len(chunks),
                answer_length=len(answer),
            )
            
            return answer
            
        except Exception as e:
            logger.error("answer_generation_failed", error=str(e))
            raise

    def _generate_conversational_response(self, query: str) -> str:
        """
        Generate a conversational response for greetings and generic queries.
        
        Args:
            query: User's conversational query
        
        Returns:
            Friendly, conversational response
        """
        query_lower = query.lower().strip()
        
        # Greeting responses
        if any(greeting in query_lower for greeting in ['hi', 'hello', 'hey', 'greetings', 'howdy']):
            return "Hello! I'm here to help you find information from your uploaded documents. Feel free to ask me questions about the content in your documents, and I'll provide answers with citations."
        
        # Thanks responses
        if any(thanks in query_lower for thanks in ['thanks', 'thank you', 'thx', 'appreciate']):
            return "You're welcome! I'm happy to help. If you have any questions about your documents, just ask!"
        
        # Help/general questions
        if any(help_word in query_lower for help_word in ['help', 'what can you do', 'who are you', 'what are you']):
            return "I'm an AI assistant that helps you find information from your uploaded documents. You can ask me questions about the content in your documents, and I'll search through them to provide accurate answers with source citations. Try asking something like 'What is mentioned about X?' or 'Summarize the key points from the documents.'"
        
        # Default conversational response
        return "I'm here to help you find information from your uploaded documents. Feel free to ask me questions about the content in your documents!"

    def _clean_answer(self, answer: str) -> str:
        """
        Post-process answer to remove common artifacts.
        
        Removes phrases like "According to the context" and cleans up formatting.
        """
        # Remove common unwanted phrases
        unwanted_phrases = [
            "According to the context,",
            "According to the provided context,",
            "Based on the context above,",
            "The context shows that",
            "The document states that",
        ]
        
        cleaned = answer
        for phrase in unwanted_phrases:
            cleaned = cleaned.replace(phrase, "")
            cleaned = cleaned.replace(phrase.lower(), "")
        
        # Clean up any double spaces
        while "  " in cleaned:
            cleaned = cleaned.replace("  ", " ")
        
        # Clean up leading/trailing whitespace
        cleaned = cleaned.strip()
        
        return cleaned

    async def generate_answer_stream(
        self,
        query: str,
        chunks: List[Dict],
    ):
        """
        Generate a professional answer with streaming support.
        
        Yields tokens as they are generated by the LLM.
        """
        try:
            # Check if query is conversational/generic
            if self._is_conversational_query(query):
                response = self._generate_conversational_response(query)
                for char in response:
                    yield char
                return
            
            # Check if chunks are actually relevant
            if not chunks or not self._chunks_are_relevant(chunks):
                # Try to answer conversationally if no relevant context
                if self._is_conversational_query(query) or len(query.strip().split()) <= 3:
                    response = self._generate_conversational_response(query)
                    for char in response:
                        yield char
                    return
                else:
                    yield "I couldn't find any relevant information in your documents to answer this question."
                    return
            
            # Format context
            context = self._format_context(chunks)
            
            # Build user prompt
            user_prompt = f"""Context from retrieved documents:

{context}

User Question: {query}

Provide a professional, well-structured answer using the format specified in your instructions. Remember to cite sources with [1], [2], etc. when using information from the context."""

            # Stream answer
            llm = ChatGoogleGenerativeAI(
                model=settings.LLM_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.5,
                streaming=True,
            )
            
            messages = [
                SystemMessage(content=self.SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
            
            async for chunk in llm.astream(messages):
                if hasattr(chunk, 'content') and chunk.content:
                    yield chunk.content
            
            logger.info(
                "answer_stream_completed",
                query_length=len(query),
                chunks_used=len(chunks),
            )
            
        except Exception as e:
            logger.error("answer_stream_failed", error=str(e))
            raise

