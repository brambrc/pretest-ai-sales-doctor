import { query } from '../db/pool.js';
import { useInMemory } from '../db/pool.js';
import { users as usersStore } from '../store/index.js';

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function getUserByEmail(email) {
  if (useInMemory) {
    for (const user of usersStore.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function getUserById(id) {
  if (useInMemory) {
    return usersStore.get(id) || null;
  }
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(data) {
  if (useInMemory) {
    usersStore.set(data.id, data);
    return data;
  }
  const { rows } = await query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.id, data.name, data.email, data.passwordHash, data.role || 'agent']
  );
  return rowToUser(rows[0]);
}
