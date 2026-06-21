const connectionString = process.env.DATABASE_URL;
const dbType = process.env.DATABASE_TYPE || (connectionString ? 'postgres' : 'json');

let pool: any = null;

const initDb = async () => {
  if (dbType === 'postgres') {
    try {
      const pgModule = 'p' + 'g';
      const pg = (await import(/* @vite-ignore */ pgModule)).default;
      const { Pool } = pg;
      pool = new Pool({
        connectionString,
        ssl: connectionString?.includes('neon') ? { rejectUnauthorized: false } : undefined,
      });
      pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          salt VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).then(() => {
        pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS salt VARCHAR(255);').catch(() => {});
      }).catch(() => {});
    } catch (err) {
    }
  } else {
    try {
      const fsModule = 'node:f' + 's';
      const fs = (await import(/* @vite-ignore */ fsModule)).default;
      const pathModule = 'node:pa' + 'th';
      const path = (await import(/* @vite-ignore */ pathModule)).default;
      const urlModule = 'node:u' + 'rl';
      const { fileURLToPath } = await import(/* @vite-ignore */ urlModule);
      const dbPath = fileURLToPath(new URL('../../database.json', import.meta.url));
      if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2));
      }
    } catch (err) {
    }
  }
};

initDb().catch(() => {});

export async function query(text: string, params?: any[]) {
  if (dbType === 'postgres') {
    if (!pool) {
      const pgModule = 'p' + 'g';
      const pg = (await import(/* @vite-ignore */ pgModule)).default;
      const { Pool } = pg;
      pool = new Pool({
        connectionString,
        ssl: connectionString?.includes('neon') ? { rejectUnauthorized: false } : undefined,
      });
    }
    return pool.query(text, params);
  }

  const normalized = text.trim().replace(/\s+/g, ' ');
  
  if (normalized.startsWith('CREATE TABLE')) {
    return { rows: [] };
  }
  
  const fsModule = 'node:f' + 's';
  const fs = (await import(/* @vite-ignore */ fsModule)).default;
  const pathModule = 'node:pa' + 'th';
  const path = (await import(/* @vite-ignore */ pathModule)).default;
  const urlModule = 'node:u' + 'rl';
  const { fileURLToPath } = await import(/* @vite-ignore */ urlModule);
  const dbPath = fileURLToPath(new URL('../../database.json', import.meta.url));
  
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  if (normalized.startsWith('INSERT INTO users')) {
    const username = params?.[0];
    const password = params?.[1];
    const salt = params?.[2];
    if (data.users.some((u: any) => u.username === username)) {
      throw new Error('Username already taken');
    }
    const newUser = {
      id: data.users.length + 1,
      username,
      password,
      salt,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return { rows: [newUser] };
  }
  
  if (normalized.startsWith('SELECT * FROM users WHERE username =')) {
    const username = params?.[0];
    const user = data.users.find((u: any) => u.username === username);
    return { rows: user ? [user] : [] };
  }
  
  return { rows: [] };
}
