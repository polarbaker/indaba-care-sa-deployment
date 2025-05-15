import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { ObservationForm } from "~/components/observations/ObservationForm";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";

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
    name: "Observations",
    to: "/nanny/observations/",
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

export const Route = createFileRoute("/nanny/observations/")({
  component: NannyObservations,
});

function NannyObservations() {
  const [showForm, setShowForm] = useState(false);
  const utils = api.useUtils();
  
  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();

  // Fetch assigned children - in a real implementation, this would be an API endpoint
  // For now we'll use mock data but structured as if it came from an API
  const { data: childrenData, isLoading: isLoadingChildren } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        setError(`Failed to load children: ${err.message}`);
        console.error("Error fetching children:", err);
      },
      // This is a placeholder until we implement the actual API endpoint
      placeholderData: {
        children: [
          { id: "child1", firstName: "Emma", lastName: "Johnson" },
          { id: "child2", firstName: "Noah", lastName: "Williams" },
        ]
      }
    }
  );

  // Fetch observations with pagination
  const [selectedChild, setSelectedChild] = useState<string | "all">("all");
  const [observationCursor, setObservationCursor] = useState<string | undefined>(undefined);

  const { 
    data: observationsData, 
    isLoading: isLoadingObservations,
    error: observationsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.getObservations.useInfiniteQuery(
    { 
      token: token || "",
      childId: selectedChild !== "all" ? selectedChild : undefined,
      limit: 10
    },
    {
      enabled: !!token,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      onError: (err) => {
        setError(`Failed to load observations: ${err.message}`);
        console.error("Error fetching observations:", err);
      },
      // This is a placeholder until we implement the actual API endpoint
      placeholderData: {
        pages: [{
          data: [
            {
              id: "obs1",
              childId: "child1",
              childName: "Emma Johnson",
              type: "TEXT",
              content: "Emma showed great progress with her alphabet today. She can now recognize and name 15 letters!",
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
              aiTags: JSON.stringify(["language development", "literacy", "cognitive"])
            },
            {
              id: "obs2",
              childId: "child2",
              childName: "Noah Williams",
              type: "PHOTO",
              content: "Noah built this tower with blocks showing excellent fine motor skills and spatial awareness.",
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
              aiTags: JSON.stringify(["physical development", "fine motor", "cognitive"])
            },
            {
              id: "obs3",
              childId: "child1",
              childName: "Emma Johnson",
              type: "TEXT",
              content: "Emma shared her toys with another child today without prompting. Great social development!",
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
              aiTags: JSON.stringify(["social development", "emotional", "sharing"])
            },
          ],
          nextCursor: undefined
        }],
        pageParams: [null]
      }
    }
  );

  // Handle observation creation success
  const handleObservationSuccess = () => {
    setShowForm(false);
    // Invalidate the observations query to refresh the list
    void utils.getObservations.invalidate();
  };

  // Flatten the observations from all pages
  const observations = observationsData?.pages.flatMap(page => page.data) || [];
  
  return (
    <DashboardLayout 
      title="Observations" 
      navigation={nannyNavigation}
    >
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Observations</h2>
          <Button
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "New Observation"}
          </Button>
        </div>
        
        {/* Observation form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Observation</h3>
            <ObservationForm 
              onSuccess={handleObservationSuccess}
              children={childrenData?.children || []}
            />
          </div>
        )}
        
        {/* Child filter */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="child-filter" className="text-sm font-medium text-gray-700">
              Filter by child:
            </label>
            <select
              id="child-filter"
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="rounded-md border border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All children</option>
              {childrenData?.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Observations list */}
        <div className="bg-white shadow rounded-lg">
          <div className="divide-y divide-gray-200">
            {isLoadingObservations && !observations.length ? (
              <div className="px-6 py-8 text-center">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                <p className="mt-2 text-gray-500">Loading observations...</p>
              </div>
            ) : observationsError ? (
              <div className="px-6 py-8 text-center text-red-500">
                <p>Error loading observations. Please try again later.</p>
              </div>
            ) : observations.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No observations yet. Create your first one!</p>
              </div>
            ) : (
              <>
                {observations.map((observation) => {
                  // Parse aiTags if it exists and is a string
                  const tags = observation.aiTags ? 
                    (() => {
                      try { return JSON.parse(observation.aiTags); } 
                      catch { return []; }
                    })() : [];
                    
                  return (
                    <div key={observation.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-medium text-gray-900">{observation.childName}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(observation.createdAt).toLocaleDateString()} at {new Date(observation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {observation.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-gray-700">{observation.content}</p>
                      </div>
                      
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.map((tag: string) => (
                            <span key={tag} className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Load more button */}
                {hasNextPage && (
                  <div className="px-6 py-4 text-center">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {isFetchingNextPage ? 'Loading more...' : 'Load more observations'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}