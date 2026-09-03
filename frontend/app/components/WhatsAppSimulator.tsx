"use client";

import React from "react";
import {
  MessageSquare,
  CheckCheck,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface WhatsAppSimulatorProps {
  latestBooking?: {
    patient_name: string;
    patient_phone: string;
    treatment_name: string;
    date: string;
    time_slot: string;
    doctor_id?: string;
  } | null;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  latestBooking,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col h-[620px] text-white relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20">
            <MessageSquare className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight">WhatsApp Simulator</h3>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Automated Patient Messaging Pipeline</p>
          </div>
        </div>

        <span className="text-[10px] text-slate-500 font-mono">Bandra West, Mumbai</span>
      </div>

      {/* Phone Simulator Body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 font-sans">
        {/* Contact Banner */}
        <div className="bg-slate-800/80 rounded-2xl p-3 flex items-center gap-3 border border-slate-700/60">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-200 truncate">
              Apex Dental & Aesthetic Studio
            </h4>
            <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Business Account
            </p>
          </div>
        </div>

        {/* Initial Welcome Message */}
        <div className="max-w-[90%] bg-emerald-950/80 border border-emerald-800/60 rounded-2xl rounded-tl-none p-3.5 text-xs text-emerald-100 shadow-sm leading-relaxed">
          <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to Apex Studio
          </p>
          <p>
            Hello! We have received your inquiry. Our clinical AI receptionist <strong>Aura</strong> is connected to our doctor schedules 24/7.
          </p>
          <div className="text-[9px] text-emerald-400/80 mt-2 text-right flex items-center justify-end gap-1 font-mono">
            <span>10:30 PM</span>
            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>

        {/* Dynamic Booking Confirmation Card */}
        {latestBooking ? (
          <div className="max-w-[90%] bg-slate-800/90 border border-teal-500/40 rounded-2xl rounded-tl-none p-4 text-xs text-slate-200 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-1.5 text-teal-400 font-bold mb-2 pb-2 border-b border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>APPOINTMENT CONFIRMED</span>
            </div>

            <p className="text-slate-300 mb-2 leading-relaxed">
              Dear <strong>{latestBooking.patient_name}</strong>, your visit for{" "}
              <strong>{latestBooking.treatment_name}</strong> has been officially reserved!
            </p>

            <div className="bg-slate-900/80 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono border border-slate-700/80">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Date: {latestBooking.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Time: {latestBooking.time_slot}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Linking Rd, Bandra West</span>
              </div>
            </div>

            {/* Pre-Visit Prep */}
            <div className="mt-3 p-2 rounded-lg bg-teal-950/60 border border-teal-900 text-[10px] text-teal-200">
              <p className="font-semibold text-teal-300">📋 Pre-Visit Guidelines:</p>
              <p className="mt-0.5">Please arrive 10 minutes prior to your slot. No makeup/dark beverages for facial/whitening treatments.</p>
            </div>

            <div className="text-[9px] text-slate-400 mt-2 text-right flex items-center justify-end gap-1 font-mono">
              <span>Just now</span>
              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
        ) : (
          <div className="max-w-[90%] bg-slate-800/50 border border-slate-700/50 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 italic">
            <p>
              💡 Complete an appointment booking with Aura in the chat window on the left to see the instant live WhatsApp confirmation trigger here!
            </p>
          </div>
        )}
      </div>

      {/* WhatsApp Simulator Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          End-to-End Encrypted
        </span>
        <span className="font-mono text-emerald-400">WhatsApp Business API</span>
      </div>
    </div>
  );
};
