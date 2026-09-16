import { createClient } from "@/lib/supabase/client";

export type SupabaseProject = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type CreateProjectInput = {
  name: string;
  color?: string;
};

/**
 * Get all projects for the currently authenticated user.
 *
 * RLS on the projects table handles user-level access.
 */
export async function getSupabaseProjects(): Promise<SupabaseProject[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("SUPABASE PROJECTS LOAD ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Create a project for the currently authenticated user.
 */
export async function createSupabaseProject(
  project: CreateProjectInput
) {
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
    .from("projects")
    .insert({
      user_id: user.id,
      name: project.name.trim(),
      color: project.color ?? "#ff6a00",
    })
    .select("id, name, color, created_at")
    .single();

  if (error) {
    console.error("SUPABASE PROJECT CREATE ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      `Failed to create project: ${error.message}`
    );
  }

  return data;
}

/**
 * Update an existing project.
 */
export async function updateSupabaseProject(
  id: string,
  project: CreateProjectInput
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: project.name.trim(),
      color: project.color ?? "#ff6a00",
    })
    .eq("id", id)
    .select("id, name, color, created_at")
    .single();

  if (error) {
    console.error("SUPABASE PROJECT UPDATE ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      `Failed to update project: ${error.message}`
    );
  }

  return data;
}

/**
 * Delete an existing project.
 */
export async function deleteSupabaseProject(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("SUPABASE PROJECT DELETE ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    throw new Error(
      `Failed to delete project: ${error.message}`
    );
  }
}
