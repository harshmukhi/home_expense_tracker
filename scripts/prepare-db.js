const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';

if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  console.log('Detected PostgreSQL connection string. Configuring Prisma provider for PostgreSQL...');
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  schema = schema.replace(/url\s*=\s*"[^"]*"/g, 'url = env("DATABASE_URL")');
  fs.writeFileSync(schemaPath, schema, 'utf8');
} else if (process.env.VERCEL) {
  console.log('Running on Vercel with SQLite. Configuring writable /tmp database path...');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schema = schema.replace(/url\s*=\s*"[^"]*"/g, 'url = "file:/tmp/dev.db"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
} else {
  console.log('Using local SQLite database.');
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  schema = schema.replace(/url\s*=\s*"[^"]*"/g, 'url = "file:./dev.db"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
}
