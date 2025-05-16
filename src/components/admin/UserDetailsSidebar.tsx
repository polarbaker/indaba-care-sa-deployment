import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import toast from "react-hot-toast";

interface UserDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface UserDetails {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  location?: string;
  certifications?: number;
  observations?: number;
}

export function UserDetailsSidebar({ isOpen, onClose, userId }: UserDetailsSidebarProps) {
  const { token } = useAuthStore();
  const [user, setUser] = useState<UserDetails | null>(null);
  
  // Fetch user details
  const { data: userData, isLoading, error } = api.getAdminUser.useQuery(
    { token: token || "", userId },
    { 
      enabled: isOpen && !!token && !!userId,
      onSuccess: (data) => {
        setUser(data);
      },
      onError: (err) => {
        toast.error(`Failed to load user details: ${err.message}`);
      }
    }
  );
  
  // Reset state when sidebar is closed
  useEffect(() => {
    if (!isOpen) {
      setUser(null);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden z-40">
      <div className="absolute inset-0 overflow-hidden">
        {/* Background overlay */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        ></div>
        
        {/* Sidebar panel */}
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="relative w-screen max-w-md">
            <div className="h-full flex flex-col py-6 bg-white shadow-xl overflow-y-auto">
              {/* Header with close button */}
              <div className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    User Details
                  </h2>
                  <div className="ml-3 h-7 flex items-center">
                    <button
                      onClick={onClose}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className="sr-only">Close panel</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* User details content */}
              <div className="mt-6 relative flex-1 px-4 sm:px-6">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="mt-2 text-gray-500">Failed to load user details.</p>
                    <Button 
                      className="mt-3" 
                      size="sm" 
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : user ? (
                  <div className="space-y-6">
                    {/* User avatar and basic info */}
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-medium">
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt={`${user.firstName} ${user.lastName}`}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          user.firstName?.charAt(0) || user.email?.charAt(0) || "U"
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {user.email}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          user.role === 'NANNY' 
                            ? 'bg-green-100 text-green-800' 
                            : user.role === 'PARENT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* User details */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Account ID</p>
                        <p className="text-sm font-medium text-gray-900">{user.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Joined</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString()} ({formatTimeAgo(user.createdAt)})
                        </p>
                      </div>
                      {user.lastLoginAt && (
                        <div>
                          <p className="text-xs text-gray-500">Last Login</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(user.lastLoginAt).toLocaleString()} ({formatTimeAgo(user.lastLoginAt)})
                          </p>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{user.phoneNumber}</p>
                        </div>
                      )}
                      {user.location && (
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium text-gray-900">{user.location}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Stats for nannies */}
                    {user.role === 'NANNY' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500">Certifications</p>
                          <p className="text-2xl font-semibold text-blue-600">{user.certifications || 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-gray-500">Observations</p>
                          <p className="text-2xl font-semibold text-blue-600">{user.observations || 0}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex space-x-3">
                        <Link 
                          to={`/admin/users/${user.id}`}
                          className="flex-1"
                        >
                          <Button fullWidth>
                            View Full Profile
                          </Button>
                        </Link>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            // This would be implemented with actual messaging functionality
                            toast.success(`Message sent to ${user.email}`);
                          }}
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No user data found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths < 12) return `${diffMonths} months ago`;
  return `${diffYears} years ago`;
}
