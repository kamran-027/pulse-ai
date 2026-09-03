import os
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "clinic.db")

CLINIC_PROFILE = {
    "name": "Apex Dental & Aesthetic Studio",
    "address": "4th Floor, Platinum Square, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
    "phone": "+91-98200-98200",
    "whatsapp": "+91-98200-98200",
    "maps_url": "https://maps.google.com/?q=Apex+Dental+Bandra+Mumbai",
    "timings": "Monday to Saturday: 9:00 AM – 8:30 PM | Sunday: 10:00 AM – 3:00 PM",
    "emergency_hotline": "+91-98200-98201",
}

DOCTORS = [
    {
        "id": "doc_ananya",
        "name": "Dr. Ananya Sharma",
        "qualification": "BDS, MDS (Cosmetic Dentistry & Implantology)",
        "experience": "12+ Years",
        "specialties": ["Dental Implants", "Smile Design", "Laser Teeth Whitening", "Root Canal", "Invisalign"],
        "consultation_fee": 1500,
    },
    {
        "id": "doc_rohan",
        "name": "Dr. Rohan Mehra",
        "qualification": "MBBS, MD (Dermatology & Aesthetic Medicine)",
        "experience": "9+ Years",
        "specialties": ["HydraFacial", "Laser Skin Therapy", "Acne Scar Revision", "Botox & Fillers", "Chemical Peels"],
        "consultation_fee": 2000,
    }
]

TREATMENTS = [
    {
        "name": "Laser Teeth Whitening",
        "category": "Dental",
        "price_range": "₹12,000 – ₹18,000",
        "duration": "45 mins",
        "doctor_id": "doc_ananya",
        "pre_op": "Avoid dark beverages (coffee/tea/wine) 24 hours prior to appointment.",
    },
    {
        "name": "Single Sitting Root Canal",
        "category": "Dental",
        "price_range": "₹7,500 – ₹12,000",
        "duration": "45 mins",
        "doctor_id": "doc_ananya",
        "pre_op": "Have a light meal prior to visit unless sedation is planned.",
    },
    {
        "name": "Dental Implants (Titanium)",
        "category": "Dental",
        "price_range": "₹35,000 – ₹55,000",
        "duration": "60 mins",
        "doctor_id": "doc_ananya",
        "pre_op": "Bring recent OPG X-rays if available; 3D CBCT scan available in-clinic.",
    },
    {
        "name": "HydraFacial Glow Therapy",
        "category": "Aesthetics",
        "price_range": "₹6,500 – ₹9,500",
        "duration": "45 mins",
        "doctor_id": "doc_rohan",
        "pre_op": "Avoid retinoids, direct sun exposure, and chemical exfoliants 48 hours prior.",
    },
    {
        "name": "Laser Skin & Acne Scar Therapy",
        "category": "Aesthetics",
        "price_range": "₹5,000 – ₹12,000 per session",
        "duration": "40 mins",
        "doctor_id": "doc_rohan",
        "pre_op": "Clean skin with no makeup on the day of treatment.",
    },
    {
        "name": "Botox & Dermal Fillers Consultation",
        "category": "Aesthetics",
        "price_range": "₹15,000 – ₹35,000 (Based on units)",
        "duration": "30 mins",
        "doctor_id": "doc_rohan",
        "pre_op": "Avoid blood-thinning supplements and alcohol 24 hours prior.",
    },
]


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db():
    """Initializes tables for doctor schedules and patient bookings."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Appointments Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                patient_phone TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                doctor_name TEXT NOT NULL,
                treatment_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                channel TEXT NOT NULL DEFAULT 'Web',  -- Web or WhatsApp
                severity TEXT NOT NULL DEFAULT 'Routine', -- Routine, Urgent, Emergency
                status TEXT NOT NULL DEFAULT 'CONFIRMED',
                notes TEXT,
                created_at TEXT NOT NULL
            );
        """)
        
        # Doctor Availability Slots Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS availability_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doctor_id TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                is_booked INTEGER NOT NULL DEFAULT 0,
                UNIQUE(doctor_id, date, time_slot)
            );
        """)
        
        # Seed Upcoming Availability Slots if empty
        cursor.execute("SELECT COUNT(*) FROM availability_slots")
        if cursor.fetchone()[0] == 0:
            seed_default_slots(cursor)
            
        conn.commit()


def seed_default_slots(cursor):
    """Pre-seeds availability slots for next 5 days."""
    today = datetime.now()
    default_times = ["10:30 AM", "11:30 AM", "02:00 PM", "04:30 PM", "06:00 PM", "07:30 PM"]
    
    for i in range(1, 6):
        day = today + timedelta(days=i)
        date_str = day.strftime("%Y-%m-%d") # e.g. 2026-09-05
        
        for doc in DOCTORS:
            for time_slot in default_times:
                cursor.execute("""
                    INSERT OR IGNORE INTO availability_slots (doctor_id, date, time_slot, is_booked)
                    VALUES (?, ?, ?, 0)
                """, (doc["id"], date_str, time_slot))


def get_available_slots(doctor_id: Optional[str] = None, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all unbooked availability slots."""
    with get_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM availability_slots WHERE is_booked = 0"
        params = []
        
        if doctor_id:
            query += " AND doctor_id = ?"
            params.append(doctor_id)
            
        if target_date:
            query += " AND date = ?"
            params.append(target_date)
            
        query += " ORDER BY date ASC, time_slot ASC LIMIT 10"
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def book_appointment(
    patient_name: str,
    patient_phone: str,
    doctor_id: str,
    treatment_name: str,
    date: str,
    time_slot: str,
    channel: str = "Web",
    severity: str = "Routine",
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Books a verified appointment and marks the slot as booked."""
    # Find doctor
    doctor = next((d for d in DOCTORS if d["id"] == doctor_id), None)
    doctor_name = doctor["name"] if doctor else "Specialist Doctor"
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Mark slot as booked
        cursor.execute("""
            UPDATE availability_slots 
            SET is_booked = 1 
            WHERE doctor_id = ? AND date = ? AND time_slot = ?
        """, (doctor_id, date, time_slot))
        
        # Insert appointment record
        cursor.execute("""
            INSERT INTO appointments (
                patient_name, patient_phone, doctor_id, doctor_name, 
                treatment_name, date, time_slot, channel, severity, status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
        """, (patient_name, patient_phone, doctor_id, doctor_name, treatment_name, date, time_slot, channel, severity, notes, created_at))
        
        conn.commit()
        appointment_id = cursor.lastrowid
        
        return {
            "id": appointment_id,
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "doctor_name": doctor_name,
            "treatment_name": treatment_name,
            "date": date,
            "time_slot": time_slot,
            "clinic_address": CLINIC_PROFILE["address"],
            "maps_url": CLINIC_PROFILE["maps_url"],
            "emergency_hotline": CLINIC_PROFILE["emergency_hotline"],
            "status": "CONFIRMED",
            "channel": channel,
            "severity": severity,
            "created_at": created_at
        }


def get_recent_appointments(limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieves recent clinic appointments for the admin/doctor feed."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM appointments ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]


# Initialize Database tables on module import
init_db()
