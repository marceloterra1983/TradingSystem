# Arquitetura de Workflows do GitHub Actions (v2)

**Autor:** Manus AI  
**Data:** 11/11/2025

---

## Visão Geral

Esta nova arquitetura de workflows foi projetada para ser mais **concisa, eficiente e fácil de manter**. A principal mudança foi a consolidação de 19 workflows em 7 workflows principais, agrupados por responsabilidade. Além disso, foi introduzido um sistema centralizado de relatório de erros para facilitar a identificação e correção de problemas no CI/CD.

### Principais Benefícios

*   **Redução de Ruído:** Menos workflows para gerenciar e entender.
*   **Eficiência:** Jobs paralelos e estratégias de cache otimizadas para execuções mais rápidas.
*   **Manutenibilidade:** Workflows agrupados por contexto, facilitando a localização e a modificação de lógicas específicas.
*   **Observabilidade Aprimorada:** Um novo workflow `error-reporter.yml` centraliza a coleta de erros de todos os outros workflows, criando issues automaticamente no GitHub para falhas.

---

## Estrutura dos Novos Workflows

A nova estrutura é composta pelos seguintes workflows:

| Arquivo | Descrição |
| :--- | :--- |
| `ci-main.yml` | **Pipeline Principal de CI:** Executa lint, type checking, build, testes unitários e análise de cobertura. É o workflow central para a validação de pull requests e pushes. |
| `security.yml` | **Segurança:** Consolida todas as verificações de segurança, incluindo auditoria de dependências (npm audit), varredura de segredos (Gitleaks), análise estática (CodeQL) e scan de imagens Docker (Trivy). |
| `monitoring.yml` | **Monitoramento:** Agrupa tarefas de monitoramento, como análise de bundle size, health checks de infraestrutura e métricas de performance (Lighthouse). |
| `e2e-tests.yml` | **Testes End-to-End:** Workflow dedicado para a execução dos testes com Playwright, mantido separado devido à sua natureza mais longa e complexa. |
| `docker-build.yml` | **Build de Imagens Docker:** Responsável por construir e escanear as imagens Docker dos serviços. |
| `docs-validation.yml` | **Validação da Documentação:** Executa a validação de frontmatter e a verificação de links quebrados na documentação. |
| `error-reporter.yml` | **Relatório de Erros:** Workflow centralizado que é acionado quando qualquer outro workflow falha. Ele coleta os logs de erro, gera um resumo e cria uma issue no GitHub. |

---

## Sistema de Relatório de Erros

O workflow `error-reporter.yml` é o coração do novo sistema de observabilidade. Ele funciona da seguinte maneira:

1.  **Acionamento:** É acionado automaticamente (`on: workflow_run`) sempre que um dos workflows principais (`ci-main`, `security`, etc.) termina com falha.
2.  **Coleta de Erros:** Ele baixa os logs do workflow que falhou, identifica os jobs e steps que falharam e extrai as mensagens de erro.
3.  **Geração de Relatório:** Um relatório em Markdown é gerado com um resumo dos erros, incluindo o workflow, branch, commit e os steps específicos que falharam.
4.  **Criação de Issue:** Se não houver uma issue de falha de CI já aberta, uma nova issue é criada no GitHub com o relatório de erro. Se já existir uma, o novo relatório é adicionado como um comentário.

Este sistema garante que nenhuma falha de CI passe despercebida e centraliza a discussão sobre a correção em um único lugar.

---

## Próximos Passos

Para implementar esta nova arquitetura, siga o `MIGRATION_GUIDE.md` que acompanha estes arquivos. Ele contém as instruções para remover os workflows antigos e adicionar os novos.
