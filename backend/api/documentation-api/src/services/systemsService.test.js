import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemsService } from './systemsService.js';
import { systemsRepository } from '../repositories/systemsRepository.js';

// Mock the repository
vi.mock('../repositories/systemsRepository.js', () => ({
  systemsRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  }
}));

describe('SystemsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSystems', () => {
    it('should return all systems with count', async () => {
      const mockSystems = [
        { id: 'sys-1', name: 'System 1', status: 'online' },
        { id: 'sys-2', name: 'System 2', status: 'offline' }
      ];

      systemsRepository.findAll.mockResolvedValue(mockSystems);
      systemsRepository.count.mockResolvedValue(2);

      const result = await systemsService.getAllSystems({});

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data).toEqual(mockSystems);
      expect(systemsRepository.findAll).toHaveBeenCalledWith({});
      expect(systemsRepository.count).toHaveBeenCalledWith({});
    });

    it('should filter systems by status', async () => {
      const mockSystems = [
        { id: 'sys-1', name: 'System 1', status: 'online' }
      ];

      systemsRepository.findAll.mockResolvedValue(mockSystems);
      systemsRepository.count.mockResolvedValue(1);

      const result = await systemsService.getAllSystems({ status: 'online' });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(systemsRepository.findAll).toHaveBeenCalledWith({ status: 'online' });
    });
  });

  describe('getSystemById', () => {
    it('should return system when found', async () => {
      const mockSystem = { id: 'sys-1', name: 'System 1', status: 'online' };

      systemsRepository.findById.mockResolvedValue(mockSystem);

      const result = await systemsService.getSystemById('sys-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSystem);
      expect(systemsRepository.findById).toHaveBeenCalledWith('sys-1');
    });

    it('should return error when system not found', async () => {
      systemsRepository.findById.mockResolvedValue(null);

      const result = await systemsService.getSystemById('sys-999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('System not found');
    });
  });

  describe('createSystem', () => {
    it('should create valid system', async () => {
      const validSystem = {
        name: 'Test System',
        description: 'Test description',
        port: 3000,
        status: 'online',
        color: '#ff0000'
      };

      const createdSystem = { id: 'sys-new', ...validSystem };
      systemsRepository.create.mockResolvedValue(createdSystem);

      const result = await systemsService.createSystem(validSystem);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdSystem);
      expect(systemsRepository.create).toHaveBeenCalledWith(validSystem);
    });

    it('should reject system with invalid name', async () => {
      const invalidSystem = {
        name: '',
        port: 3000,
        status: 'online'
      };

      const result = await systemsService.createSystem(invalidSystem);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.errors).toBeDefined();
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(systemsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject system with invalid port', async () => {
      const invalidSystem = {
        name: 'Test System',
        port: 99999,
        status: 'online'
      };

      const result = await systemsService.createSystem(invalidSystem);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.errors.some(e => e.field === 'port')).toBe(true);
      expect(systemsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject system with invalid status', async () => {
      const invalidSystem = {
        name: 'Test System',
        port: 3000,
        status: 'invalid-status'
      };

      const result = await systemsService.createSystem(invalidSystem);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
      expect(systemsRepository.create).not.toHaveBeenCalled();
    });

    it('should accept system with color (no validation)', async () => {
      const validSystem = {
        name: 'Test System',
        port: 3000,
        status: 'online',
        color: 'any-value' // Color validation was removed from service
      };

      const createdSystem = { id: 'sys-new', ...validSystem };
      systemsRepository.create.mockResolvedValue(createdSystem);

      const result = await systemsService.createSystem(validSystem);

      expect(result.success).toBe(true);
      expect(systemsRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateSystem', () => {
    it('should update existing system', async () => {
      const existingSystem = { id: 'sys-1', name: 'Old Name', status: 'offline' };
      const updateData = { name: 'New Name', status: 'online' };
      const updatedSystem = { ...existingSystem, ...updateData };

      systemsRepository.findById.mockResolvedValue(existingSystem);
      systemsRepository.update.mockResolvedValue(updatedSystem);

      const result = await systemsService.updateSystem('sys-1', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedSystem);
      expect(systemsRepository.update).toHaveBeenCalledWith('sys-1', updateData);
    });

    it('should handle update errors', async () => {
      systemsRepository.update.mockRejectedValue(new Error('Update failed'));

      const result = await systemsService.updateSystem('sys-1', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteSystem', () => {
    it('should delete existing system', async () => {
      const mockSystem = { id: 'sys-1', name: 'System 1' };
      systemsRepository.findById.mockResolvedValue(mockSystem);
      systemsRepository.delete.mockResolvedValue(true);

      const result = await systemsService.deleteSystem('sys-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('System deleted successfully');
      expect(systemsRepository.findById).toHaveBeenCalledWith('sys-1');
      expect(systemsRepository.delete).toHaveBeenCalledWith('sys-1');
    });

    it('should return error when system not found', async () => {
      systemsRepository.findById.mockResolvedValue(null);

      const result = await systemsService.deleteSystem('sys-999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('System not found');
      expect(systemsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('validateSystemData', () => {
    it('should validate complete valid system data', () => {
      const validData = {
        name: 'Test System',
        description: 'Description',
        port: 3000,
        status: 'online',
        color: '#ff0000',
        tags: 'tag1,tag2'
      };

      const result = systemsService.validateSystemData(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const invalidData = {
        name: '',
        port: 99999,
        status: 'invalid',
        color: 'not-a-color'
      };

      const result = systemsService.validateSystemData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
