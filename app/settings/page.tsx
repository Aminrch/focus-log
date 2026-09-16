"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import {
  clearSupabaseSessions,
  getSupabaseSessions,
} from "@/lib/supabase/sessions";
import { getSupabaseProjects } from "@/lib/supabase/projects";

const TIMER_DURATION_KEY = "focuslog_timer_duration";
const AUTO_START_KEY = "focuslog_auto_start";
const CONFIRM_STOP_KEY = "focuslog_confirm_stop";

const TIMER_OPTIONS = [
  { value: 25 * 60, label: "25 minutes" },
  { value: 50 * 60, label: "50 minutes" },
  { value: 60 * 60, label: "60 minutes" },
  { value: 90 * 60, label: "90 minutes" },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();

  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [autoStart, setAutoStart] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const [sessionCount, setSessionCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  const [loadingData, setLoadingData] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const savedDuration = localStorage.getItem(TIMER_DURATION_KEY);
    const savedAutoStart = localStorage.getItem(AUTO_START_KEY);
    const savedConfirmStop = localStorage.getItem(CONFIRM_STOP_KEY);

    if (savedDuration) {
      const parsed = Number(savedDuration);

      if (Number.isFinite(parsed)) {
        setTimerDuration(parsed);
      }
    }

    if (savedAutoStart === "true") {
      setAutoStart(true);
    }

    if (savedConfirmStop === "true") {
      setConfirmStop(true);
    }
  }, []);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingData(true);

        const [sessions, projects] = await Promise.all([
          getSupabaseSessions(),
          getSupabaseProjects(),
        ]);

        setSessionCount(sessions.length);
        setProjectCount(projects.length);
      } catch (error) {
        console.error("SETTINGS DATA LOAD ERROR:", error);
      } finally {
        setLoadingData(false);
      }
    }

    if (user) {
      loadStats();
    }
  }, [user]);

  function handleDurationChange(value: number) {
    setTimerDuration(value);
    localStorage.setItem(TIMER_DURATION_KEY, String(value));
  }

  function handleAutoStartChange(value: boolean) {
    setAutoStart(value);
    localStorage.setItem(AUTO_START_KEY, String(value));
  }

  function handleConfirmStopChange(value: boolean) {
    setConfirmStop(value);
    localStorage.setItem(CONFIRM_STOP_KEY, String(value));
  }

  async function handleClearSessions() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all your sessions? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setClearing(true);

      await clearSupabaseSessions();

      setSessionCount(0);
    } catch (error) {
      console.error("CLEAR SESSIONS ERROR:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to clear sessions."
      );
    } finally {
      setClearing(false);
    }
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-[#766d60]">
            Loading settings...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  const email = user.email ?? "Unknown email";
  const initial = email.charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#c96a32]">
            FocusLog
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f1e7d0]">
            Settings
          </h1>

          <p className="mt-2 text-sm text-[#766d60]">
            Manage your account, timer preferences and data.
          </p>
        </div>

        {/* Account */}
        <section className="rounded-3xl border border-[#766d60]/20 bg-[#211b16] p-6 shadow-xl shadow-black/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#f1e7d0]">
              Account
            </h2>

            <p className="mt-1 text-sm text-[#766d60]">
              Your current FocusLog account.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-[#766d60]/15 bg-[#332b22] p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#c96a32] text-lg font-bold text-[#f1e7d0] shadow-lg shadow-[#c96a32]/10">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#f1e7d0]">
                {email}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c96a32]" />

                <span className="text-xs text-[#766d60]">
                  Active account
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Timer Preferences */}
        <section className="rounded-3xl border border-[#766d60]/20 bg-[#211b16] p-6 shadow-xl shadow-black/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#f1e7d0]">
              Timer Preferences
            </h2>

            <p className="mt-1 text-sm text-[#766d60]">
              Customize how your focus timer behaves.
            </p>
          </div>

          <div className="space-y-6">
            {/* Duration */}
            <div>
              <label
                htmlFor="timer-duration"
                className="block text-sm font-medium text-[#f1e7d0]"
              >
                Default session duration
              </label>

              <p className="mt-1 text-xs text-[#766d60]">
                This will be used when you start a new focus session.
              </p>

              <select
                id="timer-duration"
                value={timerDuration}
                onChange={(event) =>
                  handleDurationChange(Number(event.target.value))
                }
                className="mt-3 w-full max-w-xs rounded-xl border border-[#766d60]/25 bg-[#332b22] px-4 py-3 text-sm text-[#f1e7d0] outline-none transition focus:border-[#c96a32]"
              >
                {TIMER_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-[#332b22]"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-px bg-[#766d60]/10" />

            {/* Auto start */}
            <ToggleRow
              title="Auto-start timer"
              description="Automatically start the timer when opening the Dashboard."
              checked={autoStart}
              onChange={handleAutoStartChange}
            />

            <div className="h-px bg-[#766d60]/10" />

            {/* Confirm stop */}
            <ToggleRow
              title="Confirm before stopping"
              description="Ask for confirmation before ending an active focus session."
              checked={confirmStop}
              onChange={handleConfirmStopChange}
            />
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-3xl border border-[#766d60]/20 bg-[#211b16] p-6 shadow-xl shadow-black/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#f1e7d0]">
              Appearance
            </h2>

            <p className="mt-1 text-sm text-[#766d60]">
              FocusLog currently uses the Japanese Retro theme.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#c96a32]/30 bg-[#332b22] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c96a32]">
                <div className="h-4 w-4 rounded-full border-2 border-[#f1e7d0]" />
              </div>

              <div>
                <p className="text-sm font-medium text-[#f1e7d0]">
                  Japanese Retro
                </p>

                <p className="mt-1 text-xs text-[#766d60]">
                  Warm cream, brown and burnt orange.
                </p>
              </div>
            </div>

            <span className="rounded-full border border-[#c96a32]/30 bg-[#c96a32]/10 px-3 py-1 text-[11px] font-medium text-[#e08a45]">
              Active
            </span>
          </div>
        </section>

        {/* Data */}
        <section className="rounded-3xl border border-[#766d60]/20 bg-[#211b16] p-6 shadow-xl shadow-black/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#f1e7d0]">
              Data
            </h2>

            <p className="mt-1 text-sm text-[#766d60]">
              Overview of your stored FocusLog data.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Focus Sessions"
              value={loadingData ? "—" : String(sessionCount)}
            />

            <StatCard
              label="Projects"
              value={loadingData ? "—" : String(projectCount)}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[#766d60]/15 bg-[#332b22] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#f1e7d0]">
                  Export your data
                </p>

                <p className="mt-1 text-xs text-[#766d60]">
                  Download your focus sessions as a CSV file.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="rounded-xl border border-[#766d60]/20 bg-[#211b16] px-4 py-2.5 text-xs font-medium text-[#766d60]"
              >
                Export CSV
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-3xl border border-red-500/20 bg-[#211b16] p-6 shadow-xl shadow-black/10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-red-400">
              Danger Zone
            </h2>

            <p className="mt-1 text-sm text-[#766d60]">
              Destructive actions cannot be undone.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#f1e7d0]">
                Clear all sessions
              </p>

              <p className="mt-1 text-xs text-[#766d60]">
                Permanently delete all focus sessions from your account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearSessions}
              disabled={clearing || sessionCount === 0}
              className="shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {clearing ? "Clearing..." : "Clear sessions"}
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-[#f1e7d0]">
          {title}
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#766d60]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#c96a32]" : "bg-[#766d60]/30"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-[#f1e7d0] shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#766d60]/15 bg-[#332b22] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[#766d60]">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold text-[#f1e7d0]">
        {value}
      </p>
    </div>
  );
}
