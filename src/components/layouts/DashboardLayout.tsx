import { ReactNode, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { AIStatusBanner } from "~/components/ui/AIStatusBanner";

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
  const { user, logout } = useAuthStore();
  const { isOnline, pendingOperations } = useSyncStore();
  const router = useRouter();
  
  const handleLogout = () => {
    logout();
    void router.navigate({ to: "/" });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? "visible" : "invisible"}`} role="dialog">
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSidebarOpen(false)}
        ></div>
        
        <div className={`relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 transition duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-shrink-0 items-center px-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Indaba Care
            </Link>
          </div>
          
          <div className="mt-5 h-0 flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) => 
                    `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon(
                    "mr-4 flex-shrink-0 h-6 w-6"
                  )}
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      
      {/* Static sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white pt-5">
          <div className="flex flex-shrink-0 items-center px-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Indaba Care
            </Link>
          </div>
          
          <div className="mt-5 flex flex-grow flex-col">
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) => 
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  {item.icon(
                    "mr-3 flex-shrink-0 h-5 w-5"
                  )}
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col md:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1 items-center">
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* Network status indicator */}
              <div className="mr-3 flex items-center">
                {isOnline ? (
                  <span className="flex items-center text-green-600 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-600 mr-1"></span>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center text-yellow-600 text-sm">
                    <span className="h-2 w-2 rounded-full bg-yellow-600 mr-1"></span>
                    Offline
                    {pendingOperations.length > 0 && ` (${pendingOperations.length} pending)`}
                  </span>
                )}
              </div>
              
              {/* Profile dropdown */}
              <div className="relative ml-3">
                <div className="flex items-center">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-700">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user?.role === "NANNY" ? "Nanny" : user?.role === "PARENT" ? "Parent" : "Admin"}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-4 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <main className="flex-1">
          {/* Add AI Status Banner here */}
          <AIStatusBanner />
          
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}