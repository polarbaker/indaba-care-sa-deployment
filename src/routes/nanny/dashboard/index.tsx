import { useState, useEffect } from "react";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { motion } from "framer-motion";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ObservationFeed } from "~/components/observations/ObservationFeed";
import { TodaysSchedule } from "~/components/nanny/TodaysSchedule";
import { HoursLogModal } from "~/components/nanny/HoursLogModal";
import { LotusPetal } from "~/components/ui/LotusPetal";
import { Card } from "~/components/ui/Card";
import toast from "react-hot-toast";

const nannyNavigation = [
  {
    name: "Dashboard",
    to: "/nanny/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/nanny/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Observations & Notes",
    to: "/nanny/observations-notes/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/nanny/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Professional Dev",
    to: "/nanny/professional-development/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: "Hours Log",
    to: "/nanny/hours-log/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// Store for persisting the selected tab
interface DashboardTabState {
  activeTab: 'overview' | 'families' | 'observations' | 'schedule';
  setActiveTab: (tab: 'overview' | 'families' | 'observations' | 'schedule') => void;
}

const useDashboardTabStore = create<DashboardTabState>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "nanny-dashboard-tab",
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (e) {
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

export const Route = createFileRoute("/nanny/dashboard/")({
  component: NannyDashboard,
});

function NannyDashboard() {
  const { user, token } = useAuthStore();
  const { isOnline } = useSyncStore();
  const router = useRouter();
  const { activeTab, setActiveTab } = useDashboardTabStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  
  // Fetch assigned children
  const { 
    data: childrenData, 
    isLoading: isLoadingChildren,
    refetch: refetchChildren
  } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );
  
  // Fetch recent observations
  const { 
    data: recentObservationsData, 
    isLoading: isLoadingObservations,
    refetch: refetchObservations
  } = api.getObservations.useQuery(
    { token: token || "", limit: 5 },
    { enabled: !!token }
  );
  
  // Fetch conversations with unread messages
  const { 
    data: conversationsData, 
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = api.getConversations.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );
  
  // Fetch current shift status
  const { 
    data: activeShiftData,
    isLoading: isLoadingActiveShift,
    refetch: refetchActiveShift
  } = api.getCurrentShift.useQuery(
    { token: token || "" },
    { 
      enabled: !!token,
      refetchInterval: 60000, // Refetch every minute
    }
  );
  
  // Calculate unread message count
  const unreadMessageCount = conversationsData 
    ? conversationsData.reduce((total, conv) => total + conv.unreadCount, 0)
    : 0;
  
  // Handle refresh action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchChildren(),
        refetchObservations(),
        refetchConversations(),
        refetchActiveShift()
      ]);
      toast.success("Dashboard refreshed");
    } catch (error) {
      toast.error("Failed to refresh dashboard");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Get time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  // Get today's date in a readable format
  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Open hours log modal
  const handleOpenHoursModal = () => {
    setIsHoursModalOpen(true);
  };
  
  // Close hours log modal
  const handleCloseHoursModal = () => {
    setIsHoursModalOpen(false);
    refetchActiveShift();
  };
  
  return (
    <DashboardLayout 
      title="Nanny Dashboard" 
      navigation={nannyNavigation}
    >
      {/* Metrics Row */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface rounded-card shadow-card overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Assigned Families
                  </dt>
                  <dd>
                    <div className="text-lg font-semibold text-text-primary">
                      {isLoadingChildren ? (
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        new Set(childrenData?.children.map(child => child.familyId)).size || 0
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <button
                onClick={() => setActiveTab('families')}
                className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
              >
                View all →
              </button>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-surface rounded-card shadow-card overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Assigned Children
                  </dt>
                  <dd>
                    <div className="text-lg font-semibold text-text-primary">
                      {isLoadingChildren ? (
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        childrenData?.children.length || 0
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <button
                onClick={() => setActiveTab('families')}
                className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
              >
                View all →
              </button>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-surface rounded-card shadow-card overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Recent Observations
                  </dt>
                  <dd>
                    <div className="text-lg font-semibold text-text-primary">
                      {isLoadingObservations ? (
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        recentObservationsData?.data.length || 0
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <button
                onClick={() => setActiveTab('observations')}
                className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
              >
                View all →
              </button>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-surface rounded-card shadow-card overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Unread Messages
                  </dt>
                  <dd>
                    <div className="text-lg font-semibold text-text-primary">
                      {isLoadingConversations ? (
                        <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        unreadMessageCount
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <Link
                to="/nanny/messages/"
                className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
              >
                View all →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Refresh button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRefreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh Dashboard
            </>
          )}
        </button>
      </div>
      
      {/* Welcome header */}
      <div className="mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-primary to-primary-light rounded-xl shadow-lg overflow-hidden relative"
        >
          <div className="absolute top-5 right-5 opacity-10">
            <LotusPetal color="white" width={120} height={120} />
          </div>
          <div className="px-6 py-8 sm:p-10 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {getGreeting()}, {user?.firstName}!
                </h2>
                <p className="mt-2 text-white text-opacity-80">
                  {getTodayDate()}
                </p>
              </div>
              <div className="hidden sm:block h-24 w-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-primary bg-opacity-20 sm:px-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white text-opacity-90">
                You have {childrenData?.children.length || 0} assigned children and {unreadMessageCount} unread messages
              </p>
              <button
                onClick={() => router.navigate({ to: "/nanny/messages/" })}
                className="text-sm font-medium text-white hover:text-white hover:underline transition-colors"
              >
                Check messages →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Dashboard tabs */}
      <div className="mb-6">
        <div className="sm:hidden">
          <select
            id="tabs"
            name="tabs"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
          >
            <option value="overview">Overview</option>
            <option value="families">Assigned Families</option>
            <option value="observations">Recent Observations</option>
            <option value="schedule">Today's Schedule</option>
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('families')}
                className={`${
                  activeTab === 'families'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150`}
              >
                Assigned Families
              </button>
              <button
                onClick={() => setActiveTab('observations')}
                className={`${
                  activeTab === 'observations'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150`}
              >
                Recent Observations
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`${
                  activeTab === 'schedule'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-150`}
              >
                Today's Schedule
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Overview tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick actions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-surface rounded-card shadow-card overflow-hidden"
          >
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-text-primary font-heading">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <button
                  onClick={() => router.navigate({ to: "/nanny/observations-notes/" })}
                  className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center space-y-3 hover:border-primary hover:ring-1 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                >
                  <div className="bg-primary-light rounded-lg p-3">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-text-primary">New Observation</span>
                </button>
                
                <button
                  onClick={() => router.navigate({ to: "/nanny/messages/" })}
                  className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center space-y-3 hover:border-primary hover:ring-1 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                >
                  <div className="bg-primary-light rounded-lg p-3">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-text-primary">Send Message</span>
                </button>
                
                <button
                  onClick={handleOpenHoursModal}
                  className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center space-y-3 hover:border-primary hover:ring-1 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                >
                  <div className="bg-primary-light rounded-lg p-3">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-text-primary">Log Hours</span>
                </button>
                
                <button
                  onClick={() => router.navigate({ to: "/nanny/professional-development/" })}
                  className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center space-y-3 hover:border-primary hover:ring-1 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-150"
                >
                  <div className="bg-primary-light rounded-lg p-3">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-text-primary">Resources</span>
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Active shift status (if any) */}
          {activeShiftData?.hasActiveShift && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-primary-light border border-primary border-opacity-20 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-primary">
                    Active Shift In Progress
                  </h3>
                  <p className="text-sm text-text-primary">
                    Started at {new Date(activeShiftData.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {activeShiftData.shift.familyName && ` • ${activeShiftData.shift.familyName}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {Math.floor(activeShiftData.shift.durationMinutes / 60)}h {activeShiftData.shift.durationMinutes % 60}m
                  </div>
                  {activeShiftData.shift.isPaused && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Currently Paused
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleOpenHoursModal}
                  className="inline-flex items-center px-3 py-1.5 border border-primary shadow-sm text-sm font-medium rounded-md text-primary bg-white hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-150"
                >
                  Manage Shift
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Recent activity */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-surface rounded-card shadow-card overflow-hidden"
          >
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-text-primary font-heading">Recent Activity</h3>
              <button 
                className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-150"
                onClick={() => router.navigate({ to: "/nanny/observations-notes/" })}
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoadingObservations ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="p-6">
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                      <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : recentObservationsData?.data && recentObservationsData.data.length > 0 ? (
                recentObservationsData.data.slice(0, 3).map((observation) => (
                  <div key={observation.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                          {observation.childName?.charAt(0) || "C"}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-text-primary">
                            Observation for {observation.childName}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {new Date(observation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                          {observation.content}
                        </p>
                        <div className="mt-2 flex">
                          <button
                            onClick={() => router.navigate({ to: `/nanny/observations/${observation.id}` })}
                            className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-150"
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-text-secondary">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-text-primary">No recent activity</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Get started by creating a new observation.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => router.navigate({ to: "/nanny/observations-notes/" })}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-on-primary bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-150"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      New Observation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Families tab content */}
      {activeTab === 'families' && (
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Assigned Families & Children</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {isLoadingChildren ? "Loading..." : `${new Set(childrenData?.children.map(child => child.familyId)).size || 0} families, ${childrenData?.children.length || 0} children`}
                </span>
              </div>
            </div>
            
            <div>
              {isLoadingChildren ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ) : childrenData?.children && childrenData.children.length > 0 ? (
                <div>
                  {/* Group children by family */}
                  {Array.from(
                    (childrenData?.children || []).reduce((familiesMap, child) => {
                      const familyKey = child.familyId || 'unknown';
                      if (!familiesMap.has(familyKey)) {
                        familiesMap.set(familyKey, {
                          id: child.familyId,
                          name: child.parentFirstName && child.parentLastName ? `${child.parentFirstName} ${child.parentLastName} Family` : 'Unknown Family',
                          address: child.address || 'No address provided',
                          // Placeholder for next scheduled visit
                          nextScheduledVisit: 'Not scheduled', 
                          children: []
                        });
                      }
                      familiesMap.get(familyKey)!.children.push(child);
                      return familiesMap;
                    }, new Map<string, any>())
                  ).map(([familyId, familyData], index) => (
                    <div key={familyId} className={index > 0 ? 'border-t border-gray-200' : ''}>
                      <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                        <div>
                          <h4 className="text-md font-medium text-gray-900">{familyData.name}</h4>
                          <p className="text-sm text-gray-500">{familyData.address}</p>
                          <p className="text-xs text-gray-400 mt-1">Next visit: {familyData.nextScheduledVisit}</p>
                        </div>
                        <button
                          onClick={() => {
                            // In a real implementation, navigate to family profile
                            toast.info("Family profile view not implemented yet");
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          View Family
                        </button>
                      </div>
                      <ul className="divide-y divide-gray-200">
                        {familyData.children.map((child: any) => (
                          <li key={child.id} className="px-6 py-4 flex items-center hover:bg-gray-50">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                {child.firstName.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{child.firstName} {child.lastName}</p>
                                  <p className="text-xs text-gray-500">
                                    {child.birthDate ? `${new Date().getFullYear() - new Date(child.birthDate).getFullYear()} years old` : 'Age not set'}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => router.navigate({ to: `/nanny/observations-notes/`, search: { childId: child.id } })}
                                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  >
                                    Add observation
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No families assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any families assigned to you yet.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Observations tab content */}
      {activeTab === 'observations' && (
        <div className="space-y-6">
          {!isLoadingObservations && recentObservationsData ? (
            <ObservationFeed
              initialObservations={recentObservationsData.data}
              hasNextPage={!!recentObservationsData.nextCursor}
              isLoading={isLoadingObservations}
              availableChildren={childrenData?.children || []}
              userRole="NANNY"
            />
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading observations...</p>
            </div>
          )}
        </div>
      )}
      
      {/* Schedule tab content */}
      {activeTab === 'schedule' && (
        <TodaysSchedule onLogHours={handleOpenHoursModal} />
      )}
      
      {/* Hours Log Modal */}
      <HoursLogModal 
        isOpen={isHoursModalOpen} 
        onClose={handleCloseHoursModal} 
        onSuccess={() => {
          refetchActiveShift();
          if (activeTab === 'schedule') {
            // Refresh schedule data if on schedule tab
          }
        }}
      />
    </DashboardLayout>
  );
}
