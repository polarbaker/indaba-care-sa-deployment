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

// Define preference types
type CarePreferences = {
  preferredActivities?: string[];
  dietaryRestrictions?: string;
  napSchedule?: string;
  bedtimeRoutine?: string;
  morningRoutine?: string;
  disciplineApproach?: string;
  screenTimeRules?: string;
  outdoorPlayPreferences?: string;
};

type NotificationSettings = {
  dailyUpdates?: boolean;
  milestoneAlerts?: boolean;
  emergencyAlerts?: boolean;
  messageNotifications?: boolean;
  observationNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
};

// Define family type
type FamilyType = {
  id: string;
  name: string;
  preferences?: {
    id: string;
    carePreferences?: string; // JSON string
    parsedCarePreferences?: CarePreferences;
    dietaryRestrictions?: string;
    notificationSettings?: string; // JSON string
    parsedNotificationSettings?: NotificationSettings;
  };
};

// Define form validation schema
const preferencesSchema = z.object({
  // Care preferences
  preferredActivities: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  napSchedule: z.string().optional(),
  bedtimeRoutine: z.string().optional(),
  morningRoutine: z.string().optional(),
  disciplineApproach: z.string().optional(),
  screenTimeRules: z.string().optional(),
  outdoorPlayPreferences: z.string().optional(),
  
  // Notification settings
  dailyUpdates: z.boolean().default(true),
  milestoneAlerts: z.boolean().default(true),
  emergencyAlerts: z.boolean().default(true),
  messageNotifications: z.boolean().default(true),
  observationNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// Component props
interface FamilyPreferencesProps {
  family?: FamilyType;
  onPreferencesUpdated?: () => void;
}

export function FamilyPreferences({ family, onPreferencesUpdated }: FamilyPreferencesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Fetch family preferences
  const { 
    data: preferencesData, 
    isLoading: isLoadingPreferences,
    refetch: refetchPreferences
  } = api.getFamilyPreferences.useQuery(
    { token: token || "", familyId: family?.id || "" },
    {
      enabled: !!token && !!family?.id,
      onError: (err) => {
        console.error("Error fetching family preferences:", err);
      },
    }
  );
  
  // Initialize form with preferences data
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      // Care preferences
      preferredActivities: family?.preferences?.parsedCarePreferences?.preferredActivities?.join(", ") || "",
      dietaryRestrictions: family?.preferences?.dietaryRestrictions || family?.preferences?.parsedCarePreferences?.dietaryRestrictions || "",
      napSchedule: family?.preferences?.parsedCarePreferences?.napSchedule || "",
      bedtimeRoutine: family?.preferences?.parsedCarePreferences?.bedtimeRoutine || "",
      morningRoutine: family?.preferences?.parsedCarePreferences?.morningRoutine || "",
      disciplineApproach: family?.preferences?.parsedCarePreferences?.disciplineApproach || "",
      screenTimeRules: family?.preferences?.parsedCarePreferences?.screenTimeRules || "",
      outdoorPlayPreferences: family?.preferences?.parsedCarePreferences?.outdoorPlayPreferences || "",
      
      // Notification settings
      dailyUpdates: family?.preferences?.parsedNotificationSettings?.dailyUpdates ?? true,
      milestoneAlerts: family?.preferences?.parsedNotificationSettings?.milestoneAlerts ?? true,
      emergencyAlerts: family?.preferences?.parsedNotificationSettings?.emergencyAlerts ?? true,
      messageNotifications: family?.preferences?.parsedNotificationSettings?.messageNotifications ?? true,
      observationNotifications: family?.preferences?.parsedNotificationSettings?.observationNotifications ?? true,
      emailNotifications: family?.preferences?.parsedNotificationSettings?.emailNotifications ?? true,
      smsNotifications: family?.preferences?.parsedNotificationSettings?.smsNotifications ?? false,
      pushNotifications: family?.preferences?.parsedNotificationSettings?.pushNotifications ?? true,
    },
  });
  
  // Watch notification method selections
  const hasNotificationMethod = watch("emailNotifications") || watch("smsNotifications") || watch("pushNotifications");
  
  // Update preferences mutation
  const updatePreferencesMutation = api.updateFamilyPreferences.useMutation({
    onSuccess: () => {
      toast.success("Family preferences updated successfully");
      setIsEditing(false);
      refetchPreferences();
      if (onPreferencesUpdated) {
        onPreferencesUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: PreferencesFormValues) => {
    if (!family?.id) {
      toast.error("Family ID is required");
      return;
    }
    
    // Format care preferences
    const carePreferences = {
      preferredActivities: data.preferredActivities?.split(",").map(item => item.trim()).filter(Boolean) || [],
      dietaryRestrictions: data.dietaryRestrictions,
      napSchedule: data.napSchedule,
      bedtimeRoutine: data.bedtimeRoutine,
      morningRoutine: data.morningRoutine,
      disciplineApproach: data.disciplineApproach,
      screenTimeRules: data.screenTimeRules,
      outdoorPlayPreferences: data.outdoorPlayPreferences,
    };
    
    // Format notification settings
    const notificationSettings = {
      dailyUpdates: data.dailyUpdates,
      milestoneAlerts: data.milestoneAlerts,
      emergencyAlerts: data.emergencyAlerts,
      messageNotifications: data.messageNotifications,
      observationNotifications: data.observationNotifications,
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      pushNotifications: data.pushNotifications,
    };
    
    if (isOnline) {
      // If online, update directly
      updatePreferencesMutation.mutate({
        token: token!,
        familyId: family.id,
        carePreferences,
        dietaryRestrictions: data.dietaryRestrictions,
        notificationSettings,
      });
    } else {
      // If offline, add to sync queue
      try {
        if (family.preferences?.id) {
          // Update existing preferences
          addOperation({
            operationType: "UPDATE",
            modelName: "FamilyPreference",
            recordId: family.preferences.id,
            data: {
              carePreferences: JSON.stringify(carePreferences),
              dietaryRestrictions: data.dietaryRestrictions,
              notificationSettings: JSON.stringify(notificationSettings),
            },
          });
        } else {
          // Create new preferences
          const newPreferencesId = crypto.randomUUID();
          addOperation({
            operationType: "CREATE",
            modelName: "FamilyPreference",
            recordId: newPreferencesId,
            data: {
              familyId: family.id,
              carePreferences: JSON.stringify(carePreferences),
              dietaryRestrictions: data.dietaryRestrictions,
              notificationSettings: JSON.stringify(notificationSettings),
            },
          });
        }
        
        toast.success("Preferences saved for syncing when back online");
        setIsEditing(false);
        if (onPreferencesUpdated) {
          onPreferencesUpdated();
        }
      } catch (error) {
        toast.error("Failed to save preferences offline");
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
        <h3 className="text-lg font-medium text-gray-900">Family Preferences & Settings</h3>
        {!isEditing && (
          <Button 
            type="button" 
            onClick={() => setIsEditing(true)}
            variant="outline"
          >
            Edit Preferences
          </Button>
        )}
      </div>
      
      {isLoadingPreferences ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Care Preferences Section */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Care Preferences</h4>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nap Schedule
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Preferred nap times and duration"
                  {...register("napSchedule")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedtime Routine
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Preferred bedtime routine steps"
                  {...register("bedtimeRoutine")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Morning Routine
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Preferred morning routine steps"
                  {...register("morningRoutine")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discipline Approach
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Preferred approach to discipline and behavior management"
                  {...register("disciplineApproach")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screen Time Rules
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Rules about TV, tablets, phones, etc."
                  {...register("screenTimeRules")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outdoor Play Preferences
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Preferences for outdoor activities, weather restrictions, etc."
                  {...register("outdoorPlayPreferences")}
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Notification Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Notification Settings</h4>
            
            <div className="space-y-6">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">What would you like to be notified about?</h5>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="dailyUpdates"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("dailyUpdates")}
                    />
                    <label htmlFor="dailyUpdates" className="ml-2 block text-sm text-gray-700">
                      Daily updates from nanny
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="milestoneAlerts"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("milestoneAlerts")}
                    />
                    <label htmlFor="milestoneAlerts" className="ml-2 block text-sm text-gray-700">
                      Milestone alerts
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="emergencyAlerts"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("emergencyAlerts")}
                    />
                    <label htmlFor="emergencyAlerts" className="ml-2 block text-sm text-gray-700">
                      Emergency alerts
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="messageNotifications"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("messageNotifications")}
                    />
                    <label htmlFor="messageNotifications" className="ml-2 block text-sm text-gray-700">
                      New messages
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="observationNotifications"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("observationNotifications")}
                    />
                    <label htmlFor="observationNotifications" className="ml-2 block text-sm text-gray-700">
                      New observations
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">How would you like to receive notifications?</h5>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="emailNotifications"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("emailNotifications")}
                    />
                    <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                      Email
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="smsNotifications"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("smsNotifications")}
                    />
                    <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-700">
                      SMS Text Messages
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="pushNotifications"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register("pushNotifications")}
                    />
                    <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-700">
                      Push Notifications (Mobile App)
                    </label>
                  </div>
                </div>
                
                {!hasNotificationMethod && (
                  <p className="mt-2 text-sm text-red-600">
                    Please select at least one notification method.
                  </p>
                )}
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
              disabled={!hasNotificationMethod}
            >
              Save Preferences
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-8">
          {/* Care Preferences Display */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Care Preferences</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                {family?.preferences?.parsedCarePreferences?.preferredActivities && 
                 family.preferences.parsedCarePreferences.preferredActivities.length > 0 ? (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Preferred Activities</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {family.preferences.parsedCarePreferences.preferredActivities.map((activity) => (
                          <span 
                            key={activity} 
                            className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                          >
                            {activity}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                ) : null}
                
                {(family?.preferences?.dietaryRestrictions || family?.preferences?.parsedCarePreferences?.dietaryRestrictions) && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Dietary Restrictions</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.dietaryRestrictions || family.preferences.parsedCarePreferences?.dietaryRestrictions}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.napSchedule && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Nap Schedule</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.napSchedule}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.bedtimeRoutine && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Bedtime Routine</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.bedtimeRoutine}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.morningRoutine && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Morning Routine</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.morningRoutine}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.disciplineApproach && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Discipline Approach</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.disciplineApproach}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.screenTimeRules && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Screen Time Rules</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.screenTimeRules}
                    </dd>
                  </div>
                )}
                
                {family?.preferences?.parsedCarePreferences?.outdoorPlayPreferences && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Outdoor Play Preferences</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {family.preferences.parsedCarePreferences.outdoorPlayPreferences}
                    </dd>
                  </div>
                )}
                
                {!family?.preferences?.parsedCarePreferences && !family?.preferences?.dietaryRestrictions && (
                  <div className="px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">No care preferences set yet.</p>
                  </div>
                )}
              </dl>
            </div>
          </div>
          
          {/* Notification Settings Display */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Notification Settings</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Notification Types</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul className="space-y-1">
                      {family?.preferences?.parsedNotificationSettings?.dailyUpdates && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Daily updates from nanny
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.milestoneAlerts && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Milestone alerts
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.emergencyAlerts && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Emergency alerts
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.messageNotifications && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          New messages
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.observationNotifications && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          New observations
                        </li>
                      )}
                      
                      {!family?.preferences?.parsedNotificationSettings && (
                        <li>No notification types selected.</li>
                      )}
                    </ul>
                  </dd>
                </div>
                
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Notification Methods</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul className="space-y-1">
                      {family?.preferences?.parsedNotificationSettings?.emailNotifications && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Email
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.smsNotifications && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          SMS Text Messages
                        </li>
                      )}
                      
                      {family?.preferences?.parsedNotificationSettings?.pushNotifications && (
                        <li className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Push Notifications (Mobile App)
                        </li>
                      )}
                      
                      {!family?.preferences?.parsedNotificationSettings && (
                        <li>No notification methods selected.</li>
                      )}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
