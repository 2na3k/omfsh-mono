import { create } from "zustand";
import type { Notebook, SourceMeta } from "../../shared/types.js";

interface NotebookState {
  notebooks: Notebook[];
  activeNotebookId: string | null;
  sources: SourceMeta[];
  loading: boolean;

  setNotebooks: (notebooks: Notebook[]) => void;
  addNotebook: (notebook: Notebook) => void;
  removeNotebook: (id: string) => void;
  renameNotebook: (id: string, name: string) => void;
  setActiveNotebook: (id: string | null) => void;
  setSources: (sources: SourceMeta[]) => void;
  addSource: (source: SourceMeta) => void;
  removeSource: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
  notebooks: [],
  activeNotebookId: null,
  sources: [],
  loading: false,

  setNotebooks: (notebooks) => set({ notebooks }),
  addNotebook: (notebook) => set((s) => ({ notebooks: [notebook, ...s.notebooks] })),
  renameNotebook: (id, name) => set((s) => ({
    notebooks: s.notebooks.map((n) => n.id === id ? { ...n, name } : n),
  })),
  removeNotebook: (id) => set((s) => ({
    notebooks: s.notebooks.filter((n) => n.id !== id),
    activeNotebookId: s.activeNotebookId === id ? null : s.activeNotebookId,
  })),
  setActiveNotebook: (id) => set({ activeNotebookId: id, sources: [] }),
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((s) => ({ sources: [source, ...s.sources] })),
  removeSource: (id) => set((s) => ({ sources: s.sources.filter((src) => src.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
