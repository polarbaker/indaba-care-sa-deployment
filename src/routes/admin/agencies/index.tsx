import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/agencies/")({
  component: AdminAgencies,
});

function AdminAgencies() {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddAgencyForm, setShowAddAgencyForm] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any | null>(null); // Type this based on API response
  
  // Fetch agencies
  const { data: agencies, isLoading, refetch } = api.getAgencies.useQuery(
    { 
      token: token || "",
      searchTerm: searchTerm || undefined
    },
    { 
      enabled: !!token && isOnline,
      onError: (error) => {
        toast.error(`Failed to load agencies: ${error.message}`);
      }
    }
  );
  
  // Mutation for adding/updating agency
  const addAgencyMutation = api.addAgency.useMutation({
    onSuccess: () => {
      toast.success("Agency added successfully");
      setShowAddAgencyForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add agency: ${error.message}`);
    }
  });
  
  const updateAgencyMutation = api.updateAgency.useMutation({
    onSuccess: () => {
      toast.success("Agency updated successfully");
      setSelectedAgency(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update agency: ${error.message}`);
    }
  });
  
  // Form state for adding a new agency
  const [newAgency, setNewAgency] = useState({
    name: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    description: ""
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (selectedAgency) {
      setSelectedAgency((prev: any) => ({ ...prev, [name]: value }));
    } else {
      setNewAgency(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle agency submission
  const handleSaveAgency = () => {
    const agencyData = selectedAgency || newAgency;
    
    if (!agencyData.name) {
      toast.error("Agency name is required");
      return;
    }
    
    if (isOnline) {
      if (selectedAgency) {
        updateAgencyMutation.mutate({
          token: token!,
          agencyId: selectedAgency.id,
          ...agencyData
        });
      } else {
        addAgencyMutation.mutate({
          token: token!,
          ...agencyData
        });
      }
    } else {
      // Handle offline operation
      const operationType = selectedAgency ? "UPDATE" : "CREATE";
      const recordId = selectedAgency ? selectedAgency.id : crypto.randomUUID();
      
      addOperation({
        operationType,
        modelName: "Agency",
        recordId,
        data: {
          ...agencyData,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success(`Agency ${operationType === "CREATE" ? "added" : "updated"}. Changes will sync when back online.`);
      setShowAddAgencyForm(false);
      setSelectedAgency(null);
    }
  };
  
  return (
    <DashboardLayout 
      title="Agency Management" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Header section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Manage Agencies</h2>
              <p className="mt-1 text-gray-500">
                Oversee nanny agencies, assignments, and payroll
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
                  setSelectedAgency(null);
                  setShowAddAgencyForm(true);
                  setNewAgency({ // Reset form
                    name: "",
                    contactPerson: "",
                    contactEmail: "",
                    contactPhone: "",
                    address: "",
                    description: ""
                  });
                }}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Agency
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <Input
            placeholder="Search agencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        {/* Add/Edit Agency Form */}
        {(showAddAgencyForm || selectedAgency) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedAgency ? "Edit Agency" : "Add New Agency"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Agency Name"
                name="name"
                value={selectedAgency ? selectedAgency.name : newAgency.name}
                onChange={handleInputChange}
                placeholder="Agency name"
                required
              />
              <Input
                label="Contact Person"
                name="contactPerson"
                value={selectedAgency ? selectedAgency.contactPerson : newAgency.contactPerson}
                onChange={handleInputChange}
                placeholder="Contact person name"
              />
              <Input
                label="Contact Email"
                name="contactEmail"
                type="email"
                value={selectedAgency ? selectedAgency.contactEmail : newAgency.contactEmail}
                onChange={handleInputChange}
                placeholder="Contact email address"
              />
              <Input
                label="Contact Phone"
                name="contactPhone"
                type="tel"
                value={selectedAgency ? selectedAgency.contactPhone : newAgency.contactPhone}
                onChange={handleInputChange}
                placeholder="Contact phone number"
              />
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  name="address"
                  value={selectedAgency ? selectedAgency.address : newAgency.address}
                  onChange={handleInputChange}
                  placeholder="Agency address"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={selectedAgency ? selectedAgency.description : newAgency.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Brief description of the agency"
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddAgencyForm(false);
                  setSelectedAgency(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAgency}
                isLoading={addAgencyMutation.isLoading || updateAgencyMutation.isLoading}
              >
                {selectedAgency ? "Save Changes" : "Add Agency"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Agencies list */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Agencies</h3>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Loading agencies...</p>
            </div>
          ) : agencies && agencies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nannies
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map((agency) => (
                    <tr key={agency.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {agency.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agency.contactPerson || "-"}
                        <br />
                        <span className="text-xs text-gray-400">{agency.contactEmail || ""}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agency.nannyAssignments?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link 
                            to="/admin/agencies/$agencyId" 
                            params={{ agencyId: agency.id }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Manage
                          </Link>
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => setSelectedAgency(agency)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this agency?")) {
                                // Delete agency logic
                                toast.success("Agency deleted (placeholder)");
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
          ) : (
            <div className="p-6 text-center text-gray-500">
              No agencies found. Click "Add Agency" to create one.
            </div>
          )}
        </div>
        
        {/* Placeholder sections */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Payroll Automation (Coming Soon)</h3>
          <p className="text-gray-500">Automate payroll based on logged hours and agency agreements.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Emergency Protocols (Coming Soon)</h3>
          <p className="text-gray-500">Manage and distribute emergency protocols and reporting requirements for agencies.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
