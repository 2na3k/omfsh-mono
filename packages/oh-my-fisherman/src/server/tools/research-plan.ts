import type { ToolDef } from "@2na3k/omfsh-provider";
import type { ResearchPlanTask } from "../../shared/types.js";

interface ResearchPlanInput {
  tasks: ResearchPlanTask[];
}

export function buildResearchPlanTool(): ToolDef<ResearchPlanInput, string> {
  return {
    description:
      "Declare or update your research plan. Call this FIRST with all planned tasks (status: pending) before starting research. Call again as each task completes to update its status to done.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          description: "The full list of research tasks with their current status",
          items: {
            type: "object",
            properties: {
              task: { type: "string", description: "Short description of the research task" },
              status: { type: "string", enum: ["pending", "done"], description: "Current status of this task" },
            },
            required: ["task", "status"],
          },
        },
      },
      required: ["tasks"],
    },
    execute(input: ResearchPlanInput): string {
      const done = input.tasks.filter((t) => t.status === "done").length;
      const pending = input.tasks.filter((t) => t.status === "pending").length;
      return `Research plan updated: ${done} done, ${pending} pending.`;
    },
  };
}
