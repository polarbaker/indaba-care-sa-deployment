import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { LotusPetal } from "~/components/ui/LotusPetal";
import { motion } from "framer-motion";

const parentNavigation = [
  {
    name: "Dashboard",
    to: "/parent/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "Family Profile",
    to: "/parent/family/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    name: "Children",
    to: "/parent/children/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
  {
    name: "Observations",
    to: "/parent/observations/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/parent/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Resources Hub",
    to: "/parent/resources/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    name: "Milestones",
    to: "/parent/milestones/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

export const Route = createFileRoute("/parent/dashboard/")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const { user, token } = useAuthStore();
  
  // Fetch children data
  const { 
    data: childrenData, 
    isLoading: isLoadingChildren 
  } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    { 
      enabled: !!token,
      onError: (error) => {
        console.error("Error fetching children:", error);
      }
    }
  );
  
  // Fetch recent observations
  const { 
    data: recentObservationsData, 
    isLoading: isLoadingObservations 
  } = api.getObservations.useQuery(
    { 
      token: token || "",
      limit: 5 
    },
    { 
      enabled: !!token,
      onError: (error) => {
        console.error("Error fetching observations:", error);
      }
    }
  );
  
  // Fetch unread message count
  const { 
    data: conversationsData,
    isLoading: isLoadingConversations 
  } = api.getConversations.useQuery(
    { token: token || "" },
    { 
      enabled: !!token,
      onError: (error) => {
        console.error("Error fetching conversations:", error);
      }
    }
  );
  
  // Calculate total unread messages
  const unreadMessageCount = conversationsData 
    ? conversationsData.reduce((total, conv) => total + conv.unreadCount, 0)
    : 0;
  
  // Get the count of children
  const childrenCount = childrenData?.children.length || 0;
  
  // Get the count of new observations (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const newObservationsCount = recentObservationsData?.data.filter(
    obs => new Date(obs.createdAt) > oneDayAgo
  ).length || 0;
  
  // Get time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  return (
    <DashboardLayout 
      title="Parent Dashboard" 
      navigation={parentNavigation}
    >
      <div className="space-y-6">
        {/* Welcome section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-primary to-primary-light rounded-xl shadow-lg overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 opacity-10">
            <LotusPetal color="white" width={120} height={120} />
          </div>
          <div className="px-6 py-8 sm:p-10 sm:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {getGreeting()}, {user?.firstName}!
                </h2>
                <p className="mt-2 text-white text-opacity-80">
                  Here's what's happening with your children today.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-primary bg-opacity-20 sm:px-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white text-opacity-90">
                You have {childrenCount} {childrenCount === 1 ? 'child' : 'children'} and {unreadMessageCount} unread {unreadMessageCount === 1 ? 'message' : 'messages'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white hover:bg-opacity-20"
                onClick={() => window.location.href = '/parent/messages/'}
              >
                Check messages →
              </Button>
            </div>
          </div>
        </motion.div>
        
        {/* Stats overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-surface rounded-card shadow-card"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Children
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-text-primary">
                    {isLoadingChildren ? (
                      <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
                    ) : (
                      childrenCount
                    )}
                  </dd>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <Link
                  to="/parent/children/"
                  className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
                >
                  View all →
                </Link>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-surface rounded-card shadow-card"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    New Observations (24h)
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-text-primary">
                    {isLoadingObservations ? (
                      <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
                    ) : (
                      newObservationsCount
                    )}
                  </dd>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <Link
                  to="/parent/observations/"
                  className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
                >
                  View all →
                </Link>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-surface rounded-card shadow-card"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-light rounded-md p-3">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-text-secondary truncate">
                    Unread Messages
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-text-primary">
                    {isLoadingConversations ? (
                      <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
                    ) : (
                      unreadMessageCount
                    )}
                  </dd>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <Link
                  to="/parent/messages/"
                  className="text-primary hover:text-primary-light font-medium transition-colors duration-150"
                >
                  View all →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Children section */}
        <Card
          title="Your Children"
          titleAction={
            <Link
              to="/parent/children/add"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-on-primary shadow-sm hover:bg-opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-150"
            >
              <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Child
            </Link>
          }
        >
          {isLoadingChildren ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !childrenData?.children.length ? (
            <div className="text-center text-text-secondary">
              You haven't added any children yet. Click "Add Child" to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {childrenData.children.map((child) => (
                <li key={child.id} className="py-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary">
                        {child.firstName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-text-primary">
                          {child.firstName} {child.lastName}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {/* Age calculation would go here in a real implementation */}
                          Child details
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/parent/children/${child.id}`}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-text-primary bg-white hover:bg-gray-50 transition-colors duration-150"
                    >
                      View details
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        
        {/* Recent observations */}
        <Card
          title="Recent Observations"
          titleAction={
            <Link
              to="/parent/observations/"
              className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-150"
            >
              View all
            </Link>
          }
        >
          {isLoadingObservations ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !recentObservationsData?.data.length ? (
            <div className="text-center text-text-secondary">
              No recent observations to display.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentObservationsData.data.slice(0, 3).map((observation) => {
                // Parse aiTags if it exists and is a string
                const tags = observation.aiTags ? 
                  (() => {
                    try { return JSON.parse(observation.aiTags); } 
                    catch { return []; }
                  })() : [];
                  
                return (
                  <li key={observation.id} className="py-4 hover:bg-gray-50 transition-colors duration-150">
                    <div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-text-primary">
                          {observation.childName}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {new Date(observation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-text-secondary">
                        {observation.content.length > 150 
                          ? `${observation.content.substring(0, 150)}...` 
                          : observation.content}
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="inline-flex items-center rounded-md bg-primary-light px-2 py-1 text-xs font-medium text-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2">
                        <Link
                          to={`/parent/observations/${observation.id}`}
                          className="text-sm font-medium text-primary hover:text-primary-light transition-colors duration-150"
                        >
                          View details →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        
        {/* Upcoming milestones */}
        <Card title="Upcoming Milestones">
          <div className="text-center text-text-secondary">
            No upcoming milestones to display.
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
