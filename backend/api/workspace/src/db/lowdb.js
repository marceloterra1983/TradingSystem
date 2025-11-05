import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { config } from '../config.js';

const defaultData = {
  items: [],
  categories: [
    { id: 'feature', name: 'Feature', description: 'Novas funcionalidades', color: '#10b981', display_order: 1, active: true },
    { id: 'bug', name: 'Bug', description: 'Correção de bugs', color: '#ef4444', display_order: 2, active: true },
    { id: 'improvement', name: 'Melhoria', description: 'Melhorias em funcionalidades existentes', color: '#3b82f6', display_order: 3, active: true },
    { id: 'documentation', name: 'Documentação', description: 'Documentação técnica', color: '#8b5cf6', display_order: 4, active: true },
    { id: 'research', name: 'Pesquisa', description: 'Pesquisa e exploração de tecnologias', color: '#f59e0b', display_order: 5, active: true },
    { id: 'other', name: 'Outro', description: 'Outros itens não categorizados', color: '#6b7280', display_order: 6, active: true }
  ]
};

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
};

export class LowdbClient {
  constructor() {
    this.file = config.lowdbPath;
    ensureDir(this.file);
    this.adapter = new JSONFile(this.file);
    this.db = new Low(this.adapter, defaultData);
    this.ready = false;
  }

  async init() {
    if (this.ready) return;
    await this.db.read();
    if (!this.db.data || typeof this.db.data !== 'object') {
      this.db.data = defaultData;
      await this.db.write();
    }
    this.ready = true;
  }

  async getItems() {
    await this.init();
    return this.db.data.items;
  }

  async getItem(id) {
    const items = await this.getItems();
    return items.find((item) => item.id === id);
  }

  async createItem(item) {
    await this.init();
    this.db.data.items.push(item);
    await this.db.write();
    return item;
  }

  async updateItem(id, updates) {
    await this.init();
    const idx = this.db.data.items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    this.db.data.items[idx] = {
      ...this.db.data.items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.db.write();
    return this.db.data.items[idx];
  }

  async deleteItem(id) {
    await this.init();
    const idx = this.db.data.items.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    this.db.data.items.splice(idx, 1);
    await this.db.write();
    return true;
  }

  // Categories methods
  async getCategories() {
    await this.init();
    if (!this.db.data.categories) {
      this.db.data.categories = defaultData.categories;
      await this.db.write();
    }
    return this.db.data.categories;
  }

  async getCategory(id) {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.id === id);
  }

  async createCategory(category) {
    await this.init();
    if (!this.db.data.categories) {
      this.db.data.categories = defaultData.categories;
    }
    this.db.data.categories.push(category);
    await this.db.write();
    return category;
  }

  async updateCategory(id, updates) {
    await this.init();
    const idx = this.db.data.categories.findIndex((cat) => cat.id === id);
    if (idx === -1) return null;
    this.db.data.categories[idx] = { ...this.db.data.categories[idx], ...updates };
    await this.db.write();
    return this.db.data.categories[idx];
  }

  async deleteCategory(id) {
    await this.init();
    const idx = this.db.data.categories.findIndex((cat) => cat.id === id);
    if (idx === -1) return false;
    this.db.data.categories.splice(idx, 1);
    await this.db.write();
    return true;
  }
}
