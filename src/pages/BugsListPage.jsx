import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bug, AlertCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import BugCard from '../components/BugCard';
import Topbar from '../components/Topbar';
import AdminTopbar from '../components/AdminTopbar';
import { subscribeToBugs, getProjects, updateBug, createNotification } from '../services/firestoreService';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getValidStatusTransitions } from '../utils/statusRules';

const STATUSES = ['All', 'Open', 'In Progress', 'Done', 'Resolved', 'Reopen', 'Reproduced'];
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
          color: 'var(--text-secondary)', whiteSpace: 'nowrap',
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
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 200,
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

/* Collapsible Kanban Column wrapper — header tap collapses on mobile */
function KanbanColumn({ status, bugs, provided, snapshot, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`kanban-column${collapsed ? ' kanban-column--collapsed' : ''}`}>
      <div
        className="kanban-column-header"
        onClick={() => setCollapsed(c => !c)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="kanban-column-title">{status}</h3>
          <span className="kanban-column-count">{bugs.length}</span>
        </div>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </div>
      {!collapsed && children}
    </div>
  );
}

export default function BugsListPage() {
  const { userProfile, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const statusFilter = 'All';
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
      const basePath = userProfile?.role === 'Admin' ? '/admin' : userProfile?.role === 'Developer' ? '/dev' : '/qa';
      navigate(`${basePath}/projects`);
    }
  }, [searchParams, navigate]);

  // If filter changes, update URL
  const handleProjectFilterChange = (newVal) => {
    setProjectFilter(newVal);
    searchParams.set('project', newVal);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    setProjectsLoading(true);
    getProjects(currentUser.uid, userProfile.role)
      .then(setProjects)
      .finally(() => setProjectsLoading(false));
  }, [currentUser, userProfile?.role]);

  useEffect(() => {
    const unsub = subscribeToBugs((data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter bugs based on role
  const myBugs = useMemo(() => {
    // When a specific project is selected from URL, filter directly by name — no need to wait for project list
    if (projectFilter) {
      if (userProfile?.role === 'Admin') return bugs.filter(b => b.projectName === projectFilter);
      return bugs.filter(b => b.projectName === projectFilter);
    }
    // For the "all bugs" view, wait for project membership to load
    if (projectsLoading) return [];
    if (userProfile?.role === 'Admin') return bugs;
    return bugs.filter(b => projects.some(p => p.id === b.projectId));
  }, [bugs, userProfile?.role, projects, projectsLoading, projectFilter]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const bugToMove = bugs.find(b => b.id === draggableId);
    if (!bugToMove) return;

    const role = userProfile?.role || 'QA';
    // Only the reporter or assigned dev (by assigneeId) can change status
    const canChangeStatus = userProfile?.role === 'Admin' || 
                            bugToMove.reportedBy === currentUser?.uid || 
                            bugToMove.assigneeId === currentUser?.uid;

    if (!canChangeStatus) {
      toast.error('Only the reporter or assigned developer can change the status');
      return;
    }

    const validTransitions = getValidStatusTransitions(bugToMove.status, role);

    if (!validTransitions.includes(newStatus)) {
      toast.error(`Cannot move bug from "${bugToMove.status}" to "${newStatus}" as ${role}`);
      return;
    }

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
    return myBugs.filter((bug) => {
      if (statusFilter !== 'All' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && bug.priority !== priorityFilter) return false;
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
  }, [myBugs, statusFilter, priorityFilter, searchQuery]);

  const isAdmin = userProfile?.role === 'Admin';

  return (
    <>
      {isAdmin ? (
        <AdminTopbar 
          title={`${projectFilter || 'Project'} Bugs`} 
          subtitle={`Monitoring ${filtered.length} active issues in ${projectFilter || 'all projects'}`}
          onSearch={setSearchQuery} 
        />
      ) : (
        <Topbar 
          title={`${projectFilter || 'Project'} Bugs`} 
          subtitle={`Monitoring ${filtered.length} active issues in ${projectFilter || 'all projects'}`}
          onSearch={setSearchQuery} 
        />
      )}
      <div className="page-container" style={{ paddingTop: 12 }}>

        {/* Filters & Bug Count Row — uses responsive CSS class */}
        <div className="filters-bar">
          <div className="filters-bar-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FilterDropdown
              icon={AlertCircle}
              label="Priority"
              value={priorityFilter}
              options={PRIORITIES}
              onChange={setPriorityFilter}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                if (userProfile?.role === 'Admin') {
                  const p = projects.find(proj => proj.name === projectFilter || proj.id === projectFilter);
                  navigate(p ? `/admin/projects/${p.id}` : '/admin/projects');
                } else if (userProfile?.role === 'Developer') {
                  navigate('/dev/projects');
                } else {
                  navigate('/qa/projects');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontWeight: 600, padding: '10px 20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-light)' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} bugs found
            </span>
          </div>
        </div>

        {(loading || (!projectFilter && projectsLoading)) ? (
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
                  <KanbanColumn key={status} status={status} bugs={columnBugs}>
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
                                  <BugCard bug={bug} hideStatus={true} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </KanbanColumn>
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <div className="grid-auto">
            {filtered.map((bug) => <BugCard key={bug.id} bug={bug} hideStatus={true} />)}
          </div>
        )}
      </div>
    </>
  );
}
