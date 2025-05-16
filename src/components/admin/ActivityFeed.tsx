import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";

interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  resourceId?: string;
  contentId?: string;
}

interface ActivityFeedProps {
  initialEvents?: ActivityEvent[];
  isLoading?: boolean;
}

export function ActivityFeed({ initialEvents = [], isLoading = false }: ActivityFeedProps) {
  const { token } = useAuthStore();
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  
  // Get all unique event types
  const eventTypes = Array.from(new Set(events.map(event => event.type)));
  
  // Filter events based on active filters
  const filteredEvents = activeFilters.length > 0
    ? events.filter(event => activeFilters.includes(event.type))
    : events;
  
  // Toggle a filter
  const toggleFilter = (type: string) => {
    setActiveFilters(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setActiveFilters([]);
  };
  
  // Subscribe to real-time activity events
  const subscription = api.getActivityStream.useSubscription(
    { token: token || "" },
    {
      enabled: isRealTimeEnabled && !!token,
      onData: (newEvent) => {
        setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
      }
    }
  );
  
  // Fallback to polling if subscriptions aren't supported or enabled
  useEffect(() => {
    if (!isRealTimeEnabled || !token) return;
    
    // Poll for new events every 30 seconds as a fallback
    const interval = setInterval(() => {
      // Only poll if subscription isn't active
      if (!subscription.data) {
        api.getAdminDashboardStats.query({ token })
          .then(data => {
            if (data.recentActivity) {
              setEvents(data.recentActivity);
            }
          })
          .catch(error => {
            console.error("Error polling for activity:", error);
          });
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isRealTimeEnabled, token, subscription.data]);
  
  // Update events when initialEvents changes
  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);
  
  // Get icon for event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'user_created':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        );
      case 'user_login':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        );
      case 'observation_created':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'content_flagged':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        );
      case 'certification_added':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        );
      case 'report_generated':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
      case 'resource_added':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        );
      case 'milestone_achieved':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
        );
      case 'data_sync':
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        );
    }
  };
  
  // Get background color for event type
  const getEventColor = (type: string) => {
    switch (type) {
      case 'user_created':
        return 'bg-green-500';
      case 'user_login':
        return 'bg-blue-500';
      case 'observation_created':
        return 'bg-yellow-500';
      case 'content_flagged':
        return 'bg-red-500';
      case 'certification_added':
        return 'bg-indigo-500';
      case 'report_generated':
        return 'bg-purple-500';
      case 'resource_added':
        return 'bg-teal-500';
      case 'milestone_achieved':
        return 'bg-orange-500';
      case 'data_sync':
        return 'bg-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Format event type for display
  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        
        {eventTypes.map(type => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              activeFilters.includes(type)
                ? `${getEventColor(type)} text-white`
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {formatEventType(type)}
          </button>
        ))}
        
        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 ml-2"
          >
            Clear filters
          </button>
        )}
        
        <div className="ml-auto flex items-center">
          <button
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            className={`flex items-center text-xs font-medium ${
              isRealTimeEnabled ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
              isRealTimeEnabled ? 'bg-green-600 animate-pulse' : 'bg-gray-400'
            }`}></span>
            {isRealTimeEnabled ? 'Real-time updates on' : 'Real-time updates off'}
          </button>
        </div>
      </div>
      
      {/* Activity feed */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {events.length === 0 
            ? "No activity to display." 
            : "No activity matches the current filters."}
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {filteredEvents.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== filteredEvents.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getEventColor(activity.type)}`}>
                        {getEventIcon(activity.type)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
