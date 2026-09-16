import { createClient } from "@/lib/supabase/client";
import type { FocusSession } from "@/lib/sessions";

function createFingerprint(session: {
  startTime: number;
  endTime: number;
  duration: number;
}) {
  return [
    session.startTime,
    session.endTime,
    session.duration,
  ].join("|");
}

export async function migrateLocalSessions(
  localSessions: FocusSession[]
) {
  if (localSessions.length === 0) {
    return {
      imported: 0,
      skipped: 0,
    };
  }

  const supabase = createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Auth error: ${userError.message}`
    );
  }

  const user = userData.user;

  if (!user) {
    throw new Error(
      "No authenticated user found."
    );
  }

  const { data: existingSessions, error } =
    await supabase
      .from("sessions")
      .select(
        "started_at, ended_at, duration_seconds"
      )
      .eq("user_id", user.id);

  if (error) {
    throw new Error(
      `Failed to load existing sessions: ${error.message}`
    );
  }

  const existingFingerprints = new Set(
    (existingSessions ?? []).map((session) =>
      createFingerprint({
        startTime: new Date(
          session.started_at
        ).getTime(),
        endTime: new Date(
          session.ended_at
        ).getTime(),
        duration: session.duration_seconds,
      })
    )
  );

  const sessionsToInsert = localSessions
    .filter((session) => {
      const fingerprint = createFingerprint(session);

      if (existingFingerprints.has(fingerprint)) {
        return false;
      }

      existingFingerprints.add(fingerprint);

      return true;
    })
    .map((session) => ({
      user_id: user.id,
      project_id: null,
      started_at: new Date(
        session.startTime
      ).toISOString(),
      ended_at: new Date(
        session.endTime
      ).toISOString(),
      duration_seconds: Math.floor(
        session.duration
      ),
      status: "completed" as const,
    }));

  if (sessionsToInsert.length === 0) {
    return {
      imported: 0,
      skipped: localSessions.length,
    };
  }

  const { error: insertError } = await supabase
    .from("sessions")
    .insert(sessionsToInsert);

  if (insertError) {
    throw new Error(
      `Failed to migrate sessions: ${insertError.message}`
    );
  }

  return {
    imported: sessionsToInsert.length,
    skipped:
      localSessions.length -
      sessionsToInsert.length,
  };
}
