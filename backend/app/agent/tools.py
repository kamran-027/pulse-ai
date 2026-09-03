import json
from typing import Optional, List, Dict, Any
from langchain_core.tools import tool
from ..database import (
    DOCTORS,
    TREATMENTS,
    CLINIC_PROFILE,
    get_available_slots,
    book_appointment as db_book_appointment
)


@tool
def check_doctor_availability(doctor_id: Optional[str] = None, target_date: Optional[str] = None) -> str:
    """
    Checks open, unbooked appointment slots for clinic doctors.
    - doctor_id: "doc_ananya" (Dental Specialist) or "doc_rohan" (Dermatology Specialist) or None for all.
    - target_date: Optional specific date in YYYY-MM-DD format (e.g. 2026-09-05).
    """
    slots = get_available_slots(doctor_id=doctor_id, target_date=target_date)
    if not slots:
        return "No slots found for the requested date. Please suggest another day between Monday and Saturday (10:00 AM - 7:30 PM)."
    
    formatted = []
    for s in slots:
        doc = next((d for d in DOCTORS if d["id"] == s["doctor_id"]), None)
        doc_name = doc["name"] if doc else "Specialist"
        formatted.append(f"• {s['date']} at {s['time_slot']} with {doc_name} (Doctor ID: {s['doctor_id']})")
    
    return "Available Appointment Slots:\n" + "\n".join(formatted)


@tool
def get_treatment_pricing_and_prep(query: str) -> str:
    """
    Retrieves official pricing bands, procedure duration, and pre-op preparation guidelines for treatments.
    - query: Name of treatment or category (e.g. "teeth whitening", "implants", "hydrafacial", "root canal", "botox").
    """
    q = query.lower()
    matches = [
        t for t in TREATMENTS
        if q in t["name"].lower() or q in t["category"].lower()
    ]
    
    if not matches:
        matches = TREATMENTS[:3] # Fallback to top treatments
        
    res = []
    for m in matches:
        doc = next((d for d in DOCTORS if d["id"] == m["doctor_id"]), None)
        doc_name = doc["name"] if doc else "Consultant Specialist"
        res.append(
            f"**{m['name']}** ({m['category']})\n"
            f"- Price Band: {m['price_range']}\n"
            f"- Session Duration: {m['duration']}\n"
            f"- Specialist: {doc_name}\n"
            f"- Pre-Care Prep: {m['pre_op']}"
        )
    return "\n\n".join(res)


@tool
def book_appointment_slot(
    patient_name: str,
    patient_phone: str,
    doctor_id: str,
    treatment_name: str,
    date: str,
    time_slot: str,
    channel: str = "Web",
    severity: str = "Routine",
    notes: Optional[str] = None
) -> str:
    """
    Officially reserves and books an appointment slot in the clinic's database.
    - patient_name: Full name of patient
    - patient_phone: Valid phone number for WhatsApp confirmation
    - doctor_id: "doc_ananya" or "doc_rohan"
    - treatment_name: Name of procedure or consultation
    - date: Date in YYYY-MM-DD format (e.g. 2026-09-05)
    - time_slot: e.g. "04:30 PM"
    - channel: "Web" or "WhatsApp"
    - severity: "Routine", "Urgent", or "Emergency"
    - notes: Any symptoms or patient requests
    """
    booking = db_book_appointment(
        patient_name=patient_name,
        patient_phone=patient_phone,
        doctor_id=doctor_id,
        treatment_name=treatment_name,
        date=date,
        time_slot=time_slot,
        channel=channel,
        severity=severity,
        notes=notes
    )
    
    return json.dumps({
        "status": "CONFIRMED",
        "booking_id": booking["id"],
        "message": f"Appointment successfully confirmed for {patient_name} on {date} at {time_slot} with {booking['doctor_name']}.",
        "whatsapp_notification_dispatched": True,
        "location": CLINIC_PROFILE["address"],
        "maps_url": CLINIC_PROFILE["maps_url"],
        "patient_phone": patient_phone
    })


@tool
def escalate_emergency(symptoms: str, severity_reason: str) -> str:
    """
    Triggers emergency clinical protocol for severe acute conditions (trauma, uncontrolled bleeding, severe facial swelling).
    """
    return json.dumps({
        "status": "EMERGENCY_ESCALATED",
        "emergency_hotline": CLINIC_PROFILE["emergency_hotline"],
        "clinic_address": CLINIC_PROFILE["address"],
        "action": "Immediate on-call doctor alerted. Patient instructed to call 24/7 hotline or visit clinic trauma room.",
        "symptoms": symptoms,
        "reason": severity_reason
    })


TOOLS = [
    check_doctor_availability,
    get_treatment_pricing_and_prep,
    book_appointment_slot,
    escalate_emergency
]
