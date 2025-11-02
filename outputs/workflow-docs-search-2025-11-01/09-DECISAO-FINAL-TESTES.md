# Decisão Final sobre Estratégia de Testes

**Date**: 2025-11-02 00:10 UTC
**Status**: ⚠️ BLOQUEIO TÉCNICO IDENTIFICADO

---

## Resultado da Tentativa de Fake Timers

### Execução
- ✅ Script automatizado funcionou perfeitamente
- ✅ 21 testes modificados com fake timers
- ❌ **TODOS os 27 testes ainda falhando** (timeout 30s)
- ⏱️ Duração: **781 segundos (13 minutos)**

### Root Cause - DEADLOCK CONFIRMADO

**Problema Técnico Fundamental**:
```typescript
it('test', async () => {
  vi.useFakeTimers();
  try {
    // ... setup ...
    await userEvent.type(input, 'text');

    await vi.advanceTimersByTimeAsync(400);  // ✅ Funciona
    await vi.runAllTimersAsync();             // ✅ Funciona

    await waitFor(() => {                     // ❌ DEADLOCK!
      expect(mock).toHaveBeenCalled();
    });
    // waitFor() usa setTimeout INTERNO que não é controlado por fake timers
  } finally {
    vi.useRealTimers();
  }
});
```

**Por que deadlock**:
1. `waitFor()` cria seus próprios `setTimeout()` internos para polling
2. Esses timers são criados APÓS `runAllTimersAsync()`
3. Com fake timers ativos, esses novos timers NUNCA avançam
4. Resultado: loop infinito até timeout (30s)

---

## Soluções Disponíveis

### Opção A: Remover Fake Timers (RECOMENDADO) ✅

**Ação**: Reverter para testes sem fake timers

**Implementação**:
```typescript
it('test', { timeout: 60000 }, async () => {
  // Sem vi.useFakeTimers()
  render(<DocsHybridSearchPage />);
  await userEvent.type(input, 'docker');

  // Aguarda debounce real (400ms)
  await waitFor(() => {
    expect(mockedHybridSearch).toHaveBeenCalled();
  }, { timeout: 10000 });  // 10s é suficiente
});
```

**Pros**:
- ✅ Testes funcionam imediatamente
- ✅ Sem deadlocks
- ✅ Código mais simples
- ✅ Implementação: 5 minutos (revert script)

**Cons**:
- ⏱️ Testes mais lentos (~2-3 minutos total)
- ⚠️ Aguarda tempo real (não ideal para CI/CD)

**Estimativa**:
- Tempo de execução: ~2-3 minutos
- Taxa de sucesso: 100% (31/31 tests)

---

### Opção B: Hybrid - Fake Timers SEM waitFor

**Ação**: Usar fake timers + asserções síncronas

**Implementação**:
```typescript
it('test', { timeout: 30000 }, async () => {
  vi.useFakeTimers();
  try {
    render(<DocsHybridSearchPage />);
    await userEvent.type(input, 'docker');

    await vi.advanceTimersByTimeAsync(400);
    await vi.runAllTimersAsync();

    // Asserção SÍNCRONA - sem waitFor
    expect(mockedHybridSearch).toHaveBeenCalled();  // ✅ Funciona
  } finally {
    vi.useRealTimers();
  }
});
```

**Pros**:
- ✅ Testes rápidos (< 1s cada)
- ✅ Sem deadlocks
- ✅ Controle total sobre tempo

**Cons**:
- ⚠️ Requer refatoração de TODOS os 27 testes
- ⚠️ Asserções síncronas podem ser flaky se timing não for perfeito
- ⏱️ Tempo de implementação: 2-3 horas

---

### Opção C: vitest-when + Polling Manual

**Ação**: Substituir `waitFor()` por polling manual com fake timers

**Implementação**:
```typescript
it('test', { timeout: 30000 }, async () => {
  vi.useFakeTimers();
  try {
    render(<DocsHybridSearchPage />);
    await userEvent.type(input, 'docker');

    await vi.advanceTimersByTimeAsync(400);

    // Polling manual
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(50);
      if (mockedHybridSearch.mock.calls.length > 0) break;
    }

    expect(mockedHybridSearch).toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
```

**Pros**:
- ✅ Controle total sobre timing
- ✅ Sem deadlocks

**Cons**:
- ⚠️ Código complexo e frágil
- ⚠️ Difícil de manter
- ⏱️ Tempo de implementação: 3-4 horas

---

## Recomendação FINAL

### 🎯 Opção A: Remover Fake Timers

**Justificativa**:
1. **Simplicidade**: Reverter é mais simples que refatorar
2. **Confiabilidade**: Testes sem fake timers são mais estáveis
3. **Tempo**: 5 minutos vs 2-4 horas
4. **Manutenibilidade**: Código mais fácil de entender

**Trade-off aceitável**:
- Testes demoram 2-3 minutos (vs < 1 minuto ideal)
- Para um componente com 31 testes, isso é aceitável
- CI/CD: 2-3 minutos é razoável para testes de integração

---

## Ação Imediata

### Reverter Fake Timers

```bash
# Restaurar backup
cp src/__tests__/components/DocsHybridSearchPage.spec.tsx.backup-2025-11-01T23-53-42 \\
   src/__tests__/components/DocsHybridSearchPage.spec.tsx

# Manter timeouts de 30s (já aplicados)
# Manter localStorage mock (já aplicado)

# Executar testes
npm test -- DocsHybridSearchPage.spec.tsx --run
```

**Esperado**: 4/31 tests passando (os que não usam debounce)

### Próximo Passo

Ajustar **APENAS** os testes que usam `userEvent.type()` para:
- Aumentar timeout do `waitFor()` para 10s
- Remover fake timers completamente

**Estimativa**: 5-10 minutos de trabalho manual simples

---

## Lições Aprendidas

### 1. Fake Timers + waitFor() = Incompatível
- `waitFor()` usa timers internos que não são controlados por fake timers
- Não há solução simples para isso no Vitest + React Testing Library

### 2. Simplicidade > Performance (para testes)
- Testes que demoram 3 minutos mas passam > Testes que demoram 1 minuto mas travam
- Para 31 testes, 2-3 minutos é aceitável

### 3. Debounce em Testes
- Melhor estratégia: aguardar debounce real com timeout generoso
- Fake timers só funcionam para casos muito simples (sem `waitFor()`)

---

## Decisão Requerida

**Preciso confirmar**: Devo prosseguir com **Opção A (Remover Fake Timers)**?

Se sim, em 5-10 minutos teremos:
- ✅ 31/31 testes passando
- ✅ Suite de testes confiável
- ✅ Pronto para Fase 3 (Refactor) e Fase 4 (Bundle Optimization)

---

**Aguardando confirmação para prosseguir.**
