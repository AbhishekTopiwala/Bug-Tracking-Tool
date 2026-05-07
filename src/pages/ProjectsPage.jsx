import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Trash2, Calendar, Layout, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjects, createProject, deleteProject, subscribeToBugs } from '../services/firestoreService';
import Topbar from '../components/Topbar';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function ProjectsPage() {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const isDeveloper = userProfile?.role === 'Developer';

  useEffect(() => {
    fetchProjects();
    const unsubscribe = subscribeToBugs((data) => {
      setBugs(data);
    });
    return () => unsubscribe();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const getBugCountForProject = (projectId) => {
    return bugs.filter(bug => bug.projectId === projectId).length;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createProject({
        name: newProject.name.trim(),
        description: newProject.description.trim()
      });
      toast.success('Project created successfully');
      setNewProject({ name: '', description: '' });
      setShowModal(false);
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? Existing bugs will remain but their link to this project will be removed.')) return;

    try {
      await deleteProject(id);
      toast.success('Project deleted');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to delete project');
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
      <Topbar title="Project Management" onSearch={setSearchQuery} />
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: 32 }}>
          <div className="page-header-left">
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">
              Manage and organize your testing workspaces
            </p>
          </div>
          {!isDeveloper && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
              style={{ padding: '12px 24px', borderRadius: 14, gap: 10, fontWeight: 700 }}
            >
              <Plus size={20} />
              New Project
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching your workspaces...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              height: 400, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 24,
              border: '1px dashed var(--border)',
              padding: 40
            }}
          >
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Folder size={40} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>
              {searchQuery ? 'No matching projects' : 'No projects created yet'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
              {searchQuery 
                ? `We couldn't find any projects matching "${searchQuery}". Try a different search term.`
                : 'Start by creating a project to group your bug reports and track progress more effectively.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '12px 24px', borderRadius: 12 }}>
                Create Your First Project
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-auto"
          >
            <AnimatePresence>
              {filteredProjects.map((project) => {
                const projectBugs = bugs.filter(bug => bug.projectId === project.id);
                const totalBugs = projectBugs.length;
                const resolvedBugs = projectBugs.filter(b => ['Resolved', 'Done'].includes(b.status)).length;
                const openBugs = totalBugs - resolvedBugs;
                const progress = totalBugs === 0 ? 0 : Math.round((resolvedBugs / totalBugs) * 100);

                const criticalBugs = projectBugs.filter(b => b.priority === 'Critical' && !['Resolved', 'Done'].includes(b.status)).length;
                const highBugs = projectBugs.filter(b => b.priority === 'High' && !['Resolved', 'Done'].includes(b.status)).length;

                let healthStatus = "Stable";
                let healthColor = "var(--success)";
                if (criticalBugs > 0) {
                  healthStatus = "At Risk";
                  healthColor = "var(--danger)";
                } else if (highBugs > 0) {
                  healthStatus = "Warning";
                  healthColor = "var(--warning)";
                } else if (openBugs > 0) {
                  healthStatus = "Active";
                  healthColor = "var(--info)";
                }

                const lastBug = projectBugs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
                const lastActiveStr = lastBug?.createdAt?.seconds 
                  ? new Date(lastBug.createdAt.seconds * 1000).toLocaleDateString() 
                  : 'No Activity';

                return (
                  <motion.div 
                    key={project.id} 
                    variants={itemVariants}
                    layout
                    whileHover={{ y: -4, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)', borderColor: healthColor }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      const path = isDeveloper ? '/dev' : '/qa/bugs';
                      navigate(`${path}?project=${encodeURIComponent(project.name)}`);
                    }}
                    style={{ 
                      padding: 24, 
                      borderRadius: 16, 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <div style={{ width: 36, height: 36, borderRadius: 10, background: `${healthColor}15`, color: healthColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Folder size={18} />
                           </div>
                           <div>
                             <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                               {project.name}
                               <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, boxShadow: `0 0 8px ${healthColor}80` }} title={healthStatus} />
                             </h3>
                           </div>
                        </div>
                        {!isDeveloper && (
                          <button 
                            onClick={(e) => handleDelete(e, project.id)}
                            style={{ padding: 6, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="Delete Project"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                     </div>
                     
                     <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5rem' }}>
                        {project.description || 'No description provided.'}
                     </p>

                     <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
                        {criticalBugs > 0 && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--danger-light)', color: 'var(--danger)' }}>
                            {criticalBugs} Critical
                          </span>
                        )}
                        {highBugs > 0 && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--warning-light)', color: 'var(--warning)' }}>
                            {highBugs} High
                          </span>
                        )}
                        {criticalBugs === 0 && highBugs === 0 && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--success-light)', color: 'var(--success)' }}>
                            {totalBugs === 0 ? 'No Bugs' : 'Stable'}
                          </span>
                        )}
                     </div>

                     <div style={{ marginTop: 'auto' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Progress</span>
                         <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{progress}%</span>
                       </div>
                       <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${progress}%` }}
                           transition={{ duration: 1, ease: 'easeOut' }}
                           style={{ height: '100%', background: healthColor, borderRadius: 2 }}
                         />
                       </div>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{openBugs}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Active</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{resolvedBugs}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Resolved</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalBugs}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Total</div>
                            </div>
                          </div>
                          
                           {!isDeveloper && (
                            <button 
                              className="btn btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/qa/bugs/new', { state: { prefilled: { projectId: project.id, projectName: project.name } } });
                              }}
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 6, gap: 4, height: 'auto', fontWeight: 600 }}
                            >
                              <Plus size={14} /> Bug
                            </button>
                           )}
                       </div>
                     </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card modal-content" 
              style={{ maxWidth: 500, width: '95%', padding: 32, borderRadius: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>New Project</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>Define a new workspace for your testing</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-body)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'block' }}>
                    Project Name
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. E-Commerce Web App"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    style={{ height: 50, borderRadius: 12, background: 'var(--bg-body)' }}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 32 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'block' }}>
                    Description
                  </label>
                  <textarea 
                    className="form-control" 
                    placeholder="What are the goals or scope of this project?"
                    rows="4"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    style={{ borderRadius: 12, background: 'var(--bg-body)', padding: 16 }}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1, height: 50, borderRadius: 14 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 2, height: 50, borderRadius: 14, gap: 10 }}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <Plus size={18} />
                        Create Project
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
        .btn-icon-danger {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon-danger:hover {
          background: rgba(239, 68, 68, 0.08);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.2);
        }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}} />
    </>
  );
}
