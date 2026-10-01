"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Phone,
  PhoneOff,
  Activity,
  Loader2,
  Sparkles,
  Calendar,
  Stethoscope,
  AlertCircle,
  Search,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { API_URL } from "../config";

type AgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

interface TranscriptMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface ToolEvent {
  tool: string;
  status: string;
  label: string;
  icon: string;
}

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  check_doctor_availability: {
    label: "Checking doctor calendar",
    icon: "calendar",
  },
  get_treatment_pricing_and_prep: {
    label: "Looking up treatment info",
    icon: "search",
  },
  book_appointment_slot: {
    label: "Booking appointment",
    icon: "check",
  },
  escalate_emergency: {
    label: "Escalating emergency",
    icon: "alert",
  },
};

function getToolIcon(icon: string) {
  switch (icon) {
    case "calendar":
      return <Calendar className="w-3.5 h-3.5" />;
    case "search":
      return <Search className="w-3.5 h-3.5" />;
    case "check":
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "alert":
      return <AlertCircle className="w-3.5 h-3.5" />;
    default:
      return <Activity className="w-3.5 h-3.5" />;
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Animated waveform bars component
const WaveformBars: React.FC<{
  active: boolean;
  color: string;
  barCount?: number;
}> = ({ active, color, barCount = 5 }) => {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all ${color} ${
            active ? "animate-waveform" : "h-1 opacity-30"
          }`}
          style={{
            animationDelay: active ? `${i * 0.12}s` : "0s",
            animationDuration: active ? `${0.6 + (i % 3) * 0.15}s` : "0s",
          }}
        />
      ))}
    </div>
  );
};

export const VoiceAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [activeTool, setActiveTool] = useState<ToolEvent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioLevelTimerRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, activeTool]);

  // Call duration timer
  useEffect(() => {
    if (isConnected) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isConnected]);

  // Audio level monitoring for real-time visualizer
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      // Average the first 20 frequency bins
      let sum = 0;
      for (let i = 0; i < 20; i++) sum += dataArray[i];
      const avg = sum / 20 / 255;
      setAudioLevel(avg);
      audioLevelTimerRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const connect = async () => {
    try {
      setErrorMsg(null);
      setTranscript([]);
      setAgentState("connecting");

      // 1. Setup AudioContext & Mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AC({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      // Separate playback context at native sample rate for better quality
      const playbackCtx = new AC();
      playbackCtxRef.current = playbackCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Analyser for visualizing mic level
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // 2. Setup WebSocket
      const wsUrl = API_URL.replace("http", "ws") + "/api/voice/stream";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setAgentState("listening");
        monitorAudioLevel();

        // Start sending audio
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          if (typeof event.data === "string") {
            handleWebSocketMessage(JSON.parse(event.data));
          }
        } catch (err) {
          console.error("WS parse error", err);
        }
      };

      ws.onerror = () => {
        setErrorMsg("Connection failed. Is the backend running?");
        disconnect();
      };

      ws.onclose = () => {
        disconnect();
      };
    } catch (err: any) {
      console.error("Voice agent error", err);
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : err.message || "Failed to start"
      );
      setAgentState("idle");
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: "end" }));
      } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    if (audioLevelTimerRef.current) {
      cancelAnimationFrame(audioLevelTimerRef.current);
      audioLevelTimerRef.current = null;
    }
    analyserRef.current = null;
    setIsConnected(false);
    setAgentState("idle");
    setActiveTool(null);
    setAudioLevel(0);
  };

  const handleWebSocketMessage = (msg: any) => {
    if (msg.type === "audio" && msg.data) {
      playAudio(msg.data);
    } else if (msg.type === "transcript") {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTranscript((prev) => [
        ...prev,
        { id: Date.now().toString(), role: msg.role, text: msg.text, timestamp: now },
      ]);
    } else if (msg.type === "tool_event") {
      if (msg.status === "executing") {
        const info = TOOL_LABELS[msg.tool] || {
          label: msg.tool.replace(/_/g, " "),
          icon: "activity",
        };
        setActiveTool({ tool: msg.tool, status: msg.status, ...info });
      } else {
        setActiveTool(null);
      }
    } else if (msg.type === "status") {
      setAgentState(msg.state);
    } else if (msg.type === "error") {
      setErrorMsg(msg.message);
    }
  };

  const playAudio = (base64Data: string) => {
    const ctx = playbackCtxRef.current || audioCtxRef.current;
    if (!ctx) return;

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      if (nextPlayTimeRef.current < ctx.currentTime) {
        nextPlayTimeRef.current = ctx.currentTime;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error("Playback error", err);
    }
  };

  // Derive visual state
  const stateConfig = {
    idle: {
      ringColor: "border-slate-700",
      glowColor: "",
      iconBg: "bg-slate-800/80",
      label: "Ready to assist",
      sublabel: "Tap the button below to start a live call with Aura",
    },
    connecting: {
      ringColor: "border-amber-500/40",
      glowColor: "shadow-amber-500/10",
      iconBg: "bg-amber-500/10",
      label: "Connecting",
      sublabel: "Establishing secure voice channel...",
    },
    listening: {
      ringColor: "border-blue-500/40",
      glowColor: "shadow-blue-500/10",
      iconBg: "bg-blue-500/10",
      label: "Listening",
      sublabel: "Speak naturally — Aura is listening",
    },
    thinking: {
      ringColor: "border-purple-500/40",
      glowColor: "shadow-purple-500/10",
      iconBg: "bg-purple-500/10",
      label: "Processing",
      sublabel: "Analyzing your request...",
    },
    speaking: {
      ringColor: "border-teal-500/40",
      glowColor: "shadow-teal-500/20",
      iconBg: "bg-teal-500/10",
      label: "Aura is speaking",
      sublabel: "Providing your information",
    },
  };

  const state = stateConfig[agentState];
  const isActive = isConnected && agentState !== "idle";

  return (
    <div className="relative">
      {/* Main Card */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-slate-800/80 overflow-hidden">
        {/* Ambient Glow Overlay */}
        {isActive && (
          <div
            className={`absolute inset-0 rounded-3xl pointer-events-none transition-all duration-1000 ${
              agentState === "speaking"
                ? "bg-gradient-to-b from-teal-500/5 via-transparent to-transparent"
                : agentState === "thinking"
                ? "bg-gradient-to-b from-purple-500/5 via-transparent to-transparent"
                : "bg-gradient-to-b from-blue-500/5 via-transparent to-transparent"
            }`}
          />
        )}

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Apex Dental & Aesthetic
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                AI Voice Receptionist
              </p>
            </div>
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-mono text-red-400">
                  {formatDuration(callDuration)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-slate-800/80" />

        {/* Visualizer Core */}
        <div className="relative z-10 flex flex-col items-center justify-center py-10 px-6">
          {/* Concentric Rings */}
          <div className="relative flex items-center justify-center">
            {/* Outer ring */}
            <div
              className={`absolute w-44 h-44 rounded-full border transition-all duration-700 ${state.ringColor} ${
                agentState === "speaking" ? "scale-110 opacity-60" : "scale-100 opacity-30"
              }`}
              style={{
                transform: `scale(${agentState === "speaking" ? 1.1 + audioLevel * 0.2 : 1})`,
              }}
            />
            {/* Middle ring */}
            <div
              className={`absolute w-36 h-36 rounded-full border transition-all duration-500 ${state.ringColor} ${
                isActive ? "opacity-50" : "opacity-20"
              }`}
              style={{
                transform: `scale(${isActive ? 1 + audioLevel * 0.15 : 1})`,
              }}
            />
            {/* Inner ring */}
            <div
              className={`absolute w-28 h-28 rounded-full border-2 transition-all duration-300 ${state.ringColor} ${
                isActive ? "opacity-80" : "opacity-30"
              }`}
              style={{
                transform: `scale(${isActive ? 1 + audioLevel * 0.1 : 1})`,
              }}
            />

            {/* Center Orb */}
            <div
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${state.iconBg} ${state.glowColor} shadow-2xl z-10`}
            >
              {agentState === "idle" ? (
                <Mic className="w-7 h-7 text-slate-400" />
              ) : agentState === "connecting" ? (
                <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              ) : agentState === "thinking" ? (
                <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
              ) : agentState === "speaking" ? (
                <WaveformBars active={true} color="bg-teal-400" barCount={5} />
              ) : (
                <WaveformBars active={audioLevel > 0.02} color="bg-blue-400" barCount={5} />
              )}
            </div>
          </div>

          {/* State Label */}
          <div className="mt-6 text-center">
            <p
              className={`text-sm font-semibold tracking-tight transition-colors duration-300 ${
                agentState === "speaking"
                  ? "text-teal-400"
                  : agentState === "thinking"
                  ? "text-purple-400"
                  : agentState === "connecting"
                  ? "text-amber-400"
                  : isActive
                  ? "text-blue-400"
                  : "text-slate-400"
              }`}
            >
              {state.label}
            </p>
            <p className="text-[12px] text-slate-500 mt-1">{state.sublabel}</p>
          </div>

          {/* Tool Execution Card */}
          {activeTool && (
            <div className="mt-4 bg-slate-800/60 backdrop-blur-lg border border-slate-700/50 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-xl">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                {getToolIcon(activeTool.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-200 truncate">
                  {activeTool.label}
                </p>
                <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full animate-indeterminate" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transcript Area */}
        {(transcript.length > 0 || errorMsg) && (
          <>
            <div className="mx-6 border-t border-slate-800/80" />
            <div className="px-6 py-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                Live Transcript
              </p>
              <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                {transcript.map((msg) => (
                  <div key={msg.id} className="flex gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                        msg.role === "assistant"
                          ? "bg-teal-500/15 text-teal-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {msg.role === "assistant" ? "A" : "Y"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-300">
                          {msg.role === "assistant" ? "Aura" : "You"}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-400 mt-0.5 leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                {errorMsg && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[13px] text-red-400">{errorMsg}</p>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </>
        )}

        {/* Controls Footer */}
        <div className="relative z-10 px-6 pb-6 pt-2">
          <div className="flex items-center justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={connect}
                disabled={agentState === "connecting"}
                className="group relative flex items-center gap-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:from-amber-500 disabled:to-amber-600 text-white font-bold py-3.5 px-10 rounded-2xl shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait"
              >
                {agentState === "connecting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    <span>Call Aura</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="group flex items-center gap-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 font-semibold py-3.5 px-10 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            )}
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Shield className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">
              End-to-end encrypted • HIPAA-ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
