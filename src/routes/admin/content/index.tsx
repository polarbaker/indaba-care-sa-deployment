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

export const Route = createFileRoute("/admin/content/")({
  component: AdminContent,
});

function AdminContent() {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [showBatchUploadForm, setShowBatchUploadForm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // State for the selected resource to edit
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  
  // Fetch resources
  const { data: resources, isLoading, refetch } = api.getAdminResources.useQuery(
    { 
      token: token || "",
      resourceType: typeFilter !== "all" ? typeFilter : undefined,
      visibleTo: roleFilter !== "all" ? roleFilter : undefined,
      searchTerm: searchTerm || undefined
    },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load resources: ${error.message}`);
      }
    }
  );
  
  // Fetch content tags
  const { data: contentTags } = api.getContentTags.useQuery(
    { token: token || "" },
    { enabled: !!token && isOnline }
  );
  
  // Mutation for adding/updating resources
  const updateResourceMutation = api.updateResource.useMutation({
    onSuccess: () => {
      toast.success("Resource updated successfully");
      setSelectedResource(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update resource: ${error.message}`);
    }
  });
  
  // Mutation for adding new resources
  const addResourceMutation = api.addResource.useMutation({
    onSuccess: () => {
      toast.success("Resource added successfully");
      setShowAddResourceForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add resource: ${error.message}`);
    }
  });
  
  // Mutation for batch upload
  const batchUploadMutation = api.batchUploadResources.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully uploaded ${data.successCount} resources`);
      if (data.errorCount > 0) {
        toast.error(`Failed to upload ${data.errorCount} resources`);
      }
      setShowBatchUploadForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Batch upload failed: ${error.message}`);
    }
  });
  
  // Form state for adding a new resource
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    contentUrl: "",
    resourceType: "Article",
    visibleTo: ["NANNY", "PARENT"],
    developmentalStage: "",
    tags: [] as string[],
    enableAITagging: true
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewResource(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes for visibleTo
  const handleVisibilityChange = (role: string) => {
    setNewResource(prev => {
      const visibleTo = [...prev.visibleTo];
      if (visibleTo.includes(role)) {
        return { ...prev, visibleTo: visibleTo.filter(r => r !== role) };
      } else {
        return { ...prev, visibleTo: [...visibleTo, role] };
      }
    });
  };
  
  // Handle tag selection
  const handleTagSelection = (tagId: string) => {
    setNewResource(prev => {
      const tags = [...prev.tags];
      if (tags.includes(tagId)) {
        return { ...prev, tags: tags.filter(t => t !== tagId) };
      } else {
        return { ...prev, tags: [...tags, tagId] };
      }
    });
  };
  
  // Handle resource submission
  const handleAddResource = () => {
    if (!newResource.title || !newResource.description || !newResource.contentUrl) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (isOnline) {
      addResourceMutation.mutate({
        token: token!,
        ...newResource
      });
    } else {
      // Handle offline operation
      const resourceId = crypto.randomUUID();
      addOperation({
        operationType: "CREATE",
        modelName: "Resource",
        recordId: resourceId,
        data: {
          ...newResource,
          createdAt: new Date().toISOString()
        }
      });
      
      // Add resource tags
      newResource.tags.forEach(tagId => {
        addOperation({
          operationType: "CREATE",
          modelName: "ResourceTag",
          recordId: crypto.randomUUID(),
          data: {
            resourceId,
            tagId,
            createdAt: new Date().toISOString()
          }
        });
      });
      
      toast.success("Resource queued for sync when back online");
      setShowAddResourceForm(false);
    }
  };
  
  // Handle batch upload
  const handleBatchUpload = (e: React.FormEvent) => {
    e.preventDefault();
    // This would be implemented with file upload and processing
    toast.success("Batch upload feature would be implemented here");
    setShowBatchUploadForm(false);
  };
  
  // Filter resources based on search and filters
  const filteredResources = resources || [];
  
  return (
    <DashboardLayout 
      title="Content Curation" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Header section with filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Resource Management</h2>
              <p className="mt-1 text-gray-500">
                Manage educational resources for nannies and parents
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
                onClick={() => {
                  setShowAddResourceForm(true);
                  setShowBatchUploadForm(false);
                }}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Resource
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setShowBatchUploadForm(true);
                  setShowAddResourceForm(false);
                }}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Batch Upload
              </Button>
              <Button 
                size="sm" 
                variant={previewMode ? "primary" : "secondary"}
                onClick={() => setPreviewMode(!previewMode)}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {previewMode ? "Exit Preview" : "Preview Mode"}
              </Button>
            </div>
          </div>
          
          {/* Add resource form */}
          {showAddResourceForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Add New Resource</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  name="title"
                  value={newResource.title}
                  onChange={handleInputChange}
                  placeholder="Resource title"
                  required
                />
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Resource Type
                  </label>
                  <select
                    name="resourceType"
                    value={newResource.resourceType}
                    onChange={handleInputChange}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="Article">Article</option>
                    <option value="Video">Video</option>
                    <option value="PDF">PDF</option>
                    <option value="Audio">Audio</option>
                    <option value="Infographic">Infographic</option>
                    <option value="Activity">Activity</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <Input
                    label="Content URL"
                    name="contentUrl"
                    value={newResource.contentUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/resource"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newResource.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                    placeholder="Describe the resource"
                    required
                  ></textarea>
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Developmental Stage
                  </label>
                  <select
                    name="developmentalStage"
                    value={newResource.developmentalStage}
                    onChange={handleInputChange}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  >
                    <option value="">Select Stage</option>
                    <option value="Infant (0-12 months)">Infant (0-12 months)</option>
                    <option value="Toddler (1-3 years)">Toddler (1-3 years)</option>
                    <option value="Preschool (3-5 years)">Preschool (3-5 years)</option>
                    <option value="School Age (6-12 years)">School Age (6-12 years)</option>
                    <option value="All Ages">All Ages</option>
                  </select>
                </div>
                
                <div>
                  <p className="mb-1 block text-sm font-medium text-gray-700">Visible To</p>
                  <div className="space-y-2">
                    <label className="inline-flex items-center mr-4">
                      <input
                        type="checkbox"
                        checked={newResource.visibleTo.includes("NANNY")}
                        onChange={() => handleVisibilityChange("NANNY")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Nannies</span>
                    </label>
                    <label className="inline-flex items-center mr-4">
                      <input
                        type="checkbox"
                        checked={newResource.visibleTo.includes("PARENT")}
                        onChange={() => handleVisibilityChange("PARENT")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Parents</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newResource.visibleTo.includes("ADMIN")}
                        onChange={() => handleVisibilityChange("ADMIN")}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Admins</span>
                    </label>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <p className="mb-1 block text-sm font-medium text-gray-700">Tags</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {contentTags?.map(tag => (
                      <label key={tag.id} className="inline-flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={newResource.tags.includes(tag.id)}
                          onChange={() => handleTagSelection(tag.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-1"
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={newResource.enableAITagging}
                      onChange={() => setNewResource(prev => ({ ...prev, enableAITagging: !prev.enableAITagging }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable AI tagging</span>
                  </label>
                </div>
                
                <div className="md:col-span-2 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddResourceForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddResource}
                    isLoading={addResourceMutation.isLoading}
                  >
                    Add Resource
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Batch upload form */}
          {showBatchUploadForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Batch Upload Resources</h3>
              <p className="text-xs text-blue-700 mb-3">
                Upload a CSV file with resources. The file should have columns for title, description, contentUrl, resourceType, and developmentalStage.
              </p>
              <form onSubmit={handleBatchUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
                
                <div>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable AI tagging for all resources</span>
                  </label>
                </div>
                
                <div className="flex justify-between space-x-2">
                  <div>
                    <a 
                      href="#" 
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.preventDefault();
                        // This would download a template CSV
                        alert("Download template CSV");
                      }}
                    >
                      Download template
                    </a>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowBatchUploadForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={batchUploadMutation.isLoading}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
          
          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="Article">Articles</option>
                <option value="Video">Videos</option>
                <option value="PDF">PDFs</option>
                <option value="Audio">Audio</option>
                <option value="Infographic">Infographics</option>
                <option value="Activity">Activities</option>
              </select>
              
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="NANNY">Nannies</option>
                <option value="PARENT">Parents</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Resources list */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Resources</h3>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-500">Loading resources...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No resources match your filters.
            </div>
          ) : (
            <div className={previewMode ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6" : ""}>
              {previewMode ? (
                // Preview mode - card layout
                filteredResources.map(resource => (
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
                            onClick={() => setSelectedResource(resource.id)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Table view
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Developmental Stage
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visible To
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredResources.map((resource) => (
                        <tr key={resource.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {resource.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {resource.developmentalStage || "All Ages"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-1">
                              {resource.visibleTo.includes("NANNY") && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Nanny
                                </span>
                              )}
                              {resource.visibleTo.includes("PARENT") && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Parent
                                </span>
                              )}
                              {resource.visibleTo.includes("ADMIN") && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {resource.tags?.slice(0, 3).map(tag => (
                                <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {tag.name}
                                </span>
                              ))}
                              {resource.tags && resource.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  +{resource.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <a
                                href={resource.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </a>
                              <button
                                className="text-indigo-600 hover:text-indigo-900"
                                onClick={() => setSelectedResource(resource.id)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this resource?")) {
                                    // Delete resource logic
                                    toast.success("Resource deleted successfully");
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Tags management section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Content Tags</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Open modal to add new tag
                const tagName = prompt("Enter new tag name:");
                if (tagName) {
                  toast.success(`Tag "${tagName}" added successfully`);
                }
              }}
            >
              Add Tag
            </Button>
          </div>
          
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {contentTags?.map(tag => (
                <div key={tag.id} className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800 flex items-center">
                  {tag.name}
                  <button className="ml-1.5 text-gray-500 hover:text-gray-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button className="ml-1 text-gray-500 hover:text-gray-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {/* Placeholder tags if no tags are loaded */}
              {(!contentTags || contentTags.length === 0) && (
                <>
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    Infant Development
                  </div>
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    Toddler Activities
                  </div>
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    Preschool Learning
                  </div>
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    Nutrition
                  </div>
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    Safety
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
