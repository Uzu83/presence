"use client";

import { useState } from "react";
import {
  addFile,
  deleteFile,
  deleteProject,
  listFiles,
  listProjects,
  newId,
  type Project,
  readFileAsText,
  upsertProject,
} from "@/lib/idb";
import { useAppStore } from "@/store/app-store";
import { usePlanStore } from "@/store/plan-store";

export function ProjectsPanel() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const files = useAppStore((s) => s.files);
  const setFiles = useAppStore((s) => s.setFiles);
  const maxProjects = usePlanStore((s) => s.entitlements.maxProjects);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refreshProjects() {
    setProjects(await listProjects());
  }

  async function createProject() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (projects.length >= maxProjects) {
      setError(
        `Free は資料プロジェクト ${maxProjects} 件まで。プランタブで Pro にすると増やせます。`,
      );
      return;
    }
    const now = Date.now();
    const project: Project = {
      id: newId("prj"),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    await upsertProject(project);
    setName("");
    await refreshProjects();
    setActiveProjectId(project.id);
    setFiles([]);
  }

  async function removeProject(id: string) {
    await deleteProject(id);
    if (activeProjectId === id) setActiveProjectId(null);
    await refreshProjects();
    setFiles([]);
  }

  async function onUpload(fileList: FileList | null) {
    if (!activeProjectId || !fileList?.length) return;
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const text = await readFileAsText(file);
        await addFile({
          id: newId("file"),
          projectId: activeProjectId,
          name: file.name,
          mime: file.type || "text/plain",
          text,
          createdAt: Date.now(),
        });
      }
      const proj = projects.find((p) => p.id === activeProjectId);
      if (proj) {
        await upsertProject({ ...proj, updatedAt: Date.now() });
        await refreshProjects();
      }
      setFiles(await listFiles(activeProjectId));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeFile(id: string) {
    await deleteFile(id);
    if (activeProjectId) setFiles(await listFiles(activeProjectId));
  }

  const active = projects.find((p) => p.id === activeProjectId) ?? null;

  return (
    <div className="px-4 py-5">
      <h1 className="font-display text-2xl tracking-wide">資料</h1>
      <p className="mt-1 text-sm text-mist">
        NotebookLM
        のようにファイルをプロジェクトに置き、会話の根拠にします。端末内のみ保存。
      </p>

      <div className="mt-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新しいプロジェクト名"
          className="min-h-12 flex-1 rounded-xl border border-line bg-panel px-3 text-base text-paper placeholder:text-mist/70"
        />
        <button
          type="button"
          onClick={() => void createProject()}
          className="min-h-12 rounded-xl bg-amber px-4 text-sm font-semibold text-ink"
        >
          作成
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {projects.map((p) => {
          const selected = p.id === activeProjectId;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setActiveProjectId(p.id)}
                className={`flex w-full min-h-12 items-center justify-between rounded-xl border px-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-amber/50 bg-amber/10 text-paper"
                    : "border-line bg-panel/60 text-mist hover:text-paper"
                }`}
              >
                <span>{p.name}</span>
                <span className="text-xs opacity-70">開く</span>
              </button>
            </li>
          );
        })}
        {projects.length === 0 && (
          <li className="rounded-xl border border-dashed border-line px-3 py-4 text-sm text-mist">
            まだプロジェクトがありません。
          </li>
        )}
      </ul>

      {active && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">{active.name}</h2>
            <button
              type="button"
              onClick={() => void removeProject(active.id)}
              className="min-h-10 rounded-lg px-3 text-xs text-danger hover:bg-danger/10"
            >
              削除
            </button>
          </div>

          <label className="mt-4 flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/50 px-4 py-5 text-sm text-mist transition-colors hover:border-amber/40 hover:text-paper">
            <span className="font-medium text-paper">ファイルを追加</span>
            <span className="mt-1 text-xs">
              .md .txt .csv .json など（PDF は次フェーズ）
            </span>
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                void onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {error && (
            <p className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-line bg-panel/70 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{f.name}</p>
                  <p className="mt-0.5 text-xs text-mist">
                    {f.text.length.toLocaleString()} 文字
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeFile(f.id)}
                  className="min-h-10 shrink-0 rounded-lg px-2 text-xs text-mist hover:text-danger"
                >
                  外す
                </button>
              </li>
            ))}
            {files.length === 0 && (
              <li className="text-sm text-mist">ファイルはまだありません。</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
