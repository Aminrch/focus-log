"use client";

import { useAuth } from "@/components/auth-provider";
import AppShell from "@/components/app-shell";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  formatDuration,
  formatTimer,
  getDayIndex,
  isSameDay,
  isSameWeek,
} from "@/lib/sessions";

import {
  createSession,
  getSupabaseSessions,
  type SupabaseSession,
} from "@/lib/supabase/sessions";

import {
  getSupabaseProjects,
  type SupabaseProject,
} from "@/lib/supabase/projects";

type TimerStorage = {
  isRunning: boolean;
  startTime?: number;
  elapsed?: number;
  projectId?: string | null;
  targetDuration?: number;
};

type TimerPreferences = {
  defaultDuration: number;
  autoStart: boolean;
  confirmBeforeStop: boolean;
};

const TIMER_STORAGE_KEY = "focuslog_timer";

const TIMER_DURATION_KEY = "focuslog_timer_duration";
const AUTO_START_KEY = "focuslog_auto_start";
const CONFIRM_STOP_KEY = "focuslog_confirm_stop";

const DEFAULT_PREFERENCES: TimerPreferences = {
  defaultDuration: 25 * 60,
  autoStart: false,
  confirmBeforeStop: false,
};

function readTimerPreferences(): TimerPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const savedDuration = localStorage.getItem(
      TIMER_DURATION_KEY
    );

    const savedAutoStart =
      localStorage.getItem(AUTO_START_KEY);

    const savedConfirmStop =
      localStorage.getItem(CONFIRM_STOP_KEY);

    const parsedDuration = savedDuration
      ? Number(savedDuration)
      : DEFAULT_PREFERENCES.defaultDuration;

    return {
      defaultDuration:
        Number.isFinite(parsedDuration) &&
        parsedDuration > 0
          ? parsedDuration
          : DEFAULT_PREFERENCES.defaultDuration,

      autoStart:
        savedAutoStart === "true",

      confirmBeforeStop:
        savedConfirmStop === "true",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default function Home() {
  const { user } = useAuth();

  const [isRunning, setIsRunning] = useState(false);

  /*
   * elapsed = actual seconds worked.
   * The visible timer is calculated from
   * targetDuration - elapsed.
   */
  const [elapsed, setElapsed] = useState(0);

  const [targetDuration, setTargetDuration] =
    useState(
      DEFAULT_PREFERENCES.defaultDuration
    );

  const [preferences, setPreferences] =
    useState<TimerPreferences>(
      DEFAULT_PREFERENCES
    );

  const [sessions, setSessions] = useState<
    SupabaseSession[]
  >([]);

  const [projects, setProjects] = useState<
    SupabaseProject[]
  >([]);

  const [selectedProjectId, setSelectedProjectId] =
    useState<string | null>(null);

  const [sessionsLoading, setSessionsLoading] =
    useState(true);

  const [projectsLoading, setProjectsLoading] =
    useState(true);

  const [hydrated, setHydrated] = useState(false);

  const startTimeRef = useRef<number | null>(null);

  const autoStartHandledRef =
    useRef(false);

  const finishingRef =
    useRef(false);

  /*
   * ---------------------------------------------------------
   * USER
   * ---------------------------------------------------------
   */

  const userName = useMemo(() => {
    const emailName =
      user?.email?.split("@")[0];

    if (!emailName) {
      return "there";
    }

    const parts = emailName
      .split(/[._-]+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "there";
    }

    return parts
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ");
  }, [user]);

  const userInitial =
    userName.charAt(0).toUpperCase() || "U";

  /*
   * ---------------------------------------------------------
   * GREETING
   * ---------------------------------------------------------
   */

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }, []);

  /*
   * ---------------------------------------------------------
   * PROJECT
   * ---------------------------------------------------------
   */

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) {
      return null;
    }

    return (
      projects.find(
        (project) =>
          project.id === selectedProjectId
      ) ?? null
    );
  }, [projects, selectedProjectId]);

  /*
   * ---------------------------------------------------------
   * INITIALIZE DASHBOARD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      /*
       * Read the exact keys written by Settings.
       */
      const savedPreferences =
        readTimerPreferences();

      if (!mounted) return;

      setPreferences(savedPreferences);

      /*
       * Restore timer.
       */

      let restoredRunningTimer = false;

      const savedTimer =
        localStorage.getItem(
          TIMER_STORAGE_KEY
        );

      if (savedTimer) {
        try {
          const data: TimerStorage =
            JSON.parse(savedTimer);

          if (
            data.isRunning &&
            data.startTime
          ) {
            restoredRunningTimer = true;

            startTimeRef.current =
              data.startTime;

            const savedTarget =
              data.targetDuration ??
              savedPreferences.defaultDuration;

            const currentElapsed = Math.max(
              0,
              Math.floor(
                (Date.now() -
                  data.startTime) /
                  1000
              )
            );

            /*
             * If the timer already finished while
             * the page was closed, don't restore it
             * as an active timer.
             */
            if (
              currentElapsed >=
              savedTarget
            ) {
              setElapsed(savedTarget);
              setTargetDuration(
                savedTarget
              );
              setSelectedProjectId(
                data.projectId ?? null
              );
            } else {
              setElapsed(currentElapsed);
              setTargetDuration(
                savedTarget
              );
              setSelectedProjectId(
                data.projectId ?? null
              );
              setIsRunning(true);
            }
          } else {
            setElapsed(data.elapsed ?? 0);

            setSelectedProjectId(
              data.projectId ?? null
            );

            setTargetDuration(
              data.targetDuration ??
                savedPreferences.defaultDuration
            );
          }
        } catch {
          localStorage.removeItem(
            TIMER_STORAGE_KEY
          );
        }
      }

      /*
       * Load sessions.
       */

      try {
        const data =
          await getSupabaseSessions();

        if (!mounted) return;

        setSessions(data);
      } catch (error) {
        console.error(
          "Failed to load Supabase sessions:",
          error
        );
      } finally {
        if (mounted) {
          setSessionsLoading(false);
        }
      }

      /*
       * Load projects.
       */

      try {
        const data =
          await getSupabaseProjects();

        if (!mounted) return;

        setProjects(data);
      } catch (error) {
        console.error(
          "Failed to load Supabase projects:",
          error
        );
      } finally {
        if (mounted) {
          setProjectsLoading(false);
        }
      }

      /*
       * Auto-start.
       *
       * This reads focuslog_auto_start,
       * which is the key used by Settings.
       */
      if (
        mounted &&
        !restoredRunningTimer &&
        savedPreferences.autoStart &&
        !autoStartHandledRef.current
      ) {
        autoStartHandledRef.current = true;

        const now = Date.now();

        startTimeRef.current = now;

        setElapsed(0);

        setTargetDuration(
          savedPreferences.defaultDuration
        );

        setIsRunning(true);
      }

      if (mounted) {
        setHydrated(true);
      }
    }

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * TIMER ENGINE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const updateTimer = () => {
      if (!startTimeRef.current) {
        return;
      }

      const seconds = Math.max(
        0,
        Math.floor(
          (Date.now() -
            startTimeRef.current) /
            1000
        )
      );

      const nextElapsed = Math.min(
        seconds,
        targetDuration
      );

      setElapsed(nextElapsed);
    };

    updateTimer();

    const interval = window.setInterval(
      updateTimer,
      250
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    isRunning,
    targetDuration,
  ]);

  /*
   * ---------------------------------------------------------
   * SAVE ACTIVE TIMER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (
      isRunning &&
      startTimeRef.current
    ) {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          isRunning: true,
          startTime:
            startTimeRef.current,
          projectId:
            selectedProjectId,
          targetDuration,
        })
      );
    } else {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          isRunning: false,
          elapsed,
          projectId:
            selectedProjectId,
          targetDuration,
        })
      );
    }
  }, [
    isRunning,
    elapsed,
    selectedProjectId,
    targetDuration,
    hydrated,
  ]);

  /*
   * ---------------------------------------------------------
   * SAVE SESSION
   * ---------------------------------------------------------
   */

  async function finishTimer(
    completedAutomatically = false
  ) {
    if (finishingRef.current) {
      return;
    }

    const startTime =
      startTimeRef.current;

    if (!startTime) {
      return;
    }

    finishingRef.current = true;

    const now = Date.now();

    const actualDuration = Math.max(
      0,
      Math.floor(
        (now - startTime) / 1000
      )
    );

    const duration = completedAutomatically
      ? Math.min(
          targetDuration,
          actualDuration
        )
      : Math.min(
          targetDuration,
          Math.max(
            0,
            elapsed
          )
        );

    if (duration <= 0) {
      startTimeRef.current = null;
      setIsRunning(false);
      setElapsed(0);
      finishingRef.current = false;
      return;
    }

    const endTime =
      completedAutomatically
        ? startTime +
          duration * 1000
        : now;

    try {
      const newSession =
        await createSession({
          startTime,
          endTime,
          duration,
          projectId:
            selectedProjectId,
        });

      setSessions((current) => [
        newSession,
        ...current,
      ]);

      startTimeRef.current = null;

      setIsRunning(false);
      setElapsed(0);

      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          isRunning: false,
          elapsed: 0,
          projectId:
            selectedProjectId,
          targetDuration:
            preferences.defaultDuration,
        })
      );
    } catch (error) {
      console.error(
        "Failed to save session to Supabase:",
        error
      );

      window.alert(
        error instanceof Error
          ? `Could not save session: ${error.message}`
          : "Could not save session. Please try again."
      );
    } finally {
      finishingRef.current = false;
    }
  }

  /*
   * ---------------------------------------------------------
   * AUTO COMPLETE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (
      targetDuration > 0 &&
      elapsed >= targetDuration
    ) {
      void finishTimer(true);
    }
  }, [
    elapsed,
    isRunning,
    targetDuration,
  ]);

  /*
   * ---------------------------------------------------------
   * START
   * ---------------------------------------------------------
   */

  const startTimer = () => {
    if (isRunning) {
      return;
    }

    const now = Date.now();

    startTimeRef.current = now;

    setElapsed(0);

    setTargetDuration(
      preferences.defaultDuration
    );

    setIsRunning(true);
  };

  /*
   * ---------------------------------------------------------
   * STOP
   * ---------------------------------------------------------
   */

  const stopTimer = async () => {
    if (!isRunning) {
      return;
    }

    if (
      preferences.confirmBeforeStop
    ) {
      const confirmed =
        window.confirm(
          "Are you sure you want to stop this focus session?"
        );

      if (!confirmed) {
        return;
      }
    }

    await finishTimer(false);
  };

  /*
   * ---------------------------------------------------------
   * RESET
   * ---------------------------------------------------------
   */

  const resetTimer = () => {
    startTimeRef.current = null;

    setIsRunning(false);

    setElapsed(0);

    setTargetDuration(
      preferences.defaultDuration
    );

    localStorage.removeItem(
      TIMER_STORAGE_KEY
    );
  };

  /*
   * ---------------------------------------------------------
   * DISPLAY TIMER
   * ---------------------------------------------------------
   */

  const remainingSeconds = Math.max(
    0,
    targetDuration - elapsed
  );

  /*
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const todayCompleted = sessions
      .filter((session) =>
        isSameDay(
          new Date(
            session.started_at
          ).getTime()
        )
      )
      .reduce(
        (total, session) =>
          total +
          session.duration_seconds,
        0
      );

    const weekCompleted = sessions
      .filter((session) =>
        isSameWeek(
          new Date(
            session.started_at
          ).getTime()
        )
      )
      .reduce(
        (total, session) =>
          total +
          session.duration_seconds,
        0
      );

    const todayTotal =
      todayCompleted +
      (isRunning ? elapsed : 0);

    const weekTotal =
      weekCompleted +
      (isRunning ? elapsed : 0);

    const longestCompleted =
      sessions.length > 0
        ? Math.max(
            ...sessions.map(
              (session) =>
                session.duration_seconds
            )
          )
        : 0;

    const longest = isRunning
      ? Math.max(
          longestCompleted,
          elapsed
        )
      : longestCompleted;

    return {
      today: todayTotal,
      week: weekTotal,
      sessions: sessions.length,
      longest,
    };
  }, [
    sessions,
    elapsed,
    isRunning,
  ]);

  /*
   * ---------------------------------------------------------
   * WEEKLY CHART
   * ---------------------------------------------------------
   */

  const weeklyData = useMemo(() => {
    const data = [
      0, 0, 0, 0, 0, 0, 0,
    ];

    sessions
      .filter((session) =>
        isSameWeek(
          new Date(
            session.started_at
          ).getTime()
        )
      )
      .forEach((session) => {
        const timestamp =
          new Date(
            session.started_at
          ).getTime();

        const index =
          getDayIndex(timestamp);

        data[index] +=
          session.duration_seconds;
      });

    if (isRunning) {
      const todayIndex =
        getDayIndex(Date.now());

      data[todayIndex] += elapsed;
    }

    return data;
  }, [
    sessions,
    elapsed,
    isRunning,
  ]);

  const maxWeeklyValue = Math.max(
    ...weeklyData,
    1
  );

  /*
   * ---------------------------------------------------------
   * RECENT
   * ---------------------------------------------------------
   */

  const recentSessions =
    sessions.slice(0, 4);

  const averageSession =
    stats.sessions > 0
      ? Math.round(
          sessions.reduce(
            (sum, session) =>
              sum +
              session.duration_seconds,
            0
          ) / stats.sessions
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <AppShell>
      <main className="app">
        <div className="ambient ambientOne" />
        <div className="ambient ambientTwo" />

        <section className="content">
          <header className="topbar">
            <div>
              <div className="eyebrow">
                {isRunning
                  ? "FOCUS SESSION ACTIVE"
                  : "YOUR WORKSPACE"}
              </div>

              <h1>
                {isRunning
                  ? "Stay in the zone."
                  : `${greeting} ${userName}.`}
              </h1>

              <p>
                {isRunning
                  ? "Your focus session is running."
                  : "Ready to make some progress today?"}
              </p>
            </div>

            <div className="topActions">
              <button
                type="button"
                className="iconButton"
              >
                ?
              </button>

              <div className="streak">
                <span className="fire">
                  ✦
                </span>

                <div>
                  <strong>7</strong>

                  <small>
                    day streak
                  </small>
                </div>
              </div>

              <div className="topAvatar">
                {userInitial}
              </div>
            </div>
          </header>

          <section
            className={`timerCard ${
              isRunning
                ? "running"
                : ""
            }`}
          >
            <div className="timerGlow" />

            <div className="timerContent">
              <div className="timerHeader">
                <div className="sessionStatus">
                  <span
                    className={
                      isRunning
                        ? "pulse"
                        : ""
                    }
                  />

                  {isRunning
                    ? "FOCUSING"
                    : "READY TO FOCUS"}
                </div>

                <button
                  type="button"
                  className="resetButton"
                  onClick={resetTimer}
                >
                  Reset
                </button>
              </div>

              <div className="timerCenter">
                <div className="timerTime">
                  {formatTimer(
                    isRunning
                      ? remainingSeconds
                      : targetDuration
                  )}
                </div>

                <div className="timerCaption">
                  {isRunning
                    ? selectedProject
                      ? `Working on ${selectedProject.name}`
                      : "Keep going. You're doing great."
                    : `${formatDuration(
                        targetDuration
                      )} focus session`}
                </div>
              </div>

              <div className="timerProject">
                {projectsLoading ? (
                  <div className="projectSelector disabled">
                    Loading projects...
                  </div>
                ) : projects.length > 0 ? (
                  <div className="projectSelector">
                    <span className="projectSelectorLabel">
                      PROJECT
                    </span>

                    <select
                      value={
                        selectedProjectId ??
                        ""
                      }
                      onChange={(event) =>
                        setSelectedProjectId(
                          event.target
                            .value || null
                        )
                      }
                      disabled={isRunning}
                    >
                      <option value="">
                        No project
                      </option>

                      {projects.map(
                        (project) => (
                          <option
                            key={
                              project.id
                            }
                            value={
                              project.id
                            }
                          >
                            {project.name}
                          </option>
                        )
                      )}
                    </select>

                    {selectedProject && (
                      <span
                        className="selectedProjectDot"
                        style={{
                          backgroundColor:
                            selectedProject.color,
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <Link
                    href="/projects"
                    className="projectEmpty"
                  >
                    <span>
                      No projects yet
                    </span>

                    <span>
                      Create one →
                    </span>
                  </Link>
                )}
              </div>

              <div className="timerAction">
                {!isRunning ? (
                  <button
                    type="button"
                    className="startButton"
                    onClick={startTimer}
                  >
                    <span className="playIcon">
                      ▶
                    </span>

                    Start Focus
                  </button>
                ) : (
                  <button
                    type="button"
                    className="stopButton"
                    onClick={stopTimer}
                  >
                    <span className="stopIcon" />

                    Stop Session
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="statsGrid">
            <div className="statCard">
              <div className="statTop">
                <span>Today</span>

                <div className="statIcon orange">
                  ◷
                </div>
              </div>

              <strong>
                {formatDuration(
                  stats.today
                )}
              </strong>

              <div className="statBottom">
                <span className="positive">
                  LIVE
                </span>

                <span>
                  focused today
                </span>
              </div>
            </div>

            <div className="statCard">
              <div className="statTop">
                <span>This week</span>

                <div className="statIcon">
                  ▥
                </div>
              </div>

              <strong>
                {formatDuration(
                  stats.week
                )}
              </strong>

              <div className="statBottom">
                <span className="positive">
                  WEEK
                </span>

                <span>
                  focused time
                </span>
              </div>
            </div>

            <div className="statCard">
              <div className="statTop">
                <span>Sessions</span>

                <div className="statIcon">
                  ◉
                </div>
              </div>

              <strong>
                {stats.sessions}
              </strong>

              <div className="statBottom">
                <span>
                  {formatDuration(
                    averageSession
                  )}
                </span>

                <span>
                  avg. session
                </span>
              </div>
            </div>

            <div className="statCard">
              <div className="statTop">
                <span>Longest</span>

                <div className="statIcon">
                  ↗
                </div>
              </div>

              <strong>
                {stats.longest > 0
                  ? formatDuration(
                      stats.longest
                    )
                  : "0m"}
              </strong>

              <div className="statBottom">
                <span className="positive">
                  BEST
                </span>

                <span>
                  session
                </span>
              </div>
            </div>
          </section>

          <section className="lowerGrid">
            <div className="panel chartPanel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">
                    Weekly activity
                  </div>

                  <div className="panelSubtitle">
                    Your focus time this week
                  </div>
                </div>

                <button
                  type="button"
                  className="periodButton"
                >
                  This week
                  <span>⌄</span>
                </button>
              </div>

              <div className="chart">
                <div className="chartLines">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="bars">
                  {weeklyData.map(
                    (
                      value,
                      index
                    ) => {
                      const percentage =
                        (value /
                          maxWeeklyValue) *
                        100;

                      const days = [
                        "M",
                        "T",
                        "W",
                        "T",
                        "F",
                        "S",
                        "S",
                      ];

                      return (
                        <div
                          className="barColumn"
                          key={index}
                        >
                          <div className="barWrapper">
                            <div
                              className={`bar ${
                                index ===
                                getDayIndex(
                                  Date.now()
                                )
                                  ? "highlight"
                                  : ""
                              }`}
                              style={{
                                height: `${
                                  value ===
                                  0
                                    ? 4
                                    : Math.max(
                                        8,
                                        percentage
                                      )
                                }%`,
                              }}
                            >
                              {value >
                                0 &&
                                index ===
                                  getDayIndex(
                                    Date.now()
                                  ) && (
                                  <span className="barTooltip">
                                    {formatDuration(
                                      value
                                    )}
                                  </span>
                                )}
                            </div>
                          </div>

                          <span className="day">
                            {
                              days[
                                index
                              ]
                            }
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="panel recentPanel">
              <div className="panelHeader">
                <div>
                  <div className="panelTitle">
                    Recent sessions
                  </div>

                  <div className="panelSubtitle">
                    Your latest focus sessions
                  </div>
                </div>

                <Link
                  href="/sessions"
                  className="viewAll"
                >
                  View all →
                </Link>
              </div>

              <div className="sessionList">
                {sessionsLoading ? (
                  <div className="emptyState">
                    <div className="emptyIcon">
                      ◷
                    </div>

                    <strong>
                      Loading sessions...
                    </strong>

                    <span>
                      Getting your focus history.
                    </span>
                  </div>
                ) : recentSessions.length ===
                  0 ? (
                  <div className="emptyState">
                    <div className="emptyIcon">
                      ◷
                    </div>

                    <strong>
                      No sessions yet
                    </strong>

                    <span>
                      Start your first focus
                      session.
                    </span>
                  </div>
                ) : (
                  recentSessions.map(
                    (session) => {
                      const sessionProject =
                        projects.find(
                          (project) =>
                            project.id ===
                            session.project_id
                        );

                      return (
                        <div
                          className="sessionRow"
                          key={
                            session.id
                          }
                        >
                          <div className="sessionProject">
                            <span
                              className="projectDot"
                              style={{
                                backgroundColor:
                                  sessionProject?.color ??
                                  "#c96a32",
                                color:
                                  sessionProject?.color ??
                                  "#c96a32",
                              }}
                            />

                            <div>
                              <strong>
                                {sessionProject?.name ??
                                  "No project"}
                              </strong>

                              <small>
                                {new Date(
                                  session.started_at
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    month:
                                      "short",
                                    day: "numeric",
                                  }
                                )}
                                {" · "}
                                {new Date(
                                  session.started_at
                                ).toLocaleTimeString(
                                  undefined,
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )}
                              </small>
                            </div>
                          </div>

                          <span className="sessionDuration">
                            {formatDuration(
                              session.duration_seconds
                            )}
                          </span>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </section>
        </section>

        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #171411;
            color: #f1e7d0;
          }

          body {
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          button,
          a,
          select {
            font-family: inherit;
          }

          a {
            text-decoration: none;
          }

          .app {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
          }

          .ambient {
            position: fixed;
            pointer-events: none;
            border-radius: 999px;
            filter: blur(120px);
            opacity: 0.12;
          }

          .ambientOne {
            width: 400px;
            height: 400px;
            right: -180px;
            top: -140px;
            background: #c96a32;
          }

          .ambientTwo {
            width: 300px;
            height: 300px;
            left: 20%;
            bottom: -220px;
            background: #e08a45;
            opacity: 0.04;
          }

          .content {
            width: 100%;
            max-width: 1450px;
            margin: 0 auto;
            padding: 42px 48px 55px;
            position: relative;
            z-index: 2;
          }

          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
          }

          .eyebrow {
            color: #e08a45;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.16em;
            margin-bottom: 8px;
          }

          h1 {
            margin: 0;
            font-size: clamp(
              25px,
              3vw,
              34px
            );
            letter-spacing: -0.045em;
            line-height: 1.1;
            color: #f1e7d0;
          }

          .topbar p {
            color: #9c8f7d;
            margin: 8px 0 0;
            font-size: 13px;
          }

          .topActions {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .iconButton {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: 1px solid
              rgba(241, 231, 208, 0.09);
            background: rgba(
              241,
              231,
              208,
              0.03
            );
            color: #9c8f7d;
            cursor: pointer;
          }

          .streak {
            height: 40px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 11px;
            border-radius: 11px;
            border: 1px solid
              rgba(241, 231, 208, 0.09);
            background: rgba(
              241,
              231,
              208,
              0.025
            );
          }

          .fire {
            color: #e08a45;
            font-size: 17px;
          }

          .streak div {
            display: flex;
            flex-direction: column;
          }

          .streak strong {
            font-size: 12px;
            color: #f1e7d0;
          }

          .streak small {
            color: #766d60;
            font-size: 8px;
          }

          .topAvatar {
            width: 40px;
            height: 40px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background:
              linear-gradient(
                135deg,
                #4a4035,
                #28221c
              );
            border: 1px solid #5b4e40;
            font-size: 12px;
            font-weight: 700;
            color: #f1e7d0;
          }

          .timerCard {
            position: relative;
            min-height: 350px;
            border: 1px solid
              rgba(241, 231, 208, 0.1);
            border-radius: 20px;
            overflow: hidden;
            background:
              radial-gradient(
                circle at 50% 45%,
                rgba(
                  201,
                  106,
                  50,
                  0.12
                ),
                transparent 34%
              ),
              linear-gradient(
                135deg,
                #332b22,
                #211b16
              );
            box-shadow:
              0 30px 80px
                rgba(0, 0, 0, 0.28),
              inset 0 1px 0
                rgba(241, 231, 208, 0.025);
            transition: 300ms ease;
          }

          .timerCard.running {
            border-color: rgba(
              201,
              106,
              50,
              0.3
            );
            box-shadow:
              0 30px 100px
                rgba(0, 0, 0, 0.38),
              0 0 70px
                rgba(201, 106, 50, 0.07);
          }

          .timerGlow {
            position: absolute;
            width: 330px;
            height: 330px;
            left: 50%;
            top: 46%;
            transform: translate(
              -50%,
              -50%
            );
            background: #c96a32;
            opacity: 0.045;
            filter: blur(100px);
            border-radius: 50%;
            pointer-events: none;
          }

          .timerContent {
            position: relative;
            z-index: 2;
            min-height: 350px;
            display: flex;
            flex-direction: column;
            padding: 22px 24px;
          }

          .timerHeader {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .sessionStatus {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #9c8f7d;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.14em;
          }

          .sessionStatus > span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #766d60;
          }

          .sessionStatus > span.pulse {
            background: #c96a32;
            box-shadow: 0 0 12px
              #c96a32;
            animation: pulse 1.6s
              infinite;
          }

          @keyframes pulse {
            50% {
              opacity: 0.4;
              transform: scale(0.65);
            }
          }

          .resetButton {
            border: 0;
            background: transparent;
            color: #766d60;
            font-size: 10px;
            cursor: pointer;
          }

          .resetButton:hover {
            color: #b9a991;
          }

          .timerCenter {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .timerTime {
            font-variant-numeric: tabular-nums;
            font-size: clamp(
              58px,
              9vw,
              104px
            );
            font-weight: 250;
            letter-spacing: -0.075em;
            line-height: 1;
            background:
              linear-gradient(
                180deg,
                #f1e7d0 10%,
                #b9a991 100%
              );
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .timerCaption {
            color: #8b7d6b;
            margin-top: 16px;
            font-size: 11px;
          }

          .timerProject {
            display: flex;
            justify-content: center;
            margin: 16px 0;
          }

          .projectSelector {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 190px;
            height: 38px;
            padding: 0 12px;
            border: 1px solid
              rgba(241, 231, 208, 0.1);
            border-radius: 10px;
            background: rgba(
              241,
              231,
              208,
              0.035
            );
          }

          .projectSelectorLabel {
            color: #766d60;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.12em;
          }

          .projectSelector select {
            min-width: 100px;
            flex: 1;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f1e7d0;
            font-size: 10px;
            cursor: pointer;
          }

          .projectSelector select:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .projectSelector select option {
            background: #332b22;
            color: #f1e7d0;
          }

          .selectedProjectDot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .projectSelector.disabled {
            color: #766d60;
            justify-content: center;
            font-size: 10px;
          }

          .projectEmpty {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 38px;
            padding: 0 13px;
            border: 1px dashed
              rgba(241, 231, 208, 0.1);
            border-radius: 10px;
            color: #766d60;
            font-size: 9px;
            transition: 160ms ease;
          }

          .projectEmpty span:last-child {
            color: #e08a45;
          }

          .projectEmpty:hover {
            border-color: rgba(
              201,
              106,
              50,
              0.35
            );
            background: rgba(
              201,
              106,
              50,
              0.05
            );
          }

          .timerAction {
            display: flex;
            justify-content: center;
          }

          .startButton,
          .stopButton {
            height: 48px;
            min-width: 190px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 750;
            cursor: pointer;
            transition: all 180ms ease;
          }

          .startButton {
            border: 1px solid
              rgba(
                241,
                180,
                130,
                0.3
              );
            color: #f1e7d0;
            background:
              linear-gradient(
                135deg,
                #e08a45,
                #b75424
              );
            box-shadow:
              0 10px 30px
                rgba(
                  201,
                  106,
                  50,
                  0.2
                ),
              inset 0 1px 0
                rgba(241, 231, 208, 0.25);
          }

          .startButton:hover {
            transform: translateY(-2px);
            box-shadow:
              0 14px 38px
                rgba(
                  201,
                  106,
                  50,
                  0.3
                ),
              inset 0 1px 0
                rgba(241, 231, 208, 0.3);
          }

          .playIcon {
            font-size: 9px;
            margin-right: 8px;
          }

          .stopButton {
            border: 1px solid
              rgba(
                201,
                106,
                50,
                0.4
              );
            color: #e08a45;
            background: rgba(
              201,
              106,
              50,
              0.08
            );
          }

          .stopButton:hover {
            background: rgba(
              201,
              106,
              50,
              0.14
            );
            border-color: rgba(
              201,
              106,
              50,
              0.6
            );
          }

          .stopIcon {
            width: 8px;
            height: 8px;
            background: currentColor;
            display: inline-block;
            margin-right: 8px;
            border-radius: 2px;
          }

          .statsGrid {
            display: grid;
            grid-template-columns: repeat(
              4,
              1fr
            );
            gap: 12px;
            margin-top: 12px;
          }

          .statCard {
            min-height: 128px;
            padding: 18px;
            border: 1px solid
              rgba(241, 231, 208, 0.09);
            border-radius: 14px;
            background: rgba(
              241,
              231,
              208,
              0.025
            );
            transition: 180ms ease;
          }

          .statCard:hover {
            background: rgba(
              241,
              231,
              208,
              0.045
            );
            border-color: rgba(
              241,
              231,
              208,
              0.13
            );
          }

          .statTop {
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #8b7d6b;
            font-size: 10px;
          }

          .statIcon {
            width: 26px;
            height: 26px;
            display: grid;
            place-items: center;
            border-radius: 7px;
            background: rgba(
              241,
              231,
              208,
              0.045
            );
            color: #9c8f7d;
            font-size: 11px;
          }

          .statIcon.orange {
            color: #e08a45;
            background: rgba(
              201,
              106,
              50,
              0.1
            );
          }

          .statCard > strong {
            display: block;
            margin-top: 15px;
            font-size: 23px;
            letter-spacing: -0.04em;
            color: #f1e7d0;
          }

          .statBottom {
            display: flex;
            gap: 5px;
            margin-top: 7px;
            color: #766d60;
            font-size: 9px;
          }

          .positive {
            color: #e08a45;
          }

          .lowerGrid {
            display: grid;
            grid-template-columns: 1.35fr 1fr;
            gap: 12px;
            margin-top: 12px;
          }

          .panel {
            border: 1px solid
              rgba(241, 231, 208, 0.09);
            border-radius: 14px;
            background: rgba(
              241,
              231,
              208,
              0.025
            );
            padding: 20px;
          }

          .panelHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .panelTitle {
            font-size: 13px;
            font-weight: 650;
            color: #f1e7d0;
          }

          .panelSubtitle {
            color: #766d60;
            font-size: 9px;
            margin-top: 5px;
          }

          .periodButton,
          .viewAll {
            border: 1px solid
              rgba(241, 231, 208, 0.09);
            background: rgba(
              241,
              231,
              208,
              0.025
            );
            color: #9c8f7d;
            border-radius: 8px;
            padding: 7px 9px;
            font-size: 9px;
            cursor: pointer;
          }

          .periodButton span {
            margin-left: 6px;
          }

          .viewAll {
            border: 0;
            background: transparent;
            color: #e08a45;
          }

          .chart {
            height: 190px;
            margin-top: 24px;
            position: relative;
          }

          .chartLines {
            position: absolute;
            inset: 5px 0 25px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .chartLines span {
            width: 100%;
            border-top: 1px dashed
              rgba(
                241,
                231,
                208,
                0.065
              );
          }

          .bars {
            position: absolute;
            inset: 0;
            display: grid;
            grid-template-columns: repeat(
              7,
              1fr
            );
            gap: 12px;
            padding: 0 5px;
          }

          .barColumn {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
          }

          .barWrapper {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 28px;
          }

          .bar {
            position: relative;
            width: min(26px, 48%);
            min-height: 8px;
            border-radius: 6px 6px 3px 3px;
            background:
              linear-gradient(
                180deg,
                #8a7a68,
                #443a30
              );
            transition: 180ms ease;
          }

          .bar.highlight {
            background:
              linear-gradient(
                180deg,
                #e08a45,
                #b75424
              );
            box-shadow: 0 0 22px
              rgba(
                201,
                106,
                50,
                0.2
              );
          }

          .barTooltip {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(
              -50%
            );
            white-space: nowrap;
            background: #332b22;
            border: 1px solid #5a4a3a;
            border-radius: 6px;
            padding: 5px 7px;
            color: #e3d5bc;
            font-size: 8px;
          }

          .day {
            color: #766d60;
            font-size: 9px;
          }

          .sessionList {
            margin-top: 14px;
          }

          .sessionRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 55px;
            border-bottom: 1px solid
              rgba(
                241,
                231,
                208,
                0.055
              );
          }

          .sessionRow:last-child {
            border-bottom: 0;
          }

          .sessionProject {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .projectDot {
            width: 8px;
            height: 8px;
            border-radius: 3px;
            box-shadow: 0 0 10px
              currentColor;
            flex-shrink: 0;
          }

          .sessionProject div {
            display: flex;
            flex-direction: column;
          }

          .sessionProject strong {
            font-size: 10px;
            font-weight: 600;
            color: #f1e7d0;
          }

          .sessionProject small {
            color: #766d60;
            font-size: 8px;
            margin-top: 3px;
          }

          .sessionDuration {
            color: #b9a991;
            font-size: 10px;
            font-variant-numeric: tabular-nums;
          }

          .emptyState {
            min-height: 220px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 6px;
            text-align: center;
          }

          .emptyIcon {
            width: 40px;
            height: 40px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            color: #e08a45;
            background: rgba(
              201,
              106,
              50,
              0.1
            );
            margin-bottom: 7px;
          }

          .emptyState strong {
            font-size: 11px;
            color: #f1e7d0;
          }

          .emptyState span {
            color: #766d60;
            font-size: 9px;
          }

          @media (max-width: 1050px) {
            .content {
              padding: 34px 28px 45px;
            }

            .statsGrid {
              grid-template-columns: repeat(
                2,
                1fr
              );
            }
          }

          @media (max-width: 800px) {
            .content {
              padding: 25px 18px 35px;
            }

            .topActions .streak {
              display: none;
            }

            .lowerGrid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 520px) {
            .topbar {
              align-items: center;
            }

            .topbar p {
              font-size: 11px;
            }

            .topAvatar {
              display: none;
            }

            .statsGrid {
              grid-template-columns: 1fr 1fr;
            }

            .statCard {
              padding: 14px;
            }

            .statCard > strong {
              font-size: 19px;
            }

            .timerCard,
            .timerContent {
              min-height: 360px;
            }

            .timerTime {
              font-size: 53px;
            }

            .projectSelector {
              min-width: 170px;
            }

            .panel {
              padding: 16px;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
