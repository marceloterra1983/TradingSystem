import { Router } from 'express';

const plugins = [
  { id: 'hotmart', description: 'Scraper pré-configurado para Hotmart', status: 'beta' },
  { id: 'udemy', description: 'Scraper pré-configurado para Udemy', status: 'beta' },
  { id: 'moodle', description: 'Scraper pré-configurado para Moodle', status: 'experimental' },
];

const router = Router();

router.get('/', (_req, res) => {
  res.json({ plugins });
});

export default router;
