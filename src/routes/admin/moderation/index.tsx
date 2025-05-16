import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/moderation/")({
  component: AdminModeration,
});

function AdminModeration() {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  
  // Fetch flagged content
  const { data: flaggedContent, isLoading, refetch } = api.getAdminFlaggedContent.useQuery(
    { 
      token: token || "",
      status: statusFilter !== "all" ? statusFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
      contentType: contentTypeFilter !== "all" ? contentTypeFilter : undefined,
      searchTerm: searchTerm || undefined
    },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load flagged content: ${error.message}`);
      }
    }
  );
  
  // Mutation for updating flagged content
  const updateFlagMutation = api.updateFlaggedContent.useMutation({
    onSuccess: () => {
      toast.success("Flag updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update flag: ${error.message}`);
    }
  });
  
  // Handle status change
  const handleStatusChange = (flagId: string, newStatus: string, notes?: string) => {
    if (isOnline) {
      updateFlagMutation.mutate({
        token: token!,
        flagId,
        status: newStatus,
        moderatorNotes: notes
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "UPDATE",
        modelName: "FlaggedContent",
        recordId: flagId,
        data: {
          status: newStatus,
          moderatorNotes: notes,
          moderatedAt: new Date().toISOString()
        }
      });
      toast.success("Flag update queued for sync when back online");
      // Optimistically update the UI
      refetch();
    }
  };
  
  // Add custom keyword
  const [newKeyword, setNewKeyword] = useState("");
  const [showKeywordForm, setShowKeywordForm] = useState(false);
  
  const addKeywordMutation = api.addKeywordFlag.useMutation({
    onSuccess: () => {
      toast.success("Keyword flag added successfully");
      setNewKeyword("");
      setShowKeywordForm(false);
    },
    onError: (error) => {
      toast.error(`Failed to add keyword flag: ${error.message}`);
    }
  });
  
  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      toast.error("Keyword cannot be empty");
      return;
    }
    
    if (isOnline) {
      addKeywordMutation.mutate({
        token: token!,
        keyword: newKeyword
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "KeywordFlag",
        recordId: crypto.randomUUID(),
        data: {
          keyword: newKeyword,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      });
      toast.success("Keyword flag queued for sync when back online");
      setNewKeyword("");
      setShowKeywordForm(false);
    }
  };
  
  // Get flagged content counts by status
  const pendingCount = flaggedContent?.filter(flag => flag.status === "Pending").length || 0;
  const reviewedCount = flaggedContent?.filter(flag => flag.status === "Reviewed").length || 0;
  const dismissedCount = flaggedContent?.filter(flag => flag.status === "Dismissed").length || 0;
  
  // Get flagged content counts by priority
  const urgentCount = flaggedContent?.filter(flag => flag.priority === "Urgent").length || 0;
  const highCount = flaggedContent?.filter(flag => flag.priority === "High").length || 0;
  const mediumCount = flaggedContent?.filter(flag => flag.priority === "Medium").length || 0;
  const lowCount = flaggedContent?.filter(flag => flag.priority === "Low").length || 0;
  
  // Filter the flagged content based on search term
  const filteredContent = flaggedContent || [];
  
  return (
    <DashboardLayout 
      title="Content Moderation" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Header section with filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Content Moderation Queue</h2>
              <p className="mt-1 text-gray-500">
                Review and respond to flagged content
              </p>
            </div>
            <div className="mt-3 sm:mt-0 flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => refetch()}
                isLoading={isLoading}
                disabled={!isOnline}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowKeywordForm(!showKeywordForm)}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                Add Keyword Flag
              </Button>
            </div>
          </div>
          
          {/* Keyword form */}
          {showKeywordForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Add Emergency Keyword Flag</h3>
              <p className="text-xs text-blue-700 mb-3">
                Content containing this keyword will be automatically flagged as urgent.
              </p>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter keyword or phrase"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  fullWidth={false}
                  className="flex-1"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddKeyword}
                  isLoading={addKeywordMutation.isLoading}
                >
                  Add Keyword
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowKeywordForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search flagged content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending ({pendingCount})</option>
                <option value="Reviewed">Reviewed ({reviewedCount})</option>
                <option value="Dismissed">Dismissed ({dismissedCount})</option>
              </select>
            </div>
            
            <div>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent ({urgentCount})</option>
                <option value="High">High ({highCount})</option>
                <option value="Medium">Medium ({mediumCount})</option>
                <option value="Low">Low ({lowCount})</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
              >
                <option value="all">All Content Types</option>
                <option value="Observation">Observations</option>
                <option value="Message">Messages</option>
                <option value="Resource">Resources</option>
                <option value="Profile">Profiles</option>
              </select>
            </div>
            
            <div className="flex justify-end">
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setContentTypeFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
        
        {/* Flagged content list */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Flagged Content</h3>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading flagged content...</p>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No flagged content matches your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flagged At
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContent.map((flag) => (
                    <tr key={flag.id} className={flag.priority === "Urgent" ? "bg-red-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {flag.contentType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {flag.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flag.priority === 'Urgent' 
                            ? 'bg-red-100 text-red-800' 
                            : flag.priority === 'High'
                              ? 'bg-orange-100 text-orange-800'
                              : flag.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                        }`}>
                          {flag.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flag.status === 'Pending' 
                            ? 'bg-blue-100 text-blue-800' 
                            : flag.status === 'Reviewed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {flag.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(flag.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => {
                              // Open modal with flag details
                              // This would be implemented with a modal component
                              alert(`View details for flag ${flag.id}`);
                            }}
                          >
                            View
                          </button>
                          {flag.status === "Pending" && (
                            <>
                              <button
                                className="text-green-600 hover:text-green-900"
                                onClick={() => {
                                  const notes = prompt("Enter review notes:");
                                  if (notes !== null) {
                                    handleStatusChange(flag.id, "Reviewed", notes);
                                  }
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  const notes = prompt("Enter dismissal reason:");
                                  if (notes !== null) {
                                    handleStatusChange(flag.id, "Dismissed", notes);
                                  }
                                }}
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Active keyword flags */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Active Keyword Flags</h3>
            <p className="mt-1 text-sm text-gray-500">
              Content containing these keywords will be automatically flagged
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {/* This would be populated with actual keyword data */}
              <div className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-sm font-medium flex items-center">
                urgent
                <button className="ml-1.5 text-red-600 hover:text-red-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-sm font-medium flex items-center">
                emergency
                <button className="ml-1.5 text-red-600 hover:text-red-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-sm font-medium flex items-center">
                danger
                <button className="ml-1.5 text-red-600 hover:text-red-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-orange-100 text-orange-800 rounded-full px-3 py-1 text-sm font-medium flex items-center">
                inappropriate
                <button className="ml-1.5 text-orange-600 hover:text-orange-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-sm font-medium flex items-center">
                warning
                <button className="ml-1.5 text-yellow-600 hover:text-yellow-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
