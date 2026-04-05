import { create } from "zustand";
import type { Entity, Relation } from "../../shared/types.js";

interface GraphState {
  entities: Entity[];
  relations: Relation[];
  selectedEntityId: string | null;
  reportMarkdown: string;

  addEntities: (entities: Entity[]) => void;
  addRelations: (relations: Relation[]) => void;
  setSelectedEntity: (id: string | null) => void;
  setEntities: (entities: Entity[]) => void;
  setRelations: (relations: Relation[]) => void;
  setReportMarkdown: (markdown: string) => void;
  clear: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  entities: [],
  relations: [],
  selectedEntityId: null,
  reportMarkdown: "",

  addEntities: (newEntities) =>
    set((s) => {
      // deduplicate by name
      const existing = new Set(s.entities.map((e) => e.name));
      const unique = newEntities.filter((e) => !existing.has(e.name));
      return { entities: [...s.entities, ...unique] };
    }),

  addRelations: (newRelations) =>
    set((s) => {
      const existing = new Set(s.relations.map((r) => `${r.sourceId}-${r.targetId}-${r.label}`));
      const unique = newRelations.filter((r) => !existing.has(`${r.sourceId}-${r.targetId}-${r.label}`));
      return { relations: [...s.relations, ...unique] };
    }),

  setSelectedEntity: (id) => set({ selectedEntityId: id }),
  setEntities: (entities) => set({ entities }),
  setRelations: (relations) => set({ relations }),
  setReportMarkdown: (markdown) => set({ reportMarkdown: markdown }),
  clear: () => set({ entities: [], relations: [], selectedEntityId: null, reportMarkdown: "" }),
}));
