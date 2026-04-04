import type { ToolMap } from "@2na3k/omfsh-provider";
import { grep } from "./grep.js";
import { bash } from "./bash.js";
import { read } from "./read.js";
import { write } from "./write.js";

export const TOOLS: ToolMap = { grep, bash, read, write };
