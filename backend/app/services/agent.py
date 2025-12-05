"""LangChain agent service with tools."""

from typing import List, Dict, Optional
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import Tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class AgentService:
    """Service for AI agent with tools (email, Jira, reports)."""

    def __init__(self):
        # Initialize LLM based on provider
        if settings.LLM_PROVIDER == "gemini":
            self.llm = ChatGoogleGenerativeAI(
                model=settings.LLM_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.7,
                convert_system_message_to_human=True,
            )
        else:  # openai
            self.llm = ChatOpenAI(
                model=settings.LLM_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
            )

    def _get_llm(self):
        """Get LLM instance."""
        return self.llm

    async def generate_email_draft(
        self,
        context: str,
        recipient: Optional[str] = None,
        tone: str = "professional",
    ) -> Dict[str, str]:
        """
        Generate email draft using LLM.
        
        Args:
            context: Context or topic for the email
            recipient: Optional recipient email/name
            tone: Email tone (professional, casual, formal, friendly)
        
        Returns:
            Dict with subject and body
        """
        try:
            recipient_text = f"Recipient: {recipient}\n" if recipient else ""
            
            prompt = f"""Generate a {tone} email based on the following context:

{recipient_text}Context: {context}

Requirements:
1. Write a clear, concise subject line
2. Write a well-structured email body
3. Use a {tone} tone throughout
4. Make it actionable and professional

Format your response as JSON with exactly these keys:
- "subject": the email subject line
- "body": the email body (can be plain text or markdown)

Example format:
{{
  "subject": "Meeting Follow-up: Project Discussion",
  "body": "Dear [Name],\\n\\nThank you for taking the time to meet..."
}}
"""
            
            messages = [
                SystemMessage(content="You are an expert email writer. Always respond with valid JSON only."),
                HumanMessage(content=prompt),
            ]
            
            response = await self._get_llm().ainvoke(messages)
            
            # Parse JSON response
            import json
            import re
            
            content = response.content
            
            # Try to extract JSON if wrapped in markdown code blocks
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
            
            try:
                parsed = json.loads(content)
                return {
                    "subject": parsed.get("subject", "Email Subject"),
                    "body": parsed.get("body", content),
                }
            except json.JSONDecodeError:
                # Fallback: try to extract subject and body from text
                lines = content.split("\n")
                subject = lines[0].replace("Subject:", "").strip() if lines else "Email Subject"
                body = "\n".join(lines[1:]).strip() if len(lines) > 1 else content
                
                return {
                    "subject": subject[:100],  # Limit subject length
                    "body": body,
                }
                
        except Exception as e:
            logger.error("email_draft_failed", error=str(e))
            raise ValueError(f"Failed to generate email draft: {str(e)}")

