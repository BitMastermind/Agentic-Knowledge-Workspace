"""LangChain agent service with tools."""

from typing import List, Dict
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import Tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

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
        
        self.tools = self._create_tools()

    def _create_tools(self) -> List[Tool]:
        """Create agent tools."""
        
        def email_draft_tool(context: str) -> str:
            """Generate an email draft from context."""
            # TODO: Implement email generation logic
            return f"Email draft based on: {context[:100]}..."
        
        def jira_ticket_tool(summary: str, description: str) -> str:
            """Create a Jira ticket."""
            # TODO: Implement Jira API integration
            return f"Created Jira ticket: {summary}"
        
        def report_generation_tool(document_ids: str) -> str:
            """Generate a report from documents."""
            # TODO: Implement report generation logic
            return f"Generated report for documents: {document_ids}"
        
        return [
            Tool(
                name="EmailDraft",
                func=email_draft_tool,
                description="Generate an email draft from given context. Input should be the context or topic.",
            ),
            Tool(
                name="CreateJiraTicket",
                func=jira_ticket_tool,
                description="Create a Jira ticket. Input should be 'summary|description' separated by pipe.",
            ),
            Tool(
                name="GenerateReport",
                func=report_generation_tool,
                description="Generate a report from document IDs. Input should be comma-separated document IDs.",
            ),
        ]

    async def run_agent(self, query: str, context: str = "") -> Dict:
        """
        Run agent with tools to answer query or take actions.
        """
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful AI assistant with access to tools for email drafting, Jira ticket creation, and report generation."),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
            
            agent = create_openai_functions_agent(self.llm, self.tools, prompt)
            agent_executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)
            
            full_input = query
            if context:
                full_input = f"Context: {context}\\n\\nQuery: {query}"
            
            result = await agent_executor.ainvoke({"input": full_input})
            
            logger.info("agent_execution_completed", query=query[:100])
            return {
                "output": result["output"],
                "intermediate_steps": result.get("intermediate_steps", []),
            }
            
        except Exception as e:
            logger.error("agent_execution_failed", error=str(e))
            raise

    async def generate_email_draft(self, context: str, tone: str = "professional") -> Dict:
        """Generate email draft using LLM."""
        try:
            prompt = f"""Generate a professional email based on the following context:

Context: {context}

Tone: {tone}

Provide:
1. Subject line
2. Email body

Format your response as JSON with keys "subject" and "body".
"""
            messages = [{"role": "user", "content": prompt}]
            response = await self.llm.ainvoke(messages)
            
            # Try to parse JSON response
            import json
            try:
                content = response.content
                # Try to extract JSON if wrapped in markdown
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                parsed = json.loads(content)
                return {
                    "subject": parsed.get("subject", "Email Subject"),
                    "body": parsed.get("body", response.content),
                }
            except:
                # Fallback if JSON parsing fails
                return {
                    "subject": "Generated Email",
                    "body": response.content,
                }
        except Exception as e:
            logger.error("email_draft_failed", error=str(e))
            raise

