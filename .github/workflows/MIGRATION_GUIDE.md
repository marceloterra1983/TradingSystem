# Guia de Migração para Workflows v2

**Autor:** Manus AI  
**Data:** 11/11/2025

---

## Introdução

Este guia fornece as instruções passo a passo para substituir a antiga estrutura de workflows do GitHub Actions pela nova arquitetura v2, que é mais enxuta e eficiente. O processo consiste em fazer um backup dos workflows antigos, removê-los e, em seguida, adicionar os novos arquivos.

**Tempo estimado para migração:** 5-10 minutos.

---

## Passo 1: Backup dos Workflows Antigos (Opcional, mas Recomendado)

Antes de remover os arquivos antigos, é uma boa prática criar um backup. Você pode fazer isso movendo-os para um diretório de backup.

Execute o seguinte comando na raiz do seu repositório:

```bash
# Criar diretório de backup
mkdir -p .github/workflows_backup

# Mover todos os arquivos .yml antigos para o backup
find .github/workflows -maxdepth 1 -type f -name "*.yml" -exec mv {} .github/workflows_backup/ \;

echo "✅ Workflows antigos movidos para .github/workflows_backup/"
```

---

## Passo 2: Adicionar os Novos Workflows

Agora que o diretório de workflows está limpo, copie os novos arquivos da arquitetura v2 para o diretório `.github/workflows/`.

Assumindo que os novos arquivos estão em um diretório chamado `new_workflows/` na raiz do projeto, execute:

```bash
# Copiar os novos arquivos de workflow
cp new_workflows/*.yml .github/workflows/

echo "✅ Novos workflows v2 adicionados com sucesso!"
```

---

## Passo 3: Revisar e Fazer o Commit das Mudanças

Após adicionar os novos arquivos, revise as mudanças e faça o commit para o seu repositório. O GitHub Actions detectará automaticamente a nova configuração.

```bash
# Adicionar as mudanças ao Git
git add .github/workflows/*.yml

# Fazer o commit das mudanças
git commit -m "chore(ci): implementa nova arquitetura de workflows v2"

# Enviar as mudanças para o repositório remoto
git push
```

---

## Passo 4: Configurar Segredos do Repositório (Se Necessário)

A nova arquitetura pode depender de alguns segredos do GitHub para funcionar corretamente. Verifique se os seguintes segredos estão configurados em `Settings > Secrets and variables > Actions` no seu repositório:

*   `GITHUB_TOKEN`: Geralmente já está disponível, mas confirme se as permissões estão corretas para cada workflow.
*   `CODECOV_TOKEN`: Necessário para o upload de relatórios de cobertura para o Codecov (no `ci-main.yml`).

---

## Conclusão

Migração concluída! Monitore a aba "Actions" do seu repositório para ver os novos workflows em execução. O workflow `error-reporter.yml` começará a atuar caso ocorra alguma falha, criando issues para facilitar o rastreamento.

Se encontrar qualquer problema, você pode reverter para a versão anterior restaurando os arquivos do diretório `.github/workflows_backup/` a`.
