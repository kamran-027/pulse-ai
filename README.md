# 🩺 PulseAI — Autonomous Medical Receptionist & Clinical Triage Engine

> **24/7 Autonomous AI Medical Receptionist & Clinical Intake Engine with Real-Time WhatsApp Automation & Doctor Calendar Scheduling.**  
> Built under **Cadence Labs** using **LangGraph**, **Google Gemini 3.6 Flash**, **FastAPI**, and **Next.js 15**.

---

## 🌟 Overview

**PulseAI** is a full-stack, dual-channel AI medical receptionist designed for high-ticket medical, dental, and aesthetic clinics (e.g., *Apex Dental & Aesthetic Studio* in Bandra West, Mumbai).

It solves the **"after-hours revenue bleed"** where clinics lose patients when the human front-desk is offline, operating seamlessly across:
1. **Interactive Web Widget**: Deployed on the clinic’s luxury booking web portal.
2. **Autonomous WhatsApp Agent**: Handles instant patient triage, treatment inquiries, doctor calendar booking, and pre-visit care guidelines.

---

## ✨ Key Features

* **🧠 Clinical Symptom Triage**: Empathetically assesses symptoms, determines urgency (Routine vs. Urgent), and triggers emergency safeguards for acute trauma.
* **💰 Transparent Treatment & Pricing RAG**: Provides accurate pricing bands, session durations, and doctor specializations.
* **🗓️ Autonomous Calendar Booking**: Queries real-time doctor availability and locks appointments without human intervention.
* **📱 Real-Time WhatsApp Phone Simulator**: Split-screen UI that simulates instant verified WhatsApp booking confirmation cards, pre-visit instructions, and location navigation pins.
* **👨‍⚕️ Doctor's Live Schedule Feed**: Displays newly confirmed patient appointments in real time.

---

## 🏗️ Tech Stack

| Component | Technology |
|---|---|
| **Agentic Framework** | [LangGraph](https://github.com/langchain-ai/langgraph) / LangChain |
| **LLM Engine** | [Google Gemini 3.6 Flash](https://aistudio.google.com/) |
| **Backend API** | FastAPI, Uvicorn, Python 3.9+ |
| **Database** | SQLite (WAL Mode) / Cloud PostgreSQL |
| **Frontend App** | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Icons & UI** | Lucide React, Glassmorphism |

---

## 🚀 Quickstart Guide

### 1️⃣ Clone Repository
```bash
git clone https://github.com/your-username/pulse-ai.git
cd pulse-ai
```

### 2️⃣ Run Backend (FastAPI)
```bash
cd backend

# Create & activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Add your Gemini API key in backend/.env
# GEMINI_API_KEY="your-gemini-api-key"

# Start the server
uvicorn app.main:app --reload --port 8000
```
> 📍 Backend will run at: `http://127.0.0.1:8000`  
> 📖 Swagger API Docs: `http://127.0.0.1:8000/docs`

---

### 3️⃣ Run Frontend (Next.js)
```bash
cd ../frontend

# Install dependencies
npm install

# Start Next.js dev server
npm run dev
```
> 📍 Frontend will run at: `http://localhost:3001` (or `http://localhost:3000`)

---

## 🧠 System Architecture

```
                 [ Patient Inquires via Web / WhatsApp ]
                                    │
                                    ▼
                 ┌────────────────────────────────────┐
                 │    Node 1: Clinical Triage Agent   │
                 │  • Symptom Assessment & Urgency    │
                 │  • Emergency Red-Flag Detection    │
                 └──────────────────┬─────────────────┘
                                    │
                                    ▼
                 ┌────────────────────────────────────┐
                 │   Node 2: Treatment Pricing RAG    │
                 │  • Procedure pricing & durations   │
                 │  • Pre-op preparation rules        │
                 └──────────────────┬─────────────────┘
                                    │
                                    ▼
                 ┌────────────────────────────────────┐
                 │   Node 3: Calendar Tool Calling    │
                 │  • `check_doctor_availability`     │
                 │  • `book_appointment_slot`         │
                 └──────────────────┬─────────────────┘
                                    │
                                    ▼
                 ┌────────────────────────────────────┐
                 │  Node 4: Multi-Channel Dispatcher  │
                 │  • Instant WhatsApp confirmation   │
                 │  • Sync to Doctor Schedule Feed    │
                 └────────────────────────────────────┘
```

---

## 👨‍💻 Author & Agency

Built by **[Kamran Khan](https://github.com/kamran-027)** under **Cadence Labs** — Elite AI Agents & High-Impact MVPs.
