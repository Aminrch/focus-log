"use client";

import { useState } from "react";

import {
  getSessions,
} from "@/lib/sessions";

import {
  migrateLocalSessions,
} from "@/lib/supabase/migrate-sessions";

export default function MigrateSessionsPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMigration() {
    setLoading(true);
    setMessage("Checking local sessions...");

    try {
      const localSessions = getSessions();

      if (localSessions.length === 0) {
        setMessage(
          "No localStorage sessions found."
        );
        return;
      }

      setMessage(
        `Found ${localSessions.length} local sessions. Migrating...`
      );

      const result =
        await migrateLocalSessions(
          localSessions
        );

      setMessage(
        `Migration complete. Imported: ${result.imported}. Skipped: ${result.skipped}.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Migration failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-orange-400">
            FocusLog
          </p>

          <h1 className="mt-2 text-2xl font-semibold">
            Migrate Sessions
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Import your existing localStorage
            sessions into Supabase without creating
            duplicates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMigration}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Migrating..."
            : "Migrate Sessions"}
        </button>

        {message && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-400">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
