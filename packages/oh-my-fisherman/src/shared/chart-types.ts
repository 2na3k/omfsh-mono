export interface DataPoint {
  label: string;
  value: number;
}

export interface XYPoint {
  x: number;
  y: number;
  label?: string;
}

export type ChartSpec =
  | { type: "bar";     title?: string; xLabel?: string; yLabel?: string; data: DataPoint[] }
  | { type: "line";    title?: string; xLabel?: string; yLabel?: string; data: DataPoint[] }
  | { type: "pie";     title?: string; data: DataPoint[] }
  | { type: "scatter"; title?: string; xLabel?: string; yLabel?: string; data: XYPoint[] };
