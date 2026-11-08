import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Workflow,
  Play,
  Key,
  Box,
  Settings,
  BarChart3,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useAppSelector } from '@app/stores/hooks';

interface SidebarProps {
  isCollapsed?: boolean;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Workflows', path: '/workflows', icon: Workflow },
  { name: 'Executions', path: '/executions', icon: Play },
  { name: 'Credentials', path: '/credentials', icon: Key },
  { name: 'Templates', path: '/templates', icon: BookOpen },
  { name: 'Marketplace', path: '/marketplace', icon: Sparkles },
  { name: 'Variables', path: '/variables', icon: Box },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const location = useLocation();
  const user = useAppSelector(state => state.auth.user);
  
  // Get user initials from first and last name
  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    if (!firstName && !lastName) return 'U';
    const initials = [
      firstName?.[0],
      lastName?.[0]
    ].filter(Boolean).join('').toUpperCase();
    return initials || 'U';
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-[42px]' : 'w-[200px]'
      } bg-background-light1 border-r border-foreground flex flex-col transition-all duration-300 ease-in-out`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-foreground px-4">
        {!isCollapsed ? (
          <div className="flex items-center space-x-3 transition-all duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-shade rounded-lg flex items-center justify-center shadow-light">
              <span className="text-text-tint3 text-xl font-bold">⚡</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-text-shade1">Automation</h1>
              <p className="text-3xs text-text-tint1">Marketplace</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-shade rounded-lg flex items-center justify-center shadow-light hover:scale-105 transition-transform duration-200">
            <span className="text-text-tint3 text-xl font-bold">⚡</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center space-x-3 px-3 py-2.5 rounded transition-all duration-200
                    ${
                      isActive
                        ? 'bg-primary-tint3 text-primary border-l-2 border-primary font-medium shadow-sm'
                        : 'text-text hover:bg-background-light2 hover:text-primary'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon size={isCollapsed ? 20 : 18} className="flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm">{item.name}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 bg-primary-tint2 text-primary text-2xs font-semibold rounded animate-pulse-subtle">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        {console.log('📋 Sidebar - Rendering user section:', { user, firstName: user?.firstName, lastName: user?.lastName })}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.firstName || 'User'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
