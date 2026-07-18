import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "_snapshots",
]);

const ignoredFiles = new Set([
  "scripts/detect-mojibake.mjs",
]);

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);

const mojibakePattern =
  /�|锟|Ã|Â|â€|鍥|瑙|鏂|绯|馃|鉃|禲|俙|鈴|銆|鎴|涓|姝|鏆|瀹|绋|勫|傚|犳|藉|撴|堢|鐢|杈|鍏|鏈|璇|澶|閰|鐩|闆|瀵|绮|鎸|濡|閲|闂|缇|璧|閾|宸|鏉|鑷|鏁|浠|妯|瀛|懡|鐨|鍒|欏|垪|悎|嶆|滃|屾|斁|煎|叆|簿|熸|犳|愮|鏃|戝|潡|涔|绗/;

const visibleMojibakePattern =
  /鎵撳|鎰忓浘|鎺у埗|鍙\?|娓呯|璁板綍|濞撳|拋鏉跨秿|鏀惰捣|瀵硅瘽/;

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isTextFile(filePath) {
  const ext = path.extname(filePath);
  if (textExtensions.has(ext)) return true;
  const base = path.basename(filePath);
  return base === ".editorconfig" || base === ".gitattributes";
}

function isAllowedFinding(relativePath, line) {
  return (
    relativePath === "components/GlobalApiConfigTab.tsx" &&
    line.includes("return /�|锟|Ã|Â|â€|鎴")
  );
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectFiles(fullPath));
      }
      continue;
    }

    const relativePath = toPosix(path.relative(root, fullPath));
    if (!ignoredFiles.has(relativePath) && isTextFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];
const files = await collectFiles(root);

for (const file of files) {
  const relativePath = toPosix(path.relative(root, file));
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (
      (mojibakePattern.test(line) || visibleMojibakePattern.test(line)) &&
      !isAllowedFinding(relativePath, line)
    ) {
      findings.push({
        file: relativePath,
        line: index + 1,
        text: line.trim().slice(0, 180),
      });
    }
  });
}

if (findings.length > 0) {
  console.error(`Mojibake scan failed: ${findings.length} suspicious line(s).`);
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log(`Mojibake scan passed across ${files.length} text file(s).`);
