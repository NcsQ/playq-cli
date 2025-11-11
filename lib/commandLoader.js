import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerCommands(program) {
  const dir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(dir, file);
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    if (typeof mod.default === 'function') mod.default(program);
  }
}