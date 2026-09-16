export type FocusSession = {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  project: string;
  createdAt: number;
};

const STORAGE_KEY = "focuslog_sessions";

export function getSessions(): FocusSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const sessions = JSON.parse(saved);

    if (!Array.isArray(sessions)) {
      return [];
    }

    return sessions.filter(
      (session): session is FocusSession =>
        typeof session.id === "string" &&
        typeof session.startTime === "number" &&
        typeof session.endTime === "number" &&
        typeof session.duration === "number" &&
        typeof session.project === "string" &&
        typeof session.createdAt === "number"
    );
  } catch {
    return [];
  }
}

export function saveSessions(sessions: FocusSession[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function addSession(
  session: Omit<FocusSession, "id" | "createdAt">
): FocusSession {
  const newSession: FocusSession = {
    ...session,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`,
    createdAt: Date.now(),
  };

  const sessions = getSessions();

  saveSessions([newSession, ...sessions]);

  return newSession;
}

export function deleteSession(id: string) {
  const sessions = getSessions();

  saveSessions(
    sessions.filter((session) => session.id !== id)
  );
}

export function clearSessions() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}

export function isSameDay(timestamp: number, date = new Date()) {
  const value = new Date(timestamp);

  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

export function getMonday(date = new Date()) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}

export function isSameWeek(
  timestamp: number,
  referenceDate = new Date()
) {
  const timestampDate = new Date(timestamp);
  const monday = getMonday(referenceDate);

  const sunday = new Date(monday);

  sunday.setDate(sunday.getDate() + 7);

  return (
    timestampDate >= monday &&
    timestampDate < sunday
  );
}

export function getDayIndex(timestamp: number) {
  const date = new Date(timestamp);

  const day = date.getDay();

  return day === 0 ? 6 : day - 1;
}
