"use client";

import React, { useState, useEffect } from "react";
import { Calendar, User, Clock, CheckCircle2, Stethoscope, RefreshCw } from "lucide-react";
import { API_URL } from "../config";

export const DoctorScheduleFeed: React.FC = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/appointments`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Doctor's Live Schedule Feed</h3>
            <p className="text-[11px] text-slate-500">Real-time slots locked by AI Receptionist</p>
          </div>
        </div>

        <button
          onClick={fetchAppointments}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {appointments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {appointments.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    {item.channel} Booking
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {item.patient_name}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  {item.treatment_name}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{item.doctor_name.split(" ")[1] || "Doctor"}</span>
                <span className="font-semibold text-slate-700">{item.date} • {item.time_slot}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-slate-400">
          No live appointments booked yet. Try chatting with Aura above!
        </div>
      )}
    </div>
  );
};
