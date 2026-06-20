import { query } from './db';

export async function handleSignup(username: string, password: string) {
  await query(
    'INSERT INTO users (username, password) VALUES ($1, $2)',
    [username, password]
  );
}

export async function handleLogin(username: string, password: string) {
  const res = await query('SELECT * FROM users WHERE username = $1', [username]);
  if (res.rows.length === 0) {
    throw new Error('User not found');
  }
  const user = res.rows[0];
  if (user.password !== password) {
    throw new Error('Invalid password');
  }
}
