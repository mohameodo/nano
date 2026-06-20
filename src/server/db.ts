import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const dbType = process.env.DATABASE_TYPE || (connectionString ? 'postgres' : 'json');

let pool: any = null;
const JSON_DB_PATH = path.resolve(process.cwd(), 'database.json');

if (dbType === 'postgres') {
  pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('neon') ? { rejectUnauthorized: false } : undefined,
  });
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch(() => {});
} else {
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify({ users: [] }, null, 2));
  }
}

export async function query(text: string, params?: any[]) {
  if (dbType === 'postgres') {
    return pool.query(text, params);
  }

  const normalized = text.trim().replace(/\s+/g, ' ');
  
  if (normalized.startsWith('CREATE TABLE')) {
    return { rows: [] };
  }
  
  const data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
  
  if (normalized.startsWith('INSERT INTO users')) {
    const username = params?.[0];
    const password = params?.[1];
    if (data.users.some((u: any) => u.username === username)) {
      throw new Error('Username already taken');
    }
    const newUser = {
      id: data.users.length + 1,
      username,
      password,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
    return { rows: [newUser] };
  }
  
  if (normalized.startsWith('SELECT * FROM users WHERE username =')) {
    const username = params?.[0];
    const user = data.users.find((u: any) => u.username === username);
    return { rows: user ? [user] : [] };
  }
  
  return { rows: [] };
}
