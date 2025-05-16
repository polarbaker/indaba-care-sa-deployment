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

// Define time zones
const timeZones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT/BST (UK)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

// Define locales
const locales = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German" },
  { value: "it-IT", label: "Italian" },
  { value: "ja-JP", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
];

// Define pronouns options
const pronounOptions = [
  { value: "he/him", label: "He/Him" },
  { value: "she/her", label: "She/Her" },
  { value: "they/them", label: "They/Them" },
  { value: "custom", label: "Custom" },
];

// Define the form schema for validation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  displayName: z.string().optional(),
  pronouns: z.string().optional(),
  customPronouns: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().optional(),
  phoneVerified: z.boolean().optional(),
  timeZone: z.string().optional(),
  locale: z.string().optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  preferredNotificationChannels: z.array(z.enum(["in-app", "email", "sms"])).optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  coverImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  // Nanny specific fields
  location: z.string().optional(),
  availability: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileDetailProps {
  profile: any; // Type from getProfile response
  userType: "nanny" | "parent" | "admin";
  onProfileUpdated: () => void;
}

export function ProfileDetail({ profile, userType, onProfileUpdated }: ProfileDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPronouns, setSelectedPronouns] = useState(profile.pronouns || "");
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: user?.displayName || "",
      pronouns: user?.pronouns || "",
      customPronouns: user?.pronouns && !pronounOptions.some(p => p.value === user.pronouns) 
        ? user.pronouns 
        : "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      phoneVerified: user?.phoneVerified || false,
      timeZone: user?.timeZone || "UTC",
      locale: user?.locale || "en-US",
      bio: profile.bio || "",
      preferredNotificationChannels: user?.notificationSettings?.preferredChannels || [],
      profileImageUrl: profile.profileImageUrl || "",
      coverImageUrl: profile.coverImageUrl || "",
      location: profile.location || "", // Nanny specific
      availability: profile.availability || "", // Nanny specific
    },
  });
  
  // Watch the selected pronouns to conditionally show custom pronouns field
  const watchedPronouns = watch("pronouns");
  
  // Get the appropriate update mutation based on user type
  const updateMutation = userType === "nanny" 
    ? api.updateNannyProfile.useMutation()
    : userType === "parent"
    ? api.updateParentProfile.useMutation()
    : api.updateAdminProfile.useMutation();
  
  // Handle mutation success and error
  updateMutation.onSuccess = () => {
    toast.success("Profile updated successfully");
    setIsSubmitting(false);
    setIsEditing(false);
    onProfileUpdated();
  };
  
  updateMutation.onError = (error) => {
    toast.error(`Failed to update profile: ${error.message}`);
    setIsSubmitting(false);
  };
  
  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    setIsSubmitting(true);
    
    // Handle custom pronouns
    const finalPronouns = data.pronouns === "custom" && data.customPronouns 
      ? data.customPronouns 
      : data.pronouns;
    
    if (isOnline) {
      // If online, send directly to the server
      updateMutation.mutate({
        token: token!,
        ...data,
        pronouns: finalPronouns, // Use finalPronouns
        // NannyProfile specific fields are already part of 'data'
        // User specific fields like email, displayName, timeZone, locale are also part of 'data'
        // and should be handled by the respective updateNannyProfile/updateParentProfile/updateAdminProfile procedures
      });
    } else {
      // If offline, store in sync queue
      try {
        // Add profile update operation
        const modelName = userType === "nanny" 
          ? "NannyProfile" 
          : userType === "parent" 
          ? "ParentProfile" 
          : "AdminProfile";
        
        const profilePayload: any = {
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          profileImageUrl: data.profileImageUrl,
          coverImageUrl: data.coverImageUrl,
        };

        if (userType === "nanny") {
          profilePayload.location = data.location;
          profilePayload.availability = data.availability;
        }
        
        addOperation({
          operationType: "UPDATE",
          modelName,
          recordId: profile.id,
          data: profilePayload,
        });
        
        // Add user settings update operation
        addOperation({
          operationType: "UPDATE",
          modelName: "User",
          recordId: user?.id || "current",
          data: {
            displayName: data.displayName,
            pronouns: finalPronouns,
            email: data.email,
            phoneNumber: data.phoneNumber,
            // phoneVerified will be handled by a separate flow
            timeZone: data.timeZone,
            locale: data.locale,
          },
        });

        // Add preferred notification channels update
        if (data.preferredNotificationChannels) {
           addOperation({
            operationType: "UPDATE",
            modelName: "UserNotificationSettings",
            recordId: user?.notificationSettings?.id || "current", // Assuming UserNotificationSettings has an ID or a way to update it
            data: {
              preferredChannels: data.preferredNotificationChannels,
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
  
  // Handle cancel button click
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
  
  // Handle phone verification
  const handleVerifyPhone = () => {
    // This would be implemented with a separate mutation to send a verification code
    toast.info("Phone verification feature is coming soon");
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
            <h4 className="text-sm font-medium text-gray-500">Email Address</h4>
            <p className="mt-1 text-sm text-gray-900">{user?.email || "Not provided"}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Phone Number</h4>
            <p className="mt-1 text-sm text-gray-900 flex items-center">
              {profile.phoneNumber || "Not provided"}
              {profile.phoneNumber && user?.phoneVerified && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              )}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Location</h4>
            <p className="mt-1 text-sm text-gray-900">{profile.location || "Not provided"}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Time Zone</h4>
            <p className="mt-1 text-sm text-gray-900">
              {timeZones.find(tz => tz.value === user?.timeZone)?.label || "UTC"}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500">Language</h4>
            <p className="mt-1 text-sm text-gray-900">
              {locales.find(l => l.value === user?.locale)?.label || "English (US)"}
            </p>
          </div>
          
          {userType === "nanny" && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">Availability</h4>
              <p className="mt-1 text-sm text-gray-900">{profile.availability || "Not specified"}</p>
            </div>
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500">Bio</h4>
          <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{profile.bio || "No bio provided."}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500">Preferred Notification Channels</h4>
          <p className="mt-1 text-sm text-gray-900">
            {user?.notificationSettings?.preferredChannels?.join(", ") || "Not set"}
          </p>
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
            label="Email Address"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            // Email editing might require verification, consider disabling or adding a verification flow
            // disabled 
          />
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="tel"
                id="phoneNumber"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...register("phoneNumber")}
              />
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm"
                onClick={handleVerifyPhone}
                disabled={!watch("phoneNumber") || isSubmitting}
              >
                Verify
              </button>
            </div>
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>
          
          <Input
            label="Location"
            {...register("location")}
            error={errors.location?.message}
            placeholder="City, State"
          />
          
          <div>
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
              Time Zone
            </label>
            <select
              id="timeZone"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              {...register("timeZone")}
            >
              {timeZones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            {errors.timeZone && (
              <p className="mt-1 text-sm text-red-600">{errors.timeZone.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="locale" className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              id="locale"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              {...register("locale")}
            >
              {locales.map((locale) => (
                <option key={locale.value} value={locale.value}>
                  {locale.label}
                </option>
              ))}
            </select>
            {errors.locale && (
              <p className="mt-1 text-sm text-red-600">{errors.locale.message}</p>
            )}
          </div>
          
          {userType === "nanny" && (
            <Input
              label="Availability"
              {...register("availability")}
              error={errors.availability?.message}
              placeholder="e.g., Weekdays 9am-5pm"
            />
          )}
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Preferred Notification Channels
          </label>
          <div className="mt-2 space-y-2">
            {["in-app", "email", "sms"].map((channel) => (
              <div key={channel} className="flex items-center">
                <input
                  id={`channel-${channel}`}
                  type="checkbox"
                  value={channel}
                  {...register("preferredNotificationChannels")}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`channel-${channel}`} className="ml-2 text-sm text-gray-700 capitalize">
                  {channel}
                </label>
              </div>
            ))}
          </div>
          {errors.preferredNotificationChannels && (
            <p className="mt-1 text-sm text-red-600">{errors.preferredNotificationChannels.message}</p>
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
