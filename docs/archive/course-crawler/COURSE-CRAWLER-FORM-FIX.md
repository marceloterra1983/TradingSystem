# 🐛 Course Crawler - Problema com Botão "Create"

**Data:** 2025-11-11
**Status:** 🔴 **BUG IDENTIFICADO**
**Prioridade:** Alta
**Componente:** Frontend Form + API Schema

---

## 📋 Problema Identificado

O botão "Create" para criar um novo curso não está funcionando porque há uma **incompatibilidade entre o formulário do frontend e o schema de validação da API**.

---

## 🔍 Análise Detalhada

### 1. **Schema da API (Backend)**

**Arquivo:** `backend/api/course-crawler/src/schemas/course.schema.ts`

```typescript
export const CreateCourseSchema = z.object({
  name: z.string().min(1, "Course name is required").max(255),
  baseUrl: z.string().url("Invalid base URL format"),
  username: z.string().min(1, "Username is required").max(255),
  password: z.string().min(1, "Password is required"),  // ✅ Obrigatório
  targetUrls: z
    .array(z.string().url("Invalid target URL format"))
    .min(1, "At least one target URL is required"),     // ❌ PROBLEMA: Obrigatório!
});
```

**Requisitos da API:**
- ✅ `name` - Obrigatório
- ✅ `baseUrl` - Obrigatório
- ✅ `username` - Obrigatório
- ✅ `password` - Obrigatório
- ❌ `targetUrls` - **Obrigatório (min 1 URL)** ← **PROBLEMA!**

### 2. **Formulário do Frontend**

**Arquivo:** `frontend/course-crawler/src/components/CoursesSection.tsx`

```typescript
const [formData, setFormData] = useState({
  name: '',
  baseUrl: '',
  username: '',
  password: '',
  // ❌ targetUrls NÃO EXISTE NO ESTADO!
});
```

**O que o formulário envia:**
```json
{
  "name": "Test Course",
  "baseUrl": "https://example.com",
  "username": "testuser",
  "password": "testpass"
  // ❌ targetUrls está FALTANDO!
}
```

**O que a API espera:**
```json
{
  "name": "Test Course",
  "baseUrl": "https://example.com",
  "username": "testuser",
  "password": "testpass",
  "targetUrls": ["https://example.com/course"]  // ✅ OBRIGATÓRIO!
}
```

---

## 🎯 Causa Raiz

O formulário do frontend **não possui** um campo para `targetUrls`, mas o schema da API **exige** pelo menos 1 URL.

Quando o usuário clica em "Create", o formulário envia um payload **sem** `targetUrls`, e a API **rejeita** a requisição com erro de validação.

---

## ✅ Soluções Possíveis

### Opção 1: Adicionar Campo `targetUrls` ao Formulário (Recomendado)

**Prós:**
- Mantém integridade do schema da API
- Usuário pode especificar URLs específicas para crawling
- Mais flexível e robusto

**Contras:**
- Requer modificação do formulário
- Experiência do usuário ligeiramente mais complexa

**Implementação:**

```typescript
// 1. Adicionar targetUrls ao estado do formulário
const [formData, setFormData] = useState({
  name: '',
  baseUrl: '',
  username: '',
  password: '',
  targetUrls: [''],  // ✅ Array com 1 URL vazia inicial
});

// 2. Adicionar campo dinâmico no formulário
<div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    Target URLs
  </label>
  {formData.targetUrls.map((url, index) => (
    <div key={index} className="flex gap-2 mb-2">
      <input
        type="url"
        value={url}
        onChange={(e) => {
          const newUrls = [...formData.targetUrls];
          newUrls[index] = e.target.value;
          setFormData({ ...formData, targetUrls: newUrls });
        }}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        required
        placeholder="https://example.com/course/module"
      />
      {formData.targetUrls.length > 1 && (
        <Button
          type="button"
          onClick={() => {
            const newUrls = formData.targetUrls.filter((_, i) => i !== index);
            setFormData({ ...formData, targetUrls: newUrls });
          }}
          variant="outline"
          size="sm"
        >
          Remove
        </Button>
      )}
    </div>
  ))}
  <Button
    type="button"
    onClick={() => {
      setFormData({
        ...formData,
        targetUrls: [...formData.targetUrls, ''],
      });
    }}
    variant="outline"
    size="sm"
    className="mt-2"
  >
    <Plus className="h-3 w-3 mr-1" />
    Add URL
  </Button>
</div>
```

---

### Opção 2: Tornar `targetUrls` Opcional no Schema da API

**Prós:**
- Fix rápido (apenas backend)
- Não requer mudanças no frontend
- Experiência do usuário mais simples

**Contras:**
- `targetUrls` pode ficar vazio (array vazio)
- Menos robusto (baseUrl pode ser usado como fallback)

**Implementação:**

