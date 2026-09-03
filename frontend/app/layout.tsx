import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseAI — Autonomous Medical Receptionist & Clinic Intake Engine",
  description: "24/7 AI Medical Receptionist, Patient Triage, Calendar Booking & WhatsApp Automation by Cadence Labs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
