import { useState } from "react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: () => void;
}

interface UserFormData {
  email: string;
  role: "NANNY" | "PARENT" | "ADMIN";
  firstName: string;
  lastName: string;
  phoneNumber: string;
  sendInvitation: boolean;
}

export function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    role: "NANNY",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    sendInvitation: true
  });
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Create user mutation
  const createUserMutation = api.updateAdminUser.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      if (onUserAdded) onUserAdded();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
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
      createUserMutation.mutate({
        token: token!,
        userId: "new", // Special value to indicate a new user
        userData: {
          ...formData,
          // Generate a temporary password
          password: Math.random().toString(36).slice(-8)
        }
      });
    } else {
      // Handle offline operation
      addOperation({
        operationType: "CREATE",
        modelName: "User",
        recordId: crypto.randomUUID(),
        data: {
          ...formData,
          createdAt: new Date().toISOString()
        }
      });
      
      toast.success("User creation queued for when back online");
      if (onUserAdded) onUserAdded();
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
                    Add New User
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        <option value="NANNY">Nanny</option>
                        <option value="PARENT">Parent</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="user@example.com"
                      error={errors.email}
                      required
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        error={errors.firstName}
                        required
                      />
                      
                      <Input
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        error={errors.lastName}
                        required
                      />
                    </div>
                    
                    <Input
                      label="Phone Number"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      error={errors.phoneNumber}
                    />
                    
                    <div className="flex items-center">
                      <input
                        id="sendInvitation"
                        name="sendInvitation"
                        type="checkbox"
                        checked={formData.sendInvitation}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="sendInvitation" className="ml-2 block text-sm text-gray-700">
                        Send invitation email
                      </label>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-500">
                      <p>
                        {formData.sendInvitation 
                          ? "An email will be sent to the user with instructions to set their password." 
                          : "You'll need to provide the login credentials to the user manually."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                isLoading={createUserMutation.isLoading}
              >
                Add User
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
