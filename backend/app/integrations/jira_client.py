"""Jira API client for ticket creation."""

from typing import Dict, Optional
from jira import JIRA
from jira.exceptions import JIRAError

from app.core.logging import get_logger

logger = get_logger(__name__)


class JiraClient:
    """Client for interacting with Jira API."""

    def __init__(
        self,
        server_url: str,
        email: str,
        api_token: str,
    ):
        """
        Initialize Jira client.
        
        Args:
            server_url: Jira server URL (e.g., https://yourcompany.atlassian.net)
            email: Jira user email
            api_token: Jira API token (from https://id.atlassian.com/manage-profile/security/api-tokens)
        """
        self.server_url = server_url
        self.email = email
        self.api_token = api_token
        self._client: Optional[JIRA] = None

    def _get_client(self) -> JIRA:
        """Get or create Jira client instance."""
        if self._client is None:
            try:
                self._client = JIRA(
                    server=self.server_url,
                    basic_auth=(self.email, self.api_token),
                )
                logger.info("jira_client_initialized", server=self.server_url)
            except Exception as e:
                logger.error("jira_client_init_failed", error=str(e))
                raise ValueError(f"Failed to connect to Jira: {str(e)}")
        return self._client

    def create_ticket(
        self,
        project_key: str,
        summary: str,
        description: str,
        issue_type: str = "Task",
        **kwargs,
    ) -> Dict[str, str]:
        """
        Create a Jira ticket.
        
        Args:
            project_key: Project key (e.g., "PROJ")
            summary: Ticket summary/title
            description: Ticket description
            issue_type: Issue type (Task, Bug, Story, etc.)
            **kwargs: Additional fields (assignee, priority, labels, etc.)
        
        Returns:
            Dict with ticket_key and ticket_url
        """
        try:
            client = self._get_client()
            
            # Build issue dict
            issue_dict = {
                "project": {"key": project_key},
                "summary": summary,
                "description": description,
                "issuetype": {"name": issue_type},
            }
            
            # Add any additional fields
            issue_dict.update(kwargs)
            
            # Create issue
            new_issue = client.create_issue(fields=issue_dict)
            
            ticket_key = new_issue.key
            ticket_url = f"{self.server_url}/browse/{ticket_key}"
            
            logger.info(
                "jira_ticket_created",
                ticket_key=ticket_key,
                project_key=project_key,
            )
            
            return {
                "ticket_key": ticket_key,
                "ticket_url": ticket_url,
            }
            
        except JIRAError as e:
            logger.error(
                "jira_ticket_creation_failed",
                error=str(e),
                project_key=project_key,
            )
            raise ValueError(f"Failed to create Jira ticket: {str(e)}")
        except Exception as e:
            logger.error("jira_unexpected_error", error=str(e))
            raise

    def test_connection(self) -> bool:
        """Test connection to Jira."""
        try:
            client = self._get_client()
            client.current_user()
            return True
        except Exception as e:
            logger.error("jira_connection_test_failed", error=str(e))
            return False

