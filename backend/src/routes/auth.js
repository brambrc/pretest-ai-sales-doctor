import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { getUserByEmail, createUser } from '../dal/users.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ detail: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ detail: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      id: uuidv4(),
      name,
      email,
      passwordHash,
      role: 'agent',
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
