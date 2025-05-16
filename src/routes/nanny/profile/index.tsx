import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import { FamilyLinks } from "~/components/nanny/FamilyLinks";
import { FamilyRequestAccess } from "~/components/nanny/FamilyRequestAccess";
import { CertificationManager } from "~/components/nanny/CertificationManager";
import { ProfileDetail } from "~/components/settings/ProfileDetail";
import { AccountSecurity } from "~/components/settings/AccountSecurity";
import { NotificationSettings } from "~/components/settings/NotificationSettings";
import { PrivacySettings } from "~/components/settings/PrivacySettings";
import { SyncSettings } from "~/components/settings/SyncSettings";
import { MessageComposer } from "~/components/messaging/MessageComposer";
import toast from "react-hot-toast";

const nannyNavigation = [
  {
    name: "Dashboard",
    to: "/nanny/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/nanny/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Observations & Notes",
    to: "/nanny/observations-notes/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/nanny/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Professional Dev",
    to: "/nanny/professional-development/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: "Hours Log",
    to: "/nanny/hours-log/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

type ProfileTab = "details" | "families" | "certifications" | "security" | "notifications" | "privacy" | "sync";

export const Route = createFileRoute("/nanny/profile/")({
  component: NannyProfile,
});

function NannyProfile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("details");
  const [isMessageComposerOpen, setIsMessageComposerOpen] = useState(false);
  const { token } = useAuthStore();
  
  // Fetch nanny profile data
  const { 
    data: profileData, 
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = api.getNannyProfile.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching nanny profile:", err);
      },
    }
  );
  
  // Handle message sent successfully
  const handleMessageSent = () => {
    setIsMessageComposerOpen(false);
    toast.success("Message sent successfully");
  };
  
  // Handle tab switching
  const renderTabContent = () => {
    if (isLoadingProfile) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (profileError) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load profile data. Please try again.</span>
        </div>
      );
    }
    
    if (!profileData) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">No profile data available.</span>
        </div>
      );
    }
    
    switch (activeTab) {
      case "details":
        return <ProfileDetail profile={profileData} userType="nanny" onProfileUpdated={() => refetchProfile()} />;
      case "families":
        return (
          <div className="space-y-8">
            <FamilyLinks families={profileData.assignedFamilies || []} />
            <div className="border-t border-gray-200 pt-6">
              <FamilyRequestAccess 
                onRequestSent={() => refetchProfile()} 
                // availableFamilies might need to be fetched separately or passed if already available
              />
            </div>
          </div>
        );
      case "certifications":
        return <CertificationManager 
          certifications={profileData.certifications} 
          onCertificationUpdated={() => refetchProfile()} 
        />;
      case "security":
        return <AccountSecurity />;
      case "notifications":
        return <NotificationSettings 
          initialSettings={profileData.user?.notificationSettings}
          onSettingsUpdated={() => refetchProfile()}
        />;
      case "privacy":
        return <PrivacySettings 
          initialSettings={{
            profileVisibility: profileData.user?.profileVisibility || "connected",
            marketingOptIn: profileData.user?.marketingOptIn || false,
          }}
          onSettingsUpdated={() => refetchProfile()}
        />;
      case "sync":
        return <SyncSettings 
          initialSettings={profileData.user?.settings}
          onSettingsUpdated={() => refetchProfile()}
        />;
      default:
        return null;
    }
  };
  
  return (
    <DashboardLayout 
      title="My Profile" 
      navigation={nannyNavigation}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <button
            type="button"
            onClick={() => setIsMessageComposerOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Message
          </button>
        </div>
        
        {/* Profile tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={`${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("families")}
              className={`${
                activeTab === "families"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Family Links
            </button>
            <button
              onClick={() => setActiveTab("certifications")}
              className={`${
                activeTab === "certifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Certifications
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
          </nav>
        </div>
        
        {/* Tab content */}
        <div className="bg-white shadow rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
      
      {/* Message Composer Modal */}
      {isMessageComposerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <MessageComposer
              onMessageSent={handleMessageSent}
              children={profileData?.assignedFamilies?.flatMap(family => family.children || []) || []}
              className="shadow-2xl rounded-lg"
            />
            <button 
              onClick={() => setIsMessageComposerOpen(false)} 
              className="absolute top-4 right-4 text-white hover:text-gray-200"
              aria-label="Close new message composer"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
