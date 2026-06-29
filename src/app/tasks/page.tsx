"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Task = {
  id: number;
  title: string;
  estimatedTime: string;
  emotionalIntensity: string;
  dueDate: string;
  completed: number;
  sortOrder: number;
  parentId: number | null;
  recurrence: string;
};

type ViewMode = 'all' | 'today' | 'week';

function parseTimeStr(timeStr: string) {
  if (!timeStr) return { value: '15', unit: 'mins' };
  const num = parseInt(timeStr, 10);
  if (isNaN(num)) return { value: '15', unit: 'mins' };
  const unit = timeStr.toLowerCase().includes('hour') || timeStr.toLowerCase().includes('hr') ? 'hours' : 'mins';
  return { value: String(num), unit };
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewMode>('all');
  
  // Add top-level task form state
  const [title, setTitle] = useState('');
  const [timeValue, setTimeValue] = useState('15');
  const [timeUnit, setTimeUnit] = useState('mins');
  const [intensity, setIntensity] = useState('Low');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  
  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimatedTime, setEditEstimatedTime] = useState('');
  const [editIntensity, setEditIntensity] = useState('Low');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurrence, setEditRecurrence] = useState('none');
  
  // Add sub-step state
  const [addingSubToTaskId, setAddingSubToTaskId] = useState<number | null>(null);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [subTaskTimeValue, setSubTaskTimeValue] = useState('15');
  const [subTaskTimeUnit, setSubTaskTimeUnit] = useState('mins');
  const [subTaskIntensity, setSubTaskIntensity] = useState('Low');
  const [subTaskDueDate, setSubTaskDueDate] = useState('');
  const [subTaskRecurrence, setSubTaskRecurrence] = useState('none');

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tasks: [{ 
          title, 
          estimatedTime: `${timeValue} ${timeUnit}`, 
          emotionalIntensity: intensity,
          dueDate: dueDate || null,
          recurrence,
          parentId: null
        }] 
      })
    });
    
    setTitle('');
    setTimeValue('15');
    setTimeUnit('mins');
    setIntensity('Low');
    setDueDate('');
    setRecurrence('none');
    fetchTasks();
  }

  async function handleAddSub(parentId: number) {
    if (!subTaskTitle.trim()) return;
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: [{
          title: subTaskTitle,
          estimatedTime: `${subTaskTimeValue} ${subTaskTimeUnit}`,
          emotionalIntensity: subTaskIntensity,
          dueDate: subTaskDueDate || null,
          recurrence: subTaskRecurrence,
          parentId
        }]
      })
    });
    
    setSubTaskTitle('');
    setSubTaskTimeValue('15');
    setSubTaskTimeUnit('mins');
    setSubTaskIntensity('Low');
    setSubTaskDueDate('');
    setSubTaskRecurrence('none');
    setAddingSubToTaskId(null);
    fetchTasks();
  }

  async function toggleComplete(id: number, currentStatus: number) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: currentStatus ? 0 : 1 })
    });
    fetchTasks();
  }

  async function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditEstimatedTime(task.estimatedTime || '');
    setEditIntensity(task.emotionalIntensity || 'Low');
    setEditDueDate(task.dueDate || '');
    setEditRecurrence(task.recurrence || 'none');
  }

  async function handleSaveEdit(id: number) {
    if (!editTitle.trim()) return;
    
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        estimatedTime: editEstimatedTime,
        emotionalIntensity: editIntensity,
        dueDate: editDueDate || null,
        recurrence: editRecurrence
      })
    });
    
    setEditingTaskId(null);
    fetchTasks();
  }

  async function handleClearCompleted() {
    if (!confirm("Are you sure you want to clear completed tasks?")) return;
    try {
      const res = await fetch('/api/tasks', { method: 'DELETE' });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Failed to clear completed tasks:", err);
    }
  }

  async function moveParentTask(parentIndex: number, direction: 'up' | 'down') {
    const parentTasks = tasks.filter(t => !t.parentId);
    const targetIndex = direction === 'up' ? parentIndex - 1 : parentIndex + 1;
    if (targetIndex < 0 || targetIndex >= parentTasks.length) return;
    
    const temp = parentTasks[parentIndex];
    parentTasks[parentIndex] = parentTasks[targetIndex];
    parentTasks[targetIndex] = temp;
    
    // Rebuild order maintaining subtasks underneath their parents
    const subTasks = tasks.filter(t => t.parentId);
    const rebuiltTasks: Task[] = [];
    parentTasks.forEach(pt => {
      rebuiltTasks.push(pt);
      subTasks.filter(st => st.parentId === pt.id).forEach(st => rebuiltTasks.push(st));
    });
    
    setTasks(rebuiltTasks);
    
    try {
      const orderedIds = rebuiltTasks.map(t => t.id);
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      console.error("Reorder parents failed:", err);
      fetchTasks();
    }
  }

  async function moveSubTask(parentId: number, subIndex: number, direction: 'up' | 'down') {
    const parentTasks = tasks.filter(t => !t.parentId);
    const subTasks = tasks.filter(t => t.parentId);
    const siblingSubTasks = subTasks.filter(st => st.parentId === parentId);
    
    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblingSubTasks.length) return;
    
    const temp = siblingSubTasks[subIndex];
    siblingSubTasks[subIndex] = siblingSubTasks[targetIndex];
    siblingSubTasks[targetIndex] = temp;
    
    const rebuiltTasks: Task[] = [];
    parentTasks.forEach(pt => {
      rebuiltTasks.push(pt);
      if (pt.id === parentId) {
        siblingSubTasks.forEach(st => rebuiltTasks.push(st));
      } else {
        subTasks.filter(st => st.parentId === pt.id).forEach(st => rebuiltTasks.push(st));
      }
    });
    
    setTasks(rebuiltTasks);
    
    try {
      const orderedIds = rebuiltTasks.map(t => t.id);
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (err) {
      console.error("Reorder subtasks failed:", err);
      fetchTasks();
    }
  }

  // Calendar Link Helpers
  function formatDateTimeForGoogle(dateStr: string) {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function getCalendarUrls(t: Task) {
    const titleStr = encodeURIComponent(`Momentum: ${t.title}`);
    const details = encodeURIComponent(
      `Coping Grounding Task.\nEstimated time: ${t.estimatedTime || 'N/A'}\nEmotional Cost/Intensity: ${t.emotionalIntensity || 'N/A'}\nRepeat: ${t.recurrence || 'none'}`
    );
    
    const startDate = t.dueDate ? formatDateTimeForGoogle(t.dueDate) : formatDateTimeForGoogle(new Date().toISOString());
    const endDate = t.dueDate 
      ? formatDateTimeForGoogle(new Date(new Date(t.dueDate).getTime() + 30 * 60 * 1000).toISOString())
      : formatDateTimeForGoogle(new Date(new Date().getTime() + 30 * 60 * 1000).toISOString());

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleStr}&dates=${startDate}/${endDate}&details=${details}`;
    
    const startIso = t.dueDate ? new Date(t.dueDate).toISOString() : new Date().toISOString();
    const endIso = new Date(new Date(startIso).getTime() + 30 * 60 * 1000).toISOString();
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${titleStr}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&body=${details}`;

    return { googleUrl, outlookUrl };
  }

  function downloadAppleIcs(t: Task) {
    const startIso = t.dueDate ? new Date(t.dueDate).toISOString() : new Date().toISOString();
    const endIso = new Date(new Date(startIso).getTime() + 30 * 60 * 1000).toISOString();
    
    const startFormatted = startIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endFormatted = endIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Momentum//NONSGML Mental Wellness App//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Momentum: ${t.title}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `DESCRIPTION:Coping Grounding Task.\\nEstimated time: ${t.estimatedTime || 'N/A'}\\nEmotional Cost/Intensity: ${t.emotionalIntensity || 'N/A'}\\nRepeat: ${t.recurrence || 'none'}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `momentum-${t.title.replace(/\s+/g, '-').toLowerCase().substring(0, 20)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function CalendarDropdown({ task }: { task: Task }) {
    const [open, setOpen] = useState(false);
    const urls = getCalendarUrls(task);

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button 
          type="button" 
          onClick={() => setOpen(!open)}
          className="secondary"
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', margin: 0 }}
        >
          <span>📅 Add to Calendar</span>
          <span style={{ fontSize: '0.5rem' }}>▼</span>
        </button>
        {open && (
          <div style={{ 
            position: 'absolute', right: 0, marginTop: '0.25rem', backgroundColor: '#fff', 
            border: '1px solid var(--border)', borderRadius: 'var(--radius)', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', 
            flexDirection: 'column', width: '160px', padding: '0.25rem 0'
          }}>
            <a 
              href={urls.googleUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#444', textDecoration: 'none' }}
              className="calendar-link"
            >
              Google Calendar
            </a>
            <a 
              href={urls.outlookUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#444', textDecoration: 'none' }}
              className="calendar-link"
            >
              Outlook
            </a>
            <button 
              type="button"
              onClick={() => {
                downloadAppleIcs(task);
                setOpen(false);
              }}
              style={{ 
                textAlign: 'left', padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#444',
                background: 'none', border: 'none', width: '100%', cursor: 'pointer', borderRadius: 0
              }}
              className="calendar-link"
            >
              Apple Calendar (.ics)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter Helpers for views
  const isDateToday = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    return today.getFullYear() === d.getFullYear() &&
           today.getMonth() === d.getMonth() &&
           today.getDate() === d.getDate();
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter(t => {
      if (t.recurrence === 'daily' || t.recurrence === 'twice-daily') return true;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return date.getFullYear() === d.getFullYear() &&
             date.getMonth() === d.getMonth() &&
             date.getDate() === d.getDate();
    });
  };

  const getDayLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
      return "Today";
    }
    if (date.getFullYear() === tomorrow.getFullYear() && date.getMonth() === tomorrow.getMonth() && date.getDate() === tomorrow.getDate()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Generate next 7 days list
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  // Separate parent and child tasks for 'all' view
  const parentTasks = tasks.filter(t => !t.parentId);
  const subTasks = tasks.filter(t => t.parentId);

  // Flat list of today's tasks
  const todayTasks = tasks.filter(t => isDateToday(t.dueDate) || t.recurrence === 'daily' || t.recurrence === 'twice-daily');

  return (
    <div style={{ padding: '2rem 0', maxWidth: '850px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--sage-green)', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 600, margin: 0 }}>Action Planner</h1>
          <p style={{ fontSize: '1.1rem', color: '#555', margin: '0.5rem 0 0 0' }}>Manage, reorder, and schedule the gentle steps generated from your worries.</p>
          <Link href="/" style={{ color: 'var(--soft-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '1rem' }}>&larr; Back to Dashboard</Link>
        </div>
        {tasks.some(t => t.completed) && (
          <button 
            type="button" 
            onClick={handleClearCompleted}
            className="secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', transition: 'all 0.2s', margin: 0 }}
          >
            🧹 Clear Completed
          </button>
        )}
      </header>

      {/* View Switcher Menu */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          onClick={() => setActiveView('all')}
          style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '0.9rem', 
            backgroundColor: activeView === 'all' ? 'var(--sage-green)' : 'transparent',
            color: activeView === 'all' ? '#fff' : '#666',
            border: activeView === 'all' ? 'none' : '1px solid var(--border)',
            fontWeight: 600
          }}
        >
          📋 By Task View (List)
        </button>
        <button 
          type="button" 
          onClick={() => setActiveView('today')}
          style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '0.9rem', 
            backgroundColor: activeView === 'today' ? 'var(--sage-green)' : 'transparent',
            color: activeView === 'today' ? '#fff' : '#666',
            border: activeView === 'today' ? 'none' : '1px solid var(--border)',
            fontWeight: 600
          }}
        >
          📅 Today's View
        </button>
        <button 
          type="button" 
          onClick={() => setActiveView('week')}
          style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '0.9rem', 
            backgroundColor: activeView === 'week' ? 'var(--sage-green)' : 'transparent',
            color: activeView === 'week' ? '#fff' : '#666',
            border: activeView === 'week' ? 'none' : '1px solid var(--border)',
            fontWeight: 600
          }}
        >
          🗓️ Weekly Agenda View
        </button>
      </div>

      {/* Manual Parent Task Add Form */}
      {activeView === 'all' && (
        <form onSubmit={handleAdd} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>New Action / Project</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Prepare for project presentation" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Time span</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <input 
                type="number" 
                min="1"
                value={timeValue} 
                onChange={(e) => setTimeValue(e.target.value)} 
                style={{ width: '60px', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} 
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: '#fff' }}
              >
                <option value="mins">Mins</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
          <div style={{ width: '100px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Intensity</label>
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: 'white' }}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div style={{ width: '160px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Due Date & Time</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: 'white' }} />
          </div>
          <div style={{ width: '110px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Repeat</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: 'white' }}>
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="twice-daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '0.75rem 1.5rem' }}>Add Project</button>
        </form>
      )}

      {loading ? (
        <p>Loading your gently actionable tasks...</p>
      ) : (
        <>
          {/* ALL TASKS (BY TASK) VIEW */}
          {activeView === 'all' && (
            parentTasks.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                <p style={{ color: '#888', fontSize: '1.1rem' }}>You have no projects or actions yet. Visit the Vaults or add one above!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
                {parentTasks.map((pt, parentIndex) => {
                  const currentChildren = subTasks.filter(st => st.parentId === pt.id);
                  const isEditing = editingTaskId === pt.id;

                  return (
                    <div key={pt.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Parent Task Container */}
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', 
                        backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        opacity: pt.completed ? 0.6 : 1, transition: 'opacity 0.2s'
                      }}>
                        {/* Reordering column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <button 
                            type="button" 
                            onClick={() => moveParentTask(parentIndex, 'up')} 
                            disabled={parentIndex === 0 || !!pt.completed}
                            style={{ background: 'none', border: 'none', color: parentIndex === 0 || !!pt.completed ? '#e2e8f0' : '#888', cursor: 'pointer', padding: '0.1rem 0.2rem', fontSize: '0.85rem' }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button 
                            type="button" 
                            onClick={() => moveParentTask(parentIndex, 'down')} 
                            disabled={parentIndex === parentTasks.length - 1 || !!pt.completed}
                            style={{ background: 'none', border: 'none', color: parentIndex === parentTasks.length - 1 || !!pt.completed ? '#e2e8f0' : '#888', cursor: 'pointer', padding: '0.1rem 0.2rem', fontSize: '0.85rem' }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        <input type="checkbox" checked={!!pt.completed} onChange={() => toggleComplete(pt.id, pt.completed)} style={{ width: '1.4rem', height: '1.4rem', cursor: 'pointer', accentColor: 'var(--sage-green)' }} />
                        
                        {isEditing ? (
                          /* Editing Form fields */
                          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: '2 1 200px' }}>
                              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                            </div>
                            <div style={{ width: '140px' }}>
                              {(() => {
                                const parsed = parseTimeStr(editEstimatedTime);
                                return (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <input 
                                      type="number" 
                                      min="1"
                                      value={parsed.value} 
                                      onChange={e => setEditEstimatedTime(`${e.target.value} ${parsed.unit}`)} 
                                      style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} 
                                    />
                                    <select
                                      value={parsed.unit}
                                      onChange={e => setEditEstimatedTime(`${parsed.value} ${e.target.value}`)}
                                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                                    >
                                      <option value="mins">Mins</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>
                                );
                              })()}
                            </div>
                            <div style={{ width: '90px' }}>
                              <select value={editIntensity} onChange={(e) => setEditIntensity(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                              </select>
                            </div>
                            <div style={{ width: '160px' }}>
                              <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                            </div>
                            <div style={{ width: '95px' }}>
                              <select value={editRecurrence} onChange={(e) => setEditRecurrence(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                <option value="none">Once</option>
                                <option value="daily">Daily</option>
                                <option value="twice-daily">Twice Daily</option>
                                <option value="weekly">Weekly</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button type="button" onClick={() => handleSaveEdit(pt.id)} style={{ padding: '0.5rem 1rem' }}>Save</button>
                              <button type="button" onClick={() => setEditingTaskId(null)} className="secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          /* Display Layout */
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ 
                                fontSize: '1.15rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', 
                                textDecoration: pt.completed ? 'line-through' : 'none', color: pt.completed ? '#888' : 'var(--foreground)'
                              }}>
                                {pt.title}
                              </span>
                              <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ backgroundColor: '#f0f4f8', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>⏱ {pt.estimatedTime || 'N/A'}</span>
                                <span style={{ backgroundColor: '#edf2f7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>Intensity: {pt.emotionalIntensity || 'N/A'}</span>
                                {pt.dueDate && (
                                  <span style={{ backgroundColor: '#fff0f0', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                    📅 By {new Date(pt.dueDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                )}
                                {pt.recurrence && pt.recurrence !== 'none' && (
                                  <span style={{ backgroundColor: '#fdf4e3', padding: '0.2rem 0.6rem', borderRadius: '12px', color: '#b45309', fontWeight: 600 }}>
                                    🔁 {pt.recurrence === 'daily' ? 'Daily' : 'Weekly'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Parent Actions */}
                            {!pt.completed && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setAddingSubToTaskId(addingSubToTaskId === pt.id ? null : pt.id);
                                    setSubTaskTitle('');
                                  }}
                                  className="secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  + Add Sub-step
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => startEdit(pt)}
                                  className="secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                  ✏️ Edit
                                </button>
                                <CalendarDropdown task={pt} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-steps container (indented) */}
                      {(currentChildren.length > 0 || addingSubToTaskId === pt.id) && (
                        <div style={{ 
                          marginLeft: '2.5rem', 
                          paddingLeft: '1rem', 
                          borderLeft: '2px dashed var(--border)',
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.5rem',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          {currentChildren.map((st, subIndex) => {
                            const isSubEditing = editingTaskId === st.id;

                            return (
                              <div key={st.id} style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', 
                                backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                                opacity: st.completed ? 0.6 : 1
                              }}>
                                {/* Reordering subtask column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                                  <button 
                                    type="button" 
                                    onClick={() => moveSubTask(pt.id, subIndex, 'up')} 
                                    disabled={subIndex === 0 || !!st.completed}
                                    style={{ background: 'none', border: 'none', color: subIndex === 0 || !!st.completed ? '#e2e8f0' : '#888', cursor: 'pointer', padding: '0 0.1rem', fontSize: '0.75rem' }}
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => moveSubTask(pt.id, subIndex, 'down')} 
                                    disabled={subIndex === currentChildren.length - 1 || !!st.completed}
                                    style={{ background: 'none', border: 'none', color: subIndex === currentChildren.length - 1 || !!st.completed ? '#e2e8f0' : '#888', cursor: 'pointer', padding: '0 0.1rem', fontSize: '0.75rem' }}
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>

                                <input type="checkbox" checked={!!st.completed} onChange={() => toggleComplete(st.id, st.completed)} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--sage-green)' }} />
                                
                                {isSubEditing ? (
                                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div style={{ flex: '2 1 150px' }}>
                                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                    </div>
                                    <div style={{ width: '140px' }}>
                                      {(() => {
                                        const parsed = parseTimeStr(editEstimatedTime);
                                        return (
                                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <input 
                                              type="number" 
                                              min="1"
                                              value={parsed.value} 
                                              onChange={e => setEditEstimatedTime(`${e.target.value} ${parsed.unit}`)} 
                                              style={{ width: '60px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} 
                                            />
                                            <select
                                              value={parsed.unit}
                                              onChange={e => setEditEstimatedTime(`${parsed.value} ${e.target.value}`)}
                                              style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                                            >
                                              <option value="mins">Mins</option>
                                              <option value="hours">Hours</option>
                                            </select>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div style={{ width: '80px' }}>
                                      <select value={editIntensity} onChange={(e) => setEditIntensity(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                      </select>
                                    </div>
                                    <div style={{ width: '150px' }}>
                                      <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                    </div>
                                    <div style={{ width: '90px' }}>
                                      <select value={editRecurrence} onChange={(e) => setEditRecurrence(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                        <option value="none">Once</option>
                                        <option value="daily">Daily</option>
                                        <option value="twice-daily">Twice Daily</option>
                                        <option value="weekly">Weekly</option>
                                      </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button type="button" onClick={() => handleSaveEdit(st.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Save</button>
                                      <button type="button" onClick={() => setEditingTaskId(null)} className="secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                      <span style={{ 
                                        fontSize: '0.95rem', fontWeight: 500, display: 'block', marginBottom: '0.2rem',
                                        textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? '#888' : 'var(--foreground)'
                                      }}>
                                        {st.title}
                                      </span>
                                      <div style={{ fontSize: '0.75rem', color: '#777', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ backgroundColor: '#f0f4f8', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>⏱ {st.estimatedTime}</span>
                                        <span style={{ backgroundColor: '#edf2f7', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>Intensity: {st.emotionalIntensity}</span>
                                        {st.dueDate && (
                                          <span style={{ backgroundColor: '#fff0f0', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                                            📅 By {new Date(st.dueDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                          </span>
                                        )}
                                        {st.recurrence && st.recurrence !== 'none' && (
                                          <span style={{ backgroundColor: '#fdf4e3', padding: '0.1rem 0.3rem', borderRadius: '8px', color: '#b45309', fontWeight: 600 }}>
                                            🔁 {st.recurrence === 'daily' ? 'Daily' : 'Weekly'}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {!st.completed && (
                                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                        <button 
                                          type="button" 
                                          onClick={() => startEdit(st)}
                                          className="secondary"
                                          style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', margin: 0 }}
                                        >
                                          ✏️ Edit
                                        </button>
                                        <CalendarDropdown task={st} />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add subtask input box */}
                          {addingSubToTaskId === pt.id && (
                            <div style={{ 
                              display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', 
                              backgroundColor: '#f8fafc', border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
                              alignItems: 'flex-end', animation: 'fadeIn 0.2s ease'
                            }}>
                              <div style={{ flex: '2 1 150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Sub-step title</label>
                                <input type="text" value={subTaskTitle} onChange={e => setSubTaskTitle(e.target.value)} placeholder="E.g., Outline slide deck" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }} />
                              </div>
                              <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Time span</label>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={subTaskTimeValue} 
                                    onChange={e => setSubTaskTimeValue(e.target.value)} 
                                    style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }} 
                                  />
                                  <select
                                    value={subTaskTimeUnit}
                                    onChange={e => setSubTaskTimeUnit(e.target.value)}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                                  >
                                    <option value="mins">Mins</option>
                                    <option value="hours">Hours</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ width: '80px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Intensity</label>
                                <select value={subTaskIntensity} onChange={e => setSubTaskIntensity(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                  <option>Low</option>
                                  <option>Medium</option>
                                  <option>High</option>
                                </select>
                              </div>
                              <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Due Date & Time</label>
                                <input type="datetime-local" value={subTaskDueDate} onChange={e => setSubTaskDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }} />
                              </div>
                              <div style={{ width: '90px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Repeat</label>
                                <select value={subTaskRecurrence} onChange={e => setSubTaskRecurrence(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                  <option value="none">Once</option>
                                  <option value="daily">Daily</option>
                                  <option value="twice-daily">Twice Daily</option>
                                  <option value="weekly">Weekly</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button type="button" onClick={() => handleAddSub(pt.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Add</button>
                                <button type="button" onClick={() => setAddingSubToTaskId(null)} className="secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TODAY'S VIEW */}
          {activeView === 'today' && (
            todayTasks.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍃</div>
                <p style={{ color: '#888', fontSize: '1.15rem', lineHeight: '1.6', maxWidth: '300px', marginInline: 'auto' }}>
                  No tasks scheduled for today. Take a deep breath and enjoy the quiet space.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#4a5d4e', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Today's Agenda ({new Date().toLocaleDateString(undefined, { dateStyle: 'long' })})
                </h3>
                {todayTasks.map(t => {
                  const parentTask = t.parentId ? tasks.find(pt => pt.id === t.parentId) : null;
                  
                  return (
                    <div key={t.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', 
                      backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', 
                      opacity: t.completed ? 0.6 : 1
                    }}>
                      <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t.id, t.completed)} style={{ width: '1.4rem', height: '1.4rem', cursor: 'pointer', accentColor: 'var(--sage-green)' }} />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ 
                          fontSize: '1.1rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem', 
                          textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#888' : 'var(--foreground)'
                        }}>
                          {parentTask ? `${parentTask.title} ➜ ` : ''}{t.title}
                        </span>
                        <div style={{ fontSize: '0.8rem', color: '#777', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ backgroundColor: '#f0f4f8', padding: '0.15rem 0.5rem', borderRadius: '8px' }}>⏱ {t.estimatedTime}</span>
                          <span style={{ backgroundColor: '#edf2f7', padding: '0.15rem 0.5rem', borderRadius: '8px' }}>Intensity: {t.emotionalIntensity}</span>
                          {t.recurrence && t.recurrence !== 'none' && (
                            <span style={{ backgroundColor: '#fdf4e3', padding: '0.15rem 0.5rem', borderRadius: '8px', color: '#b45309', fontWeight: 600 }}>🔁 {t.recurrence}</span>
                          )}
                        </div>
                      </div>
                      
                      {!t.completed && <CalendarDropdown task={t} />}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* WEEKLY AGENDA VIEW */}
          {activeView === 'week' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
              {next7Days.map((day, idx) => {
                const dayTasks = getTasksForDay(day);
                
                return (
                  <div key={idx} style={{ 
                    backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border)', boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                  }}>
                    <h4 style={{ 
                      fontSize: '1.15rem', color: '#4a5d4e', borderBottom: '1px solid #f0f0f0', 
                      paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 600 
                    }}>
                      {getDayLabel(day)}
                    </h4>
                    
                    {dayTasks.length === 0 ? (
                      <p style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic', margin: '0.5rem 0' }}>No tasks scheduled.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {dayTasks.map(t => {
                          const parentTask = t.parentId ? tasks.find(pt => pt.id === t.parentId) : null;
                          
                          return (
                            <div key={t.id} style={{ 
                              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', 
                              backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0',
                              opacity: t.completed ? 0.6 : 1
                            }}>
                              <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t.id, t.completed)} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--sage-green)' }} />
                              
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ 
                                  fontSize: '0.98rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem', 
                                  textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#888' : 'var(--foreground)'
                                }}>
                                  {parentTask ? `${parentTask.title} ➜ ` : ''}{t.title}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#777', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span>⏱ {t.estimatedTime}</span>
                                  <span>•</span>
                                  <span>Intensity: {t.emotionalIntensity}</span>
                                  {t.recurrence && t.recurrence !== 'none' && (
                                    <>
                                      <span>•</span>
                                      <span style={{ color: '#b45309' }}>🔁 {t.recurrence}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-link { display: block; width: 100%; transition: background-color 0.2s; box-sizing: border-box; }
        .calendar-link:hover { background-color: #f0f7f4; color: var(--foreground) !important; }
      `}} />
    </div>
  );
}
