import { ReactNode, useState, useEffect } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { AIStatusBanner } from "~/components/ui/AIStatusBanner";
import { motion, AnimatePresence } from "framer-motion";
import { LotusPetal } from "~/components/ui/LotusPetal";

interface NavItem {
  name: string;
  to: string;
  icon: (className: string) => JSX.Element;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navigation: NavItem[];
}

export function DashboardLayout({ children, title, navigation }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuthStore();
  const { isOnline, pendingOperations } = useSyncStore();
  const router = useRouter();
  
  // Check if we're on mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const handleLogout = () => {
    logout();
    void router.navigate({ to: "/" });
  };
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      if (sidebarOpen && sidebar && !sidebar.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };
    
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-secondary bg-opacity-75 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            id="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 flex z-40 w-full max-w-xs flex-col bg-surface md:hidden"
          >
            <div className="h-full flex flex-col overflow-y-auto bg-surface shadow-xl">
              <div className="px-4 pt-6 pb-4 flex items-center justify-between">
                <Link to="/" className="flex-shrink-0 flex items-center">
                  <svg className="h-8 w-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span className="ml-2 text-xl font-bold text-text-primary font-heading">Indaba Care</span>
                </Link>
                <button
                  className="rounded-md text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* User profile */}
              <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary-light flex items-center justify-center text-on-primary font-medium">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {user?.role === "NANNY" ? "Nanny" : user?.role === "PARENT" ? "Parent" : "Admin"}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex-shrink-0 p-1 rounded-full text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                  >
                    <span className="sr-only">Log out</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Mobile navigation */}
              <div className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) => 
                      `group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-light text-primary'
                          : 'text-text-primary hover:bg-primary-light hover:text-primary'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon(
                      "mr-3 flex-shrink-0 h-5 w-5"
                    )}
                    {item.name}
                  </Link>
                ))}
              </div>
              
              {/* Network status */}
              <div className="px-4 py-4 border-t border-gray-200">
                <div className="flex items-center">
                  {isOnline ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <span className="h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-600 text-sm">
                      <span className="h-2 w-2 rounded-full bg-yellow-600 mr-2"></span>
                      Offline
                      {pendingOperations.length > 0 && ` (${pendingOperations.length} pending)`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-surface">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4 relative">
            <div className="absolute top-0 right-0 opacity-5">
              <LotusPetal color="var(--color-primary)" width={80} height={80} />
            </div>
            <div className="flex flex-shrink-0 items-center px-4">
              <Link to="/" className="flex items-center">
                <svg className="h-8 w-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                <span className="ml-2 text-xl font-semibold text-text-primary font-heading">Indaba Care</span>
              </Link>
            </div>
            
            {/* User profile */}
            <div className="mt-6 px-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-primary-light flex items-center justify-center text-on-primary font-medium">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-text-primary">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {user?.role === "NANNY" ? "Nanny" : user?.role === "PARENT" ? "Parent" : "Admin"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 px-3">
              <div className="pt-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) => 
                      `group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-light text-primary'
                          : 'text-text-primary hover:bg-primary-light hover:text-primary'
                      }`
                    }
                  >
                    {item.icon(
                      "mr-3 flex-shrink-0 h-5 w-5"
                    )}
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* Network status & logout */}
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex flex-1 items-center justify-between">
              {isOnline ? (
                <span className="flex items-center text-green-600 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                  Online
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 text-sm">
                  <span className="h-2 w-2 rounded-full bg-yellow-600 mr-2"></span>
                  Offline
                  {pendingOperations.length > 0 && ` (${pendingOperations.length})`}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full p-1 text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
              >
                <span className="sr-only">Log out</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-surface shadow-sm">
          <div className="flex-shrink-0 h-16 bg-surface border-b border-gray-200 flex">
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden px-4 text-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-all duration-150"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Page title */}
            <div className="flex-1 px-4 flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-text-primary font-heading">{title}</h1>
                <div className="ml-3 opacity-10">
                  <LotusPetal color="var(--color-primary)" width={30} height={30} />
                </div>
              </div>
              
              {/* Right side actions */}
              <div className="ml-4 flex items-center md:ml-6">
                {/* Search button */}
                <button className="p-1 rounded-full text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150">
                  <span className="sr-only">Search</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                
                {/* Notifications */}
                <button className="ml-3 p-1 rounded-full text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150">
                  <span className="sr-only">View notifications</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                
                {/* Profile dropdown */}
                <div className="ml-3 relative">
                  <div>
                    <button
                      type="button"
                      className="max-w-xs rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary-light flex items-center justify-center text-on-primary font-medium">
                        {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </div>
                    </button>
                  </div>
                  
                  {/* Profile dropdown menu */}
                  <AnimatePresence>
                    {profileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <div className="py-1">
                          <Link
                            to={
                              user?.role === "NANNY" 
                                ? "/nanny/profile/" 
                                : user?.role === "PARENT" 
                                  ? "/parent/profile/" 
                                  : "/admin/settings/"
                            }
                            className="block px-4 py-2 text-sm text-text-primary hover:bg-primary-light transition-all duration-150"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            Your Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-text-primary hover:bg-primary-light transition-all duration-150"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            Settings
                          </Link>
                          <button
                            onClick={() => {
                              setProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-primary-light transition-all duration-150"
                          >
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Status Banner */}
          <AIStatusBanner />
        </div>
        
        {/* Main content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
