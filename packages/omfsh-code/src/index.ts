import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";
import { isValidModelId } from "./model-registry.js";
import { DEFAULT_MODEL_ID } from "./constants.js";
import type { ModelId } from "@2na3k/omfsh-provider";

const arg = process.argv[2];
const modelId: ModelId = arg && isValidModelId(arg) ? arg : DEFAULT_MODEL_ID;

if (arg && !isValidModelId(arg)) {
  console.error(`Unknown model: "${arg}". Starting with default model: ${DEFAULT_MODEL_ID}`);
}

render(React.createElement(App, { modelId }), { exitOnCtrlC: false });
