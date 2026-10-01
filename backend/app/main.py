import os
import json
import asyncio
import logging
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, Query, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_core.messages import HumanMessage, AIMessage

from .database import (
    CLINIC_PROFILE,
    DOCTORS,
    TREATMENTS,
    get_available_slots,
    get_recent_appointments,
    init_db
)
from .agent.graph import get_agent, get_llm
from .voice_agent import GeminiVoiceBridge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pulseai")

load_dotenv()

app = FastAPI(
    title="PulseAI — Autonomous Medical Receptionist & Triage API",
    description="24/7 AI Receptionist, Medical Triage, Calendar Booking & WhatsApp Engine by Cadence Labs",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    channel: Optional[str] = "Web" # "Web" or "WhatsApp"


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "PulseAI Clinic Receptionist Engine",
        "clinic": CLINIC_PROFILE["name"],
        "version": "1.0.0"
    }


@app.get("/api/clinic")
def get_clinic_info():
    """Returns clinic profile, doctors, treatments, and upcoming slots."""
    return {
        "profile": CLINIC_PROFILE,
        "doctors": DOCTORS,
        "treatments": TREATMENTS,
        "upcoming_slots": get_available_slots()
    }


@app.get("/api/appointments")
def list_appointments(limit: int = 15):
    """Returns recent clinic bookings for the doctor dashboard."""
    return get_recent_appointments(limit=limit)


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Synchronous chat endpoint with complete tool-calling output."""
    try:
        agent = get_agent()
        
        # Convert incoming payload to LangChain message formats
        lc_messages = []
        for msg in request.messages:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            else:
                lc_messages.append(AIMessage(content=msg.content))
        
        # Invoke LangGraph agent
        result = await agent.ainvoke({"messages": lc_messages})
        last_message = result["messages"][-1]
        
        # Extract tool calls if any were executed in the trajectory
        tool_events = []
        for m in result["messages"]:
            if hasattr(m, "tool_calls") and m.tool_calls:
                for tc in m.tool_calls:
                    tool_events.append({
                        "name": tc["name"],
                        "args": tc["args"]
                    })
        
        return {
            "response": last_message.content,
            "tool_calls": tool_events,
            "channel": request.channel
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/stream")
async def chat_stream_endpoint(
    message: str = Query(..., description="User's input query"),
    channel: str = Query("Web", description="Channel: Web or WhatsApp")
):
    """
    SSE Streaming endpoint that streams real-time tool execution events
    and final response tokens to the frontend widget.
    """
    async def event_generator():
        try:
            agent = get_agent()
            
            # Step 1: Emit thinking event
            yield json.dumps({"event": "status", "data": "Triage analysis in progress..."})
            await asyncio.sleep(0.1)
            
            lc_messages = [HumanMessage(content=message)]
            
            # Step 2: Stream graph execution
            async for chunk in agent.astream(
                {"messages": lc_messages},
                stream_mode="updates"
            ):
                for node_name, node_output in chunk.items():
                    if "messages" in node_output:
                        for m in node_output["messages"]:
                            if hasattr(m, "tool_calls") and m.tool_calls:
                                for tc in m.tool_calls:
                                    tool_name = tc["name"]
                                    if tool_name == "check_doctor_availability":
                                        yield json.dumps({"event": "tool", "data": "Checking doctor availability calendar..."})
                                    elif tool_name == "get_treatment_pricing_and_prep":
                                        yield json.dumps({"event": "tool", "data": "Retrieving clinical pricing & pre-op care rules..."})
                                    elif tool_name == "book_appointment_slot":
                                        yield json.dumps({"event": "tool", "data": "Locking appointment slot & dispatching WhatsApp alert..."})
                                    elif tool_name == "escalate_emergency":
                                        yield json.dumps({"event": "tool", "data": "⚠️ Triggering Clinical Emergency Protocol..."})
                                    await asyncio.sleep(0.15)
            
            # Step 3: Get final response
            result = await agent.ainvoke({"messages": lc_messages})
            final_content = result["messages"][-1].content
            
            yield json.dumps({"event": "message", "data": final_content})
            
            # Also send latest appointments update if booking was made
            latest_bookings = get_recent_appointments(limit=5)
            yield json.dumps({"event": "bookings_update", "data": latest_bookings})
            
        except Exception as e:
            yield json.dumps({"event": "error", "data": f"Error: {str(e)}"})

    return EventSourceResponse(event_generator())


@app.websocket("/api/voice/stream")
async def voice_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice conversations.
    
    Browser sends: raw 16-bit PCM audio at 16kHz (binary frames)
    Server sends: JSON messages with audio, transcripts, tool events, and status
    """
    await websocket.accept()
    logger.info("Voice WebSocket client connected.")

    bridge = GeminiVoiceBridge(client_ws=websocket)

    try:
        await bridge.run()
    except WebSocketDisconnect:
        logger.info("Voice WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await bridge.close()
        logger.info("Voice session cleaned up.")
