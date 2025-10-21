import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { config } from '../config.js';

const defaultData = { items: [] };

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
}
