import { useState } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceAdded?: () => void;
}

interface ResourceFormData {
  title: string;
  description: string;
  resourceType: string;
  contentUrl: string;
  tags: string;
  developmentalStage: string;
  visibleTo: string[];
}

export function AddResourceModal({ isOpen, onClose, onResourceAdded }: AddResourceModalProps) {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Form state
  const [formData, setFormData] = useState<ResourceFormData>({
    title: "",
    description: "",
    resourceType: "Article",
    contentUrl: "",
    tags: "",
    developmentalStage: "",
    visibleTo: ["NANNY", "PARENT", "ADMIN"]
  });
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
  
  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      
      // Clear error when field is modified
      if (errors.file) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.file;
          return newErrors;
        });
      }
    }
  };
  
  // Handle role visibility change
  const handleRoleChange = (role: string) => {
    setFormData(prev => {
      const roles = [...prev.visibleTo];
      if (roles.includes(role)) {
        return { ...prev, visibleTo: roles.filter(r => r !== role) };
      } else {
        return { ...prev, visibleTo: [...roles, role] };
      }
    });
  };
  
  // Add resource mutation
  const addResourceMutation = api.addResource.useMutation({
    onSuccess: () => {
      toast.success("Resource added successfully");
      if (onResourceAdded) onResourceAdded();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to add resource: ${error.message}`);
    }
  });
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.description) {
      newErrors.description = "Description is required";
    }
    
    if (!formData.contentUrl && !file) {
      newErrors.file = "Either a file or content URL is required";
    }
    
    if (formData.visibleTo.length === 0) {
      newErrors.visibleTo = "Select at least one role that can view this resource";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Mock file upload function
  const uploadFile = async (file: File): Promise<string> => {
    // In a real implementation, this would upload the file to a storage service
    // and return the URL
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsUploading(false);
    
    // Return a mock URL
    return `https://storage.example.com/resources/${file.name}`;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    let contentUrl = formData.contentUrl;
    
    // Upload file if provided
    if (file) {
      try {
        contentUrl = await uploadFile(file);
      } catch (error) {
        toast.error("Failed to upload file");
        return;
      }
    }
    
    if (isOnline) {
      addResourceMutation.mutate({
        token: token!,
        title: formData.title,
        description: formData.description,
        contentUrl,
        resourceType: formData.resourceType,
        tags: formData.tags,
        developmentalStage: formData.developmentalStage || undefined,
        visibleTo: formData.visibleTo
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "Resource",
        recordId: crypto.randomUUID(),
        data: {
          ...formData,
          contentUrl,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success("Resource creation queued for when back online");
      if (onResourceAdded) onResourceAdded();
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
                    Add New Resource
                  </h3>
                  <div className="mt-4 space-y-4">
                    <Input
                      label="Title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Child Development Milestones"
                      error={errors.title}
                      required
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className={`rounded-md border ${errors.description ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full`}
                        placeholder="Provide a detailed description of this resource"
                        required
                      ></textarea>
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resource Type
                      </label>
                      <select
                        name="resourceType"
                        value={formData.resourceType}
                        onChange={handleInputChange}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        <option value="Article">Article</option>
                        <option value="Video">Video</option>
                        <option value="PDF">PDF</option>
                        <option value="Image">Image</option>
                        <option value="Audio">Audio</option>
                        <option value="Link">External Link</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload File or Provide URL
                      </label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500">or</p>
                        <Input
                          name="contentUrl"
                          value={formData.contentUrl}
                          onChange={handleInputChange}
                          placeholder="https://example.com/resource.pdf"
                        />
                        {errors.file && <p className="mt-1 text-sm text-red-600">{errors.file}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (comma-separated)
                      </label>
                      <Input
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        placeholder="e.g., development, toddler, milestones"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Developmental Stage
                      </label>
                      <select
                        name="developmentalStage"
                        value={formData.developmentalStage}
                        onChange={handleInputChange}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        <option value="">Select a stage (optional)</option>
                        <option value="Infant (0-12 months)">Infant (0-12 months)</option>
                        <option value="Toddler (1-3 years)">Toddler (1-3 years)</option>
                        <option value="Preschool (3-5 years)">Preschool (3-5 years)</option>
                        <option value="School Age (5+ years)">School Age (5+ years)</option>
                        <option value="All Ages">All Ages</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Visible To
                      </label>
                      <div className="space-y-2">
                        <label className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={formData.visibleTo.includes("NANNY")}
                            onChange={() => handleRoleChange("NANNY")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Nannies</span>
                        </label>
                        <label className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={formData.visibleTo.includes("PARENT")}
                            onChange={() => handleRoleChange("PARENT")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Parents</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.visibleTo.includes("ADMIN")}
                            onChange={() => handleRoleChange("ADMIN")}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Admins</span>
                        </label>
                      </div>
                      {errors.visibleTo && <p className="mt-1 text-sm text-red-600">{errors.visibleTo}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                isLoading={addResourceMutation.isLoading || isUploading}
                disabled={addResourceMutation.isLoading || isUploading}
              >
                {isUploading ? "Uploading..." : "Add Resource"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:mr-3"
                disabled={addResourceMutation.isLoading || isUploading}
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
