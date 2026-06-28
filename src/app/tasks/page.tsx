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
};

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add top-level task form state
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [intensity, setIntensity] = useState('Low');
  const [dueDate, setDueDate] = useState('');
  
  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimatedTime, setEditEstimatedTime] = useState('');
  const [editIntensity, setEditIntensity] = useState('Low');
  const [editDueDate, setEditDueDate] = useState('');
  
  // Add sub-step state
  const [addingSubToTaskId, setAddingSubToTaskId] = useState<number | null>(null);
  const [subTaskTitle, setSubTaskTitle] = useState('');
  const [subTaskTime, setSubTaskTime] = useState('');
  const [subTaskIntensity, setSubTaskIntensity] = useState('Low');
  const [subTaskDueDate, setSubTaskDueDate] = useState('');

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
          estimatedTime: estimatedTime || '15 mins', 
          emotionalIntensity: intensity,
          dueDate: dueDate || null,
          parentId: null
        }] 
      })
    });
    
    setTitle('');
    setEstimatedTime('');
    setIntensity('Low');
    setDueDate('');
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
          estimatedTime: subTaskTime || '10 mins',
          emotionalIntensity: subTaskIntensity,
          dueDate: subTaskDueDate || null,
          parentId
        }]
      })
    });
    
    setSubTaskTitle('');
    setSubTaskTime('');
    setSubTaskIntensity('Low');
    setSubTaskDueDate('');
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
        dueDate: editDueDate || null
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
      `Coping Grounding Task.\nEstimated time: ${t.estimatedTime || 'N/A'}\nEmotional Cost/Intensity: ${t.emotionalIntensity || 'N/A'}`
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
      `DESCRIPTION:Coping Grounding Task.\\nEstimated time: ${t.estimatedTime || 'N/A'}\\nEmotional Cost/Intensity: ${t.emotionalIntensity || 'N/A'}`,
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

  // Separate parent and child tasks
  const parentTasks = tasks.filter(t => !t.parentId);
  const subTasks = tasks.filter(t => t.parentId);

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

      {/* Manual Parent Task Add */}
      <form onSubmit={handleAdd} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>New Action / Project</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Prepare for project presentation" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ width: '120px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Time span</label>
          <input type="text" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="1 hr" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ width: '120px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Intensity</label>
          <select value={intensity} onChange={(e) => setIntensity(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: 'white' }}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Due Date & Time</label>
          <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: 'white' }} />
        </div>
        <button type="submit" style={{ padding: '0.75rem 1.5rem' }}>Add Project</button>
      </form>

      {loading ? (
        <p>Loading your gently actionable tasks...</p>
      ) : parentTasks.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>You have no projects or actions yet. Visit the Worry Vault or add one above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                      <div style={{ width: '100px' }}>
                        <input type="text" value={editEstimatedTime} onChange={(e) => setEditEstimatedTime(e.target.value)} placeholder="Time" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      </div>
                      <div style={{ width: '100px' }}>
                        <select value={editIntensity} onChange={(e) => setEditIntensity(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </div>
                      <div style={{ width: '170px' }}>
                        <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
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
                              <div style={{ width: '80px' }}>
                                <input type="text" value={editEstimatedTime} onChange={(e) => setEditEstimatedTime(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
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
                        <div style={{ width: '90px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Time span</label>
                          <input type="text" value={subTaskTime} onChange={e => setSubTaskTime(e.target.value)} placeholder="15 mins" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }} />
                        </div>
                        <div style={{ width: '90px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Intensity</label>
                          <select value={subTaskIntensity} onChange={e => setSubTaskIntensity(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                        </div>
                        <div style={{ width: '160px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: '#555' }}>Due Date & Time</label>
                          <input type="datetime-local" value={subTaskDueDate} onChange={e => setSubTaskDueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: '#fff' }} />
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
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-link { display: block; width: 100%; transition: background-color 0.2s; box-sizing: border-box; }
        .calendar-link:hover { background-color: #f0f7f4; color: var(--foreground) !important; }
      `}} />
    </div>
  );
}
