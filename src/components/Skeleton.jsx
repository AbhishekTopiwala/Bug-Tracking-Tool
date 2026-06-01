/**
 * Skeleton Loading System
 * Centralized, reusable skeleton components for all major sections.
 * Uses shimmer-only animation — no flashy pulse effects.
 */

import React from 'react';

/* ── Base Skeleton Block ────────────────────────────────────────────────────── */
export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

/* ── Text Lines ─────────────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 3, gap = 8, lastWidth = '70%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height={14}
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
export function SkeletonAvatar({ size = 40, borderRadius = '50%' }) {
  return <SkeletonBlock width={size} height={size} borderRadius={borderRadius} />;
}

/* ── Stat Card ──────────────────────────────────────────────────────────────── */
export function SkeletonCard({ height = 120, borderRadius = 12 }) {
  return (
    <div
      className="skeleton"
      style={{ height, borderRadius, width: '100%' }}
    />
  );
}

/* ── Stats Strip (4-column row of stat cards) ───────────────────────────────── */
export function SkeletonStatsStrip({ count = 4, height = 90 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 14, marginBottom: 28 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <SkeletonBlock width={44} height={44} borderRadius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock height={22} width="60%" />
            <SkeletonBlock height={12} width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────────── */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height={12} width="60%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 16,
            padding: '16px 20px',
            borderBottom: rowIdx < rows - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock key={colIdx} height={14} width={colIdx === 0 ? '80%' : '55%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Chart Placeholder ──────────────────────────────────────────────────────── */
export function SkeletonChart({ height = 240 }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <SkeletonBlock height={16} width={140} />
        <SkeletonBlock height={28} width={80} borderRadius={20} />
      </div>
      <SkeletonBlock height={height} borderRadius={8} />
    </div>
  );
}

/* ── Activity Feed Row ──────────────────────────────────────────────────────── */
export function SkeletonActivityRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 10px' }}>
      <SkeletonAvatar size={30} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock height={13} width="85%" />
        <SkeletonBlock height={11} width="40%" />
      </div>
    </div>
  );
}

/* ── Activity Feed ──────────────────────────────────────────────────────────── */
export function SkeletonActivityFeed({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonActivityRow key={i} />
      ))}
    </div>
  );
}

/* ── Bug List Item ──────────────────────────────────────────────────────────── */
export function SkeletonBugRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <SkeletonBlock width={80} height={20} borderRadius={20} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock height={14} width="70%" />
        <SkeletonBlock height={11} width="40%" />
      </div>
      <SkeletonBlock width={72} height={22} borderRadius={20} />
      <SkeletonBlock width={72} height={22} borderRadius={20} />
    </div>
  );
}

/* ── Bug List ────────────────────────────────────────────────────────────────── */
export function SkeletonBugList({ rows = 6 }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBugRow key={i} />
      ))}
    </div>
  );
}

/* ── Project Card ───────────────────────────────────────────────────────────── */
export function SkeletonProjectCard() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkeletonBlock width={44} height={44} borderRadius={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBlock height={16} width="60%" />
          <SkeletonBlock height={11} width="40%" />
        </div>
      </div>
      <SkeletonBlock height={12} width="90%" />
      <SkeletonBlock height={12} width="75%" />
      <SkeletonBlock height={6} borderRadius={99} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <SkeletonBlock height={52} borderRadius={10} />
        <SkeletonBlock height={52} borderRadius={10} />
        <SkeletonBlock height={52} borderRadius={10} />
      </div>
    </div>
  );
}

/* ── Project Cards Grid ──────────────────────────────────────────────────────── */
export function SkeletonProjectGrid({ count = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 24,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProjectCard key={i} />
      ))}
    </div>
  );
}

/* ── Kanban Column ──────────────────────────────────────────────────────────── */
export function SkeletonKanbanColumn() {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <SkeletonBlock height={14} width="50%" />
        <SkeletonBlock height={20} width={28} borderRadius={20} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <SkeletonBlock height={13} width="80%" />
          <SkeletonBlock height={11} width="55%" />
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <SkeletonBlock height={18} width={55} borderRadius={20} />
            <SkeletonBlock height={18} width={55} borderRadius={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Kanban Board ───────────────────────────────────────────────────────────── */
export function SkeletonKanbanBoard({ columns = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonKanbanColumn key={i} />
      ))}
    </div>
  );
}

/* ── Team Member Card ───────────────────────────────────────────────────────── */
export function SkeletonTeamMember() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <SkeletonAvatar size={44} borderRadius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock height={14} width="55%" />
        <SkeletonBlock height={11} width="70%" />
      </div>
      <SkeletonBlock height={24} width={60} borderRadius={20} />
    </div>
  );
}

/* ── Team Members List ──────────────────────────────────────────────────────── */
export function SkeletonTeamList({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTeamMember key={i} />
      ))}
    </div>
  );
}

/* ── Notification Row ───────────────────────────────────────────────────────── */
export function SkeletonNotificationRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <SkeletonAvatar size={36} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock height={13} width="75%" />
        <SkeletonBlock height={11} width="30%" />
      </div>
    </div>
  );
}

