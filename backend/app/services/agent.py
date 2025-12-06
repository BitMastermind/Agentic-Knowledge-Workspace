"""LangChain agent service with tools."""

from typing import List, Dict, Optional, Callable, Awaitable
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import Tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, SystemMessage

from app.core.config import settings
from app.core.logging import get_logger
from app.services.agent_tools import (
    create_email_draft_tool,
    create_jira_ticket_tool,
    create_report_tool,
)

logger = get_logger(__name__)


class AgentService:
    """Service for AI agent with tools (email, Jira, reports)."""

    def __init__(
        self,
        jira_client_factory: Optional[Callable[[], Awaitable]] = None,
        report_generator: Optional[Callable] = None,
    ):
        """
        Initialize agent service.
        
        Args:
            jira_client_factory: Async function that returns a JiraClient instance
            report_generator: Function to generate reports from documents
        """
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
        
        self.jira_client_factory = jira_client_factory
        self.report_generator = report_generator
        self._agent_executor: Optional[AgentExecutor] = None

    def _get_llm(self):
        """Get LLM instance."""
        return self.llm
    
    def _get_tools(self) -> List[Tool]:
        """Get list of LangChain tools for the agent."""
        tools = []
        
        # Email draft tool
        tools.append(create_email_draft_tool(self))
        
        # Jira ticket tool (if factory provided)
        if self.jira_client_factory:
            tools.append(create_jira_ticket_tool(self.jira_client_factory))
        
        # Report generation tool (if generator provided)
        if self.report_generator:
            tools.append(create_report_tool(self.report_generator))
        
        return tools
    
    def _get_agent_executor(self) -> AgentExecutor:
        """Get or create LangChain agent executor with tools."""
        if self._agent_executor is None:
            tools = self._get_tools()
            
            # Create agent prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a helpful AI assistant with access to tools for:
- Generating email drafts
- Creating Jira tickets
- Generating reports from documents

Use the tools when appropriate to help the user accomplish their tasks. Always explain what you're doing before using a tool."""),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            # Create agent (use OpenAI functions agent for function calling)
            # Note: Gemini doesn't support function calling in the same way, so we'll use a simpler approach
            if settings.LLM_PROVIDER == "openai" and len(tools) > 0:
                try:
                    agent = create_openai_functions_agent(self.llm, tools, prompt)
                    # Create executor
                    self._agent_executor = AgentExecutor(
                        agent=agent,
                        tools=tools,
                        verbose=True,
                        handle_parsing_errors=True,
                    )
                except Exception as e:
                    logger.warning("failed_to_create_openai_agent", error=str(e))
                    # Fall back to simple agent
                    self._agent_executor = None
            else:
                # For Gemini or when tools are not available, agent executor is not created
                # The direct methods (generate_email_draft, etc.) will still work
                self._agent_executor = None
                logger.info("agent_executor_not_created", reason="Gemini or no tools available")
        
        return self._agent_executor
    
    async def run_agent(self, input_text: str, chat_history: Optional[List] = None) -> str:
        """
        Run the agent with tools on user input.
        
        Args:
            input_text: User's input/question
            chat_history: Optional chat history
            
        Returns:
            Agent's response
        """
        try:
            executor = self._get_agent_executor()
            if executor is None:
                return "Agent executor is not available. Please use direct endpoints for actions."
            
            result = await executor.ainvoke({
                "input": input_text,
                "chat_history": chat_history or [],
            })
            return result.get("output", "I couldn't process that request.")
        except Exception as e:
            logger.error("agent_execution_failed", error=str(e))
            return f"I encountered an error: {str(e)}"

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

