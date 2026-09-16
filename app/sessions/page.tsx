"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import UserMenu from "@/components/user-menu";

import {
  formatDuration,
  isSameDay,
  isSameWeek,
} from "@/lib/sessions";

import {
  getSupabaseSessions,
  deleteSupabaseSession,
  type SupabaseSession,
} from "@/lib/supabase/sessions";

import {
  getSupabaseProjects,
  type SupabaseProject,
} from "@/lib/supabase/projects";

type FilterType =
  | "all"
  | "today"
  | "week";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<
    SupabaseSession[]
  >([]);

  const [projects, setProjects] = useState<
    SupabaseProject[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [
          sessionsData,
          projectsData,
        ] = await Promise.all([
          getSupabaseSessions(),
          getSupabaseProjects(),
        ]);

        if (!mounted) return;

        setSessions(sessionsData);
        setProjects(projectsData);
      } catch (err) {
        console.error(
          "Failed to load sessions:",
          err
        );

        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sessions."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * PROJECT LOOKUP
   * ---------------------------------------------------------
   */

  const projectMap = useMemo(() => {
    const map = new Map<
      string,
      SupabaseProject
    >();

    projects.forEach((project) => {
      map.set(project.id, project);
    });

    return map;
  }, [projects]);

  /*
   * ---------------------------------------------------------
   * FILTERED SESSIONS
   * ---------------------------------------------------------
   */

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (filter === "today") {
      result = result.filter((session) =>
        isSameDay(
          new Date(
            session.started_at
          ).getTime()
        )
      );
    }

    if (filter === "week") {
      result = result.filter((session) =>
        isSameWeek(
          new Date(
            session.started_at
          ).getTime()
        )
      );
    }

    const query =
      search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (session) => {
          const project =
            session.project_id
              ? projectMap.get(
                  session.project_id
                )
              : null;

          const projectName =
            project?.name ??
            "No project";

          return projectName
            .toLowerCase()
            .includes(query);
        }
      );
    }

    return result;
  }, [
    sessions,
    filter,
    search,
    projectMap,
  ]);

  /*
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const todaySessions =
      sessions.filter((session) =>
        isSameDay(
          new Date(
            session.started_at
          ).getTime()
        )
      );

    const weekSessions =
      sessions.filter((session) =>
        isSameWeek(
          new Date(
            session.started_at
          ).getTime()
        )
      );

    const totalSeconds =
      sessions.reduce(
        (sum, session) =>
          sum +
          session.duration_seconds,
        0
      );

    const todaySeconds =
      todaySessions.reduce(
        (sum, session) =>
          sum +
          session.duration_seconds,
        0
      );

    const weekSeconds =
      weekSessions.reduce(
        (sum, session) =>
          sum +
          session.duration_seconds,
        0
      );

    const longest =
      sessions.length > 0
        ? Math.max(
            ...sessions.map(
              (session) =>
                session.duration_seconds
            )
          )
        : 0;

    const average =
      sessions.length > 0
        ? Math.round(
            totalSeconds /
              sessions.length
          )
        : 0;

    return {
      totalSeconds,
      todaySeconds,
      weekSeconds,
      longest,
      average,
      totalSessions: sessions.length,
      todaySessions:
        todaySessions.length,
      weekSessions:
        weekSessions.length,
    };
  }, [sessions]);

  /*
   * ---------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------
   */

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this focus session?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      await deleteSupabaseSession(id);

      setSessions((current) =>
        current.filter(
          (session) =>
            session.id !== id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete session:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete session."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
   * ---------------------------------------------------------
   * DATE FORMAT
   * ---------------------------------------------------------
   */

  function formatSessionDate(
    timestamp: string
  ) {
    const date = new Date(timestamp);

    return date.toLocaleDateString(
      undefined,
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  function formatSessionTime(
    timestamp: string
  ) {
    return new Date(
      timestamp
    ).toLocaleTimeString(
      undefined,
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  const workspaceItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: "⌂",
    },
    {
      name: "Sessions",
      href: "/sessions",
      icon: "◷",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: "▥",
    },
  ];

  const personalItems = [
    {
      name: "Projects",
      href: "/projects",
      icon: "◈",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "⚙",
    },
  ];

  return (
    <main className="app">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <span />
          </div>

          <div>
            <div className="brandName">
              FocusLog
            </div>

            <div className="brandSub">
              FOCUS BETTER
            </div>
          </div>
        </div>

        <div className="navSection">
          <div className="navLabel">
            WORKSPACE
          </div>

          {workspaceItems.map(
            (item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`navItem ${
                  item.name ===
                  "Sessions"
                    ? "active"
                    : ""
                }`}
              >
                <span className="navIcon">
                  {item.icon}
                </span>

                <span>
                  {item.name}
                </span>

                {item.name ===
                  "Sessions" && (
                  <span className="activeDot" />
                )}
              </Link>
            )
          )}
        </div>

        <div className="navSection second">
          <div className="navLabel">
            PERSONAL
          </div>

          {personalItems.map(
            (item) => (
              <Link
                key={item.name}
                href={item.href}
                className="navItem"
              >
                <span className="navIcon">
                  {item.icon}
                </span>

                <span>
                  {item.name}
                </span>
              </Link>
            )
          )}
        </div>

        <div className="sidebarBottom">
          <div className="miniGoal">
            <div className="miniGoalTop">
              <span>
                Weekly focus
              </span>

              <strong>
                {formatDuration(
                  stats.weekSeconds
                )}
              </strong>
            </div>

            <div className="goalBar">
              <div
                className="goalProgress"
                style={{
                  width: `${Math.min(
                    100,
                    (stats.weekSeconds /
                      72000) *
                      100
                  )}%`,
                }}
              />
            </div>

            <div className="goalText">
              Weekly target: 20h
            </div>
          </div>

          <UserMenu />
        </div>
      </aside>

      {/* CONTENT */}

      <section className="content">
        {/* HEADER */}

        <header className="topbar">
          <div>
            <div className="eyebrow">
              FOCUS HISTORY
            </div>

            <h1>
              Sessions
            </h1>

            <p>
              Review your focus history
              and see where your time
              went.
            </p>
          </div>

          <div className="topActions">
            <Link
              href="/"
              className="startButtonSmall"
            >
              <span>▶</span>
              Start Focus
            </Link>

            <div className="topAvatar">
              F
            </div>
          </div>
        </header>

        {/* SUMMARY */}

        <section className="summaryGrid">
          <div className="summaryCard">
            <div className="summaryIcon orange">
              ◷
            </div>

            <div>
              <span>
                Total focus
              </span>

              <strong>
                {formatDuration(
                  stats.totalSeconds
                )}
              </strong>
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon">
              ◎
            </div>

            <div>
              <span>
                Sessions
              </span>

              <strong>
                {stats.totalSessions}
              </strong>
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon">
              ↗
            </div>

            <div>
              <span>
                Average
              </span>

              <strong>
                {formatDuration(
                  stats.average
                )}
              </strong>
            </div>
          </div>

          <div className="summaryCard">
            <div className="summaryIcon orange">
              ★
            </div>

            <div>
              <span>
                Longest
              </span>

              <strong>
                {formatDuration(
                  stats.longest
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* FILTERS */}

        <section className="toolbar">
          <div className="filters">
            <button
              type="button"
              className={
                filter === "all"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All
            </button>

            <button
              type="button"
              className={
                filter === "today"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("today")
              }
            >
              Today
            </button>

            <button
              type="button"
              className={
                filter === "week"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("week")
              }
            >
              This week
            </button>
          </div>

          <div className="searchBox">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search projects..."
            />
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="errorBox">
            <span>!</span>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {/* SESSION TABLE */}

        <section className="sessionsPanel">
          <div className="panelHeader">
            <div>
              <div className="panelTitle">
                Focus sessions
              </div>

              <div className="panelSubtitle">
                {filteredSessions.length}{" "}
                session
                {filteredSessions.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </div>
            </div>

            <div className="panelMeta">
              {filter === "all"
                ? "All time"
                : filter === "today"
                ? "Today"
                : "This week"}
            </div>
          </div>

          {loading ? (
            <div className="loadingState">
              <div className="loadingCircle" />

              <strong>
                Loading sessions...
              </strong>

              <span>
                Getting your focus history
                from Supabase.
              </span>
            </div>
          ) : filteredSessions.length ===
            0 ? (
            <div className="emptyState">
              <div className="emptyIcon">
                ◷
              </div>

              <strong>
                {search
                  ? "No matching sessions"
                  : filter === "today"
                  ? "No sessions today"
                  : filter === "week"
                  ? "No sessions this week"
                  : "No sessions yet"}
              </strong>

              <span>
                {search
                  ? "Try a different project name."
                  : "Start a focus session from the dashboard."}
              </span>

              {!search &&
                filter === "all" && (
                  <Link
                    href="/"
                    className="emptyAction"
                  >
                    Start Focus →
                  </Link>
                )}
            </div>
          ) : (
            <div className="sessionTable">
              <div className="tableHeader">
                <span>
                  PROJECT
                </span>

                <span>
                  DATE
                </span>

                <span>
                  TIME
                </span>

                <span>
                  DURATION
                </span>

                <span />
              </div>

              {filteredSessions.map(
                (session) => {
                  const project =
                    session.project_id
                      ? projectMap.get(
                          session.project_id
                        )
                      : null;

                  return (
                    <div
                      className="sessionRow"
                      key={session.id}
                    >
                      {/* PROJECT */}

                      <div className="projectCell">
                        <span
                          className="projectDot"
                          style={{
                            backgroundColor:
                              project?.color ??
                              "#c96a32",
                            color:
                              project?.color ??
                              "#c96a32",
                          }}
                        />

                        <div>
                          <strong>
                            {project?.name ??
                              "No project"}
                          </strong>

                          <small>
                            {project
                              ? "Project"
                              : "Unassigned session"}
                          </small>
                        </div>
                      </div>

                      {/* DATE */}

                      <div className="dateCell">
                        <strong>
                          {formatSessionDate(
                            session.started_at
                          )}
                        </strong>
                      </div>

                      {/* TIME */}

                      <div className="timeCell">
                        {formatSessionTime(
                          session.started_at
                        )}
                        <span>
                          →
                        </span>
                        {formatSessionTime(
                          session.ended_at
                        )}
                      </div>

                      {/* DURATION */}

                      <div className="durationCell">
                        <strong>
                          {formatDuration(
                            session.duration_seconds
                          )}
                        </strong>
                      </div>

                      {/* DELETE */}

                      <div className="actionCell">
                        <button
                          type="button"
                          className="deleteButton"
                          onClick={() =>
                            handleDelete(
                              session.id
                            )
                          }
                          disabled={
                            deletingId ===
                            session.id
                          }
                          title="Delete session"
                        >
                          {deletingId ===
                          session.id
                            ? "..."
                            : "×"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
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
        input {
          font-family: inherit;
        }

        a {
          text-decoration: none;
        }

        .app {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at 72% 4%,
              rgba(
                201,
                106,
                50,
                0.12
              ),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #171411 0%,
              #211b16 100%
            );
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

        /* SIDEBAR */

        .sidebar {
          width: 248px;
          min-height: 100vh;
          border-right: 1px solid
            rgba(241, 231, 208, 0.09);
          background: rgba(
            24,
            20,
            16,
            0.9
          );
          backdrop-filter: blur(24px);
          padding: 28px 18px 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 5;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 10px 35px;
        }

        .brandMark {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background:
            linear-gradient(
              145deg,
              #e08a45,
              #c96a32 58%,
              #8f4523
            );
          display: grid;
          place-items: center;
          box-shadow:
            0 0 24px
              rgba(201, 106, 50, 0.24),
            inset 0 1px 0
              rgba(241, 231, 208, 0.3);
        }

        .brandMark span {
          width: 12px;
          height: 16px;
          border-radius: 7px 7px 8px 8px;
          border: 2px solid #f1e7d0;
          border-top-color: transparent;
          transform: rotate(25deg);
        }

        .brandName {
          font-size: 16px;
          font-weight: 750;
          letter-spacing: -0.03em;
          color: #f1e7d0;
        }

        .brandSub {
          color: #766d60;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.18em;
          margin-top: 3px;
        }

        .navSection {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .navSection.second {
          margin-top: 32px;
        }

        .navLabel {
          color: #766d60;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          padding: 0 12px 9px;
        }

        .navItem {
          position: relative;
          width: 100%;
          height: 43px;
          border-radius: 10px;
          background: transparent;
          color: #9c8f7d;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          font-size: 13px;
          cursor: pointer;
          transition: all 160ms ease;
        }

        .navItem:hover {
          background: rgba(
            241,
            231,
            208,
            0.045
          );
          color: #d8c8a8;
        }

        .navItem.active {
          color: #f1e7d0;
          background:
            linear-gradient(
              90deg,
              rgba(
                201,
                106,
                50,
                0.16
              ),
              rgba(
                201,
                106,
                50,
                0.035
              )
            );
        }

        .navIcon {
          width: 19px;
          color: inherit;
          font-size: 16px;
          text-align: center;
          opacity: 0.85;
        }

        .activeDot {
          position: absolute;
          right: 10px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #c96a32;
          box-shadow: 0 0 10px
            #c96a32;
        }

        .sidebarBottom {
          margin-top: auto;
        }

        .miniGoal {
          border: 1px solid
            rgba(241, 231, 208, 0.09);
          background: rgba(
            241,
            231,
            208,
            0.025
          );
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .miniGoalTop {
          display: flex;
          justify-content: space-between;
          color: #9c8f7d;
          font-size: 11px;
        }

        .miniGoalTop strong {
          color: #e08a45;
          font-size: 10px;
        }

        .goalBar {
          height: 4px;
          margin: 12px 0 9px;
          background: #3d342c;
          border-radius: 10px;
          overflow: hidden;
        }

        .goalProgress {
          height: 100%;
          background:
            linear-gradient(
              90deg,
              #b75424,
              #e08a45
            );
          border-radius: inherit;
          box-shadow: 0 0 10px
            rgba(201, 106, 50, 0.5);
        }

        .goalText {
          color: #766d60;
          font-size: 9px;
        }

        /* CONTENT */

        .content {
          flex: 1;
          min-width: 0;
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
            28px,
            3vw,
            38px
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

        .startButtonSmall {
          height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 13px;
          border-radius: 10px;
          color: #f1e7d0;
          background:
            linear-gradient(
              135deg,
              #d97838,
              #a94d22
            );
          border: 1px solid
            rgba(
              241,
              180,
              130,
              0.24
            );
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 8px 24px
            rgba(
              201,
              106,
              50,
              0.16
            );
        }

        .startButtonSmall span {
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

        /* SUMMARY */

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 12px;
        }

        .summaryCard {
          min-height: 105px;
          padding: 17px;
          border: 1px solid
            rgba(241, 231, 208, 0.09);
          border-radius: 14px;
          background: rgba(
            241,
            231,
            208,
            0.025
          );
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .summaryIcon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #9c8f7d;
          background: rgba(
            241,
            231,
            208,
            0.045
          );
        }

        .summaryIcon.orange {
          color: #e08a45;
          background: rgba(
            201,
            106,
            50,
            0.1
          );
        }

        .summaryCard div:last-child {
          display: flex;
          flex-direction: column;
        }

        .summaryCard span {
          color: #766d60;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .summaryCard strong {
          color: #f1e7d0;
          font-size: 19px;
          letter-spacing: -0.03em;
        }

        /* TOOLBAR */

        .toolbar {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .filters {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .filter {
          height: 34px;
          padding: 0 12px;
          border: 1px solid
            rgba(241, 231, 208, 0.08);
          border-radius: 9px;
          background: rgba(
            241,
            231,
            208,
            0.025
          );
          color: #766d60;
          font-size: 9px;
          cursor: pointer;
          transition: 160ms ease;
        }

        .filter:hover {
          color: #d8c8a8;
          border-color: rgba(
            241,
            231,
            208,
            0.14
          );
        }

        .filter.active {
          color: #f1e7d0;
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
            0.09
          );
        }

        .searchBox {
          height: 34px;
          min-width: 210px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          border: 1px solid
            rgba(241, 231, 208, 0.08);
          border-radius: 9px;
          background: rgba(
            241,
            231,
            208,
            0.025
          );
        }

        .searchBox span {
          color: #766d60;
          font-size: 15px;
        }

        .searchBox input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1e7d0;
          font-size: 9px;
        }

        .searchBox input::placeholder {
          color: #62594f;
        }

        /* ERROR */

        .errorBox {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid
            rgba(220, 90, 60, 0.25);
          background: rgba(
            180,
            60,
            35,
            0.08
          );
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .errorBox > span {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: rgba(
            220,
            90,
            60,
            0.14
          );
          color: #db8065;
          font-weight: 800;
          font-size: 10px;
        }

        .errorBox strong {
          color: #dca18f;
          font-size: 10px;
        }

        .errorBox p {
          color: #8f746a;
          font-size: 9px;
          margin: 4px 0 0;
        }

        /* PANEL */

        .sessionsPanel {
          margin-top: 14px;
          border: 1px solid
            rgba(241, 231, 208, 0.09);
          border-radius: 15px;
          background: rgba(
            241,
            231,
            208,
            0.025
          );
          overflow: hidden;
        }

        .panelHeader {
          min-height: 72px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid
            rgba(
              241,
              231,
              208,
              0.055
            );
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

        .panelMeta {
          padding: 6px 9px;
          border-radius: 7px;
          background: rgba(
            241,
            231,
            208,
            0.04
          );
          color: #9c8f7d;
          font-size: 8px;
        }

        /* TABLE */

        .sessionTable {
          width: 100%;
        }

        .tableHeader,
        .sessionRow {
          display: grid;
          grid-template-columns:
            minmax(230px, 1.5fr)
            minmax(150px, 1fr)
            minmax(130px, 0.8fr)
            minmax(100px, 0.6fr)
            44px;
          align-items: center;
          gap: 18px;
          padding: 0 20px;
        }

        .tableHeader {
          height: 39px;
          background: rgba(
            241,
            231,
            208,
            0.018
          );
          border-bottom: 1px solid
            rgba(
              241,
              231,
              208,
              0.055
            );
        }

        .tableHeader span {
          color: #62594f;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .sessionRow {
          min-height: 76px;
          border-bottom: 1px solid
            rgba(
              241,
              231,
              208,
              0.05
            );
          transition: background 160ms
            ease;
        }

        .sessionRow:last-child {
          border-bottom: 0;
        }

        .sessionRow:hover {
          background: rgba(
            241,
            231,
            208,
            0.022
          );
        }

        .projectCell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .projectDot {
          width: 9px;
          height: 9px;
          flex-shrink: 0;
          border-radius: 3px;
          box-shadow: 0 0 10px
            currentColor;
        }

        .projectCell div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .projectCell strong {
          color: #f1e7d0;
          font-size: 10px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .projectCell small {
          color: #766d60;
          font-size: 8px;
          margin-top: 4px;
        }

        .dateCell strong {
          color: #b9a991;
          font-size: 9px;
          font-weight: 500;
        }

        .timeCell {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8b7d6b;
          font-size: 9px;
          font-variant-numeric: tabular-nums;
        }

        .timeCell span {
          color: #62594f;
        }

        .durationCell strong {
          color: #e08a45;
          font-size: 10px;
          font-weight: 650;
          font-variant-numeric: tabular-nums;
        }

        .actionCell {
          display: flex;
          justify-content: flex-end;
        }

        .deleteButton {
          width: 28px;
          height: 28px;
          border: 1px solid
            transparent;
          border-radius: 8px;
          background: transparent;
          color: #62594f;
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
          transition: 160ms ease;
        }

        .deleteButton:hover {
          color: #d47b61;
          border-color: rgba(
            212,
            123,
            97,
            0.2
          );
          background: rgba(
            212,
            123,
            97,
            0.07
          );
        }

        .deleteButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* EMPTY / LOADING */

        .loadingState,
        .emptyState {
          min-height: 360px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          text-align: center;
        }

        .loadingCircle {
          width: 34px;
          height: 34px;
          border: 2px solid
            rgba(201, 106, 50, 0.16);
          border-top-color: #c96a32;
          border-radius: 50%;
          animation: spin 0.8s linear
            infinite;
          margin-bottom: 7px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .emptyIcon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #e08a45;
          background: rgba(
            201,
            106,
            50,
            0.1
          );
          margin-bottom: 8px;
        }

        .loadingState strong,
        .emptyState strong {
          color: #f1e7d0;
          font-size: 11px;
        }

        .loadingState span,
        .emptyState span {
          color: #766d60;
          font-size: 9px;
        }

        .emptyAction {
          margin-top: 9px;
          color: #e08a45;
          font-size: 9px;
          padding: 8px 11px;
          border: 1px solid
            rgba(
              201,
              106,
              50,
              0.25
            );
          border-radius: 8px;
          background: rgba(
            201,
            106,
            50,
            0.06
          );
        }

        /* RESPONSIVE */

        @media (max-width: 1100px) {
          .sidebar {
            width: 210px;
          }

          .content {
            padding: 34px 28px 45px;
          }

          .summaryGrid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .tableHeader,
          .sessionRow {
            grid-template-columns:
              minmax(190px, 1.3fr)
              minmax(130px, 1fr)
              minmax(110px, 0.8fr)
              minmax(90px, 0.6fr)
              40px;
            gap: 12px;
          }
        }

        @media (max-width: 820px) {
          .sidebar {
            display: none;
          }

          .content {
            padding: 25px 18px 35px;
          }

          .tableHeader {
            display: none;
          }

          .sessionRow {
            grid-template-columns:
              1fr auto;
            gap: 10px 15px;
            padding: 16px 18px;
          }

          .projectCell {
            grid-column: 1;
          }

          .dateCell {
            grid-column: 1;
          }

          .timeCell {
            grid-column: 1;
          }

          .durationCell {
            grid-column: 2;
            grid-row: 1 / span 3;
            align-self: center;
          }

          .actionCell {
            grid-column: 2;
            grid-row: 1;
            justify-self: end;
          }

          .deleteButton {
            width: 25px;
            height: 25px;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            align-items: center;
          }

          .topbar p {
            font-size: 11px;
          }

          .topActions {
            gap: 6px;
          }

          .topAvatar {
            display: none;
          }

          .startButtonSmall {
            padding: 0 10px;
          }

          .summaryGrid {
            grid-template-columns: 1fr 1fr;
          }

          .summaryCard {
            min-height: 88px;
            padding: 13px;
          }

          .summaryIcon {
            width: 32px;
            height: 32px;
          }

          .summaryCard strong {
            font-size: 16px;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .filters {
            overflow-x: auto;
          }

          .searchBox {
            min-width: 0;
            width: 100%;
          }

          .panelHeader {
            padding: 16px;
          }

          .sessionRow {
            padding: 15px 16px;
          }
        }

        @media (max-width: 430px) {
          .content {
            padding-left: 13px;
            padding-right: 13px;
          }

          h1 {
            font-size: 27px;
          }

          .summaryGrid {
            gap: 8px;
          }

          .summaryCard {
            gap: 9px;
            padding: 11px;
          }

          .summaryIcon {
            display: none;
          }

          .sessionRow {
            grid-template-columns:
              minmax(0, 1fr) auto;
          }

          .dateCell,
          .timeCell {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}
