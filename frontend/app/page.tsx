"use client";

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { ClinicHero } from "./components/ClinicHero";
import { ChatWidget } from "./components/ChatWidget";
import { WhatsAppSimulator } from "./components/WhatsAppSimulator";
import { DoctorScheduleFeed } from "./components/DoctorScheduleFeed";
import { Sparkles, Bot, PhoneCall, ShieldCheck, ArrowUpRight, Zap } from "lucide-react";

export default function Home() {
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);
  const [latestBooking, setLatestBooking] = useState<any | null>(null);

  const handleOpenChatWithPrompt = (prompt?: string) => {
    setActivePrompt(prompt);
    // Smooth scroll down to chat widget if on mobile
    if (window.innerWidth < 1024) {
      document.getElementById("receptionist-chat")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBookingConfirmed = (bookingData: any) => {
    setLatestBooking(bookingData);
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 relative pb-16">
      {/* Background Ambience Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 ambient-emerald-glow rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-64 right-1/4 w-96 h-96 ambient-cyan-glow rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-dot-pattern pointer-events-none -z-10" />

      {/* Header */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Cadence Labs Agency Pitch Banner */}
        <div className="p-4 sm:p-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 border border-slate-700 text-white rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md shadow-teal-500/20">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Cadence Labs Live Interactive Client Demo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  MVP Ready
                </span>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Dual-channel autonomous patient intake: Web AI Widget + 24/7 WhatsApp auto-triage and doctor calendar booking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-teal-300 font-mono shrink-0">
            <span>Powered by Gemini 3.6 Flash & LangGraph</span>
          </div>
        </div>

        {/* Hero Section */}
        <ClinicHero onOpenChat={handleOpenChatWithPrompt} />

        {/* Interactive Split-Screen Showcase */}
        <div id="receptionist-chat" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          {/* Left Column: 24/7 AI Receptionist */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-teal-600" />
                <span>Web Channel: AI Medical Receptionist</span>
              </span>
              <span className="text-[11px] text-teal-700 bg-teal-50 font-medium px-2 py-0.5 rounded-full">
                Interactive Test Console
              </span>
            </div>

            <ChatWidget
              initialPrompt={activePrompt}
              onAppointmentBooked={handleBookingConfirmed}
            />
          </div>

          {/* Right Column: Live WhatsApp Phone Simulator */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Channel: Live Patient Preview</span>
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 font-medium px-2 py-0.5 rounded-full">
                Auto-Sync Active
              </span>
            </div>

            <WhatsAppSimulator latestBooking={latestBooking} />
          </div>
        </div>

        {/* Doctor Schedule Feed */}
        <DoctorScheduleFeed />
      </main>
    </div>
  );
}
