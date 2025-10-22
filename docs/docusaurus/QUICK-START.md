---
title: Quick Start - Tema Gemini CLI
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: Quick Start - Tema Gemini CLI
status: active
last_review: 2025-10-22
---

# Quick Start - Tema Gemini CLI

## 🚀 Iniciando o Docusaurus

### Passo 1: Navegar para o diretório

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
```

### Passo 2: Instalar dependências (primeira vez)

```bash
npm install
```

### Passo 3: Iniciar servidor de desenvolvimento

```bash
npm run start -- --port 3004
```

### Passo 4: Acessar no navegador

Abra: **http://localhost:3004**

## 🎨 Visualizando o Tema Gemini CLI

### Dark Mode (Padrão)

1. Acesse http://localhost:3004
2. O tema dark já estará ativo
3. Observe:
   - Background ultra dark (`#0f1419`)
   - Sidebar ainda mais dark (`#0a0e17`)
   - Active items com destaque roxo/magenta (`#8e24aa`)
   - Primary color azul claro (`#8ab4f8`)

### Light Mode

1. Clique no **toggle de tema** no canto superior direito
2. O tema mudará para light mode
3. Observe:
   - Background branco puro (`#ffffff`)
   - Primary color azul Google (`#1a73e8`)
   - Active items em azul

### Comparando com Gemini CLI Original

1. Abra em outra aba: https://geminicli.com/docs/
2. Compare lado a lado:
   - ✅ Cores idênticas
   - ✅ Typography idêntica (Inter)
   - ✅ Layout similar
   - ✅ Componentes estilizados

## 🔍 Testando Componentes

### 1. Navegação Sidebar

- ✅ Clique em diferentes seções
- ✅ Observe o destaque roxo/magenta no item ativo
- ✅ Hover sobre os itens (background azul claro)

### 2. Code Blocks

Procure por blocos de código na documentação:

```javascript
console.log('Hello, World!');
```

- ✅ Background ultra dark
- ✅ Inline code com destaque roxo
- ✅ Syntax highlighting

### 3. Admonitions

Procure por callouts (note, tip, warning, danger):

:::note
Este é um exemplo de admonition
:::

- ✅ Border-left colorido
- ✅ Background sutil
- ✅ Ícone adequado

### 4. Search Bar

- ✅ Clique na barra de busca (topo direito)
- ✅ Digite algo e veja os resultados
- ✅ Observe o estilo Gemini CLI

### 5. Theme Toggle

- ✅ Clique no ícone de lua/sol
- ✅ Observe a transição suave
- ✅ Veja a mudança de cores

## 📱 Testando Responsividade

### Desktop (> 996px)

```bash
# Redimensione a janela para > 996px
```

- ✅ Sidebar visível
- ✅ TOC (Table of Contents) visível
- ✅ Navbar completo

### Tablet (768px - 996px)

```bash
# Redimensione a janela para ~800px
```

- ✅ Sidebar oculto (menu hamburger)
- ✅ TOC oculto
- ✅ Navbar compacto

### Mobile (< 768px)

```bash
# Redimensione a janela para ~375px
```

- ✅ Menu hamburger
- ✅ TOC integrado no conteúdo
- ✅ Navbar mobile-friendly

## 🛠️ Customizando o Tema

### Alterar Cor Primary

Edite `src/css/custom.css`:

```css
:root {
  --ifm-color-primary: #YOUR_COLOR; /* Substitua aqui */
}
```

Salve e veja a mudança em tempo real!

### Alterar Background Dark Mode

```css
[data-theme='dark'] {
  --ifm-background-color: #YOUR_BG_COLOR; /* Substitua aqui */
}
```

### Alterar Active Item Color

```css
.menu__link--active {
  background-color: #YOUR_ACCENT_COLOR !important; /* Substitua aqui */
}
```

## 🎯 Atalhos de Teclado

- **Ctrl/Cmd + K** - Abrir search
- **Ctrl/Cmd + /** - Toggle dark mode (se configurado)
- **/** - Focus na search bar

## 📊 Métricas de Performance

Teste a performance com Lighthouse:

```bash
# 1. Inicie o servidor
npm run start -- --port 3004

# 2. Abra Chrome DevTools (F12)
# 3. Vá em "Lighthouse"
# 4. Clique em "Analyze page load"
```

Resultados esperados:
- ✅ Performance: 90+
- ✅ Accessibility: 95+
- ✅ Best Practices: 90+
- ✅ SEO: 90+

## 🔧 Troubleshooting

### Problema: Tema não carrega

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json .docusaurus
npm install
npm run start -- --port 3004
```

### Problema: Cores não aparecem

```bash
# Verifique se custom.css está sendo importado
# Abra: src/css/custom.css
# Deve ter 708 linhas de CSS
```

### Problema: Porta 3004 em uso

```bash
# Use outra porta
npm run start -- --port 3005
```

### Problema: Build falha

```bash
# Limpe e rebuilde
npm run clear
npm run build
```

## 📚 Próximos Passos

1. ✅ **Explorar a documentação** - Navegue pelas páginas
2. ✅ **Testar dark/light mode** - Alterne entre os temas
3. ✅ **Customizar cores** - Experimente suas próprias cores
4. ✅ **Adicionar conteúdo** - Crie novas páginas
5. ✅ **Fazer build** - Teste o build de produção

## 🎨 Temas Alternativos

Se quiser experimentar outros estilos, consulte:

- **THEME-MIGRATION.md** - Guia completo de migração
- **THEME-GEMINI-CLI.md** - Documentação detalhada do tema atual

## 🔗 Links Rápidos

- **Localhost**: http://localhost:3004
- **Gemini CLI Original**: https://geminicli.com/docs/
- **Docusaurus Docs**: https://docusaurus.io/docs
- **CSS Customization**: `src/css/custom.css`

## ✅ Checklist de Teste

- [ ] Servidor iniciado com sucesso
- [ ] Página carrega no navegador
- [ ] Dark mode funcionando
- [ ] Light mode funcionando
- [ ] Sidebar navegação OK
- [ ] Code blocks estilizados
- [ ] Admonitions aparecem
- [ ] Search bar funciona
- [ ] Theme toggle funciona
- [ ] Responsivo em mobile
- [ ] Performance > 90 no Lighthouse

---

**Status**: ✅ Pronto para uso
**Tema**: Gemini CLI (100% match)
**Última Atualização**: 2025-10-19



