#!/usr/bin/env node
import { Command } from "commander";
import { registerCommands } from "../lib/commandLoader.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const program = new Command().name("playq").description("PlayQ CLI");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(__dirname, "..", "VERSION");
const cliVersion = fs.existsSync(versionFile)
  ? fs.readFileSync(versionFile, "utf8").trim()
  : "0.0.0";
program.version(cliVersion);

await registerCommands(program);
program.parse(process.argv);
