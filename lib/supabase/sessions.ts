import { createClient } from "@/lib/supabase/client";

export type SupabaseSession = {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  status: "completed" | "cancelled";
  created_at: string;
};

export type CreateSessionInput = {
  startTime: number;
  endTime: number;
  duration: number;
  projectId?: string | null;
};

/**
 * Create a completed focus session.
 */
export async function createSession(
  session: CreateSessionInput
): Promise<SupabaseSession> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("AUTH ERROR:", userError);
    throw new Error(`Auth error: ${userError.message}`);
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      project_id: session.projectId ?? null,
      started_at: new Date(session.startTime).toISOString(),
      ended_at: new Date(session.endTime).toISOString(),
      duration_seconds: Math.floor(session.duration),
      status: "completed",
    })
    .select(
      "id, project_id, started_at, ended_at, duration_seconds, status, created_at"
    )
    .single();

  if (error) {
    console.error("SUPABASE SESSION CREATE ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      [
        error.message,
        error.details,
        error.hint,
        error.code ? `Code: ${error.code}` : "",
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  return data;
}

/**
 * Get all sessions belonging to the current user.
 *
 * RLS handles user-level access.
 */
export async function getSupabaseSessions(): Promise<
  SupabaseSession[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, project_id, started_at, ended_at, duration_seconds, status, created_at"
    )
    .order("started_at", { ascending: false });

  if (error) {
    console.error("SUPABASE SESSIONS LOAD ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(`Failed to load sessions: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Delete a session.
 */
export async function deleteSupabaseSession(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("SUPABASE SESSION DELETE ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      `Failed to delete session: ${error.message}`
    );
  }
}

/**
 * Delete all sessions belonging to the current user.
 */
export async function clearSupabaseSessions() {
  const supabase = createClient();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .not("id", "is", null);

  if (error) {
    console.error("SUPABASE SESSIONS CLEAR ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      `Failed to clear sessions: ${error.message}`
    );
  }
}
