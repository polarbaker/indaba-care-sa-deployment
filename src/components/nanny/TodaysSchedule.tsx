import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";

type ScheduleItem = {
  id: string;
  type: "shift" | "routine";
  date: string;
  // For shifts
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  breakMinutes?: number;
  familyId?: string;
  familyName?: string;
  status?: string;
  // For routines
  routineId?: string;
  title?: string;
  description?: string;
  time?: string;
  isRecurring?: boolean;
  recurringDay?: string;
  childId?: string;
  childName?: string;
};

interface TodaysScheduleProps {
  onLogHours: () => void;
}

export function TodaysSchedule({ onLogHours }: TodaysScheduleProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuthStore();
  
  // Get today's date range
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get next 3 days for upcoming schedule
  const nextDays = Array.from({ length: 3 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    return date;
  });
  
  // Fetch schedule data
  const { 
    data: scheduleData,
    isLoading,
    refetch,
  } = api.getSchedule.useQuery(
    {
      token: token || "",
      startDate: today.toISOString(),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
    },
    {
      enabled: !!token,
      refetchInterval: 60000, // Refetch every minute
    }
  );
  
  // Check for active shift
  const { 
    data: activeShiftData,
    isLoading: isLoadingActiveShift,
  } = api.getCurrentShift.useQuery(
    { token: token || "" },
    { 
      enabled: !!token,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  
  // Get today's schedule items
  const todayKey = today.toISOString().split('T')[0];
  const todaysItems = scheduleData?.scheduleByDate[todayKey] || [];
  
  // Get upcoming schedule items
  const upcomingItems = nextDays.map(date => {
    const dateKey = date.toISOString().split('T')[0];
    return {
      date,
      items: scheduleData?.scheduleByDate[dateKey] || [],
    };
  });
  
  // Check if there are any events today
  const hasEventsToday = todaysItems.length > 0 || activeShiftData?.hasActiveShift;
  
  return (
    <div className="space-y-6">
      {/* Today's schedule */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(today)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </Button>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          {isLoading || isLoadingActiveShift ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading schedule...</p>
            </div>
          ) : !hasEventsToday ? (
            <div className="text-center py-10">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled events today</h3>
              <p className="mt-1 text-sm text-gray-500">
                Use the button below to log your working hours.
              </p>
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={onLogHours}
                >
                  <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Log Hours
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active shift */}
              {activeShiftData?.hasActiveShift && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-md font-medium text-blue-800">
                        Active Shift
                      </h4>
                      <p className="text-sm text-blue-600">
                        Started at {new Date(activeShiftData.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {activeShiftData.shift.familyName && (
                        <p className="text-sm text-blue-600">
                          Family: {activeShiftData.shift.familyName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-800">
                        {Math.floor(activeShiftData.shift.durationMinutes / 60)}h {activeShiftData.shift.durationMinutes % 60}m
                      </div>
                      {activeShiftData.shift.breakMinutes > 0 && (
                        <div className="text-xs text-blue-600">
                          {activeShiftData.shift.breakMinutes}m break
                        </div>
                      )}
                      {activeShiftData.shift.isPaused && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Today's events */}
              <div className="divide-y divide-gray-200">
                {todaysItems.map((item) => (
                  <div key={item.id} className="py-3">
                    {item.type === "shift" ? (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              Work Shift
                            </span>
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${item.status === "APPROVED" ? "bg-green-100 text-green-800" : 
                                item.status === "REJECTED" ? "bg-red-100 text-red-800" : 
                                "bg-yellow-100 text-yellow-800"}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.startTime} - {item.endTime}
                          </p>
                          {item.familyName && (
                            <p className="text-sm text-gray-500">
                              Family: {item.familyName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {Math.floor((item.durationMinutes || 0) / 60)}h {(item.durationMinutes || 0) % 60}m
                          </span>
                          {(item.breakMinutes || 0) > 0 && (
                            <p className="text-xs text-gray-500">
                              {item.breakMinutes}m break
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {item.title}
                            </span>
                            {item.isRecurring && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Recurring
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.time}
                          </p>
                          {item.childName && (
                            <p className="text-sm text-gray-500">
                              Child: {item.childName}
                            </p>
                          )}
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Upcoming schedule */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Schedule</h3>
          <p className="mt-1 text-sm text-gray-500">
            Next 3 days
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading upcoming schedule...</p>
            </div>
          ) : upcomingItems.every(day => day.items.length === 0) ? (
            <div className="text-center py-6 text-gray-500">
              <p>No upcoming scheduled events.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingItems.map((day) => (
                <div key={day.date.toISOString()}>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    {formatDate(day.date)}
                  </h4>
                  
                  {day.items.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No events scheduled
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {day.items.map((item) => (
                        <div key={item.id} className="py-3">
                          {item.type === "shift" ? (
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-900">
                                    Work Shift
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.startTime} - {item.endTime}
                                </p>
                                {item.familyName && (
                                  <p className="text-sm text-gray-500">
                                    Family: {item.familyName}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium text-gray-900">
                                  {Math.floor((item.durationMinutes || 0) / 60)}h {(item.durationMinutes || 0) % 60}m
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-900">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.time}
                                </p>
                                {item.childName && (
                                  <p className="text-sm text-gray-500">
                                    Child: {item.childName}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
