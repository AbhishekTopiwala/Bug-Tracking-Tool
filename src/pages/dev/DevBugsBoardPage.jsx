import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2, Bug, Filter, X, AlertCircle, ChevronDown, ChevronUp, ArrowLeft,
  LayoutGrid, List, SlidersHorizontal, User, Tag, Search, Minimize2, Maximize2,
  Square, CheckSquare
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { 
  subscribeToBugs, updateBug, createNotification, getProjects, getUsers 
} from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import { getValidStatusTransitions } from '../../utils/statusRules';
import BugCard from '../../components/BugCard';

const STATUS_COLUMNS = ['Open', 'In Progress', 'Done', 'Resolved', 'Reopen', 'Reproduced'];
const PRIORITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const SWIMLANE_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

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
        <Icon size={16} style={{ color: value !== 'All' && value !== '' ? 'var(--dev-accent)' : 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}:</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: value !== 'All' && value !== '' ? 'var(--dev-accent)' : 'var(--text-primary)' }}>{value === '' ? 'Unassigned' : value}</span>
        <ChevronDown size={14} style={{ marginLeft: 4, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 200,
          display: 'flex', flexDirection: 'column', minWidth: 160, gap: 2,
          maxHeight: 260, overflowY: 'auto'
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
              {opt === '' ? 'Unassigned' : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevBugsBoardPage() {
  const [allBugs, setAllBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // Custom Filter States
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // UI Layout States
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [useSwimlanes, setUseSwimlanes] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState({
    Critical: true,
    High: true,
    Medium: true,
    Low: true
  });

  // Row selection for List Bulk Triage
  const [selectedBugs, setSelectedBugs] = useState([]);

  // Base data states
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const projectFilter = queryParams.get('project');
  const basePath = '/dev';

  useEffect(() => {
    if (!userProfile) return;
    const unsub = subscribeToBugs((bugs) => {
      setAllBugs(bugs);
      setLoading(false);
    });
    return () => unsub();
  }, [userProfile]);

  useEffect(() => {
    if (!currentUser) return;
    setProjectsLoading(true);
    getProjects(currentUser.uid, userProfile?.role)
      .then(projs => setAssignedProjectIds(projs.map(p => p.id)))
      .finally(() => setProjectsLoading(false));

    getUsers()
      .then(setAllUsers)
      .catch(console.error);
  }, [currentUser, userProfile?.role]);

  // Base bugs filtered by project assigned
  const baseBugs = useMemo(() => {
    if (projectFilter) return allBugs.filter(b => b.projectName === projectFilter);
    if (projectsLoading) return []; 
    return allBugs.filter(b => assignedProjectIds.includes(b.projectId));
  }, [allBugs, assignedProjectIds, projectFilter, projectsLoading]);

  // Extract unique tags and assignees dynamically from developer's visible bugs
  const assigneeOptions = useMemo(() => {
    const set = new Set();
    baseBugs.forEach(b => {
      set.add(b.assigneeName || '');
    });
    return ['All', ...Array.from(set)];
  }, [baseBugs]);

  const tagOptions = useMemo(() => {
    const set = new Set();
    baseBugs.forEach(b => {
      if (b.tags) b.tags.forEach(t => set.add(t));
    });
    return ['All', ...Array.from(set)];
  }, [baseBugs]);

  // Match all user selected filters
  const filtered = useMemo(() => {
    return baseBugs.filter((bug) => {
      if (statusFilter !== 'All' && bug.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && bug.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'All') {
        const checkVal = assigneeFilter === '' ? undefined : assigneeFilter;
        if (bug.assigneeName !== checkVal) return false;
      }
      if (tagFilter !== 'All' && (!bug.tags || !bug.tags.includes(tagFilter))) return false;
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
  }, [baseBugs, statusFilter, priorityFilter, assigneeFilter, tagFilter, searchQuery]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    let newStatus = destination.droppableId;
    let newPriority = null;

    if (destination.droppableId.includes('__')) {
      [newStatus, newPriority] = destination.droppableId.split('__');
    }

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

    if (newStatus !== bugToMove.status && !validTransitions.includes(newStatus)) {
      toast.error(`Cannot move bug from "${bugToMove.status}" to "${newStatus}" as ${role}`);
      return;
    }

    // Optimistic UI update
    setAllBugs(prev => prev.map(b => {
      if (b.id === draggableId) {
        const updated = { ...b, status: newStatus };
        if (newPriority) updated.priority = newPriority;
        return updated;
      }
      return b;
    }));

    try {
      const updates = { status: newStatus };
      if (newPriority) updates.priority = newPriority;
      await updateBug(draggableId, updates, userProfile?.displayName || currentUser?.displayName);
      
      let toastMsg = `Moved to ${newStatus}`;
      if (newPriority && newPriority !== bugToMove.priority) {
        toastMsg += ` & updated priority to ${newPriority}`;
      }
      toast.success(toastMsg);

      // Notify the reporter
      if (bugToMove.reportedBy && bugToMove.reportedBy !== currentUser?.uid) {
        let notifMsg = `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> changed status of <strong>${bugToMove.title}</strong> to <strong>${newStatus}</strong>`;
        if (newPriority && newPriority !== bugToMove.priority) {
          notifMsg += ` and updated priority to <strong>${newPriority}</strong>`;
        }
        await createNotification({
          userId: bugToMove.reportedBy,
          bugId: draggableId,
          message: notifMsg,
          type: 'status_change',
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  // Inline Triage triggers
  const handleUpdateStatusInline = async (bugId, newStatus) => {
    const bug = allBugs.find(b => b.id === bugId);
    if (!bug) return;

    const role = userProfile?.role || 'Developer';
    const canChangeStatus = userProfile?.role === 'Admin' || 
                            bug.reportedBy === currentUser?.uid || 
                            bug.assigneeId === currentUser?.uid;

    if (!canChangeStatus) {
      toast.error('Only the reporter or assigned developer can change the status');
      return;
    }

    const validTransitions = getValidStatusTransitions(bug.status, role);
    if (newStatus !== bug.status && !validTransitions.includes(newStatus)) {
      toast.error(`Cannot move bug from "${bug.status}" to "${newStatus}" as ${role}`);
      return;
    }

    setAllBugs(prev => prev.map(b => b.id === bugId ? { ...b, status: newStatus } : b));
    try {
      await updateBug(bugId, { status: newStatus }, userProfile?.displayName || currentUser?.displayName);
      toast.success(`Status updated to ${newStatus}`);
      
      if (bug.reportedBy && bug.reportedBy !== currentUser?.uid) {
        await createNotification({
          userId: bug.reportedBy,
          bugId: bugId,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> updated status of <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleUpdatePriorityInline = async (bugId, newPriority) => {
    const bug = allBugs.find(b => b.id === bugId);
    if (!bug) return;

    setAllBugs(prev => prev.map(b => b.id === bugId ? { ...b, priority: newPriority } : b));
    try {
      await updateBug(bugId, { priority: newPriority }, userProfile?.displayName || currentUser?.displayName);
      toast.success(`Priority updated to ${newPriority}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update priority');
    }
  };

  const handleUpdateAssigneeInline = async (bugId, assigneeId) => {
    const bug = allBugs.find(b => b.id === bugId);
    if (!bug) return;

    const userSelected = allUsers.find(u => u.id === assigneeId);
    const assigneeName = userSelected ? userSelected.displayName : '';

    setAllBugs(prev => prev.map(b => b.id === bugId ? { ...b, assigneeId, assigneeName } : b));
    try {
      await updateBug(bugId, { assigneeId, assigneeName }, userProfile?.displayName || currentUser?.displayName);
      toast.success(`Assigned bug to ${assigneeName || 'Unassigned'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update assignee');
    }
  };

  // Bulk Triage Trigger
  const handleBulkUpdate = async (type, value) => {
    if (selectedBugs.length === 0) return;
    const loadingToast = toast.loading(`Bulk updating ${selectedBugs.length} bugs...`);

    try {
      const promises = selectedBugs.map(async (id) => {
        const bug = allBugs.find(b => b.id === id);
        if (!bug) return;

        const updates = {};
        if (type === 'status') {
          const role = userProfile?.role || 'Developer';
          const validTransitions = getValidStatusTransitions(bug.status, role);
          if (value !== bug.status && !validTransitions.includes(value)) return;
          updates.status = value;
        } else if (type === 'priority') {
          updates.priority = value;
        } else if (type === 'assignee') {
          const userSelected = allUsers.find(u => u.id === value);
          updates.assigneeId = value;
          updates.assigneeName = userSelected ? userSelected.displayName : '';
        }

        await updateBug(id, updates, userProfile?.displayName || currentUser?.displayName);
        
        if (type === 'status' && bug.reportedBy && bug.reportedBy !== currentUser?.uid) {
          await createNotification({
            userId: bug.reportedBy,
            bugId: id,
            message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> bulk updated status of <strong>${bug.title}</strong> to <strong>${value}</strong>`,
            type: 'status_change',
          });
        }
      });

      await Promise.all(promises);
      toast.dismiss(loadingToast);
      toast.success(`Successfully bulk updated ${selectedBugs.length} bugs!`);
      setSelectedBugs([]);
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Failed to bulk update');
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
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
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

        {/* LAYOUT & DENSITY TOGGLES HEADER */}
        <div className="view-control-container">
          {/* Left: View Modes */}
          <div className="view-segmented-control">
            <button
              onClick={() => { setViewMode('board'); setSelectedBugs([]); }}
              className={`view-segment-btn ${viewMode === 'board' ? 'active-dev' : ''}`}
            >
              <LayoutGrid size={14} />
              Board View
            </button>
            <button
              onClick={() => { setViewMode('list'); }}
              className={`view-segment-btn ${viewMode === 'list' ? 'active-dev' : ''}`}
            >
              <List size={14} />
              List View
            </button>
          </div>

          {/* Right: Board controls */}
          {viewMode === 'board' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <label className="swimlanes-toggle-label">
                <input
                  type="checkbox"
                  checked={useSwimlanes}
                  onChange={(e) => setUseSwimlanes(e.target.checked)}
                  className="swimlanes-toggle-checkbox-dev"
                />
                <span>Swimlanes (By Priority)</span>
              </label>
            </div>
          )}

          {/* Right: List description */}
          {viewMode === 'list' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Bulk Triage Enabled (Use checkboxes below)
            </span>
          )}
        </div>

        {/* ENHANCED DROPDOWNS FILTER BAR */}
        <div className="filters-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 200px', maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search bugs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px', fontSize: '0.82rem', width: '100%',
                borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', transition: 'all 0.2s'
              }}
            />
          </div>

          <FilterDropdown
            icon={User}
            label="Assignee"
            value={assigneeFilter}
            options={assigneeOptions}
            onChange={setAssigneeFilter}
          />

          <FilterDropdown
            icon={SlidersHorizontal}
            label="Status"
            value={statusFilter}
            options={['All', ...STATUS_COLUMNS]}
            onChange={setStatusFilter}
          />

          <FilterDropdown
            icon={Tag}
            label="Tags"
            value={tagFilter}
            options={tagOptions}
            onChange={setTagFilter}
          />

          <FilterDropdown
            icon={AlertCircle}
            label="Priority"
            value={priorityFilter}
            options={PRIORITY_FILTERS}
            onChange={setPriorityFilter}
          />

          {(assigneeFilter !== 'All' || statusFilter !== 'All' || tagFilter !== 'All' || priorityFilter !== 'All' || searchQuery !== '') && (
            <button
              onClick={() => {
                setAssigneeFilter('All');
                setStatusFilter('All');
                setTagFilter('All');
                setPriorityFilter('All');
                setSearchQuery('');
              }}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', color: 'var(--dev-accent)', fontWeight: 600 }}
            >
              Reset Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/dev/projects')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 600, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-light)' }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} found
            </span>
          </div>
        </div>

        {/* DATA CONTAINER */}
        {loading ? (
          <div className="grid-auto">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                {baseBugs.length === 0 ? 'All clear!' : 'No matches'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
                {baseBugs.length === 0
                  ? "No bugs have been assigned to you yet. You'll be notified when a QA assigns one."
                  : 'No bugs match your current filters. Try adjusting your filter settings.'}
              </p>
            </div>
          </div>
        ) : viewMode === 'list' ? (

          /* LIST VIEW: HIGH DENSITY INTERACTIVE DATA TABLE */
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: 40, padding: '12px 16px' }}>
                      <button
                        onClick={() => {
                          if (selectedBugs.length === filtered.length) {
                            setSelectedBugs([]);
                          } else {
                            setSelectedBugs(filtered.map(b => b.id));
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                      >
                        {selectedBugs.length === filtered.length ? (
                          <CheckSquare size={16} style={{ color: 'var(--dev-accent)' }} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>Priority</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>Assignee</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.72rem' }}>Project</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bug) => {
                    const isSelected = selectedBugs.includes(bug.id);
                    const bKey = bug.bugKey || bug.id?.slice(-6).toUpperCase();
                    const priorityColor = `var(--priority-${bug.priority?.toLowerCase() || 'medium'})`;

                    return (
                      <tr
                        key={bug.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '10px 16px' }}>
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBugs(prev => prev.filter(id => id !== bug.id));
                              } else {
                                setSelectedBugs(prev => [...prev, bug.id]);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            {isSelected ? (
                              <CheckSquare size={16} style={{ color: 'var(--dev-accent)' }} />
                            ) : (
                              <Square size={16} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </button>
                        </td>
                        <td 
                          onClick={() => navigate(`${basePath}/bugs/${bug.id}`)}
                          style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          #{bKey}
                        </td>
                        <td
                          onClick={() => navigate(`${basePath}/bugs/${bug.id}`)}
                          style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={bug.title}
                        >
                          {bug.title}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={bug.status}
                            onChange={(e) => handleUpdateStatusInline(bug.id, e.target.value)}
                            style={{
                              fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                          >
                            {STATUS_COLUMNS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={bug.priority}
                            onChange={(e) => handleUpdatePriorityInline(bug.id, e.target.value)}
                            style={{
                              fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid var(--border)', background: 'var(--bg-card)', color: priorityColor,
                              cursor: 'pointer'
                            }}
                          >
                            {PRIORITY_FILTERS.filter(p => p !== 'All').map(p => (
                              <option key={p} value={p} style={{ color: `var(--priority-${p.toLowerCase()})` }}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={bug.assigneeId || ''}
                            onChange={(e) => handleUpdateAssigneeInline(bug.id, e.target.value)}
                            style={{
                              fontSize: '0.78rem', fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                              cursor: 'pointer', maxWidth: 150
                            }}
                          >
                            <option value="">Unassigned</option>
                            {allUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.displayName}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                          {bug.projectName || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : useSwimlanes ? (

          /* SWIMLANES: PRIORITY LANE GROUPINGS */
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SWIMLANE_PRIORITIES.map((priority) => {
                const priorityBugs = filtered.filter(b => b.priority === priority);
                const isSwimlaneCollapsed = collapsedSwimlanes[priority];
                const priorityColor = `var(--priority-${priority.toLowerCase()})`;

                return (
                  <div key={priority} style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    
                    {/* Collapsible Row Header */}
                    <div 
                      onClick={() => setCollapsedSwimlanes(prev => ({ ...prev, [priority]: !prev[priority] }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                        background: 'var(--bg-card)', borderBottom: isSwimlaneCollapsed ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer', userSelect: 'none', transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: priorityColor, boxShadow: `0 0 6px ${priorityColor}` }} />
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                        {priority} Priority
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 100, border: '1px solid var(--border)' }}>
                          {priorityBugs.length} bugs
                        </span>
                      </h4>
                      <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        {isSwimlaneCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </div>
                    </div>

                    {/* Columns in Swimlane */}
                    {!isSwimlaneCollapsed && (
                      <div className="kanban-board" style={{ height: 'auto', maxHeight: 380, padding: 12, gap: 12 }}>
                        {STATUS_COLUMNS.map((status) => {
                          const columnBugs = priorityBugs.filter(b => b.status === status);
                          const isColumnCollapsed = collapsedColumns[status];

                          // Collapsed
                          if (isColumnCollapsed) {
                            return (
                              <div
                                key={status}
                                style={{
                                  width: 40, minWidth: 40, maxWidth: 40,
                                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                                  borderRadius: 12, padding: '12px 4px', display: 'flex',
                                  flexDirection: 'column', alignItems: 'center', gap: 12,
                                  boxSizing: 'border-box'
                                }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCollapsedColumns(prev => ({ ...prev, [status]: false })); }}
                                  title={`Expand ${status}`}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                                >
                                  <Maximize2 size={10} />
                                </button>
                                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                  {status}
                                </div>
                                <span className="kanban-column-count" style={{ padding: '2px 6px', fontSize: '0.6rem' }}>{columnBugs.length}</span>
                              </div>
                            );
                          }

                          // Expanded
                          return (
                            <div
                              key={status}
                              className="kanban-column"
                              style={{
                                minWidth: 180, background: 'var(--bg-card)', borderRadius: 12, padding: 8, height: 320
                              }}
                            >
                              <div className="kanban-column-header" style={{ padding: '0 2px 8px 2px', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <h5 style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)' }}>{status}</h5>
                                  <span className="kanban-column-count" style={{ padding: '1px 6px', fontSize: '0.62rem' }}>{columnBugs.length}</span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCollapsedColumns(prev => ({ ...prev, [status]: true })); }}
                                  title={`Collapse ${status}`}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                                >
                                  <Minimize2 size={10} />
                                </button>
                              </div>

                              <Droppable droppableId={`${status}__${priority}`}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`kanban-droppable ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                                    style={{ padding: 2, overflowY: 'auto' }}
                                  >
                                    {columnBugs.map((bug, index) => (
                                      <Draggable key={bug.id} draggableId={bug.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`kanban-draggable-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                            style={{ ...provided.draggableProps.style, marginBottom: 8 }}
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        ) : (

          /* GENERAL KANBAN BOARD WITH COLLAPSIBLE COLUMNS */
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {STATUS_COLUMNS.map((status) => {
                const columnBugs = filtered.filter(b => b.status === status);
                const isColumnCollapsed = collapsedColumns[status];

                // Collapsed (40px narrow strip)
                if (isColumnCollapsed) {
                  return (
                    <div
                      key={status}
                      style={{
                        width: 40, minWidth: 40, maxWidth: 40,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 16, padding: '16px 4px', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: 16,
                        height: '100%', boxSizing: 'border-box', transition: 'all 0.2s'
                      }}
                    >
                      <button
                        onClick={() => setCollapsedColumns(prev => ({ ...prev, [status]: false }))}
                        title={`Expand ${status}`}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        <Maximize2 size={12} />
                      </button>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {status}
                      </div>
                      <span className="kanban-column-count" style={{ padding: '2px 6px', fontSize: '0.62rem' }}>{columnBugs.length}</span>
                    </div>
                  );
                }

                // Expanded
                return (
                  <div key={status} className="kanban-column">
                    <div className="kanban-column-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 className="kanban-column-title">{status}</h3>
                        <span className="kanban-column-count">{columnBugs.length}</span>
                      </div>
                      <button
                        onClick={() => setCollapsedColumns(prev => ({ ...prev, [status]: true }))}
                        title={`Collapse ${status}`}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                      >
                        <Minimize2 size={12} />
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
                                  <BugCard bug={bug} hideStatus={true} />
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
        )}

        {/* BULK ACTIONS TRIAGE BAR */}
        {selectedBugs.length > 0 && (
          <div
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              boxShadow: '0 10px 35px rgba(0,0,0,0.15)', borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
              zIndex: 1000, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dev-accent)' }}>
              {selectedBugs.length} bugs selected
            </span>

            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

            {/* Assignee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assign:</span>
              <select
                onChange={(e) => { if (e.target.value !== '') handleBulkUpdate('assignee', e.target.value); }}
                defaultValue=""
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="" disabled>Select User</option>
                <option value="">Unassigned</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
              <select
                onChange={(e) => { if (e.target.value !== '') handleBulkUpdate('status', e.target.value); }}
                defaultValue=""
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="" disabled>Select Status</option>
                {STATUS_COLUMNS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority:</span>
              <select
                onChange={(e) => { if (e.target.value !== '') handleBulkUpdate('priority', e.target.value); }}
                defaultValue=""
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="" disabled>Select Priority</option>
                {PRIORITY_FILTERS.filter(p => p !== 'All').map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

            <button
              onClick={() => setSelectedBugs([])}
              style={{
                fontSize: '0.75rem', fontWeight: 700, background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
