import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import toast from "react-hot-toast";

// Import custom components
import { ReportGenerationModal } from "~/components/admin/ReportGenerationModal";
import { UserDetailsSidebar } from "~/components/admin/UserDetailsSidebar";
import { AddUserModal } from "~/components/admin/AddUserModal";
import { AddResourceModal } from "~/components/admin/AddResourceModal";
import { AddAgencyModal } from "~/components/admin/AddAgencyModal";
import { ActivityFeed } from "~/components/admin/ActivityFeed";

export const adminNavigation = [
  {
    name: "Dashboard",
    to: "/admin/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "Users",
    to: "/admin/users/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    name: "Moderation",
    to: "/admin/moderation/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    name: "Content",
    to: "/admin/content/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    name: "Resources Hub",
    to: "/admin/resources/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    name: "Reports",
    to: "/admin/reports/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    name: "Agencies",
    to: "/admin/agencies/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    name: "Settings",
    to: "/admin/settings/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export const Route = createFileRoute("/admin/dashboard/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, token } = useAuthStore();
  const { isOnline } = useSyncStore();
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isAddAgencyModalOpen, setIsAddAgencyModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Stats for the dashboard
  const [stats, setStats] = useState({
    totalUsers: 0,
    nannies: 0,
    parents: 0,
    observations: 0,
    certifications: 0,
    pendingFlags: 0,
    recentUsers: [] as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
      lastLoginAt?: string;
      profileImageUrl?: string;
    }>,
    recentActivity: [] as Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
    }>
  });
  
  // Fetch dashboard data using tRPC
  const { data: dashboardData, isLoading, refetch } = api.getAdminDashboardStats.useQuery(
    { token: token || "" },
    { 
      enabled: !!token && isOnline,
      onSuccess: (data) => {
        setStats({
          totalUsers: data.totalUsers,
          nannies: data.nannies,
          parents: data.parents,
          observations: data.observations,
          certifications: data.certifications,
          pendingFlags: data.pendingFlags,
          recentUsers: data.recentUsers,
          recentActivity: data.recentActivity
        });
        setStatsLoading(false);
      },
      onError: (error) => {
        console.error("Error fetching dashboard stats:", error);
        toast.error("Failed to load dashboard statistics");
        setStatsLoading(false);
      }
    }
  );
  
  // Handle offline mode
  useEffect(() => {
    if (!isOnline) {
      setStatsLoading(false);
      toast.error("You are offline. Some dashboard statistics may not be available.");
    }
  }, [isOnline]);
  
  // Handle user click in recent users
  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserSidebarOpen(true);
  };
  
  // Render skeleton loader for metrics cards
  const renderMetricSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
      <div className="h-8 w-16 bg-gray-300 rounded"></div>
    </div>
  );
  
  return (
    <DashboardLayout 
      title="Admin Dashboard" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Welcome, {user?.firstName}!</h2>
              <p className="mt-1 text-gray-500">
                Here's an overview of the Indaba Care system.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => refetch()}
                isLoading={isLoading}
                disabled={!isOnline}
                aria-label="Refresh dashboard data"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsReportModalOpen(true)}
                aria-label="Generate a new report"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Generate Report
              </Button>
            </div>
          </div>
        </div>
        
        {/* Metrics Cards (Top Row) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Total Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.totalUsers}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/users/" className="font-medium text-blue-600 hover:text-blue-500">
                  View all users
                </Link>
              </div>
            </div>
          </div>
          
          {/* Nannies */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Nannies
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.nannies}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/users/?role=NANNY" className="font-medium text-blue-600 hover:text-blue-500">
                  View all nannies
                </Link>
              </div>
            </div>
          </div>
          
          {/* Parents */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Parents
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.parents}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/users/?role=PARENT" className="font-medium text-blue-600 hover:text-blue-500">
                  View all parents
                </Link>
              </div>
            </div>
          </div>
          
          {/* Pending Flags */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Flags
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.pendingFlags}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/moderation/" className="font-medium text-blue-600 hover:text-blue-500">
                  View moderation queue
                </Link>
              </div>
            </div>
          </div>
          
          {/* Total Observations */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Observations
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.observations}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/reports/?type=observations" className="font-medium text-blue-600 hover:text-blue-500">
                  View observations report
                </Link>
              </div>
            </div>
          </div>
          
          {/* Active Certifications */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Certifications
                  </dt>
                  <dd className="flex items-baseline">
                    {statsLoading ? (
                      renderMetricSkeleton()
                    ) : (
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.certifications}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link to="/admin/reports/?type=certifications" className="font-medium text-blue-600 hover:text-blue-500">
                  View certifications report
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Users Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Users</h3>
            <Link to="/admin/users/?sort=createdAt:desc">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="View all users"
              >
                View All
              </Button>
            </Link>
          </div>
          <div className="border-t border-gray-200">
            {statsLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : stats.recentUsers.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {stats.recentUsers.map((user) => (
                  <li key={user.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleUserClick(user.id)}>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {user.profileImageUrl ? (
                          <img 
                            className="h-10 w-10 rounded-full" 
                            src={user.profileImageUrl} 
                            alt={`${user.name}'s avatar`} 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                            {user.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'NANNY' 
                            ? 'bg-green-100 text-green-800' 
                            : user.role === 'PARENT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {user.lastLoginAt ? (
                          <span>Last login: {formatTimeAgo(user.lastLoginAt)}</span>
                        ) : (
                          <span>Created: {formatTimeAgo(user.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No users to display.
              </div>
            )}
          </div>
        </div>
        
        {/* System Activity Feed */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">System Activity</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <ActivityFeed 
              initialEvents={stats.recentActivity} 
              isLoading={statsLoading}
            />
          </div>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                type="button"
                fullWidth
                onClick={() => setIsAddUserModalOpen(true)}
                aria-label="Add a new user"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Add User
              </Button>
              
              <Button
                type="button"
                fullWidth
                onClick={() => setIsAddResourceModalOpen(true)}
                aria-label="Add a new resource"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                Add Resource
              </Button>
              
              <Button
                type="button"
                fullWidth
                onClick={() => setIsAddAgencyModalOpen(true)}
                aria-label="Add a new agency"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
                Add Agency
              </Button>
              
              <Link to="/admin/moderation/" className="contents">
                <Button
                  type="button"
                  fullWidth
                  variant={stats.pendingFlags > 0 ? "danger" : "primary"}
                  aria-label="View moderation queue"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {stats.pendingFlags > 0 ? `Moderation Queue (${stats.pendingFlags})` : "Moderation Queue"}
                </Button>
              </Link>
              
              <Button
                type="button"
                fullWidth
                onClick={() => setIsReportModalOpen(true)}
                aria-label="Generate a new report"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Generate Report
              </Button>
              
              <Link to="/admin/settings/" className="contents">
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  aria-label="View system settings"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  System Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <ReportGenerationModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
      
      <UserDetailsSidebar 
        isOpen={isUserSidebarOpen} 
        onClose={() => setIsUserSidebarOpen(false)}
        userId={selectedUserId || ""}
      />
      
      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={() => refetch()}
      />
      
      <AddResourceModal 
        isOpen={isAddResourceModalOpen} 
        onClose={() => setIsAddResourceModalOpen(false)}
        onResourceAdded={() => refetch()}
      />
      
      <AddAgencyModal 
        isOpen={isAddAgencyModalOpen} 
        onClose={() => setIsAddAgencyModalOpen(false)}
        onAgencyAdded={() => refetch()}
      />
    </DashboardLayout>
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
  
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, just return the formatted date
  return date.toLocaleDateString();
}
