import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bug, Plus, Search, Filter, AlertCircle, ChevronDown, Folder } from 'lucide-react';
import BugCard from '../components/BugCard';
import Topbar from '../components/Topbar';
import { subscribeToBugs, getProjects, updateBug } from '../services/firestoreService';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';

const STATUSES = ['All', 'Open', 'In Progress', 'Reopened', 'Resolved', 'Done'];
const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

function FilterDropdown({ icon: Icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
          background: open ? 'var(--bg-card)' : 'var(--bg-secondary)', 
          border: '1px solid',
          borderColor: open ? 'var(--border)' : 'transparent',
          borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
          color: 'var(--text-secondary)'
        }}
        onMouseOver={(e) => { if (!open) e.currentTarget.style.background = 'var(--border)'; }}
        onMouseOut={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      >
        <Icon size={16} style={{ color: value !== 'All' ? 'var(--accent)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}:</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: value !== 'All' ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</span>
        <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 100,
          display: 'flex', flexDirection: 'column', minWidth: 160, gap: 2
        }}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent',
                borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                color: value === opt ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: value === opt ? 600 : 500,
                backgroundColor: value === opt ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
              onMouseOut={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BugsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || '');
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // If the URL changes, update the filter
  useEffect(() => {
    const p = searchParams.get('project');
    if (p) {
      setProjectFilter(p);
    } else {
      // No project selected, redirect to projects page
      navigate('/qa/projects');
    }
  }, [searchParams, navigate]);

  // If filter changes, update URL
  const handleProjectFilterChange = (newVal) => {
    setProjectFilter(newVal);
    searchParams.set('project', newVal);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    const unsub = subscribeToBugs((data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStatus = destination.droppableId;
    
    // Optimistic UI update
    setBugs(prev => prev.map(b => b.id === draggableId ? { ...b, status: newStatus } : b));
    
    try {
      await updateBug(draggableId, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const filtered = useMemo(() => {
    return bugs.filter((bug) => {
      if (statusFilter !== 'All' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && bug.priority !== priorityFilter) return false;
      if (bug.projectName !== projectFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          bug.title?.toLowerCase().includes(q) || 
          bug.description?.toLowerCase().includes(q) ||
          bug.bugKey?.toLowerCase().includes(q) ||
          bug.id?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bugs, statusFilter, priorityFilter, searchQuery]);

  return (
    <>
      <Topbar title={`${projectFilter || 'Project'} Bugs`} onSearch={setSearchQuery} />
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{projectFilter || 'Project'} Bugs</h1>
            <p className="page-subtitle">{filtered.length} bugs found</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, alignItems: 'center' }}>
          <FilterDropdown
            icon={Filter}
            label="Status"
            value={statusFilter}
            options={STATUSES}
            onChange={setStatusFilter}
          />
          <FilterDropdown
            icon={AlertCircle}
            label="Priority"
            value={priorityFilter}
            options={PRIORITIES}
            onChange={setPriorityFilter}
          />
        </div>

        {loading ? (
          <div className="grid-auto">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Bug size={64} />
            <h3>No bugs found</h3>
            <p>Try adjusting your filters to find what you are looking for.</p>
          </div>
        ) : statusFilter === 'All' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {STATUSES.filter(s => s !== 'All').map(status => {
                const columnBugs = filtered.filter(b => b.status === status);
                return (
                  <div key={status} className="kanban-column">
                    <div className="kanban-column-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 className="kanban-column-title">{status}</h3>
                        <span className="kanban-column-count">{columnBugs.length}</span>
                      </div>
                      <button className="kanban-column-add" onClick={() => navigate(`/qa/bugs/new?project=${projectFilter}&status=${status}`)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`kanban-droppable ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                        >
                          {columnBugs.map((bug, index) => (
                            <Draggable key={bug.id} draggableId={bug.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`kanban-draggable-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    marginBottom: 12
                                  }}
                                >
                                  <BugCard bug={bug} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <div className="grid-auto">
            {filtered.map((bug) => <BugCard key={bug.id} bug={bug} />)}
          </div>
        )}
      </div>
    </>
  );
}
