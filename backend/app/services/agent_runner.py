"""
AgentRunner — the core AI execution engine.

Takes an Agent model + task input, spins up a CrewAI agent with
the correct free LLM, runs the task, and streams back steps.

Free model routing:
  groq        → llama3-8b-8192, llama3-70b-8192, mixtral-8x7b
  huggingface → mistralai/Mixtral-8x7B-Instruct-v0.1, etc.
  gemini      → gemini-1.5-flash (free tier)
  ollama      → local fallback
"""
import time
import json
from datetime import datetime, timezone
from typing import Optional, AsyncGenerator

from app.core.config import settings
from app.models.user import Agent, TaskRun, TaskRunStatus, ModelProvider


# ── Available tools registry ──────────────────────────────────────────────────
TOOL_REGISTRY = {
    "web_search":   "DuckDuckGoSearchRun",
    "calculator":   "Calculator",
    "file_reader":  "FileReader",
    "url_reader":   "WebBaseLoader",
}


def get_llm(agent: Agent):
    """Build the correct free LLM based on agent config."""
    if agent.model_provider == ModelProvider.groq:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set. Add it to your .env file.")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=agent.model_name or "llama3-8b-8192",
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            api_key=settings.GROQ_API_KEY,
        )

    elif agent.model_provider == ModelProvider.huggingface:
        if not settings.HUGGINGFACE_API_KEY:
            raise ValueError("HUGGINGFACE_API_KEY not set.")
        from langchain_community.llms import HuggingFaceEndpoint
        return HuggingFaceEndpoint(
            repo_id=agent.model_name or "mistralai/Mixtral-8x7B-Instruct-v0.1",
            temperature=agent.temperature,
            max_new_tokens=agent.max_tokens,
            huggingfacehub_api_token=settings.HUGGINGFACE_API_KEY,
        )

    elif agent.model_provider == ModelProvider.gemini:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set.")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=agent.model_name or "gemini-1.5-flash",
            temperature=agent.temperature,
            max_output_tokens=agent.max_tokens,
            google_api_key=settings.GEMINI_API_KEY,
        )

    elif agent.model_provider == ModelProvider.ollama:
        from langchain_community.llms import Ollama
        return Ollama(
            model=agent.model_name or "llama3",
            temperature=agent.temperature,
        )

    raise ValueError(f"Unknown model provider: {agent.model_provider}")


def build_tools(tool_ids: list) -> list:
    """Build LangChain tool instances from tool IDs."""
    tools = []
    for tid in tool_ids:
        try:
            if tid == "web_search":
                from langchain_community.tools import DuckDuckGoSearchRun
                tools.append(DuckDuckGoSearchRun())
            elif tid == "calculator":
                from langchain_community.tools import WikipediaQueryRun
                from langchain_community.utilities import WikipediaAPIWrapper
                tools.append(WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper()))
        except ImportError as e:
            print(f"⚠️  Tool '{tid}' could not be loaded: {e}")
    return tools


class AgentRunner:
    """
    Executes an agent task and returns a TaskRun result.
    Designed to be called from the task endpoint.
    """

    def __init__(self, agent: Agent):
        self.agent = agent

    def run(self, task_input: str, context: Optional[dict] = None) -> dict:
        """
        Synchronous run — suitable for background task execution.
        Returns a dict with status, result, steps, tokens_used, duration_ms.
        """
        start_time = time.time()
        steps = []

        try:
            llm   = get_llm(self.agent)
            tools = build_tools(self.agent.tools or [])

            # Build the CrewAI agent
            from crewai import Agent as CrewAgent, Task, Crew

            crew_agent = CrewAgent(
                role=self.agent.role,
                goal=self.agent.goal,
                backstory=self.agent.backstory or f"You are {self.agent.name}, an AI assistant.",
                llm=llm,
                tools=tools,
                verbose=True,
                allow_delegation=False,
                max_iter=5,
            )

            # Build the task
            full_task_desc = task_input
            if context:
                full_task_desc += f"\n\nAdditional context:\n{json.dumps(context, indent=2)}"
            if self.agent.instructions:
                full_task_desc += f"\n\nSpecial instructions:\n{self.agent.instructions}"

            crew_task = Task(
                description=full_task_desc,
                agent=crew_agent,
                expected_output="A clear, helpful, well-formatted response.",
            )

            crew = Crew(
                agents=[crew_agent],
                tasks=[crew_task],
                verbose=True,
            )

            # Run it
            result = crew.kickoff()
            result_text = str(result)

            duration_ms = int((time.time() - start_time) * 1000)

            return {
                "status":      TaskRunStatus.completed,
                "result":      result_text,
                "steps":       steps,
                "tokens_used": 0,   # CrewAI doesn't expose this easily yet
                "duration_ms": duration_ms,
                "error":       None,
            }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "status":      TaskRunStatus.failed,
                "result":      None,
                "steps":       steps,
                "tokens_used": 0,
                "duration_ms": duration_ms,
                "error":       str(e),
            }

    def run_simple(self, task_input: str, context: Optional[dict] = None) -> dict:
        """
        Lightweight run using LangChain directly (faster, no CrewAI overhead).
        Good for simple single-step tasks.
        """
        start_time = time.time()
        steps = []

        try:
            llm   = get_llm(self.agent)
            tools = build_tools(self.agent.tools or [])

            system_prompt = (
                f"You are {self.agent.name}.\n"
                f"Role: {self.agent.role}\n"
                f"Goal: {self.agent.goal}\n"
            )
            if self.agent.backstory:
                system_prompt += f"Background: {self.agent.backstory}\n"
            if self.agent.instructions:
                system_prompt += f"\nInstructions:\n{self.agent.instructions}\n"

            if tools:
                from langchain.agents import create_react_agent, AgentExecutor
                from langchain_core.prompts import PromptTemplate

                react_prompt = PromptTemplate.from_template(
                    system_prompt + "\n\nTools available: {tools}\nTool names: {tool_names}\n\n"
                    "Question: {input}\nThought:{agent_scratchpad}"
                )
                agent_chain = create_react_agent(llm=llm, tools=tools, prompt=react_prompt)
                executor    = AgentExecutor(
                    agent=agent_chain,
                    tools=tools,
                    verbose=True,
                    max_iterations=5,
                    handle_parsing_errors=True,
                )
                raw = executor.invoke({"input": task_input})
                result_text = raw.get("output", str(raw))
            else:
                # No tools — direct LLM call
                from langchain_core.messages import HumanMessage, SystemMessage
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_input),
                ]
                response    = llm.invoke(messages)
                result_text = response.content

            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "status":      TaskRunStatus.completed,
                "result":      result_text,
                "steps":       steps,
                "tokens_used": 0,
                "duration_ms": duration_ms,
                "error":       None,
            }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "status":      TaskRunStatus.failed,
                "result":      None,
                "steps":       steps,
                "tokens_used": 0,
                "duration_ms": duration_ms,
                "error":       str(e),
            }
