import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, Monitor, Package, Users,
  BookOpen, ClipboardList, Wrench, CalendarDays, BarChart3,
  ChevronRight, PlusCircle, X, Menu, User, Activity, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Menu definitions per role ─────────────────────────────────────────────
const ADMIN_MENU = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Reports & CSV',    icon: FileSpreadsheet,  to: '/admin/reports' },
  { label: 'Labs',             icon: FlaskConical,    to: '/admin/labs' },
  { label: 'PCs / Assets',     icon: Monitor,         to: '/admin/pcs' },
  { label: 'AI PC Health',     icon: Activity,        to: '/admin/pc-health' },
  { label: 'AI Utilization',   icon: BarChart3,       to: '/admin/utilization' },
  { label: 'Inventory',        icon: Package,         to: '/admin/inventory' },
  { label: 'Users',            icon: Users,           to: '/admin/users' },
  { label: 'Complaints',       icon: ClipboardList,   to: '/admin/complaints' },
  { label: 'Maintenance',      icon: Wrench,          to: '/admin/maintenance' },
  { label: 'Lab Bookings',     icon: CalendarDays,    to: '/admin/bookings' },
  { label: 'Lab Availability', icon: FlaskConical,    to: '/admin/availability' },
  { label: 'My Profile',       icon: User,            to: '/profile' },
];
const FACULTY_MENU = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/faculty/dashboard' },
  { label: 'Labs',             icon: FlaskConical,    to: '/faculty/labs' },
  { label: 'PCs',              icon: Monitor,         to: '/faculty/pcs' },
  { label: 'AI PC Health',     icon: Activity,        to: '/faculty/pc-health' },
  { label: 'AI Utilization',   icon: BarChart3,       to: '/faculty/utilization' },
  { label: 'Student Management', icon: Users,         to: '/faculty/users' },
  { label: 'Book a Lab',       icon: PlusCircle,      to: '/faculty/bookings/new' },
  { label: 'My Bookings',      icon: CalendarDays,    to: '/faculty/bookings' },
  { label: 'Lab Availability', icon: FlaskConical,    to: '/faculty/availability' },
  { label: 'Submit Complaint', icon: PlusCircle,      to: '/faculty/complaints/new' },
  { label: 'My Complaints',    icon: ClipboardList,   to: '/faculty/complaints' },
  { label: 'My Profile',       icon: User,            to: '/profile' },
];
const ASSISTANT_MENU = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/assistant/dashboard' },
  { label: 'Reports & CSV',    icon: FileSpreadsheet,  to: '/assistant/reports' },
  { label: 'PCs',              icon: Monitor,         to: '/assistant/pcs' },
  { label: 'AI PC Health',     icon: Activity,        to: '/assistant/pc-health' },
  { label: 'AI Utilization',   icon: BarChart3,       to: '/assistant/utilization' },
  { label: 'Inventory',        icon: Package,         to: '/assistant/inventory' },
  { label: 'Faculty Management', icon: Users,         to: '/assistant/users' },
  { label: 'Today\'s Schedule',icon: CalendarDays,    to: '/assistant/schedule' },
  { label: 'Lab Bookings',     icon: CalendarDays,    to: '/assistant/bookings' },
  { label: 'Lab Availability', icon: FlaskConical,    to: '/assistant/availability' },
  { label: 'Complaints',       icon: ClipboardList,   to: '/assistant/complaints' },
  { label: 'Maintenance',      icon: Wrench,          to: '/assistant/maintenance' },
  { label: 'My Profile',       icon: User,            to: '/profile' },
];
const STUDENT_MENU = [
  { label: 'Dashboard',        icon: LayoutDashboard, to: '/student/dashboard' },
  { label: 'Labs',             icon: FlaskConical,    to: '/student/labs' },
  { label: 'PC Health Status', icon: Activity,        to: '/student/pc-health' },
  { label: 'Lab Availability', icon: CalendarDays,    to: '/student/availability' },
  { label: 'Submit Complaint', icon: PlusCircle,      to: '/student/complaints/new' },
  { label: 'My Complaints',    icon: ClipboardList,   to: '/student/complaints' },
  { label: 'My Profile',       icon: User,            to: '/profile' },
];
const MENU_BY_ROLE = {
  admin: ADMIN_MENU,
  faculty: FACULTY_MENU,
  lab_assistant: ASSISTANT_MENU,
  student: STUDENT_MENU,
};

function MenuItem({ item, onNavigate }) {
  const location = useLocation();
  if (!item.to) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 opacity-50 cursor-not-allowed select-none text-sm">
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
      </div>
    );
  }
  const isActive = location.pathname === item.to ||
    (item.to !== '/' && location.pathname.startsWith(item.to + '/'));
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
          : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
      }`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const menu = MENU_BY_ROLE[user?.role] || [];
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-3 mb-6 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SmartLab</p>
            <p className="text-slate-400 text-xs">Management System</p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-1">
        {menu.map((item) => (
          <MenuItem key={item.label} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      {/* Footer */}
      <div className="px-3 pt-4 border-t border-slate-700/50 mt-4">
        <p className="text-xs text-slate-500 text-center">Phase 5B — AI Lab Utilization</p>
      </div>
    </div>
  );
}

// ── Mobile toggle button (exported so Navbar can use it) ──────────────────
export function SidebarToggle({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

// ── Main Sidebar component ────────────────────────────────────────────────
export default function Sidebar({ mobileOpen, onClose }) {
  // Close sidebar on route change on mobile
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) onClose?.(); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onClose]);

  return (
    <>
      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-700/50 py-6 px-3 flex flex-col
          transition-transform duration-300 ease-in-out lg:hidden
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>

      {/* ── Desktop static sidebar ── */}
      <aside className="hidden lg:flex w-60 min-h-screen bg-slate-900 border-r border-slate-700/30 flex-col py-6 px-3">
        <SidebarContent onNavigate={undefined} />
      </aside>
    </>
  );
}
