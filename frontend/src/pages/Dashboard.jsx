import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/RoleBadge';
import {
  Building2,
  Cpu,
  CalendarCheck,
  AlertTriangle,
  Activity,
  BrainCircuit,
  Users,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Mock initial dashboard statistics for Phase 1 baseline
  const stats = {
    totalLabs: 3,
    activePCs: 115,
    pendingBookings: 2,
    openComplaints: 3,
    aiHealthStatus: 'Optimal (98.4%)',
    labOccupancy: '68% Normal',
  };

  const roleHighlights = {
    admin: {
      title: 'Admin Control Center',
      description: 'Full administrative control over labs, hardware assets, user permissions, and AI models.',
      badges: ['System Admin', 'Asset Control', 'Audit Logs', 'AI Config'],
    },
    faculty: {
      title: 'Faculty Portal',
      description: 'Book computer lab slots for practical courses, track system availability, and view student usage.',
      badges: ['Lab Reservation', 'Curriculum Labs', 'Issue Reporting'],
    },
    lab_assistant: {
      title: 'Lab Assistant Operations',
      description: 'Monitor live PC hardware status, inspect peripheral items, manage maintenance tickets, and AI warnings.',
      badges: ['Hardware Telemetry', 'Ticket Resolver', 'Lab Maintenance'],
    },
    student: {
      title: 'Student Workstation Portal',
      description: 'View open lab sessions, check available workstations, and submit hardware/software issue tickets.',
      badges: ['Lab Access', 'PC Availability', 'Complaint Tracker'],
    },
  };

  const currentRoleInfo = roleHighlights[role] || roleHighlights.student;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-900/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <RoleBadge role={role} />
              <span className="text-xs text-blue-300/80 font-medium">
                Connected: {user?.email}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name}! 👋
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {currentRoleInfo.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:self-end">
            {currentRoleInfo.badges.map((b) => (
              <span
                key={b}
                className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Labs</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.totalLabs} Labs</h3>
            <span className="text-xs text-emerald-400 font-medium">All Available</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">LAB-101, LAB-102, LAB-201</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored PCs</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">{stats.activePCs} PCs</h3>
            <span className="text-xs text-emerald-400 font-medium">psutil agent ready</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Live telemetry tracking</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Health Status</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">Optimal</h3>
            <span className="text-xs text-emerald-400 font-medium">Random Forest</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">CPU/RAM/Disk/Errors</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Tasks</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-white">5 Active</h3>
            <span className="text-xs text-amber-400 font-medium">2 Bookings, 3 Tickets</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting review</p>
        </div>
      </div>

      {/* Role specific quick action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status & Architecture Highlights */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Core System Pipeline</h2>
              <p className="text-xs text-slate-400">Architecture status and module readiness</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Phase 1 Online
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">JWT Role-Based Authentication Active</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secure access control for <strong>Admin</strong>, <strong>Faculty</strong>, <strong>Lab Assistant</strong>, and <strong>Student</strong> with token revocation and protected endpoints.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">3 AI / ML Models Pipeline Configured</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  1. Random Forest (PC Health) &bull; 2. K-Means (Lab Utilization) &bull; 3. TF-IDF + Decision Tree (Complaint Priority).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">PostgreSQL & SQLite Database ORM Ready</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-configured schemas with foreign key relationships for Users, Labs, PC Assets, Peripherals, Bookings, Complaints, and Telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Credentials & Role Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-bold text-white">Role Privileges</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Your active session permissions:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs">
                <span className="text-slate-300">Lab Management</span>
                <span className="text-emerald-400 font-medium">
                  {role === 'student' ? 'View Only' : 'Full Access'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs">
                <span className="text-slate-300">Asset & Telemetry</span>
                <span className="text-emerald-400 font-medium">
                  {role === 'student' ? 'Restricted' : 'Live Stream'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs">
                <span className="text-slate-300">Lab Booking</span>
                <span className="text-emerald-400 font-medium">Book & Reserve</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs">
                <span className="text-slate-300">User Management</span>
                <span className={role === 'admin' ? 'text-purple-400 font-bold' : 'text-slate-500'}>
                  {role === 'admin' ? 'Admin Only' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
            Current user: <strong className="text-white">{user?.username}</strong> ({user?.department})
          </div>
        </div>
      </div>
    </div>
  );
};
