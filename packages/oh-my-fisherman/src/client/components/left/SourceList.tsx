import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";
import { Badge } from "../shared/Badge.js";

export function SourceList() {
  const sources = useNotebookStore((s) => s.sources);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div>
      {sources.map((src) => (
        <div
          key={src.id}
          className="flex items-center gap-2"
          style={{
            padding: "var(--sp-2) var(--sp-4)",
            borderBottom: "1px solid var(--border)",
            fontSize: "var(--text-sm)",
          }}
        >
          <Badge variant="muted">{src.type}</Badge>
          <Text variant="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {src.title}
          </Text>
          <Text variant="xs" muted mono>{src.chunkCount} chunks</Text>
        </div>
      ))}
    </div>
  );
}
