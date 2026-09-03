"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  PhoneCall,
  Activity,
  RefreshCw
} from "lucide-react";
import { API_URL } from "../config";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEvent?: string;
  timestamp: string;
}

interface ChatWidgetProps {
  initialPrompt?: string;
  onAppointmentBooked?: (bookingData: any) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  initialPrompt,
  onAppointmentBooked,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I am **Aura**, the 24/7 AI Clinical Receptionist for **Apex Dental & Aesthetic Studio** in Bandra West.\n\nHow can I help you today? You can ask about our **treatments, pricing, pre-care guidelines**, or let me know your symptoms to check open doctor slots!",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTool]);

  // If initialPrompt changes from quick-click presets, send it
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = (customMessage || input).trim();
    if (!textToSend || loading) return;

    setInput("");
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setActiveTool("Evaluating clinical intake...");

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          channel: "Web",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive response from clinical agent");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If a booking tool was executed, notify parent simulator
      if (data.tool_calls && data.tool_calls.some((tc: any) => tc.name === "book_appointment_slot")) {
        const bookingTool = data.tool_calls.find((tc: any) => tc.name === "book_appointment_slot");
        if (onAppointmentBooked) {
          onAppointmentBooked(bookingTool.args);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "⚠️ I apologize, but I had trouble connecting to the clinic server. Please ensure the backend is running or contact our emergency desk at +91-98200-98201.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I am **Aura**, the 24/7 AI Clinical Receptionist for **Apex Dental & Aesthetic Studio**.\n\nHow can I assist you with treatments, pricing, or doctor appointments today?",
        timestamp: "Just now",
      },
    ]);
  };

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.04)] flex flex-col h-[620px] overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900">Aura AI Receptionist</h3>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Autonomous Clinical Intake & Triage</p>
          </div>
        </div>

        <button
          onClick={handleReset}
          title="Reset conversation"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                AI
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-tr-none shadow-sm"
                  : "bg-slate-100/80 text-slate-800 border border-slate-200/60 rounded-tl-none shadow-sm whitespace-pre-line"
              }`}
            >
              {msg.content}
              <div
                className={`text-[10px] mt-1.5 text-right ${
                  msg.role === "user" ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Live Active Tool Execution Badge */}
        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-teal-50/80 border border-teal-200/70 text-xs text-teal-900 animate-in fade-in duration-150">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
            <span className="font-medium">{activeTool || "Aura is analyzing clinical guidelines..."}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ask Aura anything about treatments, pricing, or symptoms..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white p-2.5 rounded-2xl transition-all shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
