import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LogOut, User as UserIcon, Info, Home as HomeIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <FileText size={24} />
        <span>DocuRAG</span>
      </Link>

      <nav className="navbar-links">
        <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <HomeIcon size={16} />
          <span>Home</span>
        </Link>

        {isAuthenticated && user && (
          <Link to="/app" className={`nav-link ${isActive('/app') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LayoutDashboard size={16} />
            <span>Workspace</span>
          </Link>
        )}

        <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Info size={16} />
          <span>About</span>
        </Link>

        {isAuthenticated && user ? (
          <>
            <div className="user-badge" style={{ marginLeft: '6px' }} title={user.email}>
              <UserIcon size={14} />
              <span>{user.name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.825rem' }}
              title="Sign out"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link" style={{ marginLeft: '6px' }}>
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary"
              style={{ width: 'auto', padding: '7px 16px', fontSize: '0.85rem' }}
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};
