
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';
import Logo from './Logo';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Get initials for avatar
  const getInitials = () => {
    if (!user?.email) return '';
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase();
  };

  return (
    <nav className="bg-[#111827] border-b border-white/5 px-4 py-2 fixed top-0 left-0 right-0 z-50">
      <div className="container max-w-4xl mx-auto flex items-center justify-between">
        <Logo size="sm" className="h-8" />
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleLogout}
            className="flex items-center text-xoul-textSecondary hover:text-white transition-colors"
          >
            <LogOut size={16} className="mr-1" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-blue-600 text-white">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <span className="ml-2 text-sm font-medium hidden sm:inline">{user?.email?.split('@')[0] || 'User'}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
