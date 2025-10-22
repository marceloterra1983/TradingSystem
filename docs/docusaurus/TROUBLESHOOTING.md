---
title: Troubleshooting - Gemini CLI Theme
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: 🔧 Troubleshooting - Gemini CLI Theme
status: active
last_review: 2025-10-22
---

# 🔧 Troubleshooting - Gemini CLI Theme

## ✅ Status Atual

**Servidor**: ✅ Rodando em http://localhost:3004  
**Build**: ✅ Compilado com sucesso  
**CSS**: ✅ Carregado sem erros  
**Tema**: ✅ Gemini CLI implementado

## 🚀 Como Acessar

### Opção 1: Navegador

```
http://localhost:3004
```

### Opção 2: Teste Local

```bash
# Abra o arquivo de teste
open test-theme.html
# ou
xdg-open test-theme.html
```

## 🔍 Verificações

### 1. Servidor Rodando?

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3004
# Deve retornar: 200
```

### 2. Processo Ativo?

```bash
ps aux | grep docusaurus
# Deve mostrar processo node rodando
```

### 3. Porta Livre?

```bash
netstat -tlnp | grep :3004
# Deve mostrar LISTEN na porta 3004
```

## 🐛 Problemas Comuns

### Problema: "Não carregou"

**Solução Rápida (Recomendada):**

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run dev:clean
```

Este comando limpa o cache automaticamente e inicia o servidor com mais memória.

**Solução Completa (se o problema persistir):**

```bash
# 1. Pare todos os processos
pkill -f docusaurus

# 2. Limpe cache
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run clear

# 3. Reinstale dependências
rm -rf node_modules package-lock.json
npm install

# 4. Use o comando dev (já inclui mais memória)
npm run dev
```

### Problema: "Erro de memória"

**Solução:**

```bash
# Aumente a memória do Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run start -- --port 3004
```

### Problema: "CSS não aplicado"

**Solução:**

```bash
# 1. Hard refresh no navegador
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 2. Limpe cache do navegador
# 3. Verifique se está em dark mode
```

### Problema: "Sidebar não escura"

**Solução:**

```bash
# 1. Verifique se está em dark mode
# 2. Clique no ícone sol/lua no navbar
# 3. Verifique se o CSS foi carregado
```

## 🎯 Teste Rápido

### 1. Acesse http://localhost:3004

### 2. Verifique:

- [ ] Background escuro (#0f1419)
- [ ] Sidebar ultra escura (#0a0e17)
- [ ] Item ativo roxo (#8e24aa)
- [ ] Search bar com "Search"
- [ ] GitHub icon no navbar
- [ ] Theme toggle "Auto"

### 3. Teste Interações:

- [ ] Hover nos links da sidebar
- [ ] Clique no toggle de tema
- [ ] Teste a busca
- [ ] Navegue entre páginas

## 📱 Teste Mobile

```bash
# Redimensione a janela para mobile
# A sidebar deve virar menu hamburguer
# O tema deve continuar funcionando
```

## 🔧 Debug Avançado

### Verificar CSS Carregado

```bash
# No navegador, abra DevTools (F12)
# Vá para Network tab
# Recarregue a página
# Verifique se styles.css foi carregado
```

### Verificar Console

```bash
# No DevTools, vá para Console
# Verifique se há erros JavaScript
# Procure por erros de CSS
```

### Verificar Elementos

```bash
# No DevTools, vá para Elements
# Verifique se as classes CSS estão aplicadas
# Procure por: .theme-doc-sidebar-container
```

## 🚀 Comandos Úteis

### Iniciar Servidor

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run start -- --port 3004
```

### Build para Produção

```bash
npm run build
npm run serve
```

### Limpar Cache

```bash
npm run clear
```

### Verificar Dependências

```bash
npm list
```

### Reinstalar Tudo

```bash
rm -rf node_modules package-lock.json
npm install
```

## 📊 Status dos Componentes

| Componente        | Status | Notas                              |
| ----------------- | ------ | ---------------------------------- |
| Navbar            | ✅     | Logo + título + search + ícones    |
| Sidebar           | ✅     | Ultra escura + item ativo roxo     |
| Conteúdo          | ✅     | Background escuro + tipografia     |
| TOC               | ✅     | Sidebar direita com "On this page" |
| Search            | ✅     | Barra com placeholder + Ctrl+K     |
| Theme Toggle      | ✅     | "Auto" com dropdown                |
| Cookies Banner    | ✅     | Componente React                   |
| Code Highlighting | ✅     | @file.md em roxo                   |

## 🎨 Cores Esperadas

```css
/* Dark Mode */
Background: #0f1419
Sidebar: #0a0e17
Navbar: #1a1f2e
Active Item: #8e24aa (roxo)
Primary: #8ab4f8 (azul)
Text: #e8eaed
Secondary Text: #9aa0a6
```

## 📞 Suporte

Se ainda não funcionar:

1. **Verifique os logs** do terminal onde rodou o comando
2. **Abra o DevTools** (F12) e verifique erros
3. **Teste o arquivo** `test-theme.html` para ver se o CSS funciona
4. **Reinicie o servidor** com mais memória

## ✅ Checklist Final

- [ ] Servidor rodando (http://localhost:3004)
- [ ] Dark mode ativo por padrão
- [ ] Sidebar ultra escura
- [ ] Item ativo roxo
- [ ] Search bar funcionando
- [ ] GitHub icon visível
- [ ] Theme toggle "Auto"
- [ ] TOC na sidebar direita
- [ ] Code highlighting roxo
- [ ] Transições suaves

---

**Se tudo estiver funcionando, você deve ver exatamente o design da imagem do Gemini CLI!** 🎉

**Comando para iniciar:**

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus && npm run start -- --port 3004
```




