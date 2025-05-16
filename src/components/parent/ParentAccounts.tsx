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

// Define parent user type
type ParentUserType = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  lastLogin?: string;
  role: "PARENT";
  accessLevel: "full" | "view_only";
};

// Define invitation type
type InvitationType = {
  id: string;
  email: string;
  role: "full" | "view_only";
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
};

// Define family type
type FamilyType = {
  id: string;
  name: string;
  parentUsers?: ParentUserType[];
  invitations?: InvitationType[];
};

// Define form validation schema
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["full", "view_only"], {
    errorMap: () => ({ message: "Please select a role" }),
  }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// Component props
interface ParentAccountsProps {
  family?: FamilyType;
  onAccountsUpdated?: () => void;
}

export function ParentAccounts({ family, onAccountsUpdated }: ParentAccountsProps) {
  const { token, user } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "view_only",
    },
  });
  
  // Fetch parent users and invitations
  const { 
    data: familyUsersData, 
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = api.getFamilyUsers.useQuery(
    { token: token || "", familyId: family?.id || "" },
    {
      enabled: !!token && !!family?.id,
      onError: (err) => {
        console.error("Error fetching family users:", err);
      },
    }
  );
  
  // Invite parent mutation
  const inviteParentMutation = api.inviteParent.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      reset();
      refetchUsers();
      if (onAccountsUpdated) {
        onAccountsUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });
  
  // Resend invitation mutation
  const resendInvitationMutation = api.resendParentInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Failed to resend invitation: ${error.message}`);
    },
  });
  
  // Cancel invitation mutation
  const cancelInvitationMutation = api.cancelParentInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled successfully");
      refetchUsers();
      if (onAccountsUpdated) {
        onAccountsUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to cancel invitation: ${error.message}`);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: InviteFormValues) => {
    if (!family?.id) {
      toast.error("Family ID is required");
      return;
    }
    
    if (isOnline) {
      // If online, send invitation directly
      inviteParentMutation.mutate({
        token: token!,
        familyId: family.id,
        email: data.email,
        role: data.role,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "ParentInvitation",
          recordId: crypto.randomUUID(),
          data: {
            familyId: family.id,
            email: data.email,
            role: data.role,
            status: "pending",
            token: crypto.randomUUID(), // Placeholder token
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            createdAt: new Date().toISOString(),
          },
        });
        
        toast.success("Invitation saved for sending when back online");
        reset();
        if (onAccountsUpdated) {
          onAccountsUpdated();
        }
      } catch (error) {
        toast.error("Failed to save invitation offline");
      }
    }
  };
  
  // Handle invitation resend
  const handleResendInvitation = (invitationId: string) => {
    if (isOnline) {
      resendInvitationMutation.mutate({
        token: token!,
        invitationId,
      });
    } else {
      toast.error("Cannot resend invitations while offline");
    }
  };
  
  // Handle invitation cancellation
  const handleCancelInvitation = (invitationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }
    
    if (isOnline) {
      cancelInvitationMutation.mutate({
        token: token!,
        invitationId,
      });
    } else {
      try {
        addOperation({
          operationType: "DELETE",
          modelName: "ParentInvitation",
          recordId: invitationId,
          data: {},
        });
        
        toast.success("Invitation cancellation saved for syncing when back online");
        if (onAccountsUpdated) {
          onAccountsUpdated();
        }
      } catch (error) {
        toast.error("Failed to cancel invitation offline");
      }
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      return interval + " year" + (interval === 1 ? "" : "s") + " ago";
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      return interval + " month" + (interval === 1 ? "" : "s") + " ago";
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
      return interval + " day" + (interval === 1 ? "" : "s") + " ago";
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
      return interval + " minute" + (interval === 1 ? "" : "s") + " ago";
    }
    
    return Math.floor(seconds) + " second" + (seconds === 1 ? "" : "s") + " ago";
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Parent Accounts</h3>
      </div>
      
      {/* Parent users list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Current Parent Users</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Parents with access to this family profile.
          </p>
        </div>
        <div className="border-t border-gray-200">
          {isLoadingUsers ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading users...</p>
            </div>
          ) : !familyUsersData?.parentUsers || familyUsersData.parentUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No additional parent users yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {familyUsersData.parentUsers.map((parentUser) => (
                <li key={parentUser.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {parentUser.profileImageUrl ? (
                          <img 
                            src={parentUser.profileImageUrl} 
                            alt={`${parentUser.firstName} ${parentUser.lastName}`} 
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          parentUser.firstName.charAt(0)
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {parentUser.firstName} {parentUser.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {parentUser.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        parentUser.accessLevel === 'full' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {parentUser.accessLevel === 'full' ? 'Full Access' : 'View Only'}
                      </span>
                      {parentUser.lastLogin && (
                        <div className="mt-1 text-xs text-gray-500">
                          Last login: {formatTimeAgo(parentUser.lastLogin)}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Pending invitations */}
      {familyUsersData?.invitations && familyUsersData.invitations.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Invitations</h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {familyUsersData.invitations.map((invitation) => (
                <li key={invitation.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invitation.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        Invited: {formatTimeAgo(invitation.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expires: {formatDate(invitation.expiresAt)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invitation.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : invitation.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </span>
                      <span className="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {invitation.role === 'full' ? 'Full Access' : 'View Only'}
                      </span>
                      {invitation.status === 'pending' && (
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="text-xs text-blue-600 hover:text-blue-900"
                            disabled={!isOnline}
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-xs text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Invite form */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Invite New Parent</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Send an invitation to another parent to join this family profile.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Input
                  label="Email Address"
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                  placeholder="parent@example.com"
                />
              </div>
              
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">
                  Access Level
                </label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <input
                      id="role-full"
                      type="radio"
                      value="full"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("role")}
                    />
                    <label htmlFor="role-full" className="ml-2 block text-sm text-gray-700">
                      Full Access (can edit family details, add documents, invite other parents)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="role-view-only"
                      type="radio"
                      value="view_only"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("role")}
                    />
                    <label htmlFor="role-view-only" className="ml-2 block text-sm text-gray-700">
                      View Only (can only view family details and documents)
                    </label>
                  </div>
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSubmitting}
              >
                Send Invitation
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
