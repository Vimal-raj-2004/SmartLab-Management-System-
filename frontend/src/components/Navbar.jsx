import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { LogOut, User, Monitor } from 'lucide-react';
import { SidebarToggle } from './Sidebar';

export const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 gap-2">
      {/* Left: hamburger (mobile) + branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <SidebarToggle onClick={onMenuToggle} />
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white flex-shrink-0">
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-white text-sm sm:text-base leading-tight tracking-tight truncate">
            Smart Computer Lab
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">AI-Based Management System</p>
        </div>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-800">
            {/* Name + role badge — clickable to go to profile */}
            <Link
              to="/profile"
              className="flex items-center gap-2.5 sm:gap-3 hover:opacity-85 transition-opacity group"
              title="Go to Account Profile"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors leading-tight">
                  {user.name}
                </p>
                <div className="flex justify-end mt-0.5">
                  <RoleBadge role={user.role} />
                </div>
              </div>

              {/* Avatar circle */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </span>
                )}
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-slate-700 hover:border-red-500/30 transition-all text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
