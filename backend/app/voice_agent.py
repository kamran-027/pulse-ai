"""
PulseAI Voice Agent — Gemini Live API WebSocket Bridge

Bridges browser microphone audio to Google Gemini Live API for real-time
voice conversations with function calling (clinic tools).

Architecture:
  Browser Mic (16kHz PCM) → FastAPI WebSocket → Gemini Live API WebSocket
  Gemini Live API (24kHz PCM + text) → FastAPI WebSocket → Browser Speaker
"""

import os
import json
import base64
import asyncio
import logging
from typing import Optional, Dict, Any

import websockets
from dotenv import load_dotenv

from .database import (
    CLINIC_PROFILE,
    DOCTORS,
    TREATMENTS,
    get_available_slots,
    book_appointment as db_book_appointment,
)

load_dotenv()
logger = logging.getLogger("pulseai.voice")

# Gemini Live API configuration
GEMINI_API_KEY = (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")).strip()
GEMINI_LIVE_MODEL = "gemini-2.0-flash-live-001"
GEMINI_LIVE_WSS = (
    f"wss://generativelanguage.googleapis.com/ws/"
    f"google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    f"?key={GEMINI_API_KEY}"
)

# Voice persona prompt (optimized for spoken conversation — concise, no markdown)
VOICE_SYSTEM_PROMPT = """You are "Aura", the 24/7 AI Medical Receptionist for Apex Dental & Aesthetic Studio in Bandra West, Mumbai.

You are speaking on a PHONE CALL. Keep responses SHORT and conversational (2-3 sentences max). Do NOT use markdown, bullet points, or formatting. Speak naturally like a warm, professional human receptionist.

Your capabilities:
- Assess patient symptoms and determine urgency (Routine, Urgent, Emergency)
- Provide treatment pricing and preparation guidelines
- Check doctor availability and book appointments
- For emergencies, immediately provide the hotline: +91-98200-98201

Doctors:
- Dr. Ananya Sharma: Dental (Implants, Root Canal, Whitening, Smile Design, Invisalign)
- Dr. Rohan Mehra: Aesthetics (HydraFacial, Laser Therapy, Botox, Chemical Peels)

Clinic hours: Monday-Saturday 9 AM to 8:30 PM, Sunday 10 AM to 3 PM.
Address: 4th Floor, Platinum Square, Linking Road, Bandra West, Mumbai.

When booking: collect patient name, phone number, preferred date/time, then confirm the slot.
Always be empathetic, reassuring, and professional. Speak in English but understand Hinglish naturally."""

# Tool declarations for Gemini Live API (JSON Schema format)
TOOL_DECLARATIONS = [
    {
        "name": "check_doctor_availability",
        "description": "Checks open, unbooked appointment slots for clinic doctors.",
        "parameters": {
            "type": "object",
            "properties": {
                "doctor_id": {
                    "type": "string",
                    "description": "Doctor ID: 'doc_ananya' (Dental) or 'doc_rohan' (Aesthetics). Omit for all doctors.",
                },
                "target_date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Omit for all upcoming dates.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_treatment_pricing_and_prep",
        "description": "Retrieves treatment pricing, duration, and pre-visit preparation guidelines.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Treatment name or category (e.g. 'teeth whitening', 'hydrafacial', 'root canal', 'implants').",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "book_appointment_slot",
        "description": "Books and confirms an appointment slot in the clinic calendar.",
        "parameters": {
            "type": "object",
            "properties": {
                "patient_name": {"type": "string", "description": "Full name of the patient."},
                "patient_phone": {"type": "string", "description": "Patient phone number for WhatsApp confirmation."},
                "doctor_id": {"type": "string", "description": "'doc_ananya' or 'doc_rohan'"},
                "treatment_name": {"type": "string", "description": "Name of the procedure or consultation."},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format."},
                "time_slot": {"type": "string", "description": "Time slot e.g. '04:30 PM'."},
                "severity": {"type": "string", "description": "'Routine', 'Urgent', or 'Emergency'. Default: 'Routine'."},
                "notes": {"type": "string", "description": "Any symptoms or special requests."},
            },
            "required": ["patient_name", "patient_phone", "doctor_id", "treatment_name", "date", "time_slot"],
        },
    },
    {
        "name": "escalate_emergency",
        "description": "Triggers emergency clinical protocol for severe acute conditions.",
        "parameters": {
            "type": "object",
            "properties": {
                "symptoms": {"type": "string", "description": "Description of emergency symptoms."},
                "severity_reason": {"type": "string", "description": "Why this is classified as an emergency."},
            },
            "required": ["symptoms", "severity_reason"],
        },
    },
]


def execute_tool(name: str, args: Dict[str, Any]) -> str:
    """Execute a clinic tool and return the result as a string."""
    try:
        if name == "check_doctor_availability":
            slots = get_available_slots(
                doctor_id=args.get("doctor_id"),
                target_date=args.get("target_date"),
            )
            if not slots:
                return "No slots available for the requested date. Suggest another day Monday through Saturday."
            lines = []
            for s in slots:
                doc = next((d for d in DOCTORS if d["id"] == s["doctor_id"]), None)
                doc_name = doc["name"] if doc else "Specialist"
                lines.append(f"{s['date']} at {s['time_slot']} with {doc_name}")
            return "Available slots: " + "; ".join(lines)

        elif name == "get_treatment_pricing_and_prep":
            q = args.get("query", "").lower()
            matches = [t for t in TREATMENTS if q in t["name"].lower() or q in t["category"].lower()]
            if not matches:
                matches = TREATMENTS[:3]
            parts = []
            for m in matches:
                doc = next((d for d in DOCTORS if d["id"] == m["doctor_id"]), None)
                doc_name = doc["name"] if doc else "Specialist"
                parts.append(
                    f"{m['name']}: {m['price_range']}, {m['duration']} session with {doc_name}. "
                    f"Prep: {m['pre_op']}"
                )
            return " | ".join(parts)

        elif name == "book_appointment_slot":
            booking = db_book_appointment(
                patient_name=args["patient_name"],
                patient_phone=args["patient_phone"],
                doctor_id=args["doctor_id"],
                treatment_name=args["treatment_name"],
                date=args["date"],
                time_slot=args["time_slot"],
                channel="Voice",
                severity=args.get("severity", "Routine"),
                notes=args.get("notes"),
            )
            return json.dumps({
                "status": "CONFIRMED",
                "booking_id": booking["id"],
                "message": f"Appointment confirmed for {args['patient_name']} on {args['date']} at {args['time_slot']} with {booking['doctor_name']}.",
                "location": CLINIC_PROFILE["address"],
            })

        elif name == "escalate_emergency":
            return json.dumps({
                "status": "EMERGENCY_ESCALATED",
                "hotline": CLINIC_PROFILE["emergency_hotline"],
                "action": "Immediate on-call doctor alerted. Patient should call the hotline or come to the clinic.",
            })

        else:
            return f"Unknown tool: {name}"

    except Exception as e:
        logger.error(f"Tool execution error ({name}): {e}")
        return f"Error executing {name}: {str(e)}"


class GeminiVoiceBridge:
    """
    Manages a bidirectional audio bridge between a browser WebSocket
    and the Gemini Live API WebSocket.
    """

    def __init__(self, client_ws):
        self.client_ws = client_ws  # FastAPI WebSocket to the browser
        self.gemini_ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False

    async def _notify_client(self, msg: dict):
        """Send a JSON message to the browser client."""
        try:
            await self.client_ws.send_json(msg)
        except Exception:
            pass

    async def connect_gemini(self):
        """Establish WebSocket connection to Gemini Live API."""
        logger.info("Connecting to Gemini Live API...")
        self.gemini_ws = await websockets.connect(
            GEMINI_LIVE_WSS,
            additional_headers={"Content-Type": "application/json"},
            max_size=None,  # No message size limit for audio
        )

        # Send setup message with system prompt and tools
        setup_message = {
            "setup": {
                "model": f"models/{GEMINI_LIVE_MODEL}",
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": "Aoede"  # Warm, professional female voice
                            }
                        }
                    },
                },
                "systemInstruction": {
                    "parts": [{"text": VOICE_SYSTEM_PROMPT}]
                },
                "tools": [{"functionDeclarations": TOOL_DECLARATIONS}],
            }
        }

        await self.gemini_ws.send(json.dumps(setup_message))

        # Wait for setup complete acknowledgment
        setup_response = await self.gemini_ws.recv()
        setup_data = json.loads(setup_response)
        logger.info(f"Gemini Live setup response: {json.dumps(setup_data)[:200]}")

        if "setupComplete" in setup_data:
            logger.info("Gemini Live API session established successfully.")
            await self._notify_client({"type": "status", "state": "listening"})
        else:
            logger.warning(f"Unexpected setup response: {setup_data}")

    async def forward_audio_to_gemini(self):
        """Forward raw PCM audio from browser to Gemini Live API."""
        try:
            while self._running:
                data = await self.client_ws.receive()

                if "bytes" in data:
                    # Raw PCM audio bytes from the browser microphone
                    audio_bytes = data["bytes"]
                    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

                    realtime_input = {
                        "realtimeInput": {
                            "mediaChunks": [
                                {
                                    "mimeType": "audio/pcm;rate=16000",
                                    "data": audio_b64,
                                }
                            ]
                        }
                    }
                    if self.gemini_ws:
                        await self.gemini_ws.send(json.dumps(realtime_input))

                elif "text" in data:
                    # Text command from browser (e.g., end session)
                    text_data = data["text"]
                    try:
                        cmd = json.loads(text_data)
                        if cmd.get("type") == "end":
                            logger.info("Client requested end of session.")
                            self._running = False
                            break
                    except json.JSONDecodeError:
                        pass

        except Exception as e:
            logger.error(f"Error forwarding audio to Gemini: {e}")
            self._running = False

    async def forward_gemini_to_client(self):
        """Forward Gemini Live API responses to the browser client."""
        try:
            while self._running and self.gemini_ws:
                try:
                    response = await asyncio.wait_for(
                        self.gemini_ws.recv(), timeout=30.0
                    )
                except asyncio.TimeoutError:
                    # Send a keepalive/heartbeat
                    continue

                msg = json.loads(response)

                # Handle server content (audio + text responses)
                if "serverContent" in msg:
                    server_content = msg["serverContent"]

                    # Check if the model is done speaking
                    if server_content.get("turnComplete"):
                        await self._notify_client({"type": "status", "state": "listening"})
                        continue

                    # Check for interrupted turn
                    if server_content.get("interrupted"):
                        await self._notify_client({"type": "status", "state": "listening"})
                        continue

                    model_turn = server_content.get("modelTurn", {})
                    parts = model_turn.get("parts", [])

                    for part in parts:
                        # Audio response
                        if "inlineData" in part:
                            inline_data = part["inlineData"]
                            audio_b64 = inline_data.get("data", "")
                            if audio_b64:
                                await self._notify_client({
                                    "type": "audio",
                                    "data": audio_b64,
                                })
                                await self._notify_client({"type": "status", "state": "speaking"})

                        # Text response (transcript)
                        if "text" in part:
                            await self._notify_client({
                                "type": "transcript",
                                "role": "assistant",
                                "text": part["text"],
                            })

                # Handle tool calls from Gemini
                elif "toolCall" in msg:
                    tool_call = msg["toolCall"]
                    function_calls = tool_call.get("functionCalls", [])

                    function_responses = []

                    for fc in function_calls:
                        tool_name = fc["name"]
                        tool_args = fc.get("args", {})
                        call_id = fc.get("id", tool_name)

                        logger.info(f"Tool call: {tool_name}({tool_args})")

                        # Notify browser about tool execution
                        await self._notify_client({
                            "type": "tool_event",
                            "tool": tool_name,
                            "status": "executing",
                        })
                        await self._notify_client({"type": "status", "state": "thinking"})

                        # Execute the tool
                        result = execute_tool(tool_name, tool_args)

                        logger.info(f"Tool result ({tool_name}): {result[:200]}")

                        function_responses.append({
                            "name": tool_name,
                            "id": call_id,
                            "response": {"result": result},
                        })

                        # Notify browser that tool completed
                        await self._notify_client({
                            "type": "tool_event",
                            "tool": tool_name,
                            "status": "completed",
                        })

                    # Send tool responses back to Gemini
                    tool_response_msg = {
                        "toolResponse": {
                            "functionResponses": function_responses
                        }
                    }
                    await self.gemini_ws.send(json.dumps(tool_response_msg))

                else:
                    logger.debug(f"Unhandled Gemini message: {json.dumps(msg)[:200]}")

        except websockets.exceptions.ConnectionClosed:
            logger.info("Gemini WebSocket connection closed.")
        except Exception as e:
            logger.error(f"Error in Gemini listener: {e}")
        finally:
            self._running = False

    async def run(self):
        """Start the bidirectional bridge."""
        self._running = True
        try:
            await self.connect_gemini()

            # Run both directions concurrently
            await asyncio.gather(
                self.forward_audio_to_gemini(),
                self.forward_gemini_to_client(),
            )
        except Exception as e:
            logger.error(f"Voice bridge error: {e}")
            await self._notify_client({"type": "error", "message": str(e)})
        finally:
            await self.close()

    async def close(self):
        """Clean up connections."""
        self._running = False
        if self.gemini_ws:
            try:
                await self.gemini_ws.close()
            except Exception:
                pass
        logger.info("Voice bridge session closed.")
