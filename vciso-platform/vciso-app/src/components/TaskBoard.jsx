import React, { useEffect, useState } from 'react';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100', dot: 'bg-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50', dot: 'bg-blue-500' },
  { id: 'review', label: 'In Review', color: 'bg-yellow-50', dot: 'bg-yellow-500' },
  { id: 'done', label: 'Done', color: 'bg-green-50', dot: 'bg-green-500' },
];

const PRIORITY_STYLE = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

function TaskCard({ task, onMove, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 hover:shadow-md transition group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-gray-900 text-sm leading-snug">{task.title}</span>
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition flex-shrink-0"
          title="Delete task"
        >✕</button>
      </div>
      {task.description && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{task.description}</p>}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium}`}>
          {task.priority}
        </span>
        {task.module && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{task.module}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 truncate">
          {task.assignee && <span>👤 {task.assignee}</span>}
        </div>
        {task.due_date && <div className="text-xs text-gray-400">{task.due_date}</div>}
      </div>
      <div className="mt-3 flex gap-1">
        {COLUMNS.filter(c => c.id !== task.status).map(c => (
          <button
            key={c.id}
            onClick={() => onMove(task.id, c.id)}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 rounded-md transition font-medium"
          >
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TaskBoard({ activeClient }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee: '', due_date: '', module: '' });

  const fetchTasks = () => {
    const url = activeClient ? `/api/tasks?client_id=${activeClient.id}` : '/api/tasks';
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setTasks([]); setLoading(false); });
  };

  useEffect(() => { fetchTasks(); }, [activeClient]);

  const moveTask = async (id, status) => {
    const prev = tasks;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
    }
  };

  const deleteTask = async (id) => {
    const prev = tasks;
    setTasks(ts => ts.filter(t => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, client_id: activeClient?.id, status: 'todo' }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const task = await res.json();
      setTasks(ts => [task, ...ts]);
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '', due_date: '', module: '' });
      setShowAdd(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="text-gray-500 mt-1">
            {activeClient ? `Showing tasks for ${activeClient.name}` : 'Showing all tasks across clients'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          + New Task
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title *"
                value={newTask.title}
                onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description"
                value={newTask.description}
                onChange={e => setNewTask(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTask.priority}
                onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assignee"
                value={newTask.assignee}
                onChange={e => setNewTask(f => ({ ...f, assignee: e.target.value }))}
              />
            </div>
            <div>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTask.due_date}
                onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Module (e.g. Compliance)"
                value={newTask.module}
                onChange={e => setNewTask(f => ({ ...f, module: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addTask} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
              Add Task
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-10 text-center">Loading tasks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {COLUMNS.map(col => (
            <div key={col.id} className={`${col.color} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <span className="font-semibold text-gray-800 text-sm">{col.label}</span>
                <span className="ml-auto text-xs font-bold bg-white px-2 py-0.5 rounded-full text-gray-600">
                  {grouped[col.id].length}
                </span>
              </div>
              <div className="kanban-col">
                {grouped[col.id].map(task => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
                ))}
                {grouped[col.id].length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
