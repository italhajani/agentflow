"""
AI Workflow Planner - Takes user description and generates workflow steps
Uses free Groq LLM to plan workflows intelligently
"""
import json
import re
from typing import List, Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import settings
from app.models.user import Agent, ModelProvider


class WorkflowPlanner:
    """AI agent that plans workflows from natural language descriptions"""
    
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY required for workflow planning")
        
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.2,  # Low temp for structured output
            api_key=settings.GROQ_API_KEY,
        )
    
    def plan_workflow(self, user_description: str, existing_agents: List[Dict]) -> Dict:
        """
        Generate a workflow plan from user description
        
        Returns:
        {
            "name": "Workflow name",
            "description": "What this workflow does",
            "steps": [
                {
                    "step_order": 1,
                    "type": "use_agent",  # or "create_agent" or "external_api"
                    "description": "What this step does",
                    "agent_id": 123,  # if use_agent
                    "agent_to_create": {  # if create_agent
                        "name": "Web Scraper",
                        "role": "Web Scraper",
                        "goal": "Scrape content from websites",
                        "tools": ["web_search"],
                        "model_provider": "groq"
                    },
                    "external_api": {  # if external_api
                        "name": "Slack",
                        "url": "https://slack.com/api/...",
                        "method": "POST"
                    },
                    "depends_on": []  # step numbers this depends on
                }
            ]
        }
        """
        
        system_prompt = """You are an AI Workflow Planner. Your job is to analyze user requests and create detailed workflow plans.

Rules:
1. Break complex tasks into simple, atomic steps
2. Each step should do ONE thing
3. Identify dependencies between steps
4. For each step, decide if we should:
   - USE_AGENT: Use an existing agent (provide agent_id if matches)
   - CREATE_AGENT: Create a new agent on the spot
   - EXTERNAL_API: Use an external API (Slack, Email, etc.)
5. Provide realistic names, roles, and goals for new agents
6. Keep the workflow efficient (avoid unnecessary steps)

Available existing agents:
{existing_agents}

Output ONLY valid JSON with this structure:
{{
    "name": "clear_workflow_name",
    "description": "brief_description",
    "steps": [
        {{
            "step_order": 1,
            "type": "use_agent",
            "description": "what this step does",
            "agent_id": 123,
            "depends_on": []
        }},
        {{
            "step_order": 2,
            "type": "create_agent",
            "description": "what this step does",
            "agent_to_create": {{
                "name": "Agent Name",
                "role": "Role description",
                "goal": "Goal description",
                "tools": ["web_search", "calculator"],
                "model_provider": "groq",
                "model_name": "llama3-8b-8192"
            }},
            "depends_on": [1]
        }},
        {{
            "step_order": 3,
            "type": "external_api",
            "description": "send result to Slack",
            "external_api": {{
                "name": "Slack",
                "action": "send_message",
                "config": {{
                    "channel": "results"
                }}
            }},
            "depends_on": [2]
        }}
    ]
}}"""

        # Format existing agents for prompt
        agents_text = "\n".join([
            f"- ID {a['id']}: {a['name']} - {a['role']}"
            for a in existing_agents[:20]  # Limit to avoid token overflow
        ]) or "No existing agents yet. You'll need to create new ones."

        messages = [
            SystemMessage(content=system_prompt.format(existing_agents=agents_text)),
            HumanMessage(content=f"User request: {user_description}\n\nCreate a workflow plan.")
        ]
        
        response = self.llm.invoke(messages)
        
        # Extract JSON from response (handle markdown code blocks)
        content = response.content
        json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        elif '```' in content:
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        
        try:
            plan = json.loads(content)
            return plan
        except json.JSONDecodeError as e:
            # Fallback: return a basic structure
            return {
                "name": "Generated Workflow",
                "description": user_description[:200],
                "steps": [
                    {
                        "step_order": 1,
                        "type": "create_agent",
                        "description": "Process user request",
                        "agent_to_create": {
                            "name": "Task Processor",
                            "role": "Process user tasks",
                            "goal": user_description[:200],
                            "tools": ["web_search"],
                            "model_provider": "groq",
                            "model_name": "llama3-8b-8192"
                        },
                        "depends_on": []
                    }
                ]
            }