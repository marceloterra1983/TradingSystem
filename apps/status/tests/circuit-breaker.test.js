/**
 * Circuit Breaker Tests
 */

const CircuitBreaker = require('../src/utils/circuit-breaker');

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second timeout
  });

  describe('Basic functionality', () => {
    it('should start with closed circuit', () => {
      expect(breaker.isOpen('test-service')).toBe(false);
    });

    it('should record failures', () => {
      breaker.recordFailure('test-service');
      const state = breaker.getState('test-service');
      
      expect(state.failures).toBe(1);
      expect(state.state).toBe('closed');
    });

    it('should open circuit after threshold failures', () => {
      breaker.recordFailure('test-service');
      breaker.recordFailure('test-service');
      breaker.recordFailure('test-service'); // 3rd failure = threshold
      
      expect(breaker.isOpen('test-service')).toBe(true);
      const state = breaker.getState('test-service');
      expect(state.state).toBe('open');
      expect(state.failures).toBe(3);
    });

    it('should reset on success', () => {
      breaker.recordFailure('test-service');
      breaker.recordFailure('test-service');
      breaker.recordSuccess('test-service');
      
      expect(breaker.isOpen('test-service')).toBe(false);
      const state = breaker.getState('test-service');
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
    });

    it('should close circuit after timeout', (done) => {
      // Open circuit
      breaker.recordFailure('test-service');
      breaker.recordFailure('test-service');
      breaker.recordFailure('test-service');
      
      expect(breaker.isOpen('test-service')).toBe(true);
      
      // Wait for timeout + margin
      setTimeout(() => {
        expect(breaker.isOpen('test-service')).toBe(false);
        done();
      }, 1100); // timeout is 1000ms
    }, 2000);
  });

  describe('Multiple services', () => {
    it('should track failures independently', () => {
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-b');
      
      const stateA = breaker.getState('service-a');
      const stateB = breaker.getState('service-b');
      
      expect(stateA.failures).toBe(2);
      expect(stateB.failures).toBe(1);
    });

    it('should open circuits independently', () => {
      // Open circuit for service-a
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-a');
      
      // service-b has only 1 failure
      breaker.recordFailure('service-b');
      
      expect(breaker.isOpen('service-a')).toBe(true);
      expect(breaker.isOpen('service-b')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return empty map when no failures', () => {
      const stats = breaker.getStats();
      expect(stats.size).toBe(0);
    });

    it('should return stats for all services with failures', () => {
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-b');
      breaker.recordFailure('service-b');
      
      const stats = breaker.getStats();
      expect(stats.size).toBe(2);
      expect(stats.has('service-a')).toBe(true);
      expect(stats.has('service-b')).toBe(true);
    });

    it('should include threshold and timeout in stats', () => {
      breaker.recordFailure('service-a');
      const stats = breaker.getStats();
      const serviceStats = stats.get('service-a');
      
      expect(serviceStats.threshold).toBe(3);
      expect(serviceStats.timeout).toBe(1000);
    });
  });

  describe('clear', () => {
    it('should clear all circuit breaker state', () => {
      breaker.recordFailure('service-a');
      breaker.recordFailure('service-b');
      breaker.recordFailure('service-c');
      
      breaker.clear();
      
      const stats = breaker.getStats();
      expect(stats.size).toBe(0);
      expect(breaker.isOpen('service-a')).toBe(false);
      expect(breaker.isOpen('service-b')).toBe(false);
      expect(breaker.isOpen('service-c')).toBe(false);
    });
  });
});













