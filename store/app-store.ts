"use client";

import { create } from "zustand";
import type { ChatMessage, Project, ProjectFile } from "@/lib/idb";
import type { ModelId } from "@/lib/models";

type AppState = {
  hydrated: boolean;
  activeProjectId: string | null;
  projects: Project[];
  files: ProjectFile[];
  messages: ChatMessage[];
  modelId: ModelId;
  streaming: boolean;
  setHydrated: (v: boolean) => void;
  setActiveProjectId: (id: string | null) => void;
  setProjects: (p: Project[]) => void;
  setFiles: (f: ProjectFile[]) => void;
  setMessages: (m: ChatMessage[]) => void;
  setModelId: (id: ModelId) => void;
  setStreaming: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  activeProjectId: null,
  projects: [],
  files: [],
  messages: [],
  modelId: "grok-3-mini",
  streaming: false,
  setHydrated: (hydrated) => set({ hydrated }),
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setProjects: (projects) => set({ projects }),
  setFiles: (files) => set({ files }),
  setMessages: (messages) => set({ messages }),
  setModelId: (modelId) => set({ modelId }),
  setStreaming: (streaming) => set({ streaming }),
}));
