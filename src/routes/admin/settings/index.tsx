import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import { ProfileDetail } from "~/components/settings/ProfileDetail";
import { AccountSecurity } from "~/components/settings/AccountSecurity";
import { NotificationSettings } from "~/components/settings/NotificationSettings";
import { PrivacySettings } from "~/components/settings/PrivacySettings";
import { SyncSettings } from "~/components/settings/SyncSettings";
import { SystemSettings } from "~/components/admin/system-settings/SystemSettings";
import toast from "react-hot-toast";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

export const Route = createFileRoute("/admin/settings/")({
  component: AdminSettings,
});

function AdminSettings() {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications" | "privacy" | "sync" | "system">("profile");
  const { token } = useAuthStore();
  
  // Fetch admin profile data
  const { 
    data: profileData, 
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = api.getAdminUser.useQuery(
    { token: token || "", userId: "current" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching admin profile:", err);
      },
    }
  );
  
  return (
    <DashboardLayout 
      title="System Settings" 
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        {/* Settings tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`${
                activeTab === "security"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`${
                activeTab === "notifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`${
                activeTab === "privacy"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Privacy
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className={`${
                activeTab === "sync"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Sync
            </button>
            <button
              onClick={() => setActiveTab("system")}
              className={`${
                activeTab === "system"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              System
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div className="bg-white shadow rounded-lg p-6">
          {isLoadingProfile ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : profileError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">Failed to load profile data. Please try again.</span>
            </div>
          ) : !profileData ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">No profile data available.</span>
            </div>
          ) : (
            <>
              {activeTab === "profile" && (
                <ProfileDetail 
                  profile={profileData} 
                  userType="admin" 
                  onProfileUpdated={() => refetchProfile()} 
                />
              )}
              
              {activeTab === "security" && (
                <AccountSecurity />
              )}
              
              {activeTab === "notifications" && (
                <NotificationSettings 
                  initialSettings={profileData.user?.notificationSettings}
                  onSettingsUpdated={() => refetchProfile()}
                />
              )}
              
              {activeTab === "privacy" && (
                <PrivacySettings 
                  initialSettings={{
                    profileVisibility: profileData.user?.profileVisibility || "connected",
                    marketingOptIn: profileData.user?.marketingOptIn || false,
                  }}
                  onSettingsUpdated={() => refetchProfile()}
                />
              )}
              
              {activeTab === "sync" && (
                <SyncSettings 
                  initialSettings={profileData.user?.settings}
                  onSettingsUpdated={() => refetchProfile()}
                />
              )}
              
              {activeTab === "system" && (
                <SystemSettings />
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
