# Course Crawler - Run Management Buttons

**Date**: 2025-11-07
**Feature**: Schedule Run Buttons in Courses Section
**Status**: ✅ IMPLEMENTED & DEPLOYED

---

## 🎯 Requested Feature

**"onde está o botão para fazer o run?"**

O usuário solicitou botões para agendar runs diretamente da lista de cursos, facilitando o workflow de:
1. Cadastrar curso
2. Agendar run do curso
3. Acompanhar execução
4. Ver artifacts

---

## ✅ Implementação

### 1. Botão "Run" na Lista de Cursos

**File**: `frontend/course-crawler/src/components/CoursesSection.tsx`

**Estado Adicionado**:
```typescript
const [schedulingIds, setSchedulingIds] = useState<Set<string>>(new Set()); // Track scheduling runs
```

**Função de Agendamento**:
```typescript
const handleScheduleRun = async (courseId: string) => {
  try {
    setSchedulingIds(prev => new Set(prev).add(courseId));
    await api.scheduleRun(courseId);
    alert('Run scheduled successfully! Check the Runs section below.');

    // Scroll to runs section
    const runsCard = document.getElementById('course-crawler-runs');
    if (runsCard) {
      runsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error('Failed to schedule run:', error);
    alert('Failed to schedule run. See console for details.');
  } finally {
    setSchedulingIds(prev => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
  }
};
```

**Botão Adicionado**:
```typescript
<Button
  onClick={() => handleScheduleRun(course.id)}
  size="sm"
  disabled={schedulingIds.has(course.id)}
  className="bg-green-600 hover:bg-green-700 text-white"
>
  <Play className="h-3 w-3 mr-1" />
  {schedulingIds.has(course.id) ? 'Scheduling...' : 'Run'}
</Button>
```

**Posição do Botão**:
```
[Run 🟢] [Edit ⚪] [Delete 🔴]
```

---

## 🎨 UI/UX

### Visual Design

**Cor Verde**: Indica ação de "iniciar/executar"
- `bg-green-600 hover:bg-green-700`
- Contrasta com Edit (cyan) e Delete (red)

**Ícone Play**: Reforça a ação de "executar"
- `<Play className="h-3 w-3 mr-1" />`

**Loading State**: Feedback visual durante agendamento
- Text: "Run" → "Scheduling..."
- Button disabled durante operação

### User Flow

1. **Usuário clica "Run"** → Botão desabilitado, texto muda para "Scheduling..."
2. **API agendada** → Alert de sucesso
3. **Auto-scroll** → Página rola automaticamente para seção "Runs"
4. **Botão restaurado** → Volta ao estado "Run" e habilitado

---

## 🔄 Integration with Runs Section

### Auto-Scroll após Agendamento

Após agendar run, a página automaticamente rola para a seção "Runs" para o usuário acompanhar:

```typescript
const runsCard = document.getElementById('course-crawler-runs');
if (runsCard) {
  runsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

### Atualização Automática

A seção "Runs" tem polling a cada 5 segundos para mostrar:
- Status: queued → running → success/failed/cancelled
- Duração: Timer em tempo real para runs ativos
- Botões: "Cancel" para runs queued/running, "Artifacts" para success

---

## 📋 Arquivos Modificados

### Frontend
1. ✅ `frontend/course-crawler/src/components/CoursesSection.tsx`
   - Adicionado import `Play` icon
   - Adicionado estado `schedulingIds`
   - Adicionado função `handleScheduleRun`
   - Adicionado botão "Run" na lista de cursos

---

## 🧪 Como Testar

### Teste 1: Agendar Run via Botão
```bash
# 1. Abrir http://localhost:4201
# 2. Na seção "Courses", localizar qualquer curso
# 3. Clicar no botão verde "Run"
# 4. Verificar:
#    - Alert "Run scheduled successfully!"
#    - Botão muda para "Scheduling..." temporariamente
#    - Página rola para seção "Runs"
#    - Novo run aparece na lista com status "queued"
```

### Teste 2: Múltiplos Runs Simultâneos
```bash
# 1. Clicar "Run" em curso A
# 2. Clicar "Run" em curso B (antes do primeiro terminar)
# 3. Verificar:
#    - Ambos os botões funcionam independentemente
#    - Estado de loading é individual por curso
#    - Ambos aparecem na seção "Runs"
```

### Teste 3: Acompanhar Execução
```bash
# 1. Agendar run
# 2. Na seção "Runs", observar:
#    - Status muda de "queued" para "running"
#    - Timer de duração aparece
#    - Botão "Cancel" disponível
# 3. Aguardar conclusão:
#    - Status muda para "success" ou "failed"
#    - Botão "Artifacts" aparece (se success)
```

---

## 🚀 Deployment Status

### Build & Deploy Completos

```bash
# Frontend build
cd frontend/course-crawler
npm run build
✅ Built successfully

