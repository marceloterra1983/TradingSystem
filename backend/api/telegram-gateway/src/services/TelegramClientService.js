import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import input from 'input';
import { SecureSessionStorage } from './SecureSessionStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * TelegramClientService
 * Gerencia a conexão MTProto com o Telegram usando GramJS
 * 
 * Features:
 * - Autenticação com número de telefone
 * - Session persistence (ENCRYPTED storage for security)
 * - Busca de mensagens de canais
 * - Event handlers para mensagens novas (opcional)
 * 
 * Security:
 * - Session is encrypted with AES-256-GCM before saving to disk
 * - Stored in user's config directory (~/.config/telegram-gateway/)
 * - File permissions restricted to owner only (0600)
 */
class TelegramClientService {
  constructor(config = {}) {
    this.apiId = config.apiId || parseInt(process.env.TELEGRAM_API_ID);
    this.apiHash = config.apiHash || process.env.TELEGRAM_API_HASH;
    this.phoneNumber = config.phoneNumber || process.env.TELEGRAM_PHONE_NUMBER;
    
    // Use encrypted session storage instead of plain file
    this.sessionStorage = new SecureSessionStorage();
    
    this.client = null;
    this.isConnected = false;
    this.logger = config.logger || console;
    
    if (!this.apiId || !this.apiHash) {
      throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH are required');
    }
  }

  /**
   * Carrega session existente (ENCRYPTED)
   */
  async loadSession() {
    try {
      const sessionString = await this.sessionStorage.load();
      
      if (!sessionString) {
        this.logger?.info?.('[TelegramClient] No session found, will need to authenticate');
        return new StringSession('');
      }
      
      this.logger?.info?.('[TelegramClient] Loaded encrypted session');
      return new StringSession(sessionString);
    } catch (error) {
      this.logger?.error?.({ err: error }, '[TelegramClient] Failed to load session');
      return new StringSession('');
    }
  }

  /**
   * Salva session em arquivo ENCRYPTED para reutilizar
   */
  async saveSession() {
    const sessionString = this.client.session.save();
    await this.sessionStorage.save(sessionString);
    this.logger?.info?.('[TelegramClient] Session saved (encrypted)');
  }

  /**
   * Conecta ao Telegram e autentica
   */
  async connect() {
    if (this.isConnected) {
      console.log('[TelegramClient] Already connected');
      return this.client;
    }

    try {
      // Carregar session existente (encrypted)
      const session = await this.loadSession();

      // Criar cliente
      this.client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        useWSS: false, // Pode mudar para true se precisar de WebSocket
      });

      console.log('[TelegramClient] Connecting to Telegram...');
      await this.client.connect();

      // Se não tiver session, fazer autenticação
      const sessionStr = session.save();
      if (!sessionStr || sessionStr === '') {
        console.log('[TelegramClient] No session found, will need to authenticate');
        console.log('[TelegramClient] Starting authentication...');
        await this.authenticate();
      } else {
        // Verificar se a session ainda é válida
        try {
          await this.client.getMe();
          console.log('[TelegramClient] Session is valid');
        } catch (error) {
          console.log('[TelegramClient] Session invalid, re-authenticating...');
          await this.authenticate();
        }
      }

      this.isConnected = true;
      console.log('[TelegramClient] Successfully connected and authenticated');
      
      return this.client;
    } catch (error) {
      console.error('[TelegramClient] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Autentica com número de telefone
   */
  async authenticate() {
    if (!this.phoneNumber) {
      throw new Error('TELEGRAM_PHONE_NUMBER is required for authentication');
    }

    console.log(`[TelegramClient] Authenticating with phone: ${this.phoneNumber}`);

    await this.client.start({
      phoneNumber: async () => this.phoneNumber,
      password: async () => await input.text('Please enter your 2FA password (if enabled): '),
      phoneCode: async () => await input.text('Please enter the code you received: '),
      onError: (err) => console.error('[TelegramClient] Auth error:', err),
    });

    // Salvar session (encrypted)
    await this.saveSession();
    
    console.log('[TelegramClient] Authentication successful');
  }

  /**
   * Desconecta do Telegram
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('[TelegramClient] Disconnected');
    }
  }

  /**
   * Busca mensagens de um canal
   * 
   * @param {string} channelId - ID do canal (pode ser username ou numeric ID)
   * @param {number} limit - Número máximo de mensagens
   * @param {number} offsetId - ID da última mensagem (para paginação)
   * @returns {Array} Array de mensagens
   */
  async getMessages(channelId, { limit = 100, offsetId = 0 } = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`[TelegramClient] Fetching messages from channel: ${channelId}, limit: ${limit}`);
      
      // Buscar mensagens
      const messages = await this.client.getMessages(channelId, {
        limit: limit,
        offsetId: offsetId,
      });

      console.log(`[TelegramClient] Fetched ${messages.length} messages from ${channelId}`);
      
      // Transformar mensagens para formato padronizado
      return messages.map(msg => this.transformMessage(msg));
    } catch (error) {
      console.error(`[TelegramClient] Failed to fetch messages from ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Transforma mensagem do Telegram para formato padronizado
   */
  transformMessage(msg) {
    return {
      id: msg.id,
      channelId: msg.peerId?.channelId?.toString() || null,
      text: msg.message || '',
      date: msg.date,
      fromId: msg.fromId?.userId?.toString() || null,
      mediaType: msg.media ? msg.media.className : null,
      isForwarded: !!msg.fwdFrom,
      replyTo: msg.replyTo?.replyToMsgId || null,
      views: msg.views || 0,
      raw: msg, // Incluir objeto original para debug
    };
  }

  /**
   * Adiciona listener para novas mensagens (opcional)
   */
  addNewMessageHandler(channelId, callback) {
    if (!this.isConnected) {
      throw new Error('Client must be connected before adding handlers');
    }

    const handler = async (event) => {
      const msg = this.transformMessage(event.message);
      await callback(msg);
    };

    this.client.addEventHandler(handler, new NewMessage({ chats: [channelId] }));
    console.log(`[TelegramClient] Added message handler for channel: ${channelId}`);
  }

  /**
   * Verifica status de saúde do cliente
   */
  getHealthStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: !!this.client,
      apiId: !!this.apiId,
      apiHash: !!this.apiHash,
      phoneNumber: !!this.phoneNumber,
    };
  }
}

// Singleton instance
let instance = null;

export function getTelegramClient(config = {}) {
  if (!instance) {
    instance = new TelegramClientService(config);
  }
  return instance;
}

export { TelegramClientService };

