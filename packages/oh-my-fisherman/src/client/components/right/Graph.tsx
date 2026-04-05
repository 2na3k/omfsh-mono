import { useRef, useEffect, useCallback } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { select } from "d3-selection";
import { useGraphStore } from "../../stores/graph.js";
import { Text } from "../shared/Text.js";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  label: string;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#4fc3f7",
  org: "#81c784",
  concept: "#ffb74d",
  event: "#e57373",
  location: "#ba68c8",
  work: "#90a4ae",
};

export function Graph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const entities = useGraphStore((s) => s.entities);
  const relations = useGraphStore((s) => s.relations);
  const selectedId = useGraphStore((s) => s.selectedEntityId);
  const setSelected = useGraphStore((s) => s.setSelectedEntity);

  const renderGraph = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const sel = select(svg);
    sel.selectAll("*").remove();

    if (entities.length === 0) return;

    const nodes: GraphNode[] = entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: GraphLink[] = relations
      .filter((r) => nodeMap.has(r.sourceId) && nodeMap.has(r.targetId))
      .map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        label: r.label,
      }));

    const simulation = forceSimulation(nodes)
      .force("link", forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(120))
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide(40));

    // edges
    const linkGroup = sel.append("g");
    const linkLines = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#2A2A2A")
      .attr("stroke-width", 1);

    const linkLabels = linkGroup
      .selectAll("text")
      .data(links)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", "9px")
      .attr("fill", "#555")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("text-anchor", "middle");

    // nodes
    const nodeGroup = sel.append("g");
    const nodeCircles = nodeGroup
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", "var(--bg)")
      .attr("stroke", (d) => TYPE_COLORS[d.type] ?? "#888")
      .attr("stroke-width", (d) => d.id === selectedId ? 2.5 : 1.5)
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelected(selectedId === d.id ? null : d.id);
      });

    const nodeLabels = nodeGroup
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.name)
      .attr("font-size", "10px")
      .attr("fill", "var(--text)")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("text-anchor", "middle")
      .attr("dy", 22);

    simulation.on("tick", () => {
      linkLines
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      linkLabels
        .attr("x", (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      nodeCircles
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!);

      nodeLabels
        .attr("x", (d) => d.x!)
        .attr("y", (d) => d.y!);
    });

    return () => {
      simulation.stop();
    };
  }, [entities, relations, selectedId, setSelected]);

  useEffect(() => {
    const cleanup = renderGraph();
    return cleanup;
  }, [renderGraph]);

  // re-render on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => renderGraph());
    if (svgRef.current) observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, [renderGraph]);

  if (entities.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ opacity: 0.5 }}
      >
        <Text variant="sm" muted>knowledge graph populates during research</Text>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: "var(--bg)" }}
    />
  );
}
