import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Layout } from './components/layout/Layout';
import { CollapsibleCard } from './components/CollapsibleCard';
import {
  Rows,
  Columns2,
  Columns3,
  Columns4,
  RotateCcw,
  ChevronsUpDown,
  ChevronsDownUp,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Eye,
  Folder,
  PlayCircle,
  FileText,
  Clock,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  targetUrls: string[];
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
}

interface CourseFormState {
  name: string;
  baseUrl: string;
  username: string;
  password: string;
  targetUrls: string;
}

interface CrawlRun {
  id: string;
  courseId: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  createdAt: string;
  outputsDir: string | null;
  metrics?: Record<string, unknown> | null;
}

interface ArtifactItem {
  path: string;
  type: 'file' | 'directory';
}

type CardId = 'courses' | 'runs' | 'artifacts' | 'markdown';

interface CardMetadata {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

const API_URL =
  import.meta.env.VITE_COURSE_CRAWLER_API_URL ?? 'http://localhost:3601';

const defaultCourseForm: CourseFormState = {
  name: '',
  baseUrl: '',
  username: '',
  password: '',
  targetUrls: '',
};

function normalizeTargets(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [artifactList, setArtifactList] = useState<ArtifactItem[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [courseForm, setCourseForm] =
    useState<CourseFormState>(defaultCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const defaultCardOrder: CardId[] = [
    'courses',
    'runs',
    'artifacts',
    'markdown',
  ];
  const [cardOrder, setCardOrder] = useState<CardId[]>(defaultCardOrder);
  const [collapsedCards, setCollapsedCards] = useState<Record<CardId, boolean>>({
    courses: false,
    runs: false,
    artifacts: false,
    markdown: false,
  });
  const [columns, setColumns] = useState(2);
  const [draggingCard, setDraggingCard] = useState<CardId | null>(null);
  const [dragOverCard, setDragOverCard] = useState<CardId | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const columnOptions = [
    { value: 1, icon: Rows, label: 'Uma coluna' },
    { value: 2, icon: Columns2, label: 'Duas colunas' },
    { value: 3, icon: Columns3, label: 'Três colunas' },
    { value: 4, icon: Columns4, label: 'Quatro colunas' },
  ] as const;
  const allCollapsed = cardOrder.every((id) => collapsedCards[id]);

  const markUpdated = () => setLastUpdated(new Date());

  const handleCollapseAllToggle = () => {
    const nextState = !allCollapsed;
    setCollapsedCards((prev) => {
      const updated: Record<CardId, boolean> = { ...prev };
      cardOrder.forEach((id) => {
        updated[id] = nextState;
      });
      return updated;
    });
  };

  const handleResetLayout = () => {
    setCardOrder(defaultCardOrder);
    setColumns(2);
    setCollapsedCards({
      courses: false,
      runs: false,
      artifacts: false,
      markdown: false,
    });
  };

  const loadCourses = useCallback(async () => {
    const response = await fetch(`${API_URL}/courses`);
    if (!response.ok) throw new Error('Falha ao carregar cursos');
    const data = (await response.json()) as Course[];
    setCourses(data);
    setSelectedCourseId((current) => {
      if (current && data.some((course) => course.id === current)) {
        return current;
      }
      return data[0]?.id ?? '';
    });
    markUpdated();
  }, []);

  const loadRuns = useCallback(async () => {
    const response = await fetch(`${API_URL}/runs`);
    if (!response.ok) throw new Error('Falha ao carregar execuções');
    const data = (await response.json()) as CrawlRun[];
    setRuns(data);
    markUpdated();
  }, []);

  const fetchArtifactContent = useCallback(
    async (runId: string, path: string) => {
      const response = await fetch(
        `${API_URL}/runs/${runId}/artifacts/raw?path=${encodeURIComponent(path)}`,
      );
      if (!response.ok) {
        throw new Error('Falha ao carregar o arquivo Markdown');
      }
      return response.text();
    },
    [],
  );

  const loadArtifacts = useCallback(
    async (runId: string) => {
      setLoadingArtifacts(true);
      setMarkdownContent('');
      setSelectedArtifact(null);
      try {
        const response = await fetch(`${API_URL}/runs/${runId}/artifacts`);
        if (!response.ok) {
          throw new Error('Não foi possível listar os artefatos');
        }
        const files = (await response.json()) as ArtifactItem[];
        const markdownFiles = files.filter(
          (item) =>
            item.type === 'file' &&
            (item.path.endsWith('.md') || item.path.endsWith('.markdown')),
        );
        setArtifactList(markdownFiles);
        const firstFile = markdownFiles[0]?.path ?? null;
        setSelectedArtifact(firstFile);
        if (firstFile) {
          const text = await fetchArtifactContent(runId, firstFile);
          setMarkdownContent(text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro nos artefatos');
      } finally {
        setLoadingArtifacts(false);
      }
    },
    [fetchArtifactContent],
  );

  useEffect(() => {
    Promise.all([loadCourses(), loadRuns()]).catch((err) =>
      setError(err instanceof Error ? err.message : 'Erro inesperado'),
    );
  }, [loadCourses, loadRuns]);

  const filteredRuns = useMemo(
    () => runs.filter((run) => run.courseId === selectedCourseId),
    [runs, selectedCourseId],
  );

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedRun(null);
      setArtifactList([]);
      setMarkdownContent('');
      setSelectedArtifact(null);
      return;
    }
    const hasSelected = filteredRuns.some((run) => run.id === selectedRun);
    if (!hasSelected) {
      const preferredRun =
        filteredRuns.find((run) => Boolean(run.outputsDir)) ?? filteredRuns[0];
      if (preferredRun) {
        setSelectedRun(preferredRun.id);
        if (preferredRun.outputsDir) {
          void loadArtifacts(preferredRun.id);
        } else {
          setArtifactList([]);
          setMarkdownContent('');
          setSelectedArtifact(null);
        }
      } else {
        setSelectedRun(null);
        setArtifactList([]);
        setMarkdownContent('');
        setSelectedArtifact(null);
      }
    }
  }, [filteredRuns, selectedCourseId, selectedRun, loadArtifacts]);

  const handleRun = async () => {
    if (!selectedCourseId) {
      setError('Selecione um curso para disparar o crawler');
      return;
    }
    setLoadingRun(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/courses/${selectedCourseId}/runs`,
        {
          method: 'POST',
        },
      );
      if (!response.ok) {
        throw new Error('Falha ao agendar a execução');
      }
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoadingRun(false);
    }
  };

  const handleSelectRun = async (runId: string) => {
    setSelectedRun(runId);
    const runDetails = runs.find((run) => run.id === runId);
    if (!runDetails?.outputsDir) {
      setArtifactList([]);
      setMarkdownContent('');
      setSelectedArtifact(null);
      return;
    }
    await loadArtifacts(runId);
  };

  const handleSelectArtifact = async (path: string) => {
    if (!selectedRun) return;
    setSelectedArtifact(path);
    try {
      const text = await fetchArtifactContent(selectedRun, path);
      setMarkdownContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    }
  };

  const openModal = () => {
    if (!markdownContent) return;
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const startCreateCourse = () => {
    setEditingCourseId(null);
    setCourseForm(defaultCourseForm);
    setIsCourseFormOpen(true);
  };

  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name,
      baseUrl: course.baseUrl,
      username: course.username,
      password: '',
      targetUrls: course.targetUrls.join('\n'),
    });
    setIsCourseFormOpen(true);
  };

  const closeCourseForm = () => {
    setIsCourseFormOpen(false);
    setCourseForm(defaultCourseForm);
    setEditingCourseId(null);
  };

  const handleCourseInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setCourseForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCourseFormSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSavingCourse(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: courseForm.name.trim(),
        baseUrl: courseForm.baseUrl.trim(),
        username: courseForm.username.trim(),
      };
      const targets = normalizeTargets(courseForm.targetUrls);
      if (targets.length > 0) {
        payload.targetUrls = targets;
      }
      if (editingCourseId) {
        if (courseForm.password.trim()) {
          payload.password = courseForm.password.trim();
        }
        const response = await fetch(`${API_URL}/courses/${editingCourseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Falha ao atualizar curso');
        }
      } else {
        if (!courseForm.password.trim()) {
          throw new Error('Informe o login e a senha antes de salvar.');
        }
        payload.password = courseForm.password.trim();
        const response = await fetch(`${API_URL}/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Falha ao criar curso');
        }
      }
      await loadCourses();
      closeCourseForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar curso');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    const confirmation = window.confirm(
      `Remover o curso "${course?.name ?? courseId}"?`,
    );
    if (!confirmation) return;
    setDeletingCourseId(courseId);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Falha ao apagar curso');
      }
      await loadCourses();
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar curso');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const toggleCardCollapse = (cardId: CardId) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleCardDragStart = (event: DragEvent<HTMLElement>, cardId: CardId) => {
    setDraggingCard(cardId);
    setDragOverCard(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
  };

  const handleCardDragOver = (event: DragEvent<HTMLElement>, targetId: CardId) => {
    event.preventDefault();
    if (!draggingCard || draggingCard === targetId) {
      setDragOverCard(null);
      return;
    }
    setDragOverCard(targetId);
  };

  const handleCardDragLeave = (cardId: CardId) => {
    setDragOverCard((current) => (current === cardId ? null : current));
  };

  const handleCardDrop = (event: DragEvent<HTMLElement>, targetId: CardId) => {
    event.preventDefault();
    const fallbackId = event.dataTransfer.getData('text/plain') as
      | CardId
      | '';
    const sourceId = draggingCard ?? (fallbackId || null);
    if (!sourceId || sourceId === targetId) {
      setDraggingCard(null);
      setDragOverCard(null);
      return;
    }
    setCardOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId);
      const targetIndex = prev.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const updated = [...prev];
      updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, sourceId);
      return updated;
    });
    setDraggingCard(null);
    setDragOverCard(null);
  };

  const handleCardDragEnd = () => {
    setDraggingCard(null);
    setDragOverCard(null);
  };

  const selectedCourseDetails = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const selectedRunDetails = useMemo(
    () => runs.find((run) => run.id === selectedRun) ?? null,
    [runs, selectedRun],
  );

  const cardMetadata: Record<CardId, CardMetadata> = {
    courses: {
      title: 'Cursos cadastrados',
      description: 'Gerencie logins e URLs que alimentam o crawler.',
      icon: <Folder className="card-icon" />,
      actions: (
        <>
          <button
            type="button"
            className="ts-icon-button ghost"
            onClick={loadCourses}
            aria-label="Recarregar cursos"
          >
            <PlayCircle className="ts-icon" />
          </button>
          <button
            type="button"
            className="ts-icon-button primary"
            onClick={startCreateCourse}
            aria-label="Novo curso"
          >
            <span className="ts-icon-plus">+</span>
          </button>
        </>
      ),
    },
    runs: {
      title: 'Execuções do curso selecionado',
      description: selectedCourseDetails
        ? `${selectedCourseDetails.name} · ${selectedCourseDetails.baseUrl}`
        : 'Selecione um curso para visualizar execuções e disparar o crawler.',
      icon: <PlayCircle className="card-icon" />,
      actions: (
        <>
          <button
            type="button"
            className="ts-icon-button ghost"
            onClick={loadRuns}
            aria-label="Atualizar execuções"
          >
            <RotateCcw className="ts-icon" />
          </button>
          <button
            type="button"
            className="ts-icon-button primary"
            onClick={handleRun}
            disabled={loadingRun || !selectedCourseId}
            aria-label="Iniciar crawl"
          >
            {loadingRun ? (
              <Loader2 className="spinner ts-icon" />
            ) : (
              <PlayCircle className="ts-icon" />
            )}
          </button>
        </>
      ),
    },
    artifacts: {
      title: 'Artefatos Markdown',
      description: selectedRunDetails
        ? `Execução ${selectedRunDetails.id}`
        : 'Selecione uma execução para listar os arquivos.',
      icon: <FileText className="card-icon" />,
      actions: selectedRun ? (
        <button
          type="button"
          className="ts-icon-button ghost"
          onClick={() => {
            if (selectedRun) {
              void loadArtifacts(selectedRun);
            }
          }}
          disabled={loadingArtifacts}
          aria-label="Atualizar artefatos"
        >
          {loadingArtifacts ? (
            <Loader2 className="spinner ts-icon" />
          ) : (
            <RotateCcw className="ts-icon" />
          )}
        </button>
      ) : undefined,
    },
    markdown: {
      title: 'Prévia do Markdown',
      description: selectedArtifact
        ? selectedArtifact
        : 'Escolha um arquivo Markdown para visualizar.',
      icon: <FileText className="card-icon" />,
      actions:
        selectedArtifact && selectedRunDetails ? (
          <>
            <a
              href={`${API_URL}/runs/${selectedRunDetails.id}/artifacts/raw?path=${encodeURIComponent(selectedArtifact)}`}
              className="ts-icon-button ghost"
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir arquivo original"
            >
              <FolderOpen className="ts-icon" />
            </a>
            <button
              type="button"
              className="ts-icon-button ghost"
              onClick={openModal}
              disabled={!markdownContent}
              aria-label="Prévia em popup"
            >
              <Eye className="ts-icon" />
            </button>
          </>
        ) : null,
    },
  };

  const lastUpdatedLabel = useMemo(
    () =>
      lastUpdated
        ? lastUpdated.toLocaleString('pt-BR')
        : 'Aguardando atualização',
    [lastUpdated],
  );

  const renderCardBody = (cardId: CardId): ReactNode => {
    switch (cardId) {
      case 'courses':
        return (
          <>
            <div className="ts-status-row">
              <span className="ts-status-chip">
                <Clock className="ts-icon" />
                Atualizado em {lastUpdatedLabel}
              </span>
            </div>
            <div className="ts-table-wrapper">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Curso</th>
                    <th>Base URL</th>
                    <th>Login</th>
                    <th>Credenciais</th>
                    <th>Targets</th>
                    <th>Cadastro</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="placeholder">
                          Nenhum curso cadastrado. Clique em &quot;Novo
                          curso&quot; para começar.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    courses.map((course, index) => (
                      <tr
                        key={course.id}
                        className={
                          selectedCourseId === course.id ? 'selected-row' : ''
                        }
                      >
                        <td>{index + 1}</td>
                        <td>
                          <span className="ts-pill">{course.name}</span>
                        </td>
                        <td>
                          <span className="muted tiny">{course.baseUrl}</span>
                        </td>
                        <td>{course.username}</td>
                        <td>
                          <span
                            className={
                              course.hasPassword
                                ? 'status-badge success'
                                : 'status-badge warning'
                            }
                          >
                            {course.hasPassword ? 'Registrada' : 'Pendente'}
                          </span>
                        </td>
                        <td>
                          <span className="ts-counter">
                            {course.targetUrls.length}
                          </span>
                        </td>
                        <td>
                          {new Date(course.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <div className="ts-table-actions">
                            <button
                              type="button"
                              className="ts-icon-button ghost"
                              onClick={() => setSelectedCourseId(course.id)}
                              aria-label={`Selecionar ${course.name}`}
                            >
                              <CheckCircle2 className="ts-icon" />
                            </button>
                            <button
                              type="button"
                              className="ts-icon-button edit"
                              onClick={() => startEditCourse(course)}
                              aria-label={`Editar ${course.name}`}
                            >
                              <Edit3 className="ts-icon" />
                            </button>
                            <button
                              type="button"
                              className="ts-icon-button danger"
                              disabled={deletingCourseId === course.id}
                              onClick={() => handleDeleteCourse(course.id)}
                              aria-label={`Excluir ${course.name}`}
                            >
                              {deletingCourseId === course.id ? (
                                <Loader2 className="spinner ts-icon" />
                              ) : (
                                <Trash2 className="ts-icon" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {isCourseFormOpen && (
              <form className="course-form" onSubmit={handleCourseFormSubmit}>
                <div className="course-form-header">
                  <div>
                    <h3>
                      {editingCourseId
                        ? 'Editar curso'
                        : 'Novo curso para rastrear'}
                    </h3>
                    <p className="muted">
                      Login e senha serão usados apenas localmente pelo
                      crawler.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost"
                    onClick={closeCourseForm}
                  >
                    Cancelar
                  </button>
                </div>
                <div className="form-grid">
                  <label>
                    Nome
                    <input
                      name="name"
                      value={courseForm.name}
                      onChange={handleCourseInputChange}
                      required
                    />
                  </label>
                  <label>
                    Base URL
                    <input
                      name="baseUrl"
                      type="url"
                      value={courseForm.baseUrl}
                      onChange={handleCourseInputChange}
                      required
                    />
                  </label>
                  <label>
                    Login
                    <input
                      name="username"
                      value={courseForm.username}
                      onChange={handleCourseInputChange}
                      required
                    />
                  </label>
                  <label>
                    Senha
                    <input
                      name="password"
                      type="password"
                      value={courseForm.password}
                      onChange={handleCourseInputChange}
                      required={!editingCourseId}
                      placeholder={
                        editingCourseId
                          ? 'Preencha apenas se desejar atualizar'
                          : ''
                      }
                    />
                  </label>
                </div>
                <label>
                  URLs alvo (uma por linha ou separadas por vírgula)
                  <textarea
                    name="targetUrls"
                    value={courseForm.targetUrls}
                    onChange={handleCourseInputChange}
                    rows={3}
                  />
                </label>
                <div className="form-actions">
                  <button type="submit" disabled={savingCourse}>
                    {savingCourse ? 'Salvando...' : 'Salvar curso'}
                  </button>
                </div>
              </form>
            )}
          </>
        );
      case 'runs':
        if (!selectedCourseDetails) {
          return (
            <div className="placeholder">
              Selecione um curso para acompanhar as execuções.
            </div>
          );
        }
        return (
          <>
            <div className="course-meta">
              <span>Login: {selectedCourseDetails.username}</span>
              <span>
                Targets monitorados: {selectedCourseDetails.targetUrls.length}
              </span>
              <span>
                Criado em{' '}
                {new Date(selectedCourseDetails.createdAt).toLocaleDateString()}
              </span>
            </div>
            {filteredRuns.length === 0 ? (
              <div className="placeholder">
                Nenhuma execução encontrada para este curso.
              </div>
            ) : (
              <div className="ts-table-wrapper">
                <table className="ts-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Iniciada em</th>
                      <th>Artefatos</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.map((run) => (
                      <tr
                        key={run.id}
                        className={selectedRun === run.id ? 'selected-row' : ''}
                      >
                        <td>
                          <span className={`badge badge-${run.status}`}>
                            {run.status}
                          </span>
                        </td>
                        <td>{new Date(run.createdAt).toLocaleString()}</td>
                        <td>
                          {run.outputsDir ? (
                            <span className="status-badge success">
                              Disponível
                            </span>
                          ) : (
                            <span className="status-badge warning">
                              Aguardando
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="ts-icon-button"
                            onClick={() => handleSelectRun(run.id)}
                            aria-label={`Abrir artefatos da execução ${run.id}`}
                          >
                            <FolderOpen className="ts-icon" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      case 'artifacts':
        if (!selectedRun) {
          return (
            <div className="placeholder">
              Selecione uma execução para listar os arquivos.
            </div>
          );
        }
        if (loadingArtifacts) {
          return <div className="placeholder">Carregando artefatos...</div>;
        }
        if (artifactList.length === 0) {
          return (
            <div className="placeholder">
              Nenhum Markdown disponível para esta execução.
            </div>
          );
        }
        return (
          <div className="ts-table-wrapper">
            <table className="ts-table ts-table--compact">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th className="text-right">Ler</th>
                </tr>
              </thead>
              <tbody>
                {artifactList.map((artifact) => (
                  <tr
                    key={artifact.path}
                    className={
                      selectedArtifact === artifact.path ? 'selected-row' : ''
                    }
                  >
                    <td>{artifact.path}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="ts-icon-button"
                        onClick={() => handleSelectArtifact(artifact.path)}
                        aria-label={`Ver ${artifact.path}`}
                      >
                        <Eye className="ts-icon" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'markdown':
        return (
          <>
            {selectedRunDetails && (
              <p className="muted">
                Execução {selectedRunDetails.id} ·{' '}
                {new Date(selectedRunDetails.createdAt).toLocaleString()}
              </p>
            )}
            {markdownContent ? (
              <div className="markdown-viewer">
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="placeholder">
                {selectedRun
                  ? loadingArtifacts
                    ? 'Processando artefatos...'
                    : 'Selecione um arquivo Markdown para visualizar.'
                  : 'Selecione uma execução para liberar os artefatos.'}
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cadastre cursos, evite duplicidades e acompanhe as execuções com os
            artefatos gerados.
          </p>
          <a
            href={`${API_URL}/health`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Verificar API
          </a>
        </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="layout-controls">
        <button
          type="button"
          className="ts-icon-button"
          onClick={handleCollapseAllToggle}
          aria-label={allCollapsed ? 'Expandir todos' : 'Recolher todos'}
        >
          {allCollapsed ? (
            <ChevronsDownUp className="ts-icon" />
          ) : (
            <ChevronsUpDown className="ts-icon" />
          )}
        </button>
        <div className="layout-controls__columns">
          {columnOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              className={`layout-controls__col-btn ${
                columns === value ? 'active' : ''
              }`}
              onClick={() => setColumns(value)}
              aria-label={label}
              aria-pressed={columns === value}
            >
              <Icon className="ts-icon" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ts-icon-button"
          onClick={handleResetLayout}
          aria-label="Resetar layout"
        >
          <RotateCcw className="ts-icon" />
        </button>
      </div>

      <div
        className="ts-card-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(280px, 1fr))` }}
      >
        {cardOrder.map((cardId) => {
          const metadata = cardMetadata[cardId];
          if (!metadata) {
            return null;
          }
          return (
            <CollapsibleCard
              key={cardId}
              cardId={`course-crawler-${cardId}`}
              title={metadata.title}
              icon={metadata.icon}
              description={metadata.description}
              actions={metadata.actions}
              collapsed={collapsedCards[cardId]}
              onToggle={() => toggleCardCollapse(cardId)}
              draggable
              isDragging={draggingCard === cardId}
              isDragOver={dragOverCard === cardId}
              onDragStart={(event) => handleCardDragStart(event, cardId)}
              onDragEnd={handleCardDragEnd}
              onDragOver={(event) => handleCardDragOver(event, cardId)}
              onDrop={(event) => handleCardDrop(event, cardId)}
              onDragLeave={() => handleCardDragLeave(cardId)}
            >
              {renderCardBody(cardId)}
            </CollapsibleCard>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>{selectedArtifact ?? 'Prévia'}</h3>
                <p className="muted">
                  Arquivos físicos em `outputs/course-crawler`
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal}>
                Fechar
              </button>
            </div>
            <div className="modal-body">
              {markdownContent ? (
                <ReactMarkdown>{markdownContent}</ReactMarkdown>
              ) : (
                <div className="placeholder">Sem conteúdo carregado.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </Layout>
  );
}
