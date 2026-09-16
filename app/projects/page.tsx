"use client";

import { useEffect, useState } from "react";

import {
  createSupabaseProject,
  deleteSupabaseProject,
  getSupabaseProjects,
  updateSupabaseProject,
  type SupabaseProject,
} from "@/lib/supabase/projects";

const PROJECT_COLORS = [
  "#ff6a00",
  "#ef4444",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<
    SupabaseProject[]
  >([]);

  const [name, setName] = useState("");
  const [color, setColor] =
    useState(PROJECT_COLORS[0]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getSupabaseProjects();

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
        const updated =
          await updateSupabaseProject(
            editingId,
            {
              name: trimmedName,
              color,
            }
          );

        setProjects((current) =>
          current.map((project) =>
            project.id === editingId
              ? updated
              : project
          )
        );
      } else {
        const created =
          await createSupabaseProject({
            name: trimmedName,
            color,
          });

        setProjects((current) => [
          ...current,
          created,
        ]);
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

  async function handleDelete(
    project: SupabaseProject
  ) {
    const confirmed = window.confirm(
      `Delete "${project.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await deleteSupabaseProject(
        project.id
      );

      setProjects((current) =>
        current.filter(
          (item) => item.id !== project.id
        )
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
    <main className="min-h-screen bg-[#0b0b0d] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium text-orange-400">
            FocusLog
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Projects
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Organize your focus sessions by project.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-5">
            <h2 className="text-lg font-medium">
              {editingId
                ? "Edit project"
                : "Create project"}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
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
                className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Project name
              </label>

              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Website Redesign"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50 focus:bg-white/[0.05]"
              />
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Color
              </p>

              <div className="flex flex-wrap gap-3">
                {PROJECT_COLORS.map(
                  (projectColor) => (
                    <button
                      key={projectColor}
                      type="button"
                      onClick={() =>
                        setColor(projectColor)
                      }
                      aria-label={`Select ${projectColor}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        color === projectColor
                          ? "border-white/60 bg-white/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded-full"
                        style={{
                          backgroundColor:
                            projectColor,
                        }}
                      />
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  saving || !name.trim()
                }
                className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">
                Your projects
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {projects.length}{" "}
                {projects.length === 1
                  ? "project"
                  : "projects"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
                Loading projects...
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-orange-400">
                +
              </div>

              <h3 className="text-lg font-medium">
                No projects yet
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Create your first project above to
                organize your focus sessions.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/15 hover:bg-white/[0.045]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="h-11 w-11 shrink-0 rounded-2xl"
                        style={{
                          backgroundColor:
                            `${project.color}20`,
                          border: `1px solid ${project.color}40`,
                        }}
                      >
                        <div
                          className="m-3 h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              project.color,
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-white">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          Created{" "}
                          {new Date(
                            project.created_at
                          ).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-3 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(project)
                        }
                        className="text-xs font-medium text-zinc-500 transition hover:text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(project)
                        }
                        className="text-xs font-medium text-zinc-600 transition hover:text-red-400"
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
  );
}
