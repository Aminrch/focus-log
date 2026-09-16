"use client";

import { useState } from "react";
import { createSession } from "@/lib/supabase/sessions";

export default function TestSessionPage() {
  const [message, setMessage] = useState("");

  async function handleTest() {
    setMessage("Saving...");

    try {
      const now = Date.now();

      await createSession({
        startTime: now - 60_000,
        endTime: now,
        duration: 60,
      });

      setMessage("Session saved successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white flex items-center justify-center">
      <button
        onClick={handleTest}
        className="rounded-xl bg-orange-500 px-6 py-3 font-semibold"
      >
        Test Supabase Session
      </button>

      {message && (
        <p className="fixed bottom-10 text-zinc-400">
          {message}
        </p>
      )}
    </main>
  );
}
