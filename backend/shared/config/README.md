# Configuração de Ambiente - Sistema Hierárquico

Este diretório contém o carregador centralizado de variáveis de ambiente para todos os serviços do backend.

## Como Funciona

O arquivo `load-env.js` implementa um sistema **hierárquico de carregamento** de variáveis de ambiente, onde arquivos mais específicos podem sobrescrever valores de arquivos mais gerais.

### Ordem de Carregamento

As variáveis de ambiente são carregadas na seguinte ordem (da menor para a maior prioridade):

```
1. config/container-images.env    (configurações de imagens Docker)
2. config/.env.defaults           (valores padrão do projeto)
3. .env                           (configuração principal do projeto)
4. .env.local                     (sobrescritas locais do desenvolvedor)
5. {service}/.env                 (configuração específica do serviço)
```

### Regras de Sobrescrita

- **Arquivos 1-2**: Não sobrescrevem variáveis já definidas
- **Arquivos 3-5**: **Sobrescrevem** variáveis definidas anteriormente
- Variáveis de ambiente do sistema têm a **maior prioridade** (nunca são sobrescritas)

## Exemplo Prático

Suponha a seguinte estrutura:

```
TradingSystem/
├── .env                                    # DB_URL=postgres://prod-server/db
├── .env.local                              # DB_URL=postgres://localhost/db-dev
└── backend/api/telegram-gateway/
    └── .env                                # DB_URL=postgres://localhost/telegram-db
```

Quando o serviço `telegram-gateway` iniciar, a ordem de leitura será:

1. Lê `.env` → `DB_URL=postgres://prod-server/db`
2. Lê `.env.local` → **sobrescreve** para `DB_URL=postgres://localhost/db-dev`
3. Lê `backend/api/telegram-gateway/.env` → **sobrescreve** para `DB_URL=postgres://localhost/telegram-db`

**Resultado final**: `DB_URL=postgres://localhost/telegram-db`

## Uso nos Serviços

### Para Serviços Backend (APIs)

Os serviços já importam automaticamente o `load-env.js`:

```javascript
// src/config.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ✅ Carrega automaticamente as variáveis de ambiente
await import('../../../shared/config/load-env.js').catch((error) => {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
    throw error;
  }
});

// Agora você pode usar process.env normalmente
export const config = {
  port: process.env.API_PORT || 3000,
  database: process.env.DB_URL,
};
```

### Para Aplicações Standalone (apps/)

Aplicações em `apps/` podem carregar o `.env` do projeto root manualmente:

```javascript
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.join(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

## Boas Práticas

### ✅ Faça

- **Crie `.env.example`** em cada serviço com todas as variáveis necessárias
- **Use `.env.local`** para sobrescritas pessoais (já está no `.gitignore`)
- **Documente** cada variável no `.env.example` com comentários
- **Use valores padrão sensatos** no código quando possível

### ❌ Não Faça

- **Nunca commite** arquivos `.env` com valores sensíveis
- **Não dependa** de variáveis sem fallback em desenvolvimento
- **Evite duplicar** variáveis entre `.env` global e local desnecessariamente
- **Não use** caminhos absolutos se puder usar relativos

## Estrutura de Arquivo .env

### Formato Recomendado

```bash
# ======================================
# Seção: Nome da Categoria
# ======================================

# Descrição da variável
# Valores aceitos: valor1, valor2, valor3
VARIABLE_NAME=value

# Outra variável relacionada
ANOTHER_VARIABLE=another_value

# ======================================
# Seção: Outra Categoria
# ======================================
...
```

## Troubleshooting

### Variáveis não estão sendo carregadas

1. Verifique se o arquivo `.env` existe no local correto
2. Certifique-se de que o `load-env.js` está sendo importado **antes** de usar `process.env`
3. Use `console.log(process.env.VARIABLE_NAME)` para debugar
4. Verifique se não há espaços extras ao redor do `=` no arquivo `.env`

### Variável está com valor errado

1. Verifique se há múltiplos arquivos `.env` definindo a mesma variável
2. Lembre-se da ordem de prioridade: service `.env` > `.env.local` > `.env`
3. Verifique se a variável não está definida no ambiente do sistema

### Serviço não encontra o load-env.js

Isso é esperado para serviços que não fazem parte do monorepo. O catch silencioso permite que o código funcione mesmo sem o carregador centralizado:

```javascript
await import('../../../shared/config/load-env.js').catch((error) => {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
    throw error; // Outros erros são propagados
  }
  // ERR_MODULE_NOT_FOUND é silenciosamente ignorado
});
```

## Segurança

### Variáveis Sensíveis

- **API Keys, Tokens, Senhas**: Sempre em arquivos `.env`, nunca hardcoded
- **Produção**: Use secrets management (AWS Secrets Manager, Vault, etc.)
- **CI/CD**: Use variáveis de ambiente do pipeline, não arquivos `.env`

### .gitignore

Certifique-se de que seu `.gitignore` contém:

```
.env
.env.local
.env.*.local
```

**Exceção**: `.env.example` deve ser commitado como template.

## Referências

- [dotenv documentation](https://github.com/motdotla/dotenv)
- [12-Factor App: Config](https://12factor.net/config)