# Docker image rebuild
docker compose -f tools/compose/docker-compose.course-crawler.yml build course-crawler-ui
✅ Image built

# Container restart
docker compose up -d course-crawler-ui
✅ Container running

# Health check
curl http://localhost:4201
✅ 200 OK
```

---

## 📖 User Journey Completo

### Workflow: Do Cadastro ao Artifact

**1. Cadastrar Curso** (Seção "Courses")
```
- Clicar "New Course"
- Preencher: name, baseUrl, username, password (opcional)
- Clicar "Create"
```

**2. Agendar Run** (Seção "Courses")
```
- Localizar curso na lista
- Clicar botão verde "Run"
- Alert de confirmação + auto-scroll
```

**3. Acompanhar Execução** (Seção "Runs")
```
- Ver status: queued → running → success/failed
- Ver duração em tempo real
- Opção de cancelar (se queued/running)
```

**4. Visualizar Artifacts** (Seção "Artifacts")
```
- Clicar "Artifacts" no run success
- Ver estrutura de diretórios
- Baixar arquivos .md e .json
```

---

## 🎯 Melhorias Implementadas

### Comparação Antes vs Depois

**Antes**:
- ❌ Sem botão visível para agendar runs
- ❌ Usuário tinha que descobrir como fazer
- ❌ Workflow confuso

**Depois**:
- ✅ Botão "Run" visível e intuitivo
- ✅ Feedback visual (loading state)
- ✅ Auto-scroll para acompanhamento
- ✅ Workflow claro e guiado

---

## 🔗 Related Features

### Integração com Outras Funcionalidades

1. **Password Management**
   - Runs usam credenciais cadastradas
   - Senha criptografada no banco
   - Descriptografia automática durante run

2. **Run Cancellation**
   - Botão "Cancel" na seção "Runs"
   - Atualiza status para "cancelled"
   - Worker para execução

3. **Artifacts Viewer**
   - Botão "Artifacts" após success
   - Visualiza estrutura de diretórios
   - Download de arquivos gerados

---

## 📊 API Endpoints Utilizados

### POST /courses/:courseId/runs
**Função**: Agendar novo run para um curso
**Request**: Nenhum body necessário
**Response**:
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "status": "queued",
  "createdAt": "2025-11-07T..."
}
```

---

## 🎨 Design Tokens

### Botão "Run"
```css
Background: bg-green-600 (hsl(142, 76%, 36%))
Hover: bg-green-700 (hsl(142, 76%, 30%))
Text: text-white
Icon: Play (lucide-react)
Size: sm (small)
Padding: px-3 py-1
```

### Estados
```typescript
Normal: "Run" + enabled
Loading: "Scheduling..." + disabled
Error: Alert message + re-enabled
Success: Alert + scroll + re-enabled
```

---

**Report Generated**: 2025-11-07 22:00 UTC
**Feature Status**: ✅ PRODUCTION READY
**User Feedback**: Requested feature successfully delivered