/* ── Notification List ──────────────────────────────────────────────────────── */
export function SkeletonNotificationList({ count = 5 }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonNotificationRow key={i} />
      ))}
    </div>
  );
}

/* ── Form ────────────────────────────────────────────────────────────────────── */
export function SkeletonForm({ fields = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBlock height={11} width={100} />
          <SkeletonBlock height={42} borderRadius={8} />
        </div>
      ))}
      <SkeletonBlock height={42} borderRadius={8} width={140} style={{ marginTop: 8 }} />
    </div>
  );
}

/* ── Modal Content ──────────────────────────────────────────────────────────── */
export function SkeletonModal() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        maxWidth: 640,
        width: '100%',
      }}
    >
      <div style={{ padding: 24, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <SkeletonBlock height={20} width={200} />
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonText lines={2} />
        <SkeletonBlock height={44} borderRadius={8} />
        <SkeletonBlock height={44} borderRadius={8} />
        <SkeletonBlock height={90} borderRadius={8} />
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <SkeletonBlock height={38} width={90} borderRadius={8} />
        <SkeletonBlock height={38} width={120} borderRadius={8} />
      </div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────────── */
export function SkeletonSidebar() {
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock height={36} borderRadius={8} style={{ marginBottom: 16 }} />
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonBlock key={i} height={38} borderRadius={8} />
      ))}
    </div>
  );
}

/* ── Header with Stats ───────────────────────────────────────────────────────── */
export function SkeletonHeader() {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock height={20} width={180} />
        <SkeletonBlock height={13} width={260} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <SkeletonBlock height={36} width={90} borderRadius={8} />
        <SkeletonBlock height={36} width={90} borderRadius={8} />
      </div>
    </div>
  );
}

/* ── AI Content Area ─────────────────────────────────────────────────────────── */
export function SkeletonAIContent({ lines = 6 }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <SkeletonBlock width={28} height={28} borderRadius={8} />
        <SkeletonBlock height={16} width={160} />
      </div>
      <SkeletonText lines={lines} />
    </div>
  );
}

/* ── Dashboard Page Skeleton ─────────────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div style={{ paddingTop: 24, paddingBottom: 40 }}>
      <SkeletonStatsStrip count={4} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Left column */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <SkeletonBlock height={16} width={110} style={{ marginBottom: 6 }} />
              <SkeletonBlock height={11} width={220} />
            </div>
            <SkeletonBlock height={32} width={80} borderRadius={8} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {[1, 2, 3, 4].map(i => (
              <SkeletonCard key={i} height={160} borderRadius={16} />
            ))}
          </div>
        </div>
        {/* Right column - activity feed */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <SkeletonBlock width={32} height={32} borderRadius={9} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock height={14} width={110} style={{ marginBottom: 5 }} />
              <SkeletonBlock height={11} width={160} />
            </div>
          </div>
          <SkeletonActivityFeed rows={6} />
        </div>
      </div>
    </div>
  );
}

/* ── Admin Dashboard Skeleton ────────────────────────────────────────────────── */
export function SkeletonAdminDashboard() {
  return (
    <div style={{ padding: '24px 40px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 28,
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <SkeletonBlock width={56} height={56} borderRadius={16} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock height={28} width={60} style={{ marginBottom: 8 }} />
              <SkeletonBlock height={12} width={100} />
            </div>
          </div>
        ))}
      </div>
      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <SkeletonCard height={320} borderRadius={16} />
        <SkeletonCard height={320} borderRadius={16} />
      </div>
    </div>
  );
}

/* ── Billing Page Skeleton ───────────────────────────────────────────────────── */
export function SkeletonBilling() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonCard height={200} borderRadius={16} />
      <SkeletonCard height={160} borderRadius={16} />
      <SkeletonTable rows={4} cols={4} />
    </div>
  );
}

/* ── Settings Page Skeleton ──────────────────────────────────────────────────── */
export function SkeletonSettings() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} height={40} borderRadius={8} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonBlock height={20} width={160} />
        <SkeletonForm fields={5} />
      </div>
    </div>
  );
}

/* ── Profile Section Skeleton ────────────────────────────────────────────────── */
export function SkeletonProfile() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24 }}>
      <SkeletonAvatar size={80} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock height={20} width={200} />
        <SkeletonBlock height={13} width={160} />
        <SkeletonBlock height={28} width={100} borderRadius={20} />
      </div>
    </div>
  );
}

/* ── Analytics Page Skeleton ─────────────────────────────────────────────────── */
export function SkeletonAnalytics() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonStatsStrip count={4} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <SkeletonChart height={240} />
        <SkeletonChart height={240} />
      </div>
      <SkeletonTable rows={5} cols={6} />
    </div>
  );
}

/* ── List Item ───────────────────────────────────────────────────────────────── */
export function SkeletonList({ count = 5, itemHeight = 56 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} height={itemHeight} borderRadius={10} />
      ))}
    </div>
  );
}
