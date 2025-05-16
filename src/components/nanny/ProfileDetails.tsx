import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Define the form schema for validation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  availability: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileDetailsProps {
  profile: any; // Type from getNannyProfile response
  onProfileUpdated: () => void;
}

export function ProfileDetails({ profile, onProfileUpdated }: ProfileDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber || "",
      location: profile.location || "",
      bio: profile.bio || "",
      availability: profile.availability || "",
      profileImageUrl: profile.profileImageUrl || "",
    },
  });
  
  const updateProfileMutation = api.updateNannyProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsSubmitting(false);
      setIsEditing(false);
      onProfileUpdated();
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = (data: ProfileFormValues) => {
    setIsSubmitting(true);
    
    if (isOnline) {
      // If online, send directly to the server
      updateProfileMutation.mutate({
        token: token!,
        ...data,
      });
    } else {
      // If offline, store in sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "NannyProfile",
          recordId: profile.id,
          data,
        });
        
        toast.success("Profile updated. Changes will sync when back online.");
        setIsSubmitting(false);
        setIsEditing(false);
        onProfileUpdated();
      } catch (error) {
        toast.error("Failed to save profile changes offline");
        setIsSubmitting(false);
      }
    }
  };
  
  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };
  
  // Display mode
  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(true)}
          >
            Edit Details
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Name</h4>
            <p className="mt-1 text-sm text-gray-900">{profile.firstName} {profile.lastName}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Phone Number</h4>
            <p className="mt-1 text-sm text-gray-900">{profile.phoneNumber || "Not provided"}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Location</h4>
            <p className="mt-1 text-sm text-gray-900">{profile.location || "Not provided"}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Availability</h4>
            <p className="mt-1 text-sm text-gray-900">{profile.availability || "Not specified"}</p>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500">Bio</h4>
          <p className="mt-1 text-sm text-gray-900">{profile.bio || "No bio provided."}</p>
        </div>
        
        {profile.profileImageUrl && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Profile Image</h4>
            <div className="mt-2">
              <img 
                src={profile.profileImageUrl} 
                alt="Profile" 
                className="h-32 w-32 rounded-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Edit mode
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Edit Personal Details</h3>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            label="Location"
            {...register("location")}
            error={errors.location?.message}
            placeholder="City, State"
          />
          
          <Input
            label="Availability"
            {...register("availability")}
            error={errors.availability?.message}
            placeholder="e.g., Weekdays 9am-5pm"
          />
          
          <Input
            label="Profile Image URL"
            {...register("profileImageUrl")}
            error={errors.profileImageUrl?.message}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            {...register("bio")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Tell us about yourself, your experience, and your childcare philosophy."
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
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
    </div>
  );
}
