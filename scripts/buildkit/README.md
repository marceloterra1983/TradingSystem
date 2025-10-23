# BuildKit Scripts

Scripts para gerenciamento e configuração do BuildKit, sistema de build avançado para Docker.

## Scripts Disponíveis

### Instalação e Configuração

- **`install-buildkit.sh`** - Instala o BuildKit e suas dependências
- **`configure-buildkit.sh`** - Configura o daemon BuildKit com configurações otimizadas
- **`setup-buildkit-cache.sh`** - Configura cache distribuído com registry
- **`setup-buildkit-cache-improved.sh`** - Versão melhorada do setup de cache
- **`setup-registry-cache.sh`** - Configura registry local para cache

### Correção e Manutenção

- **`fix-buildkit.sh`** - Corrige problemas comuns do BuildKit
- **`fix-buildkit-simple.sh`** - Correção simplificada de configuração
- **`fix-buildkit-permissions.sh`** - Corrige problemas de permissões

### Wrappers de Build

- **`buildkit-wrapper.sh`** - Wrapper básico para comandos buildctl
- **`buildkit-wrapper-cached.sh`** - Wrapper com suporte a cache avançado

### Testes

- **`test-buildkit.sh`** - Teste básico do BuildKit
- **`test-buildkit-sudo.sh`** - Teste com wrapper e sudo
- **`test-buildkit-fixed.sh`** - Teste com correções aplicadas
- **`test-buildkit-cache.sh`** - Teste de performance do cache

## Uso Rápido

### Build Simples
```bash
./scripts/buildkit/buildkit-wrapper-cached.sh build \
    context_dir \
    dockerfile_dir \
    image_name:tag
```

### Build com Cache do Registry
```bash
./scripts/buildkit/buildkit-wrapper-cached.sh build-registry \
    context_dir \
    dockerfile_dir \
    image_name:tag
```

### Limpar Cache
```bash
./scripts/buildkit/buildkit-wrapper-cached.sh clean-cache
```

## Documentação Completa

Para documentação detalhada, consulte:
- [BuildKit Guide](../../docs/context/backend/guides/buildkit-guide.md)

## Performance

Com cache ativado:
- Build inicial: ~3.8s
- Build com cache local: ~0.35s (90% mais rápido)
- Build com cache do registry: ~0.4s (89% mais rápido)

