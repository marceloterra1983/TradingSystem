import { createClient } from 'redis';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { parseSignal } from '../parseSignal.js';

/**
 * Redis Subscriber Worker (PUSH - Primary Method)
 * 
 * Escuta eventos Redis publicados pelo Telegram Gateway
 * e processa mensagens INSTANTANEAMENTE (< 100ms)
 * 
 * Benefícios vs Polling:
 * - Latência: 50ms vs 5000ms (100x mais rápido)
 * - Carga: Zero requisições HTTP desnecessárias
 * - Escalável: Múltiplos subscribers possíveis
 * 
 * Arquitetura HÍBRIDA:
 * - PUSH (Redis): Mensagens novas em tempo real
 * - PULL (Polling): Fallback a cada 60s para garantir consistência
 */
export class RedisSubscriberWorker {
  constructor({ tpCapitalDb, metrics }) {
    this.tpCapitalDb = tpCapitalDb;
    this.metrics = metrics;
    this.subscriber = null;
    this.isRunning = false;
    
    // Redis config do stack (tp-capital-redis-master)
    this.redisUrl = process.env.TP_CAPITAL_REDIS_URL || 
                    process.env.REDIS_URL || 
                    'redis://tp-capital-redis-master:6379';
    
    this.channel = 'tp-capital:new-message';
    this.channelFilter = config.gateway.signalsChannelId; // -1001649127710
    
    this.messagesProcessed = 0;
    this.errors = 0;
  }

  /**
   * Inicia subscriber Redis
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[RedisSubscriber] Already running');
      return;
    }

    try {
      // Criar cliente Redis
      this.subscriber = createClient({ url: this.redisUrl });
      
      // Handler de mensagens (PUSH)
      this.subscriber.on('message', async (channel, message) => {
        await this.handleMessage(message);
      });

      // Error handler
      this.subscriber.on('error', (error) => {
        logger.error({ err: error }, '[RedisSubscriber] Redis error');
        this.errors++;
      });

      // Conectar
      await this.subscriber.connect();
      
      // Subscribe no canal
      await this.subscriber.subscribe(this.channel);
      
      this.isRunning = true;
      
      logger.info({
        redisUrl: this.redisUrl.replace(/:[^:@]+@/, ':***@'), // Hide password in logs
        channel: this.channel,
        channelFilter: this.channelFilter,
        mode: 'HYBRID-PUSH'
      }, '[RedisSubscriber] ✅ Started - listening for real-time messages');

    } catch (error) {
      logger.error({ err: error }, '[RedisSubscriber] Failed to start');
      throw error;
    }
  }

  /**
   * Processa mensagem recebida via Redis (PUSH)
   * Latência típica: 50-100ms
   */
  async handleMessage(messageJson) {
    const startTime = Date.now();
    
    try {
      const event = JSON.parse(messageJson);
      
      // Filtrar apenas mensagens do canal de sinais
      if (event.channelId !== this.channelFilter) {
        logger.debug({
          receivedChannel: event.channelId,
          expectedChannel: this.channelFilter
        }, '[RedisSubscriber] Message from different channel, ignoring');
        return;
      }

      logger.info({
        messageId: event.messageId,
        channelId: event.channelId
      }, '[RedisSubscriber] Processing real-time message via PUSH');

      // Usar mesma lógica do polling worker
      const content = event.text || event.caption || '';
      
      if (!content || content.length < 10) {
        logger.debug({ messageId: event.messageId }, '[RedisSubscriber] Empty/short message, skipping');
        return;
      }

      // Parse signal
      let signal;
      try {
        signal = parseSignal(content, {
          timestamp: new Date(event.telegramDate || event.timestamp).getTime(),
          channel: event.channelId,
          source: 'redis-push'
        });
      } catch (parseError) {
        logger.debug({
          messageId: event.messageId,
          error: parseError.message
        }, '[RedisSubscriber] Parse failed');
        
        if (this.metrics) {
          this.metrics.messagesProcessed.inc({ method: 'push', status: 'parse_failed' });
        }
        return;
      }

      // Validar formato de ativo e completude
      const assetRegex = /^[A-Z]{3,6}\d{1,4}$/;
      const isValidAsset = assetRegex.test(signal.asset);
      
      const hasCompraValues = signal.buy_min && signal.buy_max;
      const hasTargetAndStop = (signal.target_1 || signal.target_final) && signal.stop;
      const isCompleteSignal = hasCompraValues || hasTargetAndStop;
      
      if (!isValidAsset || !isCompleteSignal) {
        logger.debug({
          messageId: event.messageId,
          asset: signal.asset,
          valid: isValidAsset,
          complete: isCompleteSignal
        }, '[RedisSubscriber] Invalid/incomplete signal, skipping');
        
        if (this.metrics) {
          this.metrics.messagesProcessed.inc({ method: 'push', status: 'ignored_invalid' });
        }
        return;
      }

      // Verificar duplicata
      const exists = await this.checkIfExists(signal);
      if (exists) {
        logger.debug({
          messageId: event.messageId,
          asset: signal.asset
        }, '[RedisSubscriber] Signal already exists (duplicate), skipping');
        
        if (this.metrics) {
          this.metrics.messagesProcessed.inc({ method: 'push', status: 'duplicate' });
        }
        return;
      }

      // Inserir sinal
      await this.tpCapitalDb.insertSignal(signal);
      
      this.messagesProcessed++;
      const duration = Date.now() - startTime;
      
      logger.info({
        messageId: event.messageId,
        asset: signal.asset,
        buyRange: `${signal.buy_min}-${signal.buy_max}`,
        latencyMs: duration,
        totalProcessed: this.messagesProcessed
      }, '[RedisSubscriber] ✅ Signal processed via PUSH (real-time)');

      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ method: 'push', status: 'success' });
        this.metrics.processingDuration.observe({ method: 'push' }, duration / 1000);
      }

    } catch (error) {
      this.errors++;
      logger.error({ 
        err: error,
        totalErrors: this.errors 
      }, '[RedisSubscriber] Error processing message');
      
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ method: 'push', status: 'error' });
      }
    }
  }

  /**
   * Verifica se sinal já existe (evita duplicatas)
   */
  async checkIfExists(signal) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM signals.tp_capital_signals
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
      logger.error({ err: error }, '[RedisSubscriber] Error checking duplicate');
      return false; // Em caso de erro, tenta inserir (deixa DB rejeitar se duplicado)
    }
  }

  /**
   * Retorna estatísticas do subscriber
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      messagesProcessed: this.messagesProcessed,
      errors: this.errors,
      channel: this.channel,
      mode: 'PUSH'
    };
  }

  /**
   * Para subscriber
   */
  async stop() {
    if (this.subscriber && this.isRunning) {
      try {
        await this.subscriber.unsubscribe(this.channel);
        await this.subscriber.disconnect();
        this.isRunning = false;
        
        logger.info({
          totalProcessed: this.messagesProcessed,
          totalErrors: this.errors
        }, '[RedisSubscriber] Stopped');
      } catch (error) {
        logger.error({ err: error }, '[RedisSubscriber] Error stopping');
      }
    }
  }
}

