import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import toast from "react-hot-toast";

// Define home details type
type HomeDetails = {
  homeType?: string;
  numberOfBedrooms?: number;
  hasOutdoorSpace?: boolean;
  petDetails?: string;
  dietaryRestrictions?: string;
  householdMembers?: {
    relationship: string;
    name?: string;
    age?: number;
  }[];
  importantNotes?: string;
  preferredActivities?: string[];
  houseRules?: string[];
};

// Define parent profile type
type ParentProfileType = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  profileImageUrl?: string;
  family?: {
    id: string;
    name: string;
    homeDetails?: string;
    parsedHomeDetails?: HomeDetails;
  };
};

// Define form validation schema
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  profileImageUrl: z.string().optional(),
  // Home details
  homeType: z.string().optional(),
  numberOfBedrooms: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  hasOutdoorSpace: z.boolean().optional(),
  petDetails: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  importantNotes: z.string().optional(),
  preferredActivities: z.string().optional(),
  houseRules: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Component props
interface ProfileDetailsProps {
  profile: ParentProfileType;
  onProfileUpdated?: () => void;
}

export function ProfileDetails({ profile, onProfileUpdated }: ProfileDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Initialize form with profile data
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber || "",
      address: profile.address || "",
      profileImageUrl: profile.profileImageUrl || "",
      // Home details
      homeType: profile.family?.parsedHomeDetails?.homeType || "",
      numberOfBedrooms: profile.family?.parsedHomeDetails?.numberOfBedrooms,
      hasOutdoorSpace: profile.family?.parsedHomeDetails?.hasOutdoorSpace || false,
      petDetails: profile.family?.parsedHomeDetails?.petDetails || "",
      dietaryRestrictions: profile.family?.parsedHomeDetails?.dietaryRestrictions || "",
      importantNotes: profile.family?.parsedHomeDetails?.importantNotes || "",
      preferredActivities: profile.family?.parsedHomeDetails?.preferredActivities?.join(", ") || "",
      houseRules: profile.family?.parsedHomeDetails?.houseRules?.join(", ") || "",
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = api.updateParentProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    // Format home details
    const homeDetails = {
      homeType: data.homeType,
      numberOfBedrooms: data.numberOfBedrooms,
      hasOutdoorSpace: data.hasOutdoorSpace,
      petDetails: data.petDetails,
      dietaryRestrictions: data.dietaryRestrictions,
      importantNotes: data.importantNotes,
      preferredActivities: data.preferredActivities?.split(",").map((item) => item.trim()).filter(Boolean) || [],
      houseRules: data.houseRules?.split(",").map((item) => item.trim()).filter(Boolean) || [],
    };

    if (isOnline) {
      // If online, update directly
      updateProfileMutation.mutate({
        token: token!,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        profileImageUrl: data.profileImageUrl,
        homeDetails,
      });
    } else {
      // If offline, add to sync queue
      try {
        // Add parent profile update operation
        addOperation({
          operationType: "UPDATE",
          modelName: "ParentProfile",
          recordId: profile.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            address: data.address,
            profileImageUrl: data.profileImageUrl,
          },
        });
        
        // Add family update operation if family exists
        if (profile.family) {
          addOperation({
            operationType: "UPDATE",
            modelName: "Family",
            recordId: profile.family.id,
            data: {
              homeDetails: JSON.stringify(homeDetails),
            },
          });
        } else {
          // Create new family if it doesn't exist
          const newFamilyId = crypto.randomUUID();
          addOperation({
            operationType: "CREATE",
            modelName: "Family",
            recordId: newFamilyId,
            data: {
              name: `${data.firstName} ${data.lastName}'s Family`,
              parentId: profile.id,
              homeDetails: JSON.stringify(homeDetails),
            },
          });
        }
        
        toast.success("Profile changes saved for syncing when back online");
        setIsEditing(false);
        if (onProfileUpdated) {
          onProfileUpdated();
        }
      } catch (error) {
        toast.error("Failed to save profile changes offline");
      }
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        {!isEditing && (
          <Button 
            type="button" 
            onClick={() => setIsEditing(true)}
            variant="outline"
          >
            Edit Profile
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="First Name"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            
            <Input
              label="Last Name"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
            
            <Input
              label="Phone Number"
              {...register("phoneNumber")}
              error={errors.phoneNumber?.message}
            />
            
            <Input
              label="Address"
              {...register("address")}
              error={errors.address?.message}
            />
            
            <Input
              label="Profile Image URL"
              {...register("profileImageUrl")}
              error={errors.profileImageUrl?.message}
            />
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Home Environment</h3>
            <p className="text-sm text-gray-500 mb-4">
              This information helps your nanny understand your home environment and preferences.
            </p>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Home Type (e.g., Apartment, House)"
                {...register("homeType")}
                error={errors.homeType?.message}
              />
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Number of Bedrooms
                </label>
                <input
                  type="number"
                  min="0"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  {...register("numberOfBedrooms")}
                />
                {errors.numberOfBedrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.numberOfBedrooms.message}</p>
                )}
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    {...register("hasOutdoorSpace")}
                  />
                  <span className="ml-2 text-sm text-gray-700">Has Outdoor Space</span>
                </label>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pet Details
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Type and temperament of any pets"
                  {...register("petDetails")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dietary Restrictions
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Any dietary restrictions or preferences"
                  {...register("dietaryRestrictions")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Important Notes
                </label>
                <textarea
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Any important information about your home environment"
                  {...register("importantNotes")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Activities (comma-separated)
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Reading, Outdoor play, Arts and crafts"
                  {...register("preferredActivities")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  House Rules (comma-separated)
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="No shoes inside, Limited screen time, Quiet time after 8pm"
                  {...register("houseRules")}
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-500">First Name</h4>
              <p className="mt-1 text-sm text-gray-900">{profile.firstName}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Last Name</h4>
              <p className="mt-1 text-sm text-gray-900">{profile.lastName}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Phone Number</h4>
              <p className="mt-1 text-sm text-gray-900">{profile.phoneNumber || "Not provided"}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Address</h4>
              <p className="mt-1 text-sm text-gray-900">{profile.address || "Not provided"}</p>
            </div>
            
            {profile.profileImageUrl && (
              <div className="sm:col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Profile Image</h4>
                <div className="mt-1">
                  <img 
                    src={profile.profileImageUrl} 
                    alt={`${profile.firstName} ${profile.lastName}`} 
                    className="h-20 w-20 rounded-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Home Environment</h3>
            
            {profile.family?.parsedHomeDetails ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {profile.family.parsedHomeDetails.homeType && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Home Type</h4>
                    <p className="mt-1 text-sm text-gray-900">{profile.family.parsedHomeDetails.homeType}</p>
                  </div>
                )}
                
                {profile.family.parsedHomeDetails.numberOfBedrooms !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Number of Bedrooms</h4>
                    <p className="mt-1 text-sm text-gray-900">{profile.family.parsedHomeDetails.numberOfBedrooms}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Outdoor Space</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.family.parsedHomeDetails.hasOutdoorSpace ? "Yes" : "No"}
                  </p>
                </div>
                
                {profile.family.parsedHomeDetails.petDetails && (
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Pet Details</h4>
                    <p className="mt-1 text-sm text-gray-900">{profile.family.parsedHomeDetails.petDetails}</p>
                  </div>
                )}
                
                {profile.family.parsedHomeDetails.dietaryRestrictions && (
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Dietary Restrictions</h4>
                    <p className="mt-1 text-sm text-gray-900">{profile.family.parsedHomeDetails.dietaryRestrictions}</p>
                  </div>
                )}
                
                {profile.family.parsedHomeDetails.importantNotes && (
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Important Notes</h4>
                    <p className="mt-1 text-sm text-gray-900">{profile.family.parsedHomeDetails.importantNotes}</p>
                  </div>
                )}
                
                {profile.family.parsedHomeDetails.preferredActivities && 
                  profile.family.parsedHomeDetails.preferredActivities.length > 0 && (
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">Preferred Activities</h4>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.family.parsedHomeDetails.preferredActivities.map((activity) => (
                        <span 
                          key={activity} 
                          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {profile.family.parsedHomeDetails.houseRules && 
                  profile.family.parsedHomeDetails.houseRules.length > 0 && (
                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">House Rules</h4>
                    <ul className="mt-1 list-disc pl-5 text-sm text-gray-900">
                      {profile.family.parsedHomeDetails.houseRules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No home environment details provided yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
