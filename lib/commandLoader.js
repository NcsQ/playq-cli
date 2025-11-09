import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerCommands(program) {
  const dir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const mod = await import(path.join(dir, file));
    if (typeof mod.default === 'function') mod.default(program);
  }
}