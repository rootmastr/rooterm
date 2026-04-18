import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const getUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Auth] Error reading users file:', error);
    return [];
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  const users = getUsers();
  const user = users.find((u) => u.username === username);

  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      token,
    });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
};

const getMe = async (req, res) => {
  // Extracted from protect middleware
  res.json(req.user);
};

export default { login, getMe };
