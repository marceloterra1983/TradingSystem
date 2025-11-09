import fs from 'node:fs';
import path from 'node:path';

export const ensureDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const writeJson = (filePath: string, data: unknown) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

export const writeText = (filePath: string, content: string) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
};

export const listArtifacts = (dirPath: string): string[] => {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).flatMap((entry) => {
    const full = path.join(dirPath, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      return listArtifacts(full);
    }
    return [full];
  });
};
