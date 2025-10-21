import { useState } from 'react';
import { PlusCircle, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleList } from '@/components/schedules/ScheduleList';
import { ScheduleEditor } from '@/components/schedules/ScheduleEditor';
import { ScheduleStatus } from '@/components/schedules/ScheduleStatus';
import {
  useCreateSchedule,
  useDeleteSchedule,
  useSchedules,
  useTemplates,
  useToggleSchedule,
  useUpdateSchedule
} from '@/hooks/useWebScraper';
import type { JobSchedule, ScheduleInput } from '@/types';

export function SchedulesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<JobSchedule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const schedulesQuery = useSchedules();
  const templatesQuery = useTemplates();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const toggleSchedule = useToggleSchedule();

  const schedules = schedulesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const handleCreate = async (payload: ScheduleInput) => {
    await createSchedule.mutateAsync(payload);
  };

  const handleUpdate = async (scheduleId: string, payload: Partial<ScheduleInput>) => {
    await updateSchedule.mutateAsync({ scheduleId, payload });
  };

  const handleDelete = (scheduleId: string) => {
    setDeletingId(scheduleId);
    deleteSchedule.mutate(scheduleId, {
      onSettled: () => setDeletingId(null)
    });
  };

  const handleToggle = (scheduleId: string) => {
    setTogglingId(scheduleId);
    toggleSchedule.mutate(scheduleId, {
      onSettled: () => setTogglingId(null)
    });
  };

  const busy = createSchedule.isPending || updateSchedule.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Schedules</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Automate recurring scraping and crawling jobs with cron, interval, or one-time execution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={statusOpen ? 'secondary' : 'ghost'}
            onClick={() => setStatusOpen(prev => !prev)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {statusOpen ? 'Hide status' : 'Show status'}
          </Button>
          <Button
            onClick={() => {
              setEditingSchedule(null);
              setEditorOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New schedule
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Manage schedules</CardTitle>
            <CardDescription>Search, edit, enable/disable, and delete schedule definitions.</CardDescription>
          </div>
          <div className="flex w-full max-w-sm items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search schedules..."
              className="border-none bg-transparent p-0 focus-visible:ring-0"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScheduleList
            schedules={schedules}
            isLoading={schedulesQuery.isLoading}
            searchTerm={searchTerm}
            onEdit={schedule => {
              setEditingSchedule(schedule);
              setEditorOpen(true);
            }}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onViewHistory={scheduleId => navigate(`/history?scheduleId=${scheduleId}`)}
            deletingId={deletingId}
            togglingId={togglingId}
          />
        </CardContent>
      </Card>

      {statusOpen && (
        <ScheduleStatus
          schedules={schedules}
          isLoading={schedulesQuery.isLoading}
        />
      )}

      <ScheduleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        schedule={editingSchedule}
        templates={templates}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isSubmitting={busy}
      />
    </div>
  );
}
