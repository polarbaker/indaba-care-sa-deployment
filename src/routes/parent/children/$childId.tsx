import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";
import { HealthAndAllergiesTab } from "~/components/parent/child/HealthAndAllergiesTab";
import { DailyScheduleTab } from "~/components/parent/child/DailyScheduleTab";
import { MediaGalleryTab } from "~/components/parent/child/MediaGalleryTab";

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
    name: "Family Profile",
    to: "/parent/family/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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
  {
    name: "Resources Hub",
    to: "/parent/resources/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

type ChildProfileTab = "overview" | "health" | "schedule" | "media";

export const Route = createFileRoute("/parent/children/$childId")({
  component: ChildProfileView,
});

function ChildProfileView() {
  const { childId } = useParams({ from: "/parent/children/$childId" });
  const [activeTab, setActiveTab] = useState<ChildProfileTab>("overview");
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const utils = api.useUtils();

  // Fetch child details - This procedure needs to be created
  const { 
    data: childData, 
    isLoading: isLoadingChild,
    error: childError,
    refetch: refetchChildDetails
  } = api.getChildDetails.useQuery( // This procedure needs to be created
    { token: token || "", childId },
    {
      enabled: !!token && !!childId,
      onError: (err) => {
        console.error("Error fetching child details:", err);
        toast.error("Failed to load child details.");
      },
    }
  );
  
  // Placeholder for delete/archive mutations
  const archiveChildMutation = api.archiveChild.useMutation({ // This procedure needs to be created
    onSuccess: () => {
      toast.success("Child archived successfully.");
      utils.getChildrenOverview.invalidate(); // Refresh the children list
      navigate({ to: "/parent/children/" });
    },
    onError: (error) => toast.error(`Failed to archive child: ${error.message}`),
  });

  const deleteChildMutation = api.deleteChild.useMutation({ // This procedure needs to be created
    onSuccess: () => {
      toast.success("Child deleted successfully.");
      utils.getChildrenOverview.invalidate(); // Refresh the children list
      navigate({ to: "/parent/children/" });
    },
    onError: (error) => toast.error(`Failed to delete child: ${error.message}`),
  });

  const handleArchiveChild = () => {
    if (window.confirm("Are you sure you want to archive this child?")) {
      archiveChildMutation.mutate({ token: token!, childId });
    }
  };

  const handleDeleteChild = () => {
    if (window.confirm("Are you sure you want to permanently delete this child? This action cannot be undone.")) {
      deleteChildMutation.mutate({ token: token!, childId });
    }
  };

  const renderTabContent = () => {
    if (!childData) return null;
    switch (activeTab) {
      case "overview":
        // Display general child info: DOB, allergies/medical info, favorite activities, sleep/eating routines
        // This will likely be part of the main ChildProfileView or a dedicated component
        return (
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="text-lg font-medium mb-2">Child Overview</h4>
            <p><strong>Date of Birth:</strong> {new Date(childData.dateOfBirth).toLocaleDateString()}</p>
            <p><strong>Gender:</strong> {childData.gender || 'Not specified'}</p>
            <p className="mt-2"><strong>Allergies:</strong></p>
            <pre className="bg-white p-2 rounded text-sm">{childData.allergies || 'None specified'}</pre>
            <p className="mt-2"><strong>Medical Info:</strong></p>
            <pre className="bg-white p-2 rounded text-sm">{childData.medicalInfo || 'None specified'}</pre>
            <p className="mt-2"><strong>Favorite Activities:</strong></p>
            <pre className="bg-white p-2 rounded text-sm">{childData.favoriteActivities || 'None specified'}</pre>
            <p className="mt-2"><strong>Sleep Routine:</strong></p>
            <pre className="bg-white p-2 rounded text-sm">{childData.sleepRoutine || 'None specified'}</pre>
            <p className="mt-2"><strong>Eating Routine:</strong></p>
            <pre className="bg-white p-2 rounded text-sm">{childData.eatingRoutine || 'None specified'}</pre>
          </div>
        );
      case "health":
        return <HealthAndAllergiesTab childId={childId} onUpdate={refetchChildDetails} />;
      case "schedule":
        return <DailyScheduleTab childId={childId} onUpdate={refetchChildDetails} />;
      case "media":
        return <MediaGalleryTab childId={childId} />;
      default:
        return null;
    }
  };

  if (isLoadingChild) {
    return (
      <DashboardLayout title="Child Profile" navigation={parentNavigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (childError || !childData) {
    return (
      <DashboardLayout title="Child Profile" navigation={parentNavigation}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load child profile. Please try again or select a different child.</span>
          <div className="mt-4">
            <Link to="/parent/children/" className="font-bold underline">Return to Children List</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title={`${childData.firstName} ${childData.lastName}'s Profile`} 
      navigation={parentNavigation}
    >
      <div className="space-y-6">
        {/* Child Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {childData.profileImageUrl ? (
                <img className="h-16 w-16 rounded-full object-cover" src={childData.profileImageUrl} alt="" />
              ) : (
                <span className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl text-gray-600">
                  {childData.firstName.charAt(0)}{childData.lastName.charAt(0)}
                </span>
              )}
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">{childData.firstName} {childData.lastName}</h2>
                <p className="text-sm text-gray-500">Age: {childData.age} years</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => {/* Implement Edit Child functionality */}}>Edit Profile</Button>
              <Button variant="outline" color="secondary" onClick={handleArchiveChild}>Archive Child</Button>
              <Button variant="destructive" onClick={handleDeleteChild}>Delete Child</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {(["overview", "health", "schedule", "media"] as ChildProfileTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
