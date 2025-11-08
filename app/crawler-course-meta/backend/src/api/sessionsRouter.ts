import { Router } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }
  const token = jwt.sign({ sub: username }, env.sessionKey, { expiresIn: '1h' });
  return res.json({ token, expiresIn: 3600 });
});

router.post('/logout', (_req, res) => {
  return res.json({ success: true });
});

export default router;
