import { useState } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

interface AddAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgencyAdded?: () => void;
}

interface AgencyFormData {
  name: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  description: string;
  emergencyProtocols: string;
}

export function AddAgencyModal({ isOpen, onClose, onAgencyAdded }: AddAgencyModalProps) {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Form state
  const [formData, setFormData] = useState<AgencyFormData>({
    name: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    description: "",
    emergencyProtocols: ""
  });
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Add agency mutation
  const addAgencyMutation = api.addAgency.useMutation({
    onSuccess: () => {
      toast.success("Agency added successfully");
      if (onAgencyAdded) onAgencyAdded();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to add agency: ${error.message}`);
    }
  });
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) {
      newErrors.name = "Agency name is required";
    }
    
    if (!formData.contactPerson) {
      newErrors.contactPerson = "Contact person is required";
    }
    
    if (!formData.contactEmail) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (isOnline) {
      addAgencyMutation.mutate({
        token: token!,
        name: formData.name,
        contactPerson: formData.contactPerson,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        description: formData.description || undefined,
        emergencyProtocols: formData.emergencyProtocols 
          ? JSON.stringify({ protocols: formData.emergencyProtocols.split('\n') })
          : undefined
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "Agency",
        recordId: crypto.randomUUID(),
        data: {
          ...formData,
          emergencyProtocols: formData.emergencyProtocols 
            ? JSON.stringify({ protocols: formData.emergencyProtocols.split('\n') })
            : undefined,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success("Agency creation queued for when back online");
      if (onAgencyAdded) onAgencyAdded();
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Add New Agency
                  </h3>
                  <div className="mt-4 space-y-4">
                    <Input
                      label="Agency Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Sunshine Nanny Agency"
                      error={errors.name}
                      required
                    />
                    
                    <Input
                      label="Contact Person"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      placeholder="e.g., Jane Smith"
                      error={errors.contactPerson}
                      required
                    />
                    
                    <Input
                      label="Contact Email"
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="e.g., contact@agency.com"
                      error={errors.contactEmail}
                      required
                    />
                    
                    <Input
                      label="Contact Phone"
                      name="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="e.g., +1 (555) 123-4567"
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={2}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                        placeholder="Full address including street, city, state, and zip code"
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                        placeholder="Brief description of the agency, its services, and specialties"
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Protocols (one per line)
                      </label>
                      <textarea
                        name="emergencyProtocols"
                        value={formData.emergencyProtocols}
                        onChange={handleInputChange}
                        rows={4}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                        placeholder="Enter emergency protocols, one per line"
                      ></textarea>
                      <p className="mt-1 text-xs text-gray-500">
                        Example: "Call agency emergency line at (555) 987-6543"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                isLoading={addAgencyMutation.isLoading}
              >
                Add Agency
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:mr-3"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
