import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Folder, Trash2, Calendar, Layout, Loader2, Users, Check, X as XIcon, 
  Search, ArrowRight, Activity, Shield, CheckCircle2, CheckCircle, Info, ChevronRight, MoreVertical, LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjects, createProject, deleteProject, subscribeToBugs, updateProject, getUsers, subscribeToProjects } from '../services/firestoreService';
import Topbar from '../components/Topbar';
import AdminTopbar from '../components/AdminTopbar';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ── Memoized Member Item ──
const MemberItem = memo(({ user, isAssigned, onToggle }) => {
  const initials = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <motion.div 
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onToggle(user.uid)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', borderRadius: 20, border: '1px solid',
        background: isAssigned ? 'var(--admin-accent-light)' : 'var(--bg-primary)',
        borderColor: isAssigned ? 'var(--admin-accent)' : 'var(--border-light)',
        cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
        boxShadow: isAssigned ? '0 4px 12px rgba(91, 108, 255, 0.08)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 48, height: 48, borderRadius: 14, 
          background: isAssigned ? 'var(--admin-accent)' : 'var(--bg-card)', 
          color: isAssigned ? 'white' : 'var(--admin-accent)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: 800, fontSize: '1.1rem', transition: 'all 0.2s'
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{user.name || user.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{user.role}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isAssigned ? 'var(--admin-accent)' : 'var(--border)', opacity: 0.5 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{user.email.split('@')[0]}</span>
          </div>
        </div>
      </div>
      <div style={{ 
        width: 28, height: 28, borderRadius: 10, border: '2px solid', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        borderColor: isAssigned ? 'var(--admin-accent)' : 'var(--border)', 
        background: isAssigned ? 'var(--admin-accent)' : 'transparent',
        transition: 'all 0.2s', boxShadow: isAssigned ? '0 4px 10px rgba(91, 108, 255, 0.3)' : 'none'
      }}>
        {isAssigned && <Check size={16} color="#fff" />}
      </div>
    </motion.div>
  );
});

MemberItem.displayName = 'MemberItem';

