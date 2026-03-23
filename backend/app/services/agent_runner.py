import time
import json
from typing import Optional
from app.core.config import settings
from app.models.user import Agent, TaskRunStatus, ModelProvider


def get_llm(agent: Agent):
    if agent.model_provider == ModelProvider.groq:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set in environment variables.")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=agent.model_name or "llama3-8b-8192",
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            api_key=settings.GROQ_API_KEY,
        )
    elif agent.model_provider == ModelProvider.ollama:
        from langchain_community.llms import Ollama
        return Ollama(model=agent.model_name or "llama3", temperature=agent.temperature)
    else:
        # Default to groq if provider not supported yet
        raise ValueError(f"Provider '{agent.model_provider}' not configured. Use 'groq'.")


def build_tools(tool_ids: list) -> list:
    tools = []
    for tid in tool_ids:
        try:
            if tid == "web_search":
                from langchain_community.tools import DuckDuckGoSearchRun
                tools.append(DuckDuckGoSearchRun())
        except Exception as e:
            print(f"Warning: could not load tool '{tid}': {e}")
    return tools


class AgentRunner:
    def __init__(self, agent: Agent):
        self.agent = agent

    def run(self, task_input: str, context: Optional[dict] = None) -> dict:
        return self.run_simple(task_input, context)

    def run_simple(self, task_input: str, context: Optional[dict] = None) -> dict:
        start_time = time.time()
        try:
            llm = get_llm(self.agent)
            tools = build_tools(self.agent.tools or [])

            system_prompt = f"You are {self.agent.name}.\nRole: {self.agent.role}\nGoal: {self.agent.goal}\n"
            if self.agent.backstory:
                system_prompt += f"Background: {self.agent.backstory}\n"
            if self.agent.instructions:
                system_prompt += f"\nInstructions:\n{self.agent.instructions}\n"
            if context:
                system_prompt += f"\nContext:\n{json.dumps(context, indent=2)}\n"

            if tools:
                from langchain_classic.agents import create_react_agent, AgentExecutor
                from langchain_core.prompts import PromptTemplate
                react_prompt = PromptTemplate.from_template(
                    system_prompt +
                    "\n\nTools: {tools}\nTool names: {tool_names}\n\n"
                    "Question: {input}\nThought:{agent_scratchpad}"
                )
                agent_chain = create_react_agent(llm=llm, tools=tools, prompt=react_prompt)
                executor = AgentExecutor(
                    agent=agent_chain, tools=tools, verbose=False,
                    max_iterations=5, handle_parsing_errors=True,
                )
                raw = executor.invoke({"input": task_input})
                result_text = raw.get("output", str(raw))
            else:
                from langchain_core.messages import HumanMessage, SystemMessage
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=task_input),
                ]
                result_text = llm.invoke(messages).content

            return {
                "status": TaskRunStatus.completed,
                "result": result_text,
                "steps": [],
                "tokens_used": 0,
                "duration_ms": int((time.time() - start_time) * 1000),
                "error": None,
            }

        except Exception as e:
            return {
                "status": TaskRunStatus.failed,
                "result": None,
                "steps": [],
                "tokens_used": 0,
                "duration_ms": int((time.time() - start_time) * 1000),
                "error": str(e),
            }