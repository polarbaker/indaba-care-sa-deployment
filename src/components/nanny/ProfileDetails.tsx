import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ImageUploader } from "~/components/settings/ImageUploader";
import toast from "react-hot-toast";

// Define the form schema for validation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().optional(),
  pronouns: z.string().optional(),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  availability: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  coverImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  specialties: z.array(z.string()).optional(),
  yearsOfExperience: z.number().min(0).optional(),
  languages: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileDetailsProps {
  profile: any; // Type from getNannyProfile response
  onProfileUpdated: () => void;
  user?: any; // User information from auth store
}

export function ProfileDetails({ profile, onProfileUpdated, user }: ProfileDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPronouns, setSelectedPronouns] = useState(user?.pronouns || "");
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Define pronouns options
  const pronounOptions = [
    { value: "he/him", label: "He/Him" },
    { value: "she/her", label: "She/Her" },
    { value: "they/them", label: "They/Them" },
    { value: "custom", label: "Custom" },
  ];
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: user?.displayName || "",
      pronouns: user?.pronouns || "",
      phoneNumber: profile.phoneNumber || "",
      location: profile.location || "",
      bio: profile.bio || "",
      availability: profile.availability || "",
      profileImageUrl: profile.profileImageUrl || "",
      coverImageUrl: profile.coverImageUrl || "",
      specialties: profile.specialties || [],
      yearsOfExperience: profile.yearsOfExperience || 0,
      languages: profile.languages || [],
    },
  });
  
  // Watch the pronouns field
  const watchedPronouns = watch("pronouns");
  
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
  
  const onSubmit = (data: z.infer<typeof profileSchema>) => {
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
        // Add profile update to sync queue
        addOperation({
          operationType: "UPDATE",
          modelName: "NannyProfile",
          recordId: profile.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            location: data.location,
            bio: data.bio,
            availability: data.availability,
            profileImageUrl: data.profileImageUrl,
            coverImageUrl: data.coverImageUrl,
            specialties: data.specialties,
            yearsOfExperience: data.yearsOfExperience,
            languages: data.languages,
          },
        });
        
        // Add user settings update to sync queue
        if (user) {
          addOperation({
            operationType: "UPDATE",
            modelName: "User",
            recordId: user.id,
            data: {
              displayName: data.displayName,
              pronouns: data.pronouns,
            },
          });
        }
        
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
  
  // Handle avatar upload
  const handleAvatarSaved = (imageUrl: string) => {
    setValue("profileImageUrl", imageUrl);
  };

  // Handle cover photo upload
  const handleCoverSaved = (imageUrl: string) => {
    setValue("coverImageUrl", imageUrl);
  };

  // Handle pronouns change
  const handlePronounsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedPronouns(value);
    setValue("pronouns", value);
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
        
        {/* Cover photo */}
        {profile.coverImageUrl && (
          <div className="w-full h-48 rounded-lg overflow-hidden">
            <img 
              src={profile.coverImageUrl} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Profile image and basic info */}
        <div className="flex items-start space-x-4">
          {profile.profileImageUrl ? (
            <img 
              src={profile.profileImageUrl} 
              alt="Profile" 
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-2xl font-medium">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </span>
            </div>
          )}
          
          <div className="space-y-1">
            <h4 className="text-xl font-medium text-gray-900">
              {profile.firstName} {profile.lastName}
            </h4>
            {user?.displayName && (
              <p className="text-gray-600">
                {user.displayName}
              </p>
            )}
            {user?.pronouns && (
              <p className="text-sm text-gray-500">
                {user.pronouns}
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Experience</h4>
            <p className="mt-1 text-sm text-gray-900">
              {profile.yearsOfExperience 
                ? `${profile.yearsOfExperience} years` 
                : "Not specified"}
            </p>
          </div>
          
          {profile.languages && profile.languages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Languages</h4>
              <p className="mt-1 text-sm text-gray-900">
                {profile.languages.join(", ")}
              </p>
            </div>
          )}
          
          {profile.specialties && profile.specialties.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Specialties</h4>
              <p className="mt-1 text-sm text-gray-900">
                {profile.specialties.join(", ")}
              </p>
            </div>
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500">Bio</h4>
          <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{profile.bio || "No bio provided."}</p>
        </div>
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
        {/* Image uploaders */}
        <div className="space-y-4">
          <ImageUploader
            imageType="cover"
            currentImageUrl={profile.coverImageUrl}
            onImageSaved={handleCoverSaved}
            aspectRatio={3}
          />
          
          <ImageUploader
            imageType="avatar"
            currentImageUrl={profile.profileImageUrl}
            onImageSaved={handleAvatarSaved}
            aspectRatio={1}
          />
        </div>
        
        {/* Personal information */}
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
            label="Display Name (optional)"
            {...register("displayName")}
            error={errors.displayName?.message}
            placeholder="How you'd like to be called"
          />
          
          <div>
            <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700">
              Pronouns (optional)
            </label>
            <select
              id="pronouns"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedPronouns}
              onChange={handlePronounsChange}
            >
              <option value="">Select pronouns</option>
              {pronounOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {watchedPronouns === "custom" && (
            <Input
              label="Custom Pronouns"
              {...register("customPronouns")}
              error={errors.customPronouns?.message}
              placeholder="Enter your pronouns"
            />
          )}
          
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
            label="Years of Experience"
            type="number"
            min="0"
            {...register("yearsOfExperience", { valueAsNumber: true })}
            error={errors.yearsOfExperience?.message}
          />
        </div>
        
        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {["English", "Spanish", "French", "Mandarin", "Arabic", "Other"].map((lang) => (
              <label key={lang} className="inline-flex items-center">
                <input
                  type="checkbox"
                  value={lang}
                  {...register("languages")}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{lang}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {["Infant Care", "Special Needs", "Early Education", "Multilingual", "Arts & Crafts", "Music", "Sports"].map((specialty) => (
              <label key={specialty} className="inline-flex items-center">
                <input
                  type="checkbox"
                  value={specialty}
                  {...register("specialties")}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{specialty}</span>
              </label>
            ))}
          </div>
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
            onClick={() => {
              reset();
              setIsEditing(false);
            }}
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
