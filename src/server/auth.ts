import { query } from './db';
import crypto from 'node:crypto';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export async function handleSignup(username: string, password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  await query(
    'INSERT INTO users (username, password, salt) VALUES ($1, $2, $3)',
    [username, hash, salt]
  );
}

export async function handleLogin(username: string, password: string) {
  const res = await query('SELECT * FROM users WHERE username = $1', [username]);
  if (res.rows.length === 0) {
    throw new Error('User not found');
  }
  const user = res.rows[0];
  const salt = user.salt;
  
  if (salt) {
    const hash = hashPassword(password, salt);
    if (user.password !== hash) {
      throw new Error('Invalid password');
    }
  } else {
    if (user.password !== password) {
      throw new Error('Invalid password');
    }
  }
}
