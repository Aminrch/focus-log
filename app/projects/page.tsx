"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/app-shell";

import {
  createSupabaseProject,
  deleteSupabaseProject,
  getSupabaseProjects,
  updateSupabaseProject,
  type SupabaseProject,
} from "@/lib/supabase/projects";

const PROJECT_COLORS = [
  "#c96a32",
  "#ef4444",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<SupabaseProject[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError("");

        const data = await getSupabaseProjects();

        if (!mounted) return;

        setProjects(data);
      } catch (error) {
        console.error(error);

        if (!mounted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load projects."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  function resetForm() {
    setName("");
    setColor(PROJECT_COLORS[0]);
    setEditingId(null);
    setError("");
  }

  function startEdit(project: SupabaseProject) {
    setEditingId(project.id);
    setName(project.name);
    setColor(project.color);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        const updated = await updateSupabaseProject(editingId, {
          name: trimmedName,
          color,
        });

        setProjects((current) =>
          current.map((project) =>
            project.id === editingId ? updated : project
          )
        );
      } else {
        const created = await createSupabaseProject({
          name: trimmedName,
          color,
        });

        setProjects((current) => [...current, created]);
      }

      resetForm();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: SupabaseProject) {
    const confirmed = window.confirm(`Delete "${project.name}"?`);

    if (!confirmed) return;

    try {
      setError("");

      await deleteSupabaseProject(project.id);

      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );

      if (editingId === project.id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to delete project."
      );
    }
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-[#171411] px-5 py-6 text-[#f1e7d0] sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c96a32]">
              FocusLog
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[#f1e7d0]">
              Projects
            </h1>

            <p className="mt-2 text-sm text-[#766d60]">
              Organize your focus sessions by project.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Create / Edit */}
          <div className="mb-8 rounded-3xl border border-[#d8c8a8]/10 bg-[#211b16] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="mb-5">
              <h2 className="text-lg font-medium text-[#f1e7d0]">
                {editingId ? "Edit project" : "Create project"}
              </h2>

              <p className="mt-1 text-sm text-[#766d60]">
                Give your project a name and color.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
            >
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#766d60]"
                >
                  Project name
                </label>

                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="w-full rounded-xl border border-[#d8c8a8]/10 bg-[#332b22] px-4 py-3 text-sm text-[#f1e7d0] outline-none transition placeholder:text-[#766d60]/70 focus:border-[#c96a32]/60 focus:bg-[#332b22]"
                />
              </div>

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#766d60]">
                  Color
                </p>

                <div className="flex flex-wrap gap-3">
                  {PROJECT_COLORS.map((projectColor) => (
                    <button
                      key={projectColor}
                      type="button"
                      onClick={() => setColor(projectColor)}
                      aria-label={`Select ${projectColor}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        color === projectColor
                          ? "border-[#f1e7d0]/60 bg-[#f1e7d0]/10"
                          : "border-[#d8c8a8]/10 bg-[#f1e7d0]/[0.03]"
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded-full"
                        style={{
                          backgroundColor: projectColor,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-xl bg-[#c96a32] px-5 py-3 text-sm font-semibold text-[#f1e7d0] shadow-lg shadow-[#c96a32]/15 transition hover:bg-[#e08a45] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create project"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-[#d8c8a8]/10 bg-[#f1e7d0]/[0.03] px-5 py-3 text-sm font-medium text-[#766d60] transition hover:bg-[#f1e7d0]/[0.06] hover:text-[#f1e7d0]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Projects */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[#f1e7d0]">
                  Your projects
                </h2>

                <p className="mt-1 text-sm text-[#766d60]">
                  {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center rounded-3xl border border-[#d8c8a8]/10 bg-[#211b16]">
                <div className="flex items-center gap-3 text-sm text-[#766d60]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8c8a8]/10 border-t-[#c96a32]" />
                  Loading projects...
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-[#d8c8a8]/10 bg-[#211b16] px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8c8a8]/10 bg-[#f1e7d0]/[0.03] text-[#c96a32]">
                  +
                </div>

                <h3 className="text-lg font-medium text-[#f1e7d0]">
                  No projects yet
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-[#766d60]">
                  Create your first project above to organize your
                  focus sessions.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group rounded-2xl border border-[#d8c8a8]/10 bg-[#211b16] p-5 transition hover:border-[#d8c8a8]/20 hover:bg-[#332b22]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className="h-11 w-11 shrink-0 rounded-2xl"
                          style={{
                            backgroundColor: `${project.color}20`,
                            border: `1px solid ${project.color}40`,
                          }}
                        >
                          <div
                            className="m-3 h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: project.color,
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium text-[#f1e7d0]">
                            {project.name}
                          </h3>

                          <p className="mt-1 text-xs text-[#766d60]">
                            Created{" "}
                            {new Date(
                              project.created_at
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-3 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(project)}
                          className="text-xs font-medium text-[#766d60] transition hover:text-[#f1e7d0]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          className="text-xs font-medium text-[#766d60] transition hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
