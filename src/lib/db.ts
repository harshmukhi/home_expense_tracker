import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { EMPTY_DB_BASE64 } from './emptyDbBase64';

const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  '';
const isPostgres =
  rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://');

let resolvedDatasourceUrl = rawDbUrl;

if (!isPostgres) {
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      let needsInit = false;
      if (!fs.existsSync(tmpDbPath)) {
        needsInit = true;
      } else {
        const stats = fs.statSync(tmpDbPath);
        if (stats.size < 10000) {
          needsInit = true;
        }
      }

      if (needsInit) {
        const localDb = path.join(process.cwd(), 'prisma', 'dev.db');
        if (fs.existsSync(localDb) && fs.statSync(localDb).size > 10000) {
          fs.copyFileSync(localDb, tmpDbPath);
        } else {
          const buffer = Buffer.from(EMPTY_DB_BASE64, 'base64');
          fs.writeFileSync(tmpDbPath, buffer);
        }
      }
    } catch (e) {
      console.error('Error ensuring /tmp/dev.db on Vercel:', e);
    }
    resolvedDatasourceUrl = 'file:/tmp/dev.db';
  } else {
    const localDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    resolvedDatasourceUrl = `file:${localDbPath.replace(/\\/g, '/')}`;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolvedDatasourceUrl,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
