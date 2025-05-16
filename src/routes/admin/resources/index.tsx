import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Import the admin navigation array
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/resources/")({
  component: AdminResourcesHub,
});

function AdminResourcesHub() {
  const { token } = useAuthStore();
  const { isOnline } = useSyncStore();
  const [viewAs, setViewAs] = useState<"ADMIN" | "PARENT" | "NANNY">("ADMIN");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  
  // Fetch resources
  const { data: resources, isLoading, refetch } = api.getAdminResources.useQuery(
    { 
      token: token || "",
      resourceType: typeFilter !== "all" ? typeFilter : undefined,
      visibleTo: viewAs,
      searchTerm: searchTerm || undefined
    },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load resources: ${error.message}`);
      }
    }
  );
  
  // Resource types for filtering
  const resourceTypes = [
    { id: "all", label: "All Types" },
    { id: "Article", label: "Articles" },
    { id: "Video", label: "Videos" },
    { id: "PDF", label: "PDFs" },
    { id: "Audio", label: "Audio" },
    { id: "Infographic", label: "Infographics" },
    { id: "Activity", label: "Activities" }
  ];
  
  // Developmental stages for filtering
  const developmentalStages = [
    { id: "all", label: "All Stages" },
    { id: "Infant (0-12 months)", label: "Infant (0-12 months)" },
    { id: "Toddler (1-3 years)", label: "Toddler (1-3 years)" },
    { id: "Preschool (3-5 years)", label: "Preschool (3-5 years)" },
    { id: "School Age (6-12 years)", label: "School Age (6-12 years)" },
    { id: "All Ages", label: "All Ages" }
  ];
  
  return (
    <DashboardLayout 
      title="Resources Hub" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Header with view selector */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Resources Hub</h2>
              <p className="mt-1 text-gray-500">
                Preview and access resources as they appear to different user roles
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
                onClick={() => window.location.href = "/admin/content/"}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Manage Content
              </Button>
            </div>
          </div>
          
          {/* View selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              View Resources As:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewAs === "ADMIN"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setViewAs("ADMIN")}
              >
                Admin View
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewAs === "PARENT"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setViewAs("PARENT")}
              >
                Parent View
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  viewAs === "NANNY"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setViewAs("NANNY")}
              >
                Nanny View
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Search"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {resourceTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Developmental Stage
              </label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                {developmentalStages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Resources Display */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Resources</h3>
              <p className="mt-1 text-sm text-gray-500">
                {viewAs === "ADMIN" 
                  ? "All resources visible to administrators" 
                  : viewAs === "PARENT" 
                    ? "Resources visible to parents"
                    : "Resources visible to nannies"}
              </p>
            </div>
            
            {/* Role-specific badges */}
            <div>
              {viewAs === "ADMIN" && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Admin View
                </span>
              )}
              {viewAs === "PARENT" && (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  Parent View
                </span>
              )}
              {viewAs === "NANNY" && (
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                  Nanny View
                </span>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading resources...</p>
            </div>
          ) : !resources || resources.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No resources match your filters or are visible to this role.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {resources.map(resource => (
                <div key={resource.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-medium text-gray-900 mb-1">{resource.title}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resource.resourceType === 'Article' 
                          ? 'bg-blue-100 text-blue-800' 
                          : resource.resourceType === 'Video'
                            ? 'bg-purple-100 text-purple-800'
                            : resource.resourceType === 'PDF'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                      }`}>
                        {resource.resourceType}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{resource.description}</p>
                    
                    {resource.developmentalStage && (
                      <p className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">Stage:</span> {resource.developmentalStage}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {resource.tags?.map(tag => (
                        <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <a 
                        href={resource.contentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View Resource
                        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                      
                      <div className="flex space-x-1">
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => window.location.href = `/admin/content/?edit=${resource.id}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick access to content management */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Resource Management</h3>
            <Button
              onClick={() => window.location.href = "/admin/content/"}
            >
              Go to Content Management
            </Button>
          </div>
          <p className="text-gray-500">
            Use the Content Management panel to add, edit, or remove resources, manage tags, and control visibility settings.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
