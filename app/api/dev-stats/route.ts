import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

function getDirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirSizeBytes(fullPath);
    } else {
      const stat = fs.statSync(fullPath);
      total += stat.size;
    }
  }
  return total;
}

async function getDevStats(): Promise<{ cpu: number; memory: number; disk: string }> {
  const buildDir = '.next';
  const cwd = process.cwd();
  const buildPath = path.join(cwd, buildDir);

  const sampleMs = 100;
  const before = process.cpuUsage();
  const start = Date.now();
  await new Promise((r) => setTimeout(r, sampleMs));
  const elapsed = Date.now() - start;
  const after = process.cpuUsage(before);
  const usageUs = after.user + after.system;
  const cpuPercent = Math.min(100, Math.round((usageUs / (elapsed * 1000)) * 100));

  const mem = process.memoryUsage();
  const memory = Math.round(mem.heapUsed / 1024 / 1024);

  const sizeBytes = getDirSizeBytes(buildPath);
  const sizeMB = Math.round(sizeBytes / 1024 / 1024);
  const disk = `${buildDir} ${sizeMB}MB`;

  return { cpu: cpuPercent, memory, disk };
}

export async function GET() {
  const stats = await getDevStats();
  return NextResponse.json(stats);
}

export const dynamic = 'force-dynamic';
