"""LangChain tools for agent actions (email, Jira, reports)."""

from typing import Optional, Dict, Any
from langchain.tools import Tool
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.core.logging import get_logger

logger = get_logger(__name__)


class EmailDraftInput(BaseModel):
    """Input schema for email draft tool."""
    
    context: str = Field(description="Context or topic for the email")
    recipient: Optional[str] = Field(default=None, description="Optional recipient email/name")
    tone: str = Field(default="professional", description="Email tone: professional, casual, formal, friendly")


class JiraTicketInput(BaseModel):
    """Input schema for Jira ticket tool."""
    
    project_key: str = Field(description="Jira project key (e.g., PROJ)")
    summary: str = Field(description="Ticket summary/title")
    description: str = Field(description="Ticket description")
    issue_type: str = Field(default="Task", description="Issue type: Task, Bug, Story, etc.")


class ReportInput(BaseModel):
    """Input schema for report generation tool."""
    
    document_ids: list[int] = Field(description="List of document IDs to include in report")
    report_type: str = Field(default="summary", description="Report type: summary, analysis, etc.")
    format: str = Field(default="html", description="Report format: html or pdf")


def create_email_draft_tool(agent_service) -> Tool:
    """Create email draft generation tool."""
    
    async def generate_email_draft(
        context: str,
        recipient: Optional[str] = None,
        tone: str = "professional"
    ) -> str:
        """Generate an email draft based on context."""
        try:
            result = await agent_service.generate_email_draft(
                context=context,
                recipient=recipient,
                tone=tone,
            )
            return f"Email draft generated:\nSubject: {result['subject']}\n\nBody:\n{result['body']}"
        except Exception as e:
            logger.error("email_draft_tool_failed", error=str(e))
            return f"Failed to generate email draft: {str(e)}"
    
    return StructuredTool.from_function(
        func=generate_email_draft,
        name="generate_email_draft",
        description="Generate a professional email draft based on context. Use this when the user wants to draft an email.",
        args_schema=EmailDraftInput,
    )


def create_jira_ticket_tool(jira_client_factory) -> Tool:
    """Create Jira ticket creation tool."""
    
    async def create_jira_ticket(
        project_key: str,
        summary: str,
        description: str,
        issue_type: str = "Task"
    ) -> str:
        """Create a Jira ticket."""
        try:
            # Get Jira client from factory (handles tenant-specific credentials)
            if jira_client_factory:
                jira_client = await jira_client_factory()
                if not jira_client:
                    return "Jira credentials not configured. Please configure Jira credentials first."
            else:
                return "Jira client factory not available."
            
            result = jira_client.create_ticket(
                project_key=project_key,
                summary=summary,
                description=description,
                issue_type=issue_type,
            )
            return f"Jira ticket created successfully!\nTicket Key: {result['ticket_key']}\nURL: {result['ticket_url']}"
        except Exception as e:
            logger.error("jira_ticket_tool_failed", error=str(e))
            return f"Failed to create Jira ticket: {str(e)}"
    
    return StructuredTool.from_function(
        func=create_jira_ticket,
        name="create_jira_ticket",
        description="Create a Jira ticket. Use this when the user wants to create a task, bug, or story in Jira.",
        args_schema=JiraTicketInput,
    )


def create_report_tool(report_generator) -> Tool:
    """Create report generation tool."""
    
    async def generate_report(
        document_ids: list[int],
        report_type: str = "summary",
        format: str = "html"
    ) -> str:
        """Generate a report from selected documents."""
        try:
            result = await report_generator(
                document_ids=document_ids,
                report_type=report_type,
                format=format,
            )
            return f"Report generated successfully!\nReport ID: {result['report_id']}\nURL: {result['report_url']}\nDocuments: {', '.join(result['document_names'])}"
        except Exception as e:
            logger.error("report_tool_failed", error=str(e))
            return f"Failed to generate report: {str(e)}"
    
    return StructuredTool.from_function(
        func=generate_report,
        name="generate_report",
        description="Generate a report from selected documents. Use this when the user wants to create a summary or analysis report from documents.",
        args_schema=ReportInput,
    )

