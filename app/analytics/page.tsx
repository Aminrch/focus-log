"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/app-shell";

import {
  getSupabaseSessions,
  type SupabaseSession,
} from "@/lib/supabase/sessions";

import {
  getSupabaseProjects,
  type SupabaseProject,
} from "@/lib/supabase/projects";

type Range = 7 | 30 | 90;

type DailyPoint = {
  date: string;
  label: string;
  seconds: number;
  sessions: number;
};

type ProjectStat = {
  id: string;
  name: string;
  color: string;
  seconds: number;
  sessions: number;
  percentage: number;
};

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0m";

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRangeStart(range: Range) {
  const today = getStartOfDay(new Date());
  const start = new Date(today);

  start.setDate(start.getDate() - (range - 1));

  return start;
}

function formatDayLabel(date: Date, range: Range) {
  if (range === 90) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (range === 30) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(7);

  const [sessions, setSessions] = useState<SupabaseSession[]>([]);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const sessionsData = await getSupabaseSessions();
        const projectsData = await getSupabaseProjects();

        if (!mounted) return;

        setSessions(sessionsData);
        setProjects(projectsData);
      } catch (err) {
        console.error("ANALYTICS LOAD ERROR:", err);

        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load analytics."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  const rangeStart = useMemo(
    () => getRangeStart(range),
    [range]
  );

  const rangeSessions = useMemo(() => {
    return sessions.filter((session) => {
      return new Date(session.started_at) >= rangeStart;
    });
  }, [sessions, rangeStart]);

  const dailyData = useMemo<DailyPoint[]>(() => {
    const points: DailyPoint[] = [];

    for (let index = 0; index < range; index++) {
      const date = new Date(rangeStart);

      date.setDate(rangeStart.getDate() + index);

      const key = getDateKey(date);

      const daySessions = rangeSessions.filter(
        (session) =>
          getDateKey(new Date(session.started_at)) === key
      );

      const seconds = daySessions.reduce(
        (total, session) =>
          total + session.duration_seconds,
        0
      );

      points.push({
        date: key,
        label: formatDayLabel(date, range),
        seconds,
        sessions: daySessions.length,
      });
    }

    return points;
  }, [range, rangeSessions, rangeStart]);

  const totalSeconds = useMemo(
    () =>
      rangeSessions.reduce(
        (total, session) =>
          total + session.duration_seconds,
        0
      ),
    [rangeSessions]
  );

  const totalSessions = rangeSessions.length;

  const averageSession =
    totalSessions > 0
      ? Math.round(totalSeconds / totalSessions)
      : 0;

  const longestSession =
    totalSessions > 0
      ? Math.max(
          ...rangeSessions.map(
            (session) => session.duration_seconds
          )
        )
      : 0;

  const activeDays = dailyData.filter(
    (day) => day.seconds > 0
  ).length;

  const maxDailySeconds = Math.max(
    ...dailyData.map((day) => day.seconds),
    1
  );

  const projectStats = useMemo<ProjectStat[]>(() => {
    const stats = new Map<string, ProjectStat>();

    for (const project of projects) {
      stats.set(project.id, {
        id: project.id,
        name: project.name,
        color: project.color,
        seconds: 0,
        sessions: 0,
        percentage: 0,
      });
    }

    const unassigned: ProjectStat = {
      id: "unassigned",
      name: "No Project",
      color: "#766d60",
      seconds: 0,
      sessions: 0,
      percentage: 0,
    };

    for (const session of rangeSessions) {
      const project = session.project_id
        ? stats.get(session.project_id)
        : undefined;

      if (project) {
        project.seconds += session.duration_seconds;
        project.sessions += 1;
      } else {
        unassigned.seconds += session.duration_seconds;
        unassigned.sessions += 1;
      }
    }

    const values = Array.from(stats.values()).filter(
      (project) => project.seconds > 0
    );

    if (unassigned.sessions > 0) {
      values.push(unassigned);
    }

    return values
      .map((project) => ({
        ...project,
        percentage:
          totalSeconds > 0
            ? (project.seconds / totalSeconds) * 100
            : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [projects, rangeSessions, totalSeconds]);

  return (
    <AppShell>
      <main className="min-h-screen">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Link
                  href="/"
                  className="text-xs uppercase tracking-[0.22em] text-[#766d60] transition hover:text-[#c96a32]"
                >
                  FocusLog
                </Link>

                <span className="text-[#51483d]">/</span>

                <span className="text-xs uppercase tracking-[0.22em] text-[#c96a32]">
                  Analytics
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Focus Analytics
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a99e8d]">
                A real view of your focus activity, sessions,
                and project distribution.
              </p>
            </div>

            <div className="flex w-fit rounded-2xl border border-[#4a3d31] bg-[#211b16] p-1">
              {[7, 30, 90].map((value) => {
                const selected = range === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setRange(value as Range)
                    }
                    className={[
                      "rounded-xl px-4 py-2.5 text-xs font-semibold transition",
                      selected
                        ? "bg-[#c96a32] text-[#f1e7d0] shadow-lg shadow-[#c96a32]/10"
                        : "text-[#8e8373] hover:bg-[#332b22] hover:text-[#f1e7d0]",
                    ].join(" ")}
                  >
                    {value}D
                  </button>
                );
              })}
            </div>
          </header>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <>
              {/* Stats */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Focus Time"
                  value={formatDuration(totalSeconds)}
                  detail={`${range} day period`}
                />

                <StatCard
                  label="Sessions"
                  value={String(totalSessions)}
                  detail={`${activeDays} active days`}
                />

                <StatCard
                  label="Average Session"
                  value={formatDuration(averageSession)}
                  detail="per completed session"
                />

                <StatCard
                  label="Longest Session"
                  value={formatDuration(longestSession)}
                  detail="best single session"
                />
              </section>

              {/* Chart */}
              <section className="mt-6 rounded-3xl border border-[#4a3d31] bg-[#211b16] p-5 md:p-7">
                <div className="mb-7 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c96a32]">
                      Focus activity
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Daily focus
                    </h2>
                  </div>

                  <p className="text-xs text-[#766d60]">
                    {formatHours(totalSeconds)} total
                  </p>
                </div>

                <DailyChart
                  data={dailyData}
                  maxSeconds={maxDailySeconds}
                  range={range}
                />
              </section>

              {/* Breakdown */}
              <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <ProjectBreakdown
                  projects={projectStats}
                  totalSeconds={totalSeconds}
                />

                <TopFocusDays data={dailyData} />
              </section>

              {/* Extra */}
              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Best Day"
                  value={getBestDay(dailyData)}
                />

                <MetricCard
                  label="Daily Average"
                  value={formatDuration(
                    Math.round(totalSeconds / range)
                  )}
                />

                <MetricCard
                  label="Average Active Day"
                  value={formatDuration(
                    activeDays > 0
                      ? Math.round(
                          totalSeconds / activeDays
                        )
                      : 0
                  )}
                />
              </section>
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function DailyChart({
  data,
  maxSeconds,
  range,
}: {
  data: DailyPoint[];
  maxSeconds: number;
  range: Range;
}) {
  return (
    <div>
      <div className="flex h-64 items-end gap-1.5 md:gap-2">
        {data.map((day, index) => {
          const proportionalHeight =
            day.seconds > 0
              ? (day.seconds / maxSeconds) * 100
              : 0;

          // Even a 1-second session gets a visible bar.
          const height =
            day.seconds > 0
              ? Math.max(4, proportionalHeight)
              : 1.5;

          const showLabel =
            range === 7 ||
            (range === 30 &&
              (index % 3 === 0 ||
                index === data.length - 1)) ||
            (range === 90 &&
              (index % 7 === 0 ||
                index === data.length - 1));

          return (
            <div
              key={day.date}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {day.seconds > 0 && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#594938] bg-[#332b22] px-2.5 py-1.5 text-[10px] text-[#f1e7d0] opacity-0 shadow-xl transition group-hover:opacity-100">
                  {formatDuration(day.seconds)}
                  <span className="ml-1 text-[#8e8373]">
                    · {day.sessions}{" "}
                    {day.sessions === 1
                      ? "session"
                      : "sessions"}
                  </span>
                </div>
              )}

              <div
                className={[
                  "w-full rounded-t-md transition-all duration-300",
                  day.seconds > 0
                    ? "bg-gradient-to-t from-[#a94f22] to-[#e08a45] group-hover:from-[#c96a32] group-hover:to-[#f0a15d]"
                    : "bg-[#332b22]",
                ].join(" ")}
                style={{
                  height: `${height}%`,
                  minHeight:
                    day.seconds > 0 ? "5px" : "2px",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-1.5 md:gap-2">
        {data.map((day, index) => {
          const showLabel =
            range === 7 ||
            (range === 30 &&
              (index % 3 === 0 ||
                index === data.length - 1)) ||
            (range === 90 &&
              (index % 7 === 0 ||
                index === data.length - 1));

          return (
            <div
              key={day.date}
              className="min-w-0 flex-1 text-center"
            >
              {showLabel && (
                <span className="block truncate text-[9px] text-[#766d60]">
                  {day.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectBreakdown({
  projects,
  totalSeconds,
}: {
  projects: ProjectStat[];
  totalSeconds: number;
}) {
  return (
    <div className="rounded-3xl border border-[#4a3d31] bg-[#211b16] p-5 md:p-7">
      <div className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c96a32]">
          Distribution
        </p>

        <h2 className="mt-2 text-xl font-semibold">
          By project
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#4a3d31] px-5 py-10 text-center">
          <p className="text-sm text-[#766d60]">
            No project activity in this period.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {projects.map((project) => (
            <div key={project.id}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: project.color,
                    }}
                  />

                  <span className="truncate text-sm text-[#d8c8a8]">
                    {project.name}
                  </span>
                </div>

                <div className="shrink-0">
                  <span className="text-sm font-semibold text-[#f1e7d0]">
                    {formatDuration(project.seconds)}
                  </span>

                  <span className="ml-2 text-[10px] text-[#766d60]">
                    {project.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#332b22]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${project.percentage}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>

              <p className="mt-1.5 text-[10px] text-[#766d60]">
                {project.sessions}{" "}
                {project.sessions === 1
                  ? "session"
                  : "sessions"}
              </p>
            </div>
          ))}
        </div>
      )}

      {totalSeconds > 0 && (
        <div className="mt-7 border-t border-[#3d3329] pt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#766d60]">
              Total project focus
            </span>

            <span className="font-semibold text-[#d8c8a8]">
              {formatDuration(totalSeconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TopFocusDays({
  data,
}: {
  data: DailyPoint[];
}) {
  const days = [...data]
    .filter((day) => day.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);

  return (
    <div className="rounded-3xl border border-[#4a3d31] bg-[#211b16] p-5 md:p-7">
      <div className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c96a32]">
          Performance
        </p>

        <h2 className="mt-2 text-xl font-semibold">
          Top focus days
        </h2>
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#4a3d31] px-5 py-10 text-center">
          <p className="text-sm text-[#766d60]">
            No focus activity yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day, index) => {
            const date = new Date(
              `${day.date}T12:00:00`
            );

            return (
              <div
                key={day.date}
                className="flex items-center gap-4 rounded-2xl border border-[#3d3329] bg-[#1b1713] p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#332b22] text-xs font-bold text-[#c96a32]">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#d8c8a8]">
                    {date.toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>

                  <p className="mt-1 text-[10px] text-[#766d60]">
                    {day.sessions}{" "}
                    {day.sessions === 1
                      ? "session"
                      : "sessions"}
                  </p>
                </div>

                <span className="text-sm font-semibold text-[#f1e7d0]">
                  {formatDuration(day.seconds)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-[#4a3d31] bg-[#211b16] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#766d60]">
        {label}
      </p>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-[#f1e7d0]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#8e8373]">
        {detail}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#3d3329] bg-[#1e1915] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#766d60]">
        {label}
      </p>

      <p className="mt-3 text-lg font-semibold text-[#d8c8a8]">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl bg-[#211b16]"
          />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-3xl bg-[#211b16]" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-3xl bg-[#211b16]" />
        <div className="h-80 animate-pulse rounded-3xl bg-[#211b16]" />
      </div>
    </div>
  );
}

function ErrorState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-red-900/40 bg-red-950/20 p-8">
      <p className="text-sm font-semibold text-red-400">
        Analytics could not be loaded
      </p>

      <p className="mt-2 text-xs leading-5 text-red-300/70">
        {message}
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-900/30"
      >
        Try again
      </button>
    </div>
  );
}

function getBestDay(data: DailyPoint[]) {
  if (!data.length) return "No activity";

  const best = data.reduce((current, item) =>
    item.seconds > current.seconds ? item : current
  );

  if (best.seconds === 0) {
    return "No activity";
  }

  const date = new Date(`${best.date}T12:00:00`);

  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} · ${formatDuration(best.seconds)}`;
}
