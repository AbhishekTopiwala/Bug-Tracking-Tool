import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2, Bug, Filter, X, AlertCircle, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { subscribeToBugs, updateBug, createNotification, getProjects } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import { getValidStatusTransitions } from '../../utils/statusRules';
import BugCard from '../../components/BugCard';

const STATUS_COLUMNS = ['Open', 'In Progress', 'Done', 'Resolved', 'Reopen', 'Reproduced'];
const PRIORITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low'];

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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: open ? 'var(--bg-card)' : 'var(--bg-secondary)',
          border: '1px solid',
          borderColor: open ? 'var(--border)' : 'transparent',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
        onMouseOver={(e) => { if (!open) e.currentTarget.style.background = 'var(--border)'; }}
        onMouseOut={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
      >
        <Icon size={16} style={{ color: value !== 'All' ? 'var(--dev-accent)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}:</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: value !== 'All' ? 'var(--dev-accent)' : 'var(--text-primary)' }}>{value}</span>
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
                color: value === opt ? 'var(--dev-accent)' : 'var(--text-secondary)',
                fontWeight: value === opt ? 600 : 500,
                backgroundColor: value === opt ? 'var(--dev-accent-light)' : 'transparent',
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

/* Collapsible Kanban Column — header tap collapses on mobile */
function KanbanColumn({ status, bugs, children }) {
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

export default function DevBugsBoardPage() {
  const [allBugs, setAllBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const projectFilter = queryParams.get('project');

  useEffect(() => {
    const unsub = subscribeToBugs((bugs) => {
      setAllBugs(bugs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setProjectsLoading(true);
    getProjects(currentUser.uid, userProfile?.role)
      .then(projs => setAssignedProjectIds(projs.map(p => p.id)))
      .finally(() => setProjectsLoading(false));
  }, [currentUser, userProfile?.role]);

  const baseBugs = useMemo(() => {
    if (projectFilter) return allBugs.filter(b => b.projectName === projectFilter);
    if (projectsLoading) return []; // wait for project data before filtering
    // Developers see all bugs in projects they are assigned to
    return allBugs.filter(b => assignedProjectIds.includes(b.projectId));
  }, [allBugs, assignedProjectIds, projectFilter, projectsLoading]);

  const filtered = useMemo(() => {
    return baseBugs.filter((bug) => {
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
  }, [baseBugs, priorityFilter, searchQuery]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const bugToMove = allBugs.find(b => b.id === draggableId);
    if (!bugToMove) return;

    const role = userProfile?.role || 'Developer';
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
    setAllBugs(prev => prev.map(b => b.id === draggableId ? { ...b, status: newStatus } : b));

    try {
      await updateBug(draggableId, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);

      // Dispatch notification to the reporter (QA)
      if (bugToMove.reportedBy && bugToMove.reportedBy !== currentUser?.uid) {
        await createNotification({
          userId: bugToMove.reportedBy,
          bugId: draggableId,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> changed the status of <strong>${bugToMove.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <Topbar 
        title={projectFilter ? `Project: ${projectFilter}` : 'My Active Bugs'} 
        subtitle="Manage and update your assigned issues across projects"
        onSearch={setSearchQuery} 
      />
      <div className="page-container" style={{ paddingTop: 12 }}>

        {/* Project Filter Banner */}
        {projectFilter && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 16px', background: 'rgba(16,185,129,0.06)',
            borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)',
            flexWrap: 'wrap',
          }}>
            <Filter size={14} style={{ color: 'var(--dev-accent)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
              Filtering by project: <span style={{ color: 'var(--dev-accent)' }}>{projectFilter}</span>
            </span>
            <button
              onClick={() => navigate('/dev/bugs')}
              style={{
                marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              <X size={12} /> Clear
            </button>
          </div>
        )}

        {/* Filters — uses responsive .filters-bar class */}
        <div className="filters-bar">
          <div className="filters-bar-left">
            <FilterDropdown
              icon={AlertCircle}
              label="Priority"
              value={priorityFilter}
              options={PRIORITY_FILTERS}
              onChange={setPriorityFilter}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/dev/projects')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontWeight: 600, padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} bugs found
            </span>
          </div>
        </div>

        {/* Bug List Board */}
        {loading ? (
          <div className="kanban-board">
            {STATUS_COLUMNS.map((col) => (
              <div key={col} className="kanban-column">
                <div className="kanban-column-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 className="kanban-column-title">{col}</h3>
                    <span className="kanban-column-count">...</span>
                  </div>
                </div>
                <div className="kanban-droppable" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                  <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: '64px 32px',
            background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)',
            textAlign: 'center', boxSizing: 'border-box'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--dev-accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={32} style={{ color: 'var(--dev-accent)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
                {baseBugs.length === 0 ? 'All clear!' : 'No matches'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
                {baseBugs.length === 0
                  ? "No bugs have been assigned to you yet. You'll be notified when a QA assigns one."
                  : 'No bugs match your current filters. Try adjusting your priority search.'}
              </p>
            </div>
            {priorityFilter !== 'All' && (
              <button
                className="btn btn-secondary"
                onClick={() => setPriorityFilter('All')}
                style={{ borderRadius: 10 }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {STATUS_COLUMNS.map((status) => {
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
        )}
      </div>
    </>
  );
}