export default function ProjectsPage() {
  const { userProfile, currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);
  const [allTeam, setAllTeam] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const navigate = useNavigate();

  const isAdmin = userProfile?.role === 'Admin';
  const isDeveloper = userProfile?.role === 'Developer';
  const isQA = userProfile?.role === 'QA';

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const unsubscribeProjects = subscribeToProjects(currentUser.uid, userProfile.role, (data) => {
      setProjects(data);
      setLoading(false);
    });

    if (isAdmin) {
      getUsers().then(users => {
        setAllTeam(users.filter(u => ['Developer', 'QA'].includes(u.role)));
      });
    }

    const unsubscribeBugs = subscribeToBugs((data) => {
      // Filter bugs based on role: QA only sees their own bugs
      if (userProfile?.role === 'QA') {
        const filteredBugs = data.filter(b => b.reportedBy === currentUser?.uid);
        setBugs(filteredBugs);
      } else {
        setBugs(data);
      }
    });

    return () => {
      unsubscribeProjects();
      unsubscribeBugs();
    };
  }, [currentUser, userProfile]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        assignedUsers: [currentUser.uid] // Admin is always assigned to their own project
      });
      toast.success('Project created successfully');
      setNewProject({ name: '', description: '' });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed handleAssign and saveAssignments as they are now on the dedicated page

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      toast.success('Project deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <>
      {isAdmin ? (
        <AdminTopbar 
          title="Projects" 
          subtitle="Manage and organize testing workspaces"
          onSearch={setSearchQuery} 
        />
      ) : (
        <Topbar 
          title="Projects" 
          subtitle="Manage and organize testing workspaces"
          onSearch={setSearchQuery} 
        />
      )}
      <div className="page-container">
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ padding: '12px 24px', borderRadius: 14, gap: 10, fontWeight: 700 }}
            >
              <Plus size={20} />
              New Project
            </button>
          </div>
        )}

        {/* Projects Grid - Redesigned */}
        {loading ? (
          <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--admin-accent)', borderRadius: '50%' }}
            />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1rem' }}>Preparing your workspace...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              height: 450, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              textAlign: 'center', background: 'var(--bg-card)', borderRadius: 32, border: '1px solid var(--border)', 
              padding: 40, boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ 
              width: 100, height: 100, borderRadius: 30, background: 'var(--admin-accent-light)', 
              color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 
            }}>
              <Folder size={48} />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.03em' }}>
              {searchQuery ? 'No matches found' : 'Ready to start?'}
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 380, marginBottom: 32, lineHeight: 1.6, fontSize: '1rem' }}>
              {searchQuery 
                ? `We couldn't find any projects matching "${searchQuery}". Try a broader term.`
                : isAdmin ? 'Create your first project to start tracking quality and team performance.' : 'No projects have been shared with you yet.'}
            </p>
            {isAdmin && !searchQuery && (
              <button 
                className="btn btn-primary" 
                onClick={() => setShowModal(true)} 
                style={{ height: 56, padding: '0 32px', borderRadius: 18, fontSize: '1rem', fontWeight: 800, background: 'var(--admin-accent)', boxShadow: '0 10px 20px rgba(91, 108, 255, 0.2)' }}
              >
                Create First Project
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-auto"
            style={{ gap: 32 }}
          >
            <AnimatePresence>
              {filteredProjects.map((project) => {
                const projectBugs = bugs.filter(bug => bug.projectId === project.id);
                const totalBugs = projectBugs.length;
                const resolvedBugs = projectBugs.filter(b => ['Resolved', 'Done'].includes(b.status)).length;
                const openBugs = totalBugs - resolvedBugs;
                const progress = totalBugs === 0 ? 0 : Math.round((resolvedBugs / totalBugs) * 100);

                const criticalBugs = projectBugs.filter(b => b.priority === 'Critical' && !['Resolved', 'Done'].includes(b.status)).length;
                
                let healthColor = "#10b981"; // Stable
                if (criticalBugs > 0) healthColor = "#ef4444"; // At Risk
                else if (openBugs > 5) healthColor = "#f59e0b"; // Warning

                return (
                  <motion.div 
                    key={project.id} 
                    variants={itemVariants}
                    layout
                    whileHover={{ y: -8, boxShadow: '0 30px 60px -12px rgba(0,0,0,0.12)' }}
                    onClick={() => isAdmin ? navigate(`/admin/projects/${project.id}`) : navigate(`${isDeveloper ? '/dev/bugs' : '/qa/bugs'}?project=${encodeURIComponent(project.name)}`)}
                    style={{ 
                      padding: 32, borderRadius: 28, border: '1px solid var(--border)', background: 'var(--bg-card)',
                      cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                          width: 48, height: 48, borderRadius: 14, background: 'var(--bg-primary)', 
                          color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' 
                        }}>
                          <Folder size={24} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{project.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, boxShadow: `0 0 10px ${healthColor}60` }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {criticalBugs > 0 ? 'Action Required' : 'Operational'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/projects/${project.id}/team`); }}
                            style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Users size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }); }}
                            style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.8rem' }}>
                      {project.description || 'Quality assurance workspace for modern development tracking.'}
                    </p>

                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PROJECT HEALTH</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{progress}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 10, overflow: 'hidden', marginBottom: 24, border: '1px solid var(--border-light)' }}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.2, ease: 'circOut' }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, var(--admin-accent), #3D49DF)', borderRadius: 10 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{openBugs}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Open</div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{resolvedBugs}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Done</div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{totalBugs}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Total</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Assign Team Modal removed in favor of dedicated page */}

      {/* Delete Project Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal"
            style={{ maxWidth: 420, borderRadius: 20, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '32px 32px 20px', gap: 14, background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.15)',
              }}>
                <Trash2 size={22} style={{ color: '#dc2626' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Delete Project
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  This action is <strong style={{ color: 'var(--danger)' }}>permanent</strong> and cannot be undone
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px', background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center' }}>
                You're about to delete{' '}
                <span style={{
                  fontWeight: 700, color: '#dc2626',
                  background: 'rgba(220,38,38,0.08)', padding: '1px 8px',
                  borderRadius: 6, fontSize: '0.85rem',
                }}>
                  {deleteTarget.name}
                </span>
                . Existing bugs will remain but their link to this project will be removed.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 10, padding: '16px 24px',
              background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1, borderRadius: 10, fontWeight: 600, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '10px 20px', borderRadius: 10,
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  border: 'none', cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {deleting
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Deleting...</>
                  : <><Trash2 size={14} /> Delete Project</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Create Project Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="card" 
              style={{ maxWidth: 500, width: '95%', padding: 0, borderRadius: 32, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '40px 40px 32px', background: 'var(--bg-card)', textAlign: 'center' }}>
                <div style={{ 
                  width: 64, height: 64, borderRadius: 20, background: 'var(--admin-accent-light)', 
                  color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', boxShadow: '0 10px 20px rgba(91, 108, 255, 0.1)'
                }}>
                  <Plus size={32} />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: 0 }}>New Project</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: 8 }}>Define a new workspace for your team</p>
              </div>

              <form onSubmit={handleCreate} style={{ padding: '0 40px 40px' }}>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'block' }}>
                    Project Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mobile Banking App"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    style={{ 
                      width: '100%', height: 56, borderRadius: 16, border: '2px solid var(--border)', 
                      background: 'var(--bg-primary)', padding: '0 20px', fontSize: '1rem', fontWeight: 600, outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--admin-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 32 }}>
                  <label style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'block' }}>
                    Project Description
                  </label>
                  <textarea 
                    placeholder="Briefly describe the project goals and scope..."
                    rows="4"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    style={{ 
                      width: '100%', borderRadius: 16, border: '2px solid var(--border)', 
                      background: 'var(--bg-primary)', padding: '16px 20px', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--admin-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, height: 56, borderRadius: 18, fontWeight: 800 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ 
                    flex: 1.5, height: 56, borderRadius: 18, fontWeight: 900, background: 'var(--admin-accent)', 
                    boxShadow: '0 10px 20px rgba(91, 108, 255, 0.2)', gap: 10 
                  }}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Plus size={20} />
                        Launch Project
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .project-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .project-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border-color: var(--primary-light) !important;
        }
        .btn-icon {
          width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }
        .btn-icon:hover {
          background: var(--bg-body);
          color: var(--primary);
        }
        .grid-auto {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
      `}} />
    </>
  );
}
