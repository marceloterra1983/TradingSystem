import prisma from '../config/database.js';
import { setTemplateCount } from '../metrics.js';

async function refreshTemplateGauge() {
  const total = await prisma.template.count();
  setTemplateCount(total);
}

export async function listTemplates(_req, res, next) {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ updatedAt: 'desc' }]
    });
    setTemplateCount(templates.length);
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id }
    });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const template = await prisma.template.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        urlPattern: req.body.urlPattern,
        options: req.body.options
      }
    });
    await refreshTemplateGauge();
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Template name must be unique'
      });
    } else {
      next(error);
    }
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        urlPattern: req.body.urlPattern,
        options: req.body.options
      }
    });
    await refreshTemplateGauge();
    res.json({ success: true, data: template });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Template name must be unique'
      });
    } else if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Template not found' });
    } else {
      next(error);
    }
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    await prisma.template.delete({
      where: { id: req.params.id }
    });
    await refreshTemplateGauge();
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Template not found' });
    } else {
      next(error);
    }
  }
}

export async function importTemplates(req, res, next) {
  try {
    const payload = Array.isArray(req.body) ? req.body : [];
    const created = await Promise.all(
      payload.map(template =>
        prisma.template.upsert({
          where: { name: template.name },
          update: {
            description: template.description,
            urlPattern: template.urlPattern,
            options: template.options
          },
          create: {
            name: template.name,
            description: template.description,
            urlPattern: template.urlPattern,
            options: template.options
          }
        })
      )
    );
    await refreshTemplateGauge();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

export async function exportTemplates(_req, res, next) {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ name: 'asc' }]
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
}
