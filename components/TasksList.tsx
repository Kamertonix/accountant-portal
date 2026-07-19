'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePortal } from '@/lib/portal-context';
import Card from './Card';

interface AccountantTask {
  id: string;
  link_id: string | null;
  title: string;
  note: string;
  due_date: string | null;
  status: 'pending' | 'done';
}

function formatDate(text: string | null): string {
  if (!text) return '';
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function urgency(dueDate: string | null): 'overdue' | 'soon' | 'none' {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'none';
}

/// The accountant's own private task list — common across all
/// clients, not nested inside any one client's workspace. Each task
/// can optionally reference a client. NOT synced from the app, never
/// visible to any client.
export default function TasksList() {
  const { links } = usePortal();
  const [tasks, setTasks] = useState<AccountantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [forClient, setForClient] = useState('');
  const [adding, setAdding] = useState(false);

  const acceptedClients = links.filter((l) => l.status === 'accepted');
  const clientLabel = (linkId: string | null) => acceptedClients.find((l) => l.id === linkId)?.client_label ?? null;

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('accountant_tasks')
      .select('id, link_id, title, note, due_date, status')
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data as AccountantTask[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    const { data: userData } = await supabase.auth.getUser();
    const accountantId = userData.user?.id;
    if (accountantId) {
      await supabase.from('accountant_tasks').insert({
        accountant_id: accountantId,
        link_id: forClient || null,
        title: title.trim(),
        due_date: dueDate || null,
      });
      setTitle('');
      setDueDate('');
      setForClient('');
      await load();
    }
    setAdding(false);
  }

  async function toggleDone(task: AccountantTask) {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    await supabase.from('accountant_tasks').update({ status: nextStatus }).eq('id', task.id);
  }

  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('accountant_tasks').delete().eq('id', id);
  }

  const pending = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  function taskTone(task: AccountantTask): 'danger' | 'warning' | 'default' {
    const u = urgency(task.due_date);
    if (u === 'overdue') return 'danger';
    if (u === 'soon') return 'warning';
    return 'default';
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-textPrimary">Tasks</h1>
      <p className="mt-1 text-sm text-textSecondary">Your own reminders — never synced from any client&rsquo;s app, never visible to them.</p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task…"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
        />
        <select
          value={forClient}
          onChange={(e) => setForClient(e.target.value)}
          className="[color-scheme:dark] rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
        >
          <option value="">No specific client</option>
          {acceptedClients.map((l) => (
            <option key={l.id} value={l.id}>
              {l.client_label || 'Unnamed client'}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="[color-scheme:dark] rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
        />
        <button
          type="submit"
          disabled={adding || !title.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          <Plus size={16} /> Add
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-textMuted">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="mt-10 text-center text-sm text-textMuted">No tasks yet — add one above.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {pending.map((task) => {
            const tone = taskTone(task);
            const label = clientLabel(task.link_id);
            return (
              <Card key={task.id} tone={tone === 'default' ? undefined : tone} className="flex items-center gap-3">
                <input type="checkbox" checked={false} onChange={() => toggleDone(task)} className="h-4 w-4 accent-accent" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-textPrimary">{task.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    {label && <span className="font-semibold text-accentLight">{label}</span>}
                    {task.due_date && (
                      <span className={`font-semibold ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-textMuted'}`}>
                        {formatDate(task.due_date)}
                        {tone === 'overdue' ? '' : ''}
                        {urgency(task.due_date) === 'overdue' ? ' · Overdue' : urgency(task.due_date) === 'soon' ? ' · Due soon' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(task.id)} className="text-textMuted transition hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </Card>
            );
          })}
          {done.length > 0 && (
            <>
              <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-textMuted">Done</p>
              {done.map((task) => (
                <Card key={task.id} className="flex items-center gap-3 opacity-60">
                  <input type="checkbox" checked onChange={() => toggleDone(task)} className="h-4 w-4 accent-success" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-textPrimary line-through">{task.title}</p>
                    {clientLabel(task.link_id) && <p className="text-xs text-textMuted">{clientLabel(task.link_id)}</p>}
                  </div>
                  <button onClick={() => remove(task.id)} className="text-textMuted transition hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
