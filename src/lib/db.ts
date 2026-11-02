import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// If running in Vercel serverless environment and using SQLite, copy db to writable /tmp
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

if (process.env.VERCEL && !isPostgres) {
  try {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      const localDb = path.join(process.cwd(), 'prisma', 'dev.db');
      if (fs.existsSync(localDb)) {
        fs.copyFileSync(localDb, tmpDbPath);
      } else {
        fs.writeFileSync(tmpDbPath, '');
      }
    }
  } catch (e) {
    console.error('Error ensuring /tmp/dev.db on Vercel:', e);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
