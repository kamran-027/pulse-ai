"use client";

import React from "react";
import { Sparkles, PhoneCall, ShieldCheck, MapPin, Stethoscope } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Clinic Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Apex Dental & Aesthetic Studio
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                24/7 AI Triage Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Linking Road, Bandra West, Mumbai</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Agency Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            <span>Emergency: +91-98200-98201</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Cadence Labs MVP</span>
          </div>
        </div>
      </div>
    </header>
  );
};
