# ADR-001: Adoção de Clean Architecture

**Status:** Aceito
**Data:** 2025-01-04
**Autor:** Marcelo Terra
**Decisores:** Equipe de Arquitetura

## Contexto

O sistema de trading precisa ser:
- **Testável**: Testes unitários e de integração sem dependências externas
- **Manutenível**: Mudanças em infraestrutura não devem afetar regras de negócio
- **Escalável**: Adicionar novos recursos sem quebrar existentes
- **Independente**: Desacoplado de frameworks, UI e banco de dados

## Decisão

Adotamos **Clean Architecture** (Uncle Bob) com as seguintes camadas:

### 1. Domain Layer (Núcleo)
- **Entidades**: `Trade`, `Order`, `Position`, `Signal`
- **Value Objects**: `Price`, `Symbol`, `Quantity`, `Timestamp`
- **Aggregates**: `OrderAggregate`, `TradeAggregate`
- **Interfaces de Repositório**: `ITradeRepository`, `IOrderRepository`
- **Domain Events**: `OrderFilledEvent`, `SignalGeneratedEvent`

**Regras:**
- ❌ Sem dependências externas
- ❌ Sem frameworks
- ✅ Apenas lógica de negócio pura

### 2. Application Layer
- **Use Cases**: `PlaceOrderCommand`, `GenerateSignalCommand`
- **DTOs**: Transferência de dados entre camadas
- **Services**: Orquestração de use cases
- **Handlers**: Processamento de comandos/queries

**Regras:**
- ✅ Depende apenas do Domain
- ✅ Implementa casos de uso
- ❌ Não conhece infraestrutura

### 3. Infrastructure Layer
- **ProfitDLL Wrapper**: Integração com DLL nativa
- **Repositories**: Implementação de persistência (Parquet)
- **WebSocket**: Comunicação em tempo real
- **HTTP Clients**: Chamadas para serviços

**Regras:**
- ✅ Implementa interfaces do Domain
- ✅ Lida com detalhes técnicos
- ❌ Não contém lógica de negócio

### 4. Presentation Layer
- **Controllers**: APIs REST
- **ViewModels**: Dados para UI
- **Middlewares**: Pipeline HTTP

**Regras:**
- ✅ Depende de Application
- ✅ Trata entrada/saída
- ❌ Sem lógica de negócio

## Fluxo de Dependências

```
Presentation  →  Application  →  Domain  ←  Infrastructure
     ↓                ↓            ↑              ↑
   (UI)          (Use Cases)  (Entities)    (ProfitDLL)
```

**Regra de Dependência:** Camadas externas dependem de camadas internas, nunca o contrário.

## Consequências

### Positivas ✅
- **Testabilidade**: Domain isolado, fácil de testar sem mocks
- **Flexibilidade**: Trocar ProfitDLL por outra fonte sem afetar Domain
- **Manutenibilidade**: Mudanças localizadas por camada
- **Reusabilidade**: Domain pode ser usado em outros projetos

### Negativas ⚠️
- **Complexidade inicial**: Mais arquivos e abstrações
- **Curva de aprendizado**: Equipe precisa entender padrão
- **Overhead**: Mapeamento entre camadas (DTOs)

### Mitigações
- Documentação completa (CLAUDE.md)
- Exemplos de implementação por camada
- Code reviews rigorosos
- Templates de geração de código

## Alternativas Consideradas

### 1. Layered Architecture (Tradicional)
- ❌ Acoplamento entre UI e Data Access
- ❌ Difícil de testar
- ✅ Mais simples inicialmente

### 2. Hexagonal Architecture (Ports & Adapters)
- ✅ Similar a Clean Architecture
- ✅ Bom isolamento
- ❌ Menos documentação/exemplos

### 3. Vertical Slice Architecture
- ✅ Organização por feature
- ❌ Difícil manter consistência
- ❌ Não escala bem para sistemas complexos

## Referências

- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design (Eric Evans)](https://www.domainlanguage.com/ddd/)
- [.NET Clean Architecture Template](https://github.com/jasontaylordev/CleanArchitecture)

## Decisão Final

Implementar **Clean Architecture** com DDD no núcleo, garantindo:
1. Domain independente de frameworks
2. Application orquestra use cases
3. Infrastructure implementa detalhes técnicos
4. Presentation trata entrada/saída

**Status:** ✅ Aceito e implementado
