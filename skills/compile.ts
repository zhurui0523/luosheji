import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SHARED_ASSET_RULES } from "../services/rules.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple, robust YAML/Markdown Frontmatter parser
export function parseMarkdownSkill(content: string): any {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized.startsWith("---")) {
    return { instruction: normalized };
  }

  // Find the closing frontmatter delimiter
  const lines = normalized.split("\n");
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { instruction: normalized };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const instruction = lines.slice(closingIndex + 1).join("\n").trim();

  const metadata: any = {};
  let currentKey = "";
  let currentOption: any = null;
  let inCustomOptions = false;

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);

    // Array item starting with -
    if (trimmed.startsWith("-")) {
      const val = trimmed.substring(1).trim();

      if (inCustomOptions) {
        // If we are parsing customOptions
        if (trimmed.startsWith("- id:") || trimmed.startsWith("- name:")) {
          // New customOption item
          if (currentOption) {
            if (!metadata.customOptions) metadata.customOptions = [];
            metadata.customOptions.push(currentOption);
          }
          currentOption = {};
          const inner = trimmed.substring(1).trim();
          const colonIdx = inner.indexOf(":");
          const k = inner.substring(0, colonIdx).trim();
          const v = inner.substring(colonIdx + 1).trim();
          currentOption[k] = parseValue(v);
        } else if (trimmed.includes(":")) {
          // Regular key-value under customOption
          const colonIdx = trimmed.indexOf(":");
          const k = trimmed.substring(trimmed.startsWith("-") ? 1 : 0, colonIdx).trim();
          const v = trimmed.substring(colonIdx + 1).trim();
          if (!currentOption) currentOption = {};
          currentOption[k] = parseValue(v);
        } else {
          // It's a choices array item under the currentOption
          if (!currentOption) currentOption = {};
          if (!currentOption.choices) currentOption.choices = [];
          currentOption.choices.push(parseValue(val));
        }
      } else if (currentKey) {
        // Top-level simple array
        if (!Array.isArray(metadata[currentKey])) {
          metadata[currentKey] = [];
        }
        metadata[currentKey].push(parseValue(val));
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1) {
      const key = trimmed.substring(0, colonIdx).trim();
      const val = trimmed.substring(colonIdx + 1).trim();

      if (key === "customOptions") {
        inCustomOptions = true;
        if (currentOption) {
          if (!metadata.customOptions) metadata.customOptions = [];
          metadata.customOptions.push(currentOption);
          currentOption = null;
        }
        continue;
      }

      if (inCustomOptions && indent >= 2) {
        if (!currentOption) currentOption = {};
        if (key === "choices") {
          currentOption.choices = [];
        } else {
          currentOption[key] = parseValue(val);
        }
      } else {
        inCustomOptions = false;
        if (currentOption) {
          if (!metadata.customOptions) metadata.customOptions = [];
          metadata.customOptions.push(currentOption);
          currentOption = null;
        }
        currentKey = key;
        if (val) {
          metadata[key] = parseValue(val);
        } else {
          metadata[key] = null;
        }
      }
    }
  }

  if (currentOption) {
    if (!metadata.customOptions) metadata.customOptions = [];
    metadata.customOptions.push(currentOption);
  }

  return {
    ...metadata,
    instruction,
  };
}

function parseValue(val: string): any {
  val = val.trim();
  if (!val) return "";
  
  // JSON array support (e.g. choices: ["A", "B"])
  if (val.startsWith("[") && val.endsWith("]")) {
    try {
      return JSON.parse(val);
    } catch (e) {
      // Fallback: parse manually
      return val.slice(1, -1).split(",").map(v => parseValue(v));
    }
  }

  // Remove wrapping quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.substring(1, val.length - 1);
  }
  if (val === "true") return true;
  if (val === "false") return false;
  if (!isNaN(val as any)) return Number(val);
  return val;
}

function run() {
  const definitionsDir = path.join(__dirname, "definitions");
  console.log(`Scanning directory: ${definitionsDir}`);

  const files = fs.readdirSync(definitionsDir);
  const mdFiles = files.filter(f => f.endsWith(".md"));

  console.log(`Found ${mdFiles.length} markdown skill definitions.`);

  const skills: any[] = [];
  const exportStatements: string[] = [];

  for (const file of mdFiles) {
    const fullPath = path.join(definitionsDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const skillName = file.replace(".md", "");
    
    let parsed = parseMarkdownSkill(content);

    // Template interpolation for SHARED_ASSET_RULES
    if (parsed.instruction.includes("${SHARED_ASSET_RULES}")) {
      parsed.instruction = parsed.instruction.replace(/\$\{SHARED_ASSET_RULES\}/g, SHARED_ASSET_RULES);
    }

    // Default fields
    parsed.isSystem = parsed.isSystem !== false;
    parsed.isInstalled = parsed.isInstalled !== false;
    parsed.isPublic = parsed.isPublic !== false;

    skills.push(parsed);

    // Generate TypeScript constant name
    const skillConstName = skillName.endsWith("Skill") ? skillName : `${skillName}Skill`;
    exportStatements.push(`export const ${skillConstName}: AiSkill = ${JSON.stringify(parsed, null, 2)};`);
  }

  // Generate system skills
  const systemSkillsOrder = [
    "general",
    "createScript",
    "analyzeScript",
    "rewriteScript",
    "videoDissect",
    "assetPrompt",
    "shotPrompt",
    "sixView",
    "scenePlan",
    "gridStoryboard",
    "officePitchDeck",
    "officeAdScript",
    "officeBriefProposal",
    "dnaSkill",
    "assetLibrary"
  ];

  // Sort according to order, any others at the end
  skills.sort((a, b) => {
    let indexA = systemSkillsOrder.indexOf(a.id);
    let indexB = systemSkillsOrder.indexOf(b.id);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });

  const indexContent = `// Automatically generated by skills/compile.ts. DO NOT EDIT DIRECTLY.
import type { AiSkill } from "../types.ts";

${exportStatements.join("\n\n")}

export const SYSTEM_SKILLS: AiSkill[] = ${JSON.stringify(skills, null, 2)};
`;

  const indexOutputPath = path.join(definitionsDir, "index.ts");
  fs.writeFileSync(indexOutputPath, indexContent, "utf-8");
  console.log(`Successfully compiled skills to ${indexOutputPath}`);
}

// Only run if called directly
if (process.argv[1] === __filename || process.argv[1].endsWith("compile.ts")) {
  run();
}
