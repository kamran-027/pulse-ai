"use client";

import React from "react";
import { Sparkles, Calendar, CheckCircle2, Star, Clock, ShieldCheck, ArrowRight } from "lucide-react";

interface ClinicHeroProps {
  onOpenChat: (presetMessage?: string) => void;
}

export const ClinicHero: React.FC<ClinicHeroProps> = ({ onOpenChat }) => {
  const TREATMENTS = [
    {
      title: "Laser Teeth Whitening",
      category: "Cosmetic Dentistry",
      price: "₹12,000 – ₹18,000",
      time: "45 mins",
      doc: "Dr. Ananya Sharma",
      prompt: "I want to inquire about laser teeth whitening pricing and available slots this week."
    },
    {
      title: "HydraFacial Glow Therapy",
      category: "Aesthetics",
      price: "₹6,500 – ₹9,500",
      time: "45 mins",
      doc: "Dr. Rohan Mehra",
      prompt: "Hi! How does HydraFacial work and what pre-treatment prep do I need before Friday?"
    },
    {
      title: "Dental Implants & Smile Design",
      category: "Implantology",
      price: "₹35,000 – ₹55,000",
      time: "60 mins",
      doc: "Dr. Ananya Sharma",
      prompt: "I have a missing tooth and would like a dental implant consultation with Dr. Ananya."
    },
    {
      title: "Acute Toothache / Emergency Triage",
      category: "Emergency Dental",
      price: "₹1,500 consultation",
      time: "Immediate Slot",
      doc: "On-Call Surgeon",
      prompt: "I have severe sharp tooth pain in my upper molar since last night. Are there emergency slots today?"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Autonomous Medical Intake & Triage System</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Next-Gen Cosmetic & Dental Care with 24/7 AI Reception.
          </h2>

          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
            Experience painless, precision treatments by top specialists in Bandra West. 
            Our autonomous clinical agent <strong>Aura</strong> triages symptoms, quotes pricing, and books appointments across Web and WhatsApp.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenChat()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-600 text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Consult AI Receptionist</span>
              <ArrowRight className="w-4 h-4 text-teal-200" />
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>4.9 / 5.0 (650+ Patient Reviews)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specialty Treatment Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Featured Treatments & Direct AI Intake
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any treatment below to test immediate clinical triage & slot booking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TREATMENTS.map((item, index) => (
            <div
              key={index}
              onClick={() => onOpenChat(item.prompt)}
              className="group bg-white hover:bg-slate-50/90 border border-slate-200/80 hover:border-teal-300 rounded-2xl p-4.5 transition-all shadow-sm hover:shadow-md cursor-pointer relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {item.price}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{item.time} session</span>
                  <span>•</span>
                  <span>{item.doc}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-teal-600 group-hover:text-teal-700">
                <span>Book / Ask Aura AI</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