```typescript
// backend/api/course-crawler/src/schemas/course.schema.ts
export const CreateCourseSchema = z.object({
  name: z.string().min(1).max(255),
  baseUrl: z.string().url(),
  username: z.string().min(1).max(255),
  password: z.string().min(1),
  targetUrls: z
    .array(z.string().url())
    .min(0)  // ✅ Permitir array vazio
    .optional()  // ✅ Tornar opcional
    .default([]),  // ✅ Default para array vazio
});
```

```typescript
// backend/api/course-crawler/src/services/course-service.ts
export async function createCourse(input: CourseInput) {
  const encrypted = input.password ? encryptSecret(input.password) : "";
  const targetUrls = input.targetUrls ?? [];  // ✅ Fallback para array vazio

  const result = await pool.query<CourseRow>(
    `INSERT INTO course_crawler.courses
       (name, base_url, username, password_encrypted, target_urls)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name, input.baseUrl, input.username, encrypted, targetUrls],
  );

  return sanitizeCourse(mapRow(result.rows[0]));
}
```

---

### Opção 3: Usar `baseUrl` como Default para `targetUrls`

**Prós:**
- Mais inteligente (usa baseUrl se targetUrls não fornecido)
- Mantém requisito de "pelo menos 1 URL"
- Experiência do usuário simples

**Contras:**
- Lógica de fallback no backend

**Implementação:**

```typescript
// backend/api/course-crawler/src/schemas/course.schema.ts
export const CreateCourseSchema = z.object({
  name: z.string().min(1).max(255),
  baseUrl: z.string().url(),
  username: z.string().min(1).max(255),
  password: z.string().min(1),
  targetUrls: z
    .array(z.string().url())
    .optional(),  // ✅ Opcional no schema
});
```

```typescript
// backend/api/course-crawler/src/services/course-service.ts
export async function createCourse(input: CourseInput) {
  const encrypted = input.password ? encryptSecret(input.password) : "";

  // ✅ Se targetUrls não fornecido, usa baseUrl
  const targetUrls = input.targetUrls && input.targetUrls.length > 0
    ? input.targetUrls
    : [input.baseUrl];  // Fallback para baseUrl

  const result = await pool.query<CourseRow>(
    `INSERT INTO course_crawler.courses
       (name, base_url, username, password_encrypted, target_urls)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name, input.baseUrl, input.username, encrypted, targetUrls],
  );

  return sanitizeCourse(mapRow(result.rows[0]));
}
```

---

## 🎯 Recomendação

**Opção 3 (Usar `baseUrl` como Default)** é a melhor solução porque:

1. ✅ **Fix rápido** - Apenas backend
2. ✅ **UX simples** - Usuário não precisa duplicar baseUrl em targetUrls
3. ✅ **Robusto** - Sempre tem pelo menos 1 URL
4. ✅ **Flexível** - Usuário pode adicionar targetUrls no futuro (via Edit)
5. ✅ **Backward compatible** - Não quebra funcionalidade existente

---

## 📝 Checklist de Implementação (Opção 3)

- [ ] Modificar `CreateCourseSchema` para tornar `targetUrls` opcional
- [ ] Atualizar `createCourse` service para usar `baseUrl` como fallback
- [ ] Atualizar `updateCourse` service com mesma lógica
- [ ] Adicionar testes para validar fallback
- [ ] Documentar comportamento no COURSE-CRAWLER-COMPLETE-GUIDE.md
- [ ] Testar criação de curso via UI
- [ ] Testar criação de curso via API (com e sem targetUrls)

---

## 🧪 Testes de Validação

### Teste 1: Criar curso sem `targetUrls` (deve usar baseUrl)
```bash
POST /courses
{
  "name": "Test Course",
  "baseUrl": "https://example.com",
  "username": "testuser",
  "password": "testpass"
}

# Esperado: Status 201, targetUrls = ["https://example.com"]
```

### Teste 2: Criar curso com `targetUrls` explícitos
```bash
POST /courses
{
  "name": "Test Course",
  "baseUrl": "https://example.com",
  "username": "testuser",
  "password": "testpass",
  "targetUrls": ["https://example.com/module1", "https://example.com/module2"]
}

# Esperado: Status 201, targetUrls preservado
```

### Teste 3: Criar curso com `targetUrls` vazio (deve usar baseUrl)
```bash
POST /courses
{
  "name": "Test Course",
  "baseUrl": "https://example.com",
  "username": "testuser",
  "password": "testpass",
  "targetUrls": []
}

# Esperado: Status 201, targetUrls = ["https://example.com"]
```

---

## 🚀 Próximos Passos

1. **Implementar Opção 3** (baseUrl como fallback)
2. **Testar via UI** (botão "Create" deve funcionar)
3. **Atualizar documentação**
4. **Adicionar testes automatizados**
5. **(Opcional) Adicionar campo targetUrls ao formulário no futuro**

---

**Status:** 🔴 Aguardando Implementação
**Prioridade:** Alta (bloqueia criação de cursos)
**Impacto:** Funcionalidade core quebrada
**Esforço:** Baixo (~15 minutos)
