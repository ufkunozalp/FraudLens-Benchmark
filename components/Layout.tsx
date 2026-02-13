
import React from 'react';
import { LayoutDashboard, Wand2, ScanSearch, FileEdit, BarChart3, ShieldAlert, Moon, Sun, LucideIcon } from 'lucide-react';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import { AppTab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

interface NavItemProps {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: (tab: AppTab) => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-r-4 ${active
      ? 'bg-brand-50 text-brand-700 border-brand-600 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-500'
      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
    {label}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { theme, toggleTheme, currentUser, logout } = useGlobalState();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-200 z-20">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-bold text-xl">
            <ShieldAlert className="w-8 h-8" />
            <span>{TEXT.APP.NAME.split(' ')[0]}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-semibold">{TEXT.APP.SUBTITLE}</p>
        </div>

        <nav className="flex-1 pt-6 space-y-1 overflow-y-auto">
          <NavItem id="dashboard" label={TEXT.NAV.DASHBOARD} icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={onTabChange} />
          <div className="px-4 pt-4 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{TEXT.NAV.WORKFLOWS}</div>
          <NavItem id="generate" label={TEXT.NAV.GENERATE} icon={Wand2} active={activeTab === 'generate'} onClick={onTabChange} />
          <NavItem id="edit" label={TEXT.NAV.EDIT} icon={FileEdit} active={activeTab === 'edit'} onClick={onTabChange} />
          <NavItem id="detect" label={TEXT.NAV.DETECT} icon={ScanSearch} active={activeTab === 'detect'} onClick={onTabChange} />
          <div className="px-4 pt-4 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{TEXT.NAV.ANALYTICS}</div>
          <NavItem id="compare" label={TEXT.NAV.BENCHMARKS} icon={BarChart3} active={activeTab === 'compare'} onClick={onTabChange} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4 bg-white dark:bg-slate-800">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold shadow-sm">
              {currentUser?.name.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.name || 'Guest'}
              </p>
              <button
                onClick={logout}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 transition-colors"
                title="Sign out / Switch User"
              >
                Switch User
              </button>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4" /> {TEXT.NAV.THEME_DARK}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4" /> {TEXT.NAV.THEME_LIGHT}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content - Now overflow-hidden to force child pages to handle scrolling */}
      <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-200 relative">
        {children}
      </main>
    </div>
  );
};

export default Layout;
