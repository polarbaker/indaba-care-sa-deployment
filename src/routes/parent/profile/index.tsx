import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { ChildList } from "~/components/parent/ChildList";
import { NannyView } from "~/components/parent/NannyView";
import { ChatMessaging } from "~/components/messaging/ChatMessaging";
import { DevelopmentTracker } from "~/components/parent/DevelopmentTracker";
import { ResourcesHub } from "~/components/parent/ResourcesHub";
import { FeedbackForm } from "~/components/parent/FeedbackForm";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import { ProfileDetail } from "~/components/settings/ProfileDetail";
import { AccountSecurity } from "~/components/settings/AccountSecurity";
import { NotificationSettings } from "~/components/settings/NotificationSettings";
import { PrivacySettings } from "~/components/settings/PrivacySettings";
import { SyncSettings } from "~/components/settings/SyncSettings";
import { MessageComposer } from "~/components/messaging/MessageComposer";
import toast from "react-hot-toast";

const parentNavigation = [
  {
    name: "Dashboard",
    to: "/parent/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/parent/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Children",
    to: "/parent/children/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
  {
    name: "Observations",
    to: "/parent/observations/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/parent/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Milestones",
    to: "/parent/milestones/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

type ProfileTab = "profile" | "children" | "nanny" | "chat" | "development" | "resources" | "feedback" | "security" | "notifications" | "privacy" | "sync";

export const Route = createFileRoute("/parent/profile/")({
  component: ParentProfile,
});

function ParentProfile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [isMessageComposerOpen, setIsMessageComposerOpen] = useState(false);
  const { token } = useAuthStore();
  
  // Placeholder for profile data loading
  const { 
    data: profileData, 
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = api.getParentProfile.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching parent profile:", err);
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
      case "profile":
        return <ProfileDetail 
          profile={profileData} 
          userType="parent" 
          onProfileUpdated={() => refetchProfile()} 
        />;
      case "children":
        return <ChildList 
          children={profileData.children || []} 
          onChildUpdated={() => refetchProfile()}
        />;
      case "nanny":
        return <NannyView 
          nannies={profileData.family?.nannies || []} 
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
      case "chat":
        return <ChatMessaging />;
      case "development":
        return <DevelopmentTracker />;
      case "resources":
        return <ResourcesHub />;
      case "feedback":
        return <FeedbackForm />;
      default:
        return null;
    }
  };
  
  return (
    <DashboardLayout 
      title="My Profile" 
      navigation={parentNavigation}
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
              onClick={() => setActiveTab("children")}
              className={`${
                activeTab === "children"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Children
            </button>
            <button
              onClick={() => setActiveTab("nanny")}
              className={`${
                activeTab === "nanny"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Nannies
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
              onClick={() => setActiveTab("chat")}
              className={`${
                activeTab === "chat"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("development")}
              className={`${
                activeTab === "development"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Development
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`${
                activeTab === "resources"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Resources
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`${
                activeTab === "feedback"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Feedback
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
              children={profileData?.children || []}
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
