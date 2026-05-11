import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ArrowLeft, CheckCircle2, Loader2,
  UserPlus, Shield, Mail, ShieldCheck, Check
} from 'lucide-react';
import { getProjects, updateProject } from '../../services/firestoreService';
import { fetchAllUsers } from '../../services/teamService';
import { toast } from 'react-hot-toast';
import AdminTopbar from '../../components/AdminTopbar';

// ── Memoized List Item ──
const MemberItem = memo(({ user, isAssigned, onToggle }) => {
  const initials = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, backgroundColor: 'var(--bg-card-hover)', borderColor: isAssigned ? 'var(--admin-accent)' : 'var(--admin-accent-light)' }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onToggle(user.uid || user.id)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px', borderRadius: 28, border: '2px solid',
        background: isAssigned ? 'var(--admin-accent-light)' : 'var(--bg-card)',
        borderColor: isAssigned ? 'var(--admin-accent)' : 'transparent',
        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isAssigned ? '0 12px 24px rgba(91, 108, 255, 0.12)' : '0 4px 12px rgba(0,0,0,0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isAssigned && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute', top: 0, left: 0, width: 6, height: '100%',
            background: 'var(--admin-accent)', borderRadius: '0 4px 4px 0'
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: isAssigned ? 'var(--admin-accent)' : 'var(--bg-primary)',
          color: isAssigned ? 'white' : 'var(--admin-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '1.4rem', transition: 'all 0.3s',
          boxShadow: isAssigned ? '0 8px 20px rgba(91, 108, 255, 0.3)' : 'none',
          border: '1px solid var(--border-light)'
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {user.name || user.email.split('@')[0]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={{
              fontSize: '0.7rem', padding: '3px 10px', borderRadius: 8,
              background: user.role === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : user.role === 'Developer' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: user.role === 'Admin' ? '#DC2626' : user.role === 'Developer' ? '#2563EB' : '#059669',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em'
            }}>{user.role}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', opacity: 0.5 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              <Mail size={14} />
              <span style={{ opacity: 0.8 }}>{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        width: 36, height: 36, borderRadius: 14, border: '2px solid',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderColor: isAssigned ? 'var(--admin-accent)' : 'var(--border-light)',
        background: isAssigned ? 'var(--admin-accent)' : 'var(--bg-primary)',
        transition: 'all 0.3s', boxShadow: isAssigned ? '0 8px 16px rgba(91, 108, 255, 0.4)' : 'none'
      }}>
        {isAssigned ? (
          <Check size={20} color="#fff" strokeWidth={3} />
        ) : (
          <UserPlus size={18} color="var(--text-muted)" />
        )}
      </div>
    </motion.div>
  );
});

MemberItem.displayName = 'MemberItem';

export default function ProjectTeamPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('All');

  useEffect(() => {
    async function load() {
      try {
        const [pList, uList] = await Promise.all([getProjects(), fetchAllUsers()]);
        const found = pList.find(p => p.id === projectId || p.name === projectId);
        if (found) {
          setProject(found);
          setSelectedIds(found.assignedUsers || []);
        }
        setAllUsers(uList);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load team data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(u => {
      const matchesSearch = (u.name || u.email || '').toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, search, roleFilter]);

  const handleToggle = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = () => {
    const visibleIds = filteredUsers.map(u => u.uid || u.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, { assignedUsers: selectedIds });
      toast.success('Team assignments saved successfully');
      navigate(`/admin/projects/${project.id}`);
    } catch (err) {
      toast.error('Failed to save assignments');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminTopbar title="Loading Team..." />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 className="animate-spin" size={48} color="var(--admin-accent)" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminTopbar 
        title="Manage Team Access" 
        subtitle={`Configure workspace permissions for ${project?.name}`}
      />

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 48, gap: 40 }}>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn"
              onClick={() => navigate(`/admin/projects/${project?.id}`)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontWeight: 700, padding: '12px 24px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <ArrowLeft size={18} /> Back to Project
            </button>
            <button
              className="btn"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontWeight: 700, padding: '12px 24px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s',
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
              onMouseOut={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Filters & Stats Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40, padding: '24px 32px',
          background: 'var(--bg-card)', borderRadius: 32, border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-md)', position: 'sticky', top: 92, zIndex: 30
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={22} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '20px 20px 20px 64px', borderRadius: 20,
                border: '2px solid var(--border-light)', background: 'var(--bg-primary)',
                fontSize: '1.05rem', fontWeight: 600, outline: 'none', transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--admin-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-primary)', padding: 6, borderRadius: 16, border: '1px solid var(--border-light)' }}>
            {['All', 'Admin', 'Developer', 'QA'].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none',
                  background: roleFilter === role ? 'var(--admin-accent)' : 'transparent',
                  color: roleFilter === role ? 'white' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.2s', boxShadow: roleFilter === role ? '0 4px 12px rgba(91, 108, 255, 0.2)' : 'none'
                }}
              >
                {role}
              </button>
            ))}
          </div>

          <button
            onClick={handleSelectAll}
            style={{
              background: 'var(--bg-primary)', border: '1px solid var(--border-light)', padding: '18px 24px',
              borderRadius: 20, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)',
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            {filteredUsers.every(u => selectedIds.includes(u.uid || u.id)) ? 'Deselect Users' : 'Select Users'}
            <CheckCircle2 size={18} color={filteredUsers.every(u => selectedIds.includes(u.uid || u.id)) ? 'var(--admin-accent)' : 'var(--text-muted)'} />
          </button>

          <div style={{ height: 40, width: 2, background: 'var(--border-light)' }} />

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--admin-accent)' }}>{selectedIds.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{allUsers.length}</span>
            </div>
          </div>
        </div>

        {/* Members Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24
        }}>
          <AnimatePresence mode="popLayout">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <MemberItem
                  key={user.uid || user.id}
                  user={user}
                  isAssigned={selectedIds.includes(user.uid || user.id)}
                  onToggle={handleToggle}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '120px 0', opacity: 0.5 }}
              >
                <div style={{
                  width: 100, height: 100, background: 'var(--bg-card)', borderRadius: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                  border: '1px solid var(--border-light)'
                }}>
                  <Users size={48} style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>No members found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Try adjusting your search criteria or role filters</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>
    </div>
  );
}
