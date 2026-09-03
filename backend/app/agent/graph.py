import os
from typing import Dict, Any, List, Optional, AsyncGenerator
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import langchain_google_genai.chat_models as chat_models
from langgraph.prebuilt import create_react_agent

from .prompts import SYSTEM_RECEPTIONIST_PROMPT
from .tools import TOOLS

load_dotenv()

# --- MONKEYPATCH for thought_signature on Gemini models ---
orig_parse_chat_history = chat_models._parse_chat_history

def patched_parse_chat_history(*args, **kwargs):
    system_instruction, history = orig_parse_chat_history(*args, **kwargs)
    for content in history:
        for part in content.parts:
            if part.function_call:
                part.thought_signature = b"skip_thought_signature_validator"
    return system_instruction, history

chat_models._parse_chat_history = patched_parse_chat_history
# -------------------------------------------------------------

def get_llm():
    """Initializes the Gemini model."""
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY is not set in backend/.env")
    
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    return ChatGoogleGenerativeAI(
        model=gemini_model,
        temperature=0.3,
        google_api_key=api_key.strip(),
    )


def build_receptionist_agent():
    """Creates the compiled LangGraph ReAct agent with clinical tools."""
    llm = get_llm()
    agent = create_react_agent(
        model=llm,
        tools=TOOLS,
        state_modifier=SYSTEM_RECEPTIONIST_PROMPT
    )
    return agent


# Global agent instance (lazy loaded)
_agent_instance = None

def get_agent():
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = build_receptionist_agent()
    return _agent_instance
