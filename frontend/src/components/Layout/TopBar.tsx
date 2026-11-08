import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/stores/hooks';
import { logout } from '@app/stores/slices/authSlice';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Get user from Redux store (primary) and localStorage (fallback)
  const userFromStore = useAppSelector(state => state.auth.user);
  const getUserFromStorage = () => {
    const userData = localStorage.getItem('user');
    const parsedUser = userData ? JSON.parse(userData) : null;
    console.log('📦 User from localStorage:', parsedUser);
    return parsedUser;
  };
  
  // Use store user if available, otherwise check localStorage
  const user = userFromStore || getUserFromStorage();
  
  console.log('👤 Current user in TopBar - from store:', userFromStore, '| final user:', user);

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    dispatch(logout());
    navigate('/login');
  };

  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    console.log('🔤 Getting initials for:', { firstName, lastName });
    if (!firstName && !lastName) return 'U';
    const initials = [
      firstName?.[0],
      lastName?.[0]
    ].filter(Boolean).join('').toUpperCase();
    console.log('✅ Generated initials:', initials);
    return initials || 'U';
  };

  return (
    <header className="h-16 bg-background-light3 border-b border-foreground flex items-center justify-between px-6 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-background-light1 rounded transition-colors duration-200"
          title="Toggle Sidebar"
        >
          <Menu size={20} className="text-text" />
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tint1" />
          <input
            type="text"
            placeholder="Search workflows, nodes..."
            className="pl-10 pr-4 py-2 w-80 bg-background-light1 border border-foreground rounded text-sm text-text-shade1
                     focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary 
                     transition-all duration-200 placeholder:text-text-tint1"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Quick Actions */}
        <button 
          onClick={() => navigate('/workflow/new')}
          className="px-4 py-2 bg-primary text-text-tint3 rounded font-medium hover:bg-primary-shade 
                   hover:shadow transition-all duration-200 text-sm transform hover:scale-[1.02] active:scale-[0.98]">
          + New Workflow
        </button>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-background-light1 rounded transition-colors duration-200">
          <Bell size={20} className="text-text" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse-subtle"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 px-3 py-2 hover:bg-background-light1 rounded transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-shade rounded-full flex items-center justify-center text-text-tint3 font-semibold text-sm shadow-light">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <span className="text-sm font-medium text-text-shade1">{user?.firstName || 'User'}</span>
            <ChevronDown size={16} className="text-text-tint1" />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-background-light3 rounded-lg shadow-dark border border-foreground py-2 z-20 animate-scale-in">
                <div className="px-4 py-3 border-b border-foreground">
                  {console.log('📋 Displaying in dropdown - firstName:', user?.firstName, 'email:', user?.email)}
                  <p className="text-sm font-semibold text-text-shade1">{user?.firstName || 'User'}</p>
                  <p className="text-xs text-text-tint1">{user?.email}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-text-shade1 hover:bg-background-light1 transition-colors duration-200">
                  Profile Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-text-shade1 hover:bg-background-light1 transition-colors duration-200">
                  Billing
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-text-shade1 hover:bg-background-light1 transition-colors duration-200">
                  Help & Support
                </button>
                <div className="border-t border-foreground mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-tint4 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
