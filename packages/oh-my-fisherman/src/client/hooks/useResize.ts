import { useState, useEffect } from "react";

const STORAGE_KEY = "fisherman:panel-sizes";

interface PanelSizes {
  left: number;
  right: number;
}

const DEFAULTS: PanelSizes = { left: 300, right: 360 };

export function usePanelSizes() {
  const [sizes, setSizes] = useState<PanelSizes>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as PanelSizes;
    } catch {
      // ignore
    }
    return DEFAULTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  }, [sizes]);

  return {
    leftWidth: sizes.left,
    rightWidth: sizes.right,
    setLeftWidth: (updater: number | ((prev: number) => number)) =>
      setSizes((s) => ({ ...s, left: typeof updater === "function" ? updater(s.left) : updater })),
    setRightWidth: (updater: number | ((prev: number) => number)) =>
      setSizes((s) => ({ ...s, right: typeof updater === "function" ? updater(s.right) : updater })),
  };
}
