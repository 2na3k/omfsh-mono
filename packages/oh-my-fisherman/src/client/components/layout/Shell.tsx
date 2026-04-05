import { useCallback, useRef, type ReactNode } from "react";
import { Resizer } from "./Resizer.js";
import { usePanelSizes } from "../../hooks/useResize.js";

interface ShellProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

const MIN_LEFT = 240;
const MIN_CENTER = 400;
const MIN_RIGHT = 280;

export function Shell({ left, center, right }: ShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const { leftWidth, rightWidth, setLeftWidth, setRightWidth } = usePanelSizes();

  const handleLeftResize = useCallback(
    (delta: number) => {
      setLeftWidth((prev) => {
        const shell = shellRef.current;
        if (!shell) return prev;
        const total = shell.offsetWidth;
        const next = prev + delta;
        const maxLeft = total - MIN_CENTER - MIN_RIGHT - 8; // 2 resizers
        return Math.max(MIN_LEFT, Math.min(next, maxLeft));
      });
    },
    [setLeftWidth],
  );

  const handleRightResize = useCallback(
    (delta: number) => {
      setRightWidth((prev) => {
        const shell = shellRef.current;
        if (!shell) return prev;
        const total = shell.offsetWidth;
        // delta is inverted for right panel (dragging left = bigger)
        const next = prev - delta;
        const maxRight = total - MIN_CENTER - leftWidth - 8;
        return Math.max(MIN_RIGHT, Math.min(next, maxRight));
      });
    },
    [leftWidth, setRightWidth],
  );

  return (
    <div
      ref={shellRef}
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* left panel */}
      <div
        className="flex-none overflow-y-auto"
        style={{
          width: leftWidth,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {left}
      </div>

      <Resizer onResize={handleLeftResize} />

      {/* center panel */}
      <div
        className="flex-1 min-w-0 overflow-hidden flex flex-col"
        style={{
          minWidth: MIN_CENTER,
          background: "var(--bg)",
        }}
      >
        {center}
      </div>

      <Resizer onResize={handleRightResize} />

      {/* right panel */}
      <div
        className="flex-none overflow-y-auto"
        style={{
          width: rightWidth,
          borderLeft: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {right}
      </div>
    </div>
  );
}
