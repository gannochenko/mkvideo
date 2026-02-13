import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function writeFile(filePath: string, buffer: Buffer) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, buffer);
}
