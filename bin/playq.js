#!/usr/bin/env node
import { Command } from "commander";
import { registerCommands } from "../lib/commandLoader.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const program = new Command().name("playq").description("PlayQ CLI");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionJsonPath = path.join(__dirname, "..", "version.json");
const packageJsonPath = path.join(__dirname, "..", "package.json");
let cliVersion = "0.0.0";

try {
  // Try version.json first (more detailed version info)
  if (fs.existsSync(versionJsonPath)) {
    const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
    cliVersion = versionJson.version || "0.0.0";
  } else {
    // Fall back to package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    cliVersion = packageJson.version || "0.0.0";
  }
} catch (error) {
  // Final fall back to VERSION file if JSON files can't be read
  const versionFile = path.join(__dirname, "..", "VERSION");
  if (fs.existsSync(versionFile)) {
    cliVersion = fs.readFileSync(versionFile, "utf8").trim();
  }
}

program.version(cliVersion);

await registerCommands(program);
program.parse(process.argv);
