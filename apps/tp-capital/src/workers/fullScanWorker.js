/**
 * Full Scan Worker
 * 
 * Faz varredura completa nas mensagens do Telegram Gateway
 * e importa TODAS as mensagens com formato de sinal estruturado
 * 
 * Critérios de seleção:
 * - Contém "Ativo:" (ou variações)
 * - Contém "Compra:" (valores de entrada)
 * - Contém pelo menos "Alvo" OU "Stop"
 * - Formato válido de ativo (LETRAS + NÚMEROS)
 */

import { logger } from '../logger.js';
import { config } from '../config.js';
import { parseSignal } from '../parseSignal.js';

export class FullScanWorker {
  constructor({ gatewayUrl, apiKey, tpCapitalDb, channelId }) {
    this.gatewayUrl = gatewayUrl || config.gateway.url || 'http://localhost:4010';
    this.apiKey = apiKey || config.gateway.apiKey;
    this.channelId = channelId || config.gateway.signalsChannelId;
    this.tpCapitalDb = tpCapitalDb;
    this.schema = config.timescale.schema;
    
    // Configuração de varredura
    this.batchSize = 100; // Mensagens por requisição
    this.maxMessages = 1000; // Máximo de mensagens para processar
  }

  /**
   * Executa varredura completa no Gateway
   * 
   * Busca TODAS as mensagens (não apenas unprocessed) e filtra por formato
   */
  async runFullScan() {
    logger.info({
      channelId: this.channelId,
      gatewayUrl: this.gatewayUrl,
      maxMessages: this.maxMessages
    }, '[FullScan] Iniciando varredura completa no Telegram Gateway');

    try {
      // 1. Buscar TODAS as mensagens do canal (paginado)
      const allMessages = await this.fetchAllMessages();
      logger.info({ total: allMessages.length }, '[FullScan] Mensagens obtidas do Gateway');

      // 2. Filtrar apenas mensagens com formato estruturado
      const structuredMessages = this.filterStructuredSignals(allMessages);
      logger.info({ 
        total: allMessages.length,
        structured: structuredMessages.length,
        rejected: allMessages.length - structuredMessages.length
      }, '[FullScan] Mensagens filtradas por formato');

      // 3. Processar cada mensagem estruturada
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const msg of structuredMessages) {
        try {
          const wasImported = await this.processAndImportMessage(msg);
          if (wasImported) {
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors++;
          logger.error({
            err: error,
            messageId: msg.messageId,
            asset: msg.preview
          }, '[FullScan] Erro ao processar mensagem');
        }
      }

      logger.info({
        scanned: allMessages.length,
        structured: structuredMessages.length,
        imported,
        skipped,
        errors
      }, '[FullScan] Varredura completa finalizada');

      return {
        success: true,
        scanned: allMessages.length,
        structured: structuredMessages.length,
        imported,
        skipped,
        errors
      };

    } catch (error) {
      logger.error({ err: error }, '[FullScan] Falha na varredura completa');
      throw error;
    }
  }

  /**
   * Busca TODAS as mensagens do canal (paginado)
   */
  async fetchAllMessages() {
    const messages = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && messages.length < this.maxMessages) {
      const url = `${this.gatewayUrl}/api/messages?channel=${this.channelId}&limit=${this.batchSize}&offset=${offset}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        logger.warn({ status: response.status, offset }, '[FullScan] Falha ao buscar mensagens');
        break;
      }

      const data = await response.json();
      const batch = data.data || [];

      if (batch.length === 0) {
        hasMore = false;
      } else {
        messages.push(...batch);
        offset += batch.length;
      }
    }

    return messages;
  }

  /**
   * Filtra mensagens que têm formato de sinal estruturado
   * 
   * Critérios:
   * - Contém "Ativo:" (identificação do ativo)
   * - Contém "Compra:" (valores de entrada)
   * - Contém "Alvo" OU "Stop" (alvos/proteção)
   */
  filterStructuredSignals(messages) {
    return messages.filter(msg => {
      const content = msg.text || msg.caption || '';
      
      if (!content || content.length < 20) return false;

      const upper = content.toUpperCase();
      
      // DEVE ter "Ativo:" (ou variações)
      const hasAtivo = /ATIV[OA]\s*[:=-]/.test(upper);
      
      // DEVE ter "Compra:" (valores de entrada)
      const hasCompra = /COMPRA\s*[:=-]/.test(upper);
      
      // DEVE ter pelo menos Alvo OU Stop
      const hasAlvo = /ALVO\s*\d*\s*[:=-]/.test(upper);
      const hasStop = /STOP\s*[:=-]/.test(upper);
      
      const isStructured = hasAtivo && hasCompra && (hasAlvo || hasStop);
      
      return isStructured;
    });
  }

  /**
   * Processa e importa uma mensagem para TP-Capital
   */
  async processAndImportMessage(msg) {
    const content = msg.text || msg.caption || '';
    
    // 1. Parse signal
    let signal;
    try {
      signal = parseSignal(content, {
        timestamp: new Date(msg.telegramDate || msg.date).getTime(),
        channel: msg.channelId,
        source: 'full-scan'
      });
    } catch (parseError) {
      logger.debug({ 
        messageId: msg.messageId,
        error: parseError.message 
      }, '[FullScan] Parse falhou');
      return false;
    }

    // 2. Validar formato de ativo
    const assetRegex = /^[A-Z]{3,6}\d{1,4}$/;
    if (!assetRegex.test(signal.asset)) {
      logger.debug({ 
        messageId: msg.messageId,
        asset: signal.asset 
      }, '[FullScan] Asset inválido');
      return false;
    }

    // 3. Validar que tem valores de trading
    const hasCompraValues = signal.buy_min && signal.buy_max;
    const hasTargetAndStop = (signal.target_1 || signal.target_final) && signal.stop;
    
    if (!hasCompraValues && !hasTargetAndStop) {
      logger.debug({ 
        messageId: msg.messageId,
        asset: signal.asset 
      }, '[FullScan] Sinal incompleto (sem valores)');
      return false;
    }

    // 4. Verificar se já existe (evitar duplicatas)
    const exists = await this.checkIfExists(signal);
    if (exists) {
      logger.debug({ 
        messageId: msg.messageId,
        asset: signal.asset 
      }, '[FullScan] Sinal já existe, pulando');
      return false;
    }

    // 5. Inserir no banco
    try {
      await this.tpCapitalDb.insertSignal(signal);
      logger.info({
        messageId: msg.messageId,
        asset: signal.asset,
        buyRange: `${signal.buy_min}-${signal.buy_max}`
      }, '[FullScan] Sinal importado com sucesso');
      return true;
    } catch (error) {
      logger.error({
        err: error,
        signal
      }, '[FullScan] Falha ao inserir sinal');
      return false;
    }
  }

  /**
   * Verifica se sinal já existe no banco
   */
  async checkIfExists(signal) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM "${this.schema}".tp_capital_signals
        WHERE asset = $1 AND buy_min = $2 AND stop = $3
        LIMIT 1
      `;
      
      const result = await this.tpCapitalDb.pool.query(query, [
        signal.asset,
        signal.buy_min,
        signal.stop
      ]);
      
      return result.rows[0].count > 0;
    } catch (error) {
      logger.error({ err: error, signal }, '[FullScan] Erro ao verificar duplicata');
      return false; // Em caso de erro, assume que não existe
    }
  }
}

