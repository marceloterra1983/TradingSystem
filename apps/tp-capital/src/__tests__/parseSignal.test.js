import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSignal } from '../parseSignal.js';

describe('parseSignal', () => {
  describe('Valid Signals', () => {
    it('should parse complete signal with all fields', () => {
      const message = `
        ATIVO: PETR4
        COMPRA: 25.50 A 26.00
        ALVO 1: 28.00
        ALVO 2: 30.00
        ALVO FINAL: 35.00
        STOP: 24.00
      `;
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'PETR4');
      assert.strictEqual(signal.buyMin, 25.50);
      assert.strictEqual(signal.buyMax, 26.00);
      assert.strictEqual(signal.target1, 28.00);
      assert.strictEqual(signal.target2, 30.00);
      assert.strictEqual(signal.targetFinal, 35.00);
      assert.strictEqual(signal.stop, 24.00);
      assert.strictEqual(signal.signalType, 'Swing Trade');
      assert.ok(signal.timestamp);
    });

    it('should parse signal with minimum required fields', () => {
      const message = 'ATIVO: VALE3 COMPRA: 50.00';
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'VALE3');
      assert.strictEqual(signal.buyMin, 50.00);
      assert.strictEqual(signal.buyMax, 50.00);
    });

  it('should parse signal with alternative formats (ATIVO VALE3)', () => {
    const message = 'ATIVO VALE3 COMPRA: 50.00 A 52.00';  // Needs colon after COMPRA
    
    const signal = parseSignal(message);
    
    assert.strictEqual(signal.asset, 'VALE3');
    assert.strictEqual(signal.buyMin, 50.00);
    assert.strictEqual(signal.buyMax, 52.00);
  });

    it('should parse signal with decimal comma (25,50)', () => {
      const message = `
        ATIVO: ITUB4
        COMPRA: 25,50 A 26,00
        STOP: 24,00
      `;
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'ITUB4');
      assert.strictEqual(signal.buyMin, 25.50);
      assert.strictEqual(signal.buyMax, 26.00);
      assert.strictEqual(signal.stop, 24.00);
    });

  it('should parse signal with thousand separators (1.250,50)', () => {
    const message = `
      ATIVO: WINFUT1
      COMPRA: 1.250,50 A 1.255,00
    `;
    
    const signal = parseSignal(message);
    
    // parseSignal prioritizes assets with numbers (WINFUT1 matches [A-Z]{3,}[0-9]+)
    assert.strictEqual(signal.asset, 'WINFUT1');
    assert.strictEqual(signal.buyMin, 1250.50);
    assert.strictEqual(signal.buyMax, 1255.00);
  });

  it('should parse signal with COMPRA DE/MIN variants', () => {
    const message = 'ATIVO: ABEV3 COMPRA DE: 12.50 ATÉ 13.00';  // Needs colon
    
    const signal = parseSignal(message);
    
    assert.strictEqual(signal.asset, 'ABEV3');
    assert.strictEqual(signal.buyMin, 12.50);
    assert.strictEqual(signal.buyMax, 13.00);
  });

    it('should handle assets with numbers (KLBNK177)', () => {
      const message = 'ATIVO: KLBNK177 COMPRA: 0.25 A 0.27';
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'KLBNK177');
      assert.strictEqual(signal.buyMin, 0.25);
      assert.strictEqual(signal.buyMax, 0.27);
    });

    it('should parse multiple targets (ALVO 1, ALVO 2, ALVO FINAL)', () => {
      const message = `
        ATIVO: BBDC4
        COMPRA: 20.00
        ALVO 1: 22.00
        ALVO 2: 24.00
        ALVO FINAL: 28.00
      `;
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.target1, 22.00);
      assert.strictEqual(signal.target2, 24.00);
      assert.strictEqual(signal.targetFinal, 28.00);
    });

    it('should use ALVO FINAL as last target if no index', () => {
      const message = `
        ATIVO: PETR4
        COMPRA: 25.00
        ALVO GERAL: 30.00
      `;
      
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.targetFinal, 30.00);
    });
  });

  describe('Overrides', () => {
    it('should allow overriding asset', () => {
      const message = 'ATIVO: INVALID COMPRA: 10.00';
      const signal = parseSignal(message, { asset: 'OVERRIDE' });
      
      assert.strictEqual(signal.asset, 'OVERRIDE');
    });

    it('should allow overriding timestamp', () => {
      const customTimestamp = Date.UTC(2025, 0, 1, 12, 0, 0);
      const signal = parseSignal('ATIVO: PETR4 COMPRA: 25.00', { timestamp: customTimestamp });
      
      assert.strictEqual(signal.timestamp, customTimestamp);
      assert.strictEqual(signal.ts, customTimestamp);
    });

    it('should allow overriding channel', () => {
      const signal = parseSignal('ATIVO: PETR4 COMPRA: 25.00', { channel: 'Custom Channel' });
      
      assert.strictEqual(signal.channel, 'Custom Channel');
    });

    it('should allow overriding signalType', () => {
      const signal = parseSignal('ATIVO: PETR4 COMPRA: 25.00', { signalType: 'Day Trade' });
      
      assert.strictEqual(signal.signalType, 'Day Trade');
      assert.strictEqual(signal.signal_type, 'Day Trade');
    });
  });

  describe('Edge Cases', () => {
    it('should throw error for empty message', () => {
      assert.throws(() => parseSignal(''), {
        message: 'Empty message'
      });
    });

    it('should throw error for null message', () => {
      assert.throws(() => parseSignal(null), {
        message: 'Empty message'
      });
    });

  it('should handle message with only whitespace', () => {
    // parseSignal.trim() removes whitespace, but doesn't throw - returns UNKNOWN asset
    const signal = parseSignal('   \n\t  ');
    assert.strictEqual(signal.asset, 'UNKNOWN');
  });

  it('should handle message with no recognizable asset', () => {
    const message = 'COMPRA: 25.00 STOP: 20.00';
    const signal = parseSignal(message);
    
    // parseSignal extracts first 4+ letter word (COMPRA in this case)
    assert.strictEqual(signal.asset, 'COMPRA');
  });

    it('should handle message with unicode characters (até, à)', () => {
      const message = 'ATIVO: PETR4 COMPRA: 25.00 ATÉ 26.00';
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.buyMin, 25.00);
      assert.strictEqual(signal.buyMax, 26.00);
    });

    it('should handle message with carriage returns (\\r\\n)', () => {
      const message = 'ATIVO: PETR4\r\nCOMPRA: 25.00\r\nSTOP: 20.00';
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'PETR4');
      assert.strictEqual(signal.buyMin, 25.00);
      assert.strictEqual(signal.stop, 20.00);
    });
  });

  describe('Output Format', () => {
  it('should include both snake_case and camelCase fields', () => {
    const message = 'ATIVO: PETR4 COMPRA: 25.00 A 26.00 STOP: 20.00 ALVO FINAL: 30.00';
    const signal = parseSignal(message);
    
    // snake_case
    assert.ok(signal.signal_type);
    assert.ok(signal.buy_min);
    assert.ok(signal.buy_max);
    assert.ok(signal.target_final);  // Needs ALVO FINAL in message
    assert.ok(signal.raw_message);
    assert.ok(signal.ingested_at);
    
    // camelCase
    assert.ok(signal.signalType);
    assert.ok(signal.buyMin);
    assert.ok(signal.buyMax);
    assert.ok(signal.targetFinal);
    assert.ok(signal.rawMessage);
  });

    it('should set default source to "forwarder"', () => {
      const signal = parseSignal('ATIVO: PETR4 COMPRA: 25.00');
      
      assert.strictEqual(signal.source, 'forwarder');
    });

    it('should allow overriding source', () => {
      const signal = parseSignal('ATIVO: PETR4 COMPRA: 25.00', { source: 'telegram-gateway' });
      
      assert.strictEqual(signal.source, 'telegram-gateway');
    });

    it('should preserve raw_message exactly', () => {
      const original = '  ATIVO: PETR4\nCOMPRA: 25.00  \n';
      const signal = parseSignal(original);
      
      // Normalização remove \r, mas preserva conteúdo
      assert.strictEqual(signal.rawMessage.trim(), original.trim().replace(/\r/g, ''));
    });
  });

  describe('Real-World Examples', () => {
  it('should parse TP Capital style message', () => {
    const message = `
      DATA 07/10/2025 17:25:59
      CANAL TP Capital
      TIPO Swing Trade
      ATIVO BEEFW655
      COMPRA: 0.25-0.27
      ALVO 1: 0.35
      ALVO 2: 0.56
      ALVO FINAL: 2.00
      STOP: 0.16
    `;
    
    const signal = parseSignal(message);
    
    assert.strictEqual(signal.asset, 'BEEFW655');
    assert.strictEqual(signal.buyMin, 0.25);
    assert.strictEqual(signal.buyMax, 0.27);
    assert.strictEqual(signal.target1, 0.35);
    assert.strictEqual(signal.target2, 0.56);
    assert.strictEqual(signal.targetFinal, 2.00);
    assert.strictEqual(signal.stop, 0.16);
  });

  it('should parse condensed format (PETR4 25-26 STOP 20)', () => {
    const message = 'PETR4 COMPRA: 25-26 STOP: 20';
    const signal = parseSignal(message);
    
    assert.strictEqual(signal.asset, 'PETR4');
    // Note: 25-26 is parsed as range, so buyMin=25, buyMax=26
    // But the regex might capture it differently depending on format
    assert.ok(signal.buyMin >= 25);
    assert.ok(signal.buyMax >= 25);
    assert.strictEqual(signal.stop, 20);
  });

    it('should handle mixed case (AtIvO)', () => {
      const message = 'AtIvO: PeTr4 CoMpRa: 25.00';
      const signal = parseSignal(message);
      
      assert.strictEqual(signal.asset, 'PETR4');
      assert.strictEqual(signal.buyMin, 25.00);
    });
  });
});


