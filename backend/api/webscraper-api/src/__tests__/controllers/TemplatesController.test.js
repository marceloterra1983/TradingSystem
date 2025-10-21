import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  importTemplates,
  exportTemplates
} from '../../controllers/TemplatesController.js';
import {
  createTestTemplate,
  mockedMetrics
} from '../testUtils.js';
import { mockTemplateArray, mockGitHubTemplate } from '../fixtures/templates.js';

function mockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('TemplatesController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('returns templates ordered by updated date and refreshes gauge', async () => {
      await createTestTemplate({ name: 'Older Template', updatedAt: new Date('2024-01-01T00:00:00.000Z') });
      await createTestTemplate({ name: 'Newer Template', updatedAt: new Date('2024-02-01T00:00:00.000Z') });

      const res = mockResponse();
      await listTemplates({}, res, vi.fn());

      const templates = res.json.mock.calls[0][0].data;
      expect(templates[0].name).toBe('Newer Template');
      expect(mockedMetrics.setTemplateCount).toHaveBeenCalledWith(2);
    });
  });

  describe('getTemplate', () => {
    it('returns template when found', async () => {
      const template = await createTestTemplate({ name: 'Lookup Template' });
      const res = mockResponse();
      await getTemplate({ params: { id: template.id } }, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: template.id })
        })
      );
    });

    it('returns 404 when template missing', async () => {
      const res = mockResponse();
      await getTemplate({ params: { id: '00000000-0000-0000-0000-000000000000' } }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Template not found' });
    });
  });

  describe('createTemplate', () => {
    it('creates template and updates gauge', async () => {
      const res = mockResponse();
      const req = {
        body: {
          name: 'Fresh Template',
          description: 'Useful template',
          options: { formats: ['markdown'], onlyMainContent: true }
        }
      };
      await createTemplate(req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Fresh Template' })
        })
      );
      expect(mockedMetrics.setTemplateCount).toHaveBeenCalled();
    });

    it('returns 409 when template name already exists', async () => {
      await createTestTemplate({ name: mockGitHubTemplate.name });
      const res = mockResponse();
      await createTemplate(
        {
          body: {
            name: mockGitHubTemplate.name,
            options: mockGitHubTemplate.options
          }
        },
        res,
        vi.fn()
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Template name must be unique'
      });
    });
  });

  describe('updateTemplate', () => {
    it('updates template fields and gauge', async () => {
      const template = await createTestTemplate({ name: 'Editable' });
      const res = mockResponse();
      await updateTemplate(
        {
          params: { id: template.id },
          body: {
            name: 'Editable',
            description: 'Updated description',
            urlPattern: '.*/updated/.*',
            options: { formats: ['html'], onlyMainContent: false }
          }
        },
        res,
        vi.fn()
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Updated description',
            urlPattern: '.*/updated/.*'
          })
        })
      );
      expect(mockedMetrics.setTemplateCount).toHaveBeenCalled();
    });

    it('returns 404 when updating missing template', async () => {
      const res = mockResponse();
      await updateTemplate(
        {
          params: { id: '00000000-0000-0000-0000-000000000000' },
          body: {
            name: 'Unknown',
            options: { formats: ['markdown'] }
          }
        },
        res,
        vi.fn()
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Template not found' });
    });

    it('returns 409 on duplicate name', async () => {
      const first = await createTestTemplate({ name: 'First Template' });
      await createTestTemplate({ name: 'Second Template' });
      const res = mockResponse();
      await updateTemplate(
        {
          params: { id: first.id },
          body: {
            name: 'Second Template',
            options: { formats: ['markdown'] }
          }
        },
        res,
        vi.fn()
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Template name must be unique'
      });
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template and updates gauge', async () => {
      const template = await createTestTemplate();
      const res = mockResponse();
      await deleteTemplate({ params: { id: template.id } }, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(mockedMetrics.setTemplateCount).toHaveBeenCalled();
    });

    it('returns 404 when deleting missing template', async () => {
      const res = mockResponse();
      await deleteTemplate({ params: { id: '00000000-0000-0000-0000-000000000000' } }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Template not found' });
    });
  });

  describe('importTemplates', () => {
    it('imports templates via upsert and updates gauge', async () => {
      const res = mockResponse();
      await importTemplates({ body: mockTemplateArray }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ name: mockTemplateArray[0].name })
          ])
        })
      );
      expect(mockedMetrics.setTemplateCount).toHaveBeenCalled();
    });
  });

  describe('exportTemplates', () => {
    it('exports templates ordered by name', async () => {
      await createTestTemplate({ name: 'C Template' });
      await createTestTemplate({ name: 'A Template' });
      const res = mockResponse();
      await exportTemplates({}, res, vi.fn());

      const data = res.json.mock.calls[0][0].data;
      expect(data.map(item => item.name)).toEqual(['A Template', 'C Template']);
    });
  });
});
