import { useCallback, useRef } from "react";

interface ResizerProps {
  onResize: (delta: number) => void;
}

export function Resizer({ onResize }: ResizerProps) {
  const startX = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startX.current = e.clientX;

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX.current;
        startX.current = ev.clientX;
        onResize(delta);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onResize],
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        flexShrink: 0,
        width: 1,
        cursor: "col-resize",
        background: "var(--border)",
        position: "relative",
      }}
    >
      {/* invisible wider hit area */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: -3,
          right: -3,
        }}
      />
    </div>
  );
}
