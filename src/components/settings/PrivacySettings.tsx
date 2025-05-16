import { useState, useEffect } from "react";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";

type ProfileVisibility = "public" | "connected" | "admin";

interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  marketingOptIn: boolean;
}

interface PrivacySettingsProps {
  initialSettings?: Partial<PrivacySettings>;
  onSettingsUpdated?: (settings: PrivacySettings) => void;
}

export function PrivacySettings({
  initialSettings,
  onSettingsUpdated,
}: PrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: "connected",
    marketingOptIn: false,
    ...initialSettings,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const { isOnline: networkIsOnline } = useNetworkStatus(); // Added for consistency
  const utils = api.useUtils();

  // Fetch current user data to get the latest privacy settings
  const { data: userData, isLoading: isLoadingUserSettings, refetch: refetchUserSettings } = api.getMe.useQuery(
    { token: token! },
    { 
      enabled: !!token && networkIsOnline,
      onSuccess: (data) => {
        if (data) {
          setSettings(prev => ({ 
            ...prev, 
            profileVisibility: data.profileVisibility as ProfileVisibility || "connected",
            marketingOptIn: data.marketingOptIn || false,
          }));
          setIsDirty(false);
        }
      }
    }
  );
  
  // Reset dirty state when initial settings change from fetched data
  useEffect(() => {
    if (userData) {
      setSettings(prev => ({
        ...prev, // Keep defaults
        profileVisibility: userData.profileVisibility as ProfileVisibility || "connected",
        marketingOptIn: userData.marketingOptIn || false,
      }));
      setIsDirty(false);
    }
  }, [userData]);
  
  const updatePrivacySettingsMutation = api.updatePrivacySettings.useMutation({
    onSuccess: () => {
      toast.success("Privacy settings updated");
      setIsSaving(false);
      setIsDirty(false);
      
      // Refetch user data to update the UI with latest settings
      void refetchUserSettings();
      void utils.getMe.invalidate();

      if (onSettingsUpdated) {
        onSettingsUpdated(settings);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update privacy settings: ${error.message}`);
      setIsSaving(false);
    },
  });
  
  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    setSettings((prev) => ({ ...prev, profileVisibility: visibility }));
    setIsDirty(true);
  };
  
  const handleMarketingOptInChange = (optIn: boolean) => {
    setSettings((prev) => ({ ...prev, marketingOptIn: optIn }));
    setIsDirty(true);
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    if (isOnline) {
      // If online, update directly
      updatePrivacySettingsMutation.mutate({
        token: token!,
        profileVisibility: settings.profileVisibility,
        marketingOptIn: settings.marketingOptIn,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "User",
          recordId: "current", // This will be replaced with the actual ID in the sync operation
          data: {
            profileVisibility: settings.profileVisibility,
            marketingOptIn: settings.marketingOptIn,
          },
        });
        
        toast.success("Privacy settings saved for syncing when back online");
        setIsSaving(false);
        setIsDirty(false);
        
        if (onSettingsUpdated) {
          onSettingsUpdated(settings);
        }
      } catch (error) {
        toast.error("Failed to save privacy settings offline");
        setIsSaving(false);
      }
    }
  };
  
  if (networkIsOnline && isLoadingUserSettings) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Control who can see your profile and how your information is used.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Profile Visibility</h4>
          <p className="text-xs text-gray-500 mt-1">
            Choose who can view your profile information.
          </p>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="visibility-public"
                  name="visibility"
                  type="radio"
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  checked={settings.profileVisibility === "public"}
                  onChange={() => handleVisibilityChange("public")}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="visibility-public" className="font-medium text-gray-700">
                  Public
                </label>
                <p className="text-gray-500">
                  Your profile is visible to anyone using the platform.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="visibility-connected"
                  name="visibility"
                  type="radio"
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  checked={settings.profileVisibility === "connected"}
                  onChange={() => handleVisibilityChange("connected")}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="visibility-connected" className="font-medium text-gray-700">
                  Connected Users Only
                </label>
                <p className="text-gray-500">
                  Only users connected to you (families, nannies) can see your profile.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="visibility-admin"
                  name="visibility"
                  type="radio"
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  checked={settings.profileVisibility === "admin"}
                  onChange={() => handleVisibilityChange("admin")}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="visibility-admin" className="font-medium text-gray-700">
                  Admins Only
                </label>
                <p className="text-gray-500">
                  Only platform administrators can see your profile.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-700">Marketing Preferences</h4>
          <p className="text-xs text-gray-500 mt-1">
            Choose whether you'd like to receive promotional communications.
          </p>
          
          <div className="mt-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="marketing-opt-in"
                  name="marketing-opt-in"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={settings.marketingOptIn}
                  onChange={(e) => handleMarketingOptInChange(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="marketing-opt-in" className="font-medium text-gray-700">
                  Marketing Communications
                </label>
                <p className="text-gray-500">
                  Receive product updates, research invitations, and promotional content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isDirty || (!networkIsOnline && !isDirty)}
        >
          Save Privacy Settings
        </Button>
      </div>
    </div>
  );
}
