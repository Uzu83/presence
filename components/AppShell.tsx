"use client";

import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { listFiles, listMessages, listProjects } from "@/lib/idb";
import { useAppStore } from "@/store/app-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setProjects = useAppStore((s) => s.setProjects);
  const setFiles = useAppStore((s) => s.setFiles);
  const setMessages = useAppStore((s) => s.setMessages);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const projects = await listProjects();
      if (cancelled) return;
      setProjects(projects);
      const [files, messages] = await Promise.all([
        activeProjectId ? listFiles(activeProjectId) : Promise.resolve([]),
        listMessages(activeProjectId),
      ]);
      if (cancelled) return;
      setFiles(files);
      setMessages(messages);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, setProjects, setFiles, setMessages, setHydrated]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="safe-pb flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
