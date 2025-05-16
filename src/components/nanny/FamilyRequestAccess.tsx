import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

// Define validation schema
const requestSchema = z.object({
  familyId: z.string().min(1, "Family ID is required"),
  message: z.string().min(10, "Please provide a brief introduction message").max(500, "Message is too long"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface Family {
  id: string;
  name: string;
  parent: {
    firstName: string;
    lastName: string;
  };
}

interface FamilyRequestAccessProps {
  onRequestSent?: () => void;
  availableFamilies?: Family[];
}

export function FamilyRequestAccess({ onRequestSent, availableFamilies = [] }: FamilyRequestAccessProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Family[]>([]);
  
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });
  
  // Search for families mutation
  const searchFamiliesMutation = api.searchFamilies.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
    },
    onError: (error) => {
      toast.error(`Failed to search families: ${error.message}`);
      setIsSearching(false);
    },
  });
  
  // Request access mutation
  const requestAccessMutation = api.requestFamilyAccess.useMutation({
    onSuccess: () => {
      toast.success("Access request sent successfully");
      setIsSubmitting(false);
      reset();
      setSelectedFamily(null);
      if (onRequestSent) {
        onRequestSent();
      }
    },
    onError: (error) => {
      toast.error(`Failed to send request: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle search submit
  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    searchFamiliesMutation.mutate({
      token: token!,
      searchTerm,
    });
  };
  
  // Handle family selection
  const handleFamilySelect = (family: Family) => {
    setSelectedFamily(family);
    setValue("familyId", family.id);
    setSearchResults([]);
    setSearchTerm("");
  };
  
  // Handle form submission
  const onSubmit = (data: RequestFormValues) => {
    setIsSubmitting(true);
    
    if (isOnline) {
      // If online, send request directly
      requestAccessMutation.mutate({
        token: token!,
        familyId: data.familyId,
        message: data.message,
      });
    } else {
      // If offline, add to sync queue
      try {
        const requestId = crypto.randomUUID();
        addOperation({
          operationType: "CREATE",
          modelName: "FamilyNannyRequest",
          recordId: requestId,
          data: {
            familyId: data.familyId,
            message: data.message,
            status: "pending",
          },
        });
        
        toast.success("Request saved for sending when back online");
        setIsSubmitting(false);
        reset();
        setSelectedFamily(null);
        
        if (onRequestSent) {
          onRequestSent();
        }
      } catch (error) {
        toast.error("Failed to save request offline");
        setIsSubmitting(false);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Request Family Access</h3>
        <p className="mt-1 text-sm text-gray-500">
          Send a request to connect with a family you'd like to work with.
        </p>
      </div>
      
      {/* Family selection */}
      <div className="space-y-4">
        <div>
          <label htmlFor="family-search" className="block text-sm font-medium text-gray-700">
            Search for a family
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="family-search"
              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter family name"
              value={searchTerm}
              onChange={handleSearchChange}
              disabled={!isOnline}
            />
            <Button
              type="button"
              onClick={handleSearch}
              className="rounded-l-none"
              isLoading={isSearching}
              disabled={!searchTerm.trim() || !isOnline}
            >
              Search
            </Button>
          </div>
          {!isOnline && (
            <p className="mt-1 text-sm text-amber-600">
              Family search is only available when online.
            </p>
          )}
        </div>
        
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {searchResults.map((family) => (
                <li key={family.id} className="px-4 py-3 hover:bg-gray-50">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleFamilySelect(family)}
                  >
                    <div className="font-medium text-gray-900">{family.name}</div>
                    <div className="text-sm text-gray-500">
                      Parent: {family.parent.firstName} {family.parent.lastName}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Available families */}
        {availableFamilies.length > 0 && !selectedFamily && searchResults.length === 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Available Families</h4>
            <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {availableFamilies.map((family) => (
                  <li key={family.id} className="px-4 py-3 hover:bg-gray-50">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => handleFamilySelect(family)}
                    >
                      <div className="font-medium text-gray-900">{family.name}</div>
                      <div className="text-sm text-gray-500">
                        Parent: {family.parent.firstName} {family.parent.lastName}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Selected family */}
        {selectedFamily && (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">{selectedFamily.name}</h4>
                <p className="text-sm text-gray-500">
                  Parent: {selectedFamily.parent.firstName} {selectedFamily.parent.lastName}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFamily(null);
                  setValue("familyId", "");
                }}
              >
                Change
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Request form */}
      {selectedFamily && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("familyId")} />
          
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Introduction Message
            </label>
            <textarea
              id="message"
              rows={4}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.message
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="Introduce yourself and explain why you'd like to work with this family..."
              {...register("message")}
            ></textarea>
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              Send Request
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
