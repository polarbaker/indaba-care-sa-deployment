import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

// Import the admin navigation array from the dashboard
import { adminNavigation } from "../dashboard";

// Define form schemas
const userSchemaBase = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["NANNY", "PARENT", "ADMIN"]),
});

const nannyProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  availability: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

const parentProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

const adminProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.string().optional(),
});

// Combine schemas for form validation
const combinedSchema = userSchemaBase.extend({
  nannyProfile: nannyProfileSchema.optional(),
  parentProfile: parentProfileSchema.optional(),
  adminProfile: adminProfileSchema.optional(),
});

type UserFormValues = z.infer<typeof combinedSchema>;

export const Route = createFileRoute("/admin/users/$userId")({
  component: AdminUserEdit,
});

function AdminUserEdit() {
  const { userId } = useParams({ from: "/admin/users/$userId" });
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(userId === 'new');
  
  // Fetch user data
  const { data: userData, isLoading, refetch } = api.getAdminUser.useQuery(
    { token: token || "", userId },
    { 
      enabled: !!token && isOnline && userId !== 'new',
      onError: (error) => {
        toast.error(`Failed to load user: ${error.message}`);
        navigate({ to: "/admin/users/" });
      }
    }
  );
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<UserFormValues>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      email: "",
      role: "NANNY", // Default role for new user
    }
  });
  
  // Watch role for conditional rendering
  const selectedRole = watch("role");
  
  // Populate form with user data
  useEffect(() => {
    if (userData) {
      reset({
        email: userData.email,
        role: userData.role,
        nannyProfile: userData.nannyProfile || undefined,
        parentProfile: userData.parentProfile || undefined,
        adminProfile: userData.adminProfile || undefined,
      });
      if (userId !== 'new') setIsEditing(false);
    }
  }, [userData, reset, userId]);
  
  // Update user mutation
  const updateUserMutation = api.updateAdminUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsEditing(false);
      refetch();
      if (userId === 'new') {
        navigate({ to: "/admin/users/" });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });
  
  // Handle form submission
  const onSubmit = (data: UserFormValues) => {
    if (isOnline) {
      updateUserMutation.mutate({
        token: token!,
        userId: userId === 'new' ? undefined : userId, // Pass undefined for new user
        ...data
      });
    } else {
      // Handle offline operation
      const operationType = userId === 'new' ? "CREATE" : "UPDATE";
      const recordId = userId === 'new' ? crypto.randomUUID() : userId;
      
      addOperation({
        operationType,
        modelName: "User",
        recordId,
        data: {
          email: data.email,
          role: data.role,
          // Include profile data based on role
          ...(data.role === "NANNY" && { nannyProfile: data.nannyProfile }),
          ...(data.role === "PARENT" && { parentProfile: data.parentProfile }),
          ...(data.role === "ADMIN" && { adminProfile: data.adminProfile }),
          createdAt: new Date().toISOString() // For CREATE
        }
      });
      
      toast.success(`User ${operationType === "CREATE" ? "created" : "updated"}. Changes will sync when back online.`);
      setIsEditing(false);
      if (userId === 'new') {
        navigate({ to: "/admin/users/" });
      }
    }
  };
  
  if (isLoading && userId !== 'new') {
    return (
      <DashboardLayout title="User Profile" navigation={adminNavigation}>
        <div className="p-6 text-center">Loading user data...</div>
      </DashboardLayout>
    );
  }
  
  const user = userData;
  
  return (
    <DashboardLayout 
      title={userId === 'new' ? "Add New User" : `User Profile: ${user?.email || ""}`}
      navigation={adminNavigation}
    >
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {userId === 'new' ? "Create New User Account" : "User Details"}
            </h2>
            {userId !== 'new' && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit User
              </Button>
            )}
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* User Account Details */}
            <h3 className="text-md font-medium text-gray-700 border-b pb-2">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                {...register("email")}
                error={errors.email?.message}
                disabled={!isEditing}
                required
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                <select
                  {...register("role")}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  disabled={!isEditing}
                >
                  <option value="NANNY">Nanny</option>
                  <option value="PARENT">Parent</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
              </div>
            </div>
            
            {/* Profile Details based on Role */}
            {selectedRole === "NANNY" && (
              <>
                <h3 className="text-md font-medium text-gray-700 border-b pb-2 pt-4">Nanny Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="First Name" {...register("nannyProfile.firstName")} error={errors.nannyProfile?.firstName?.message} disabled={!isEditing} required />
                  <Input label="Last Name" {...register("nannyProfile.lastName")} error={errors.nannyProfile?.lastName?.message} disabled={!isEditing} required />
                  <Input label="Phone Number" {...register("nannyProfile.phoneNumber")} error={errors.nannyProfile?.phoneNumber?.message} disabled={!isEditing} />
                  <Input label="Location" {...register("nannyProfile.location")} error={errors.nannyProfile?.location?.message} disabled={!isEditing} />
                  <Input label="Profile Image URL" {...register("nannyProfile.profileImageUrl")} error={errors.nannyProfile?.profileImageUrl?.message} disabled={!isEditing} />
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Availability</label>
                    <textarea {...register("nannyProfile.availability")} rows={2} className="input-styles" disabled={!isEditing} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
                    <textarea {...register("nannyProfile.bio")} rows={3} className="input-styles" disabled={!isEditing} />
                  </div>
                </div>
              </>
            )}
            
            {selectedRole === "PARENT" && (
              <>
                <h3 className="text-md font-medium text-gray-700 border-b pb-2 pt-4">Parent Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="First Name" {...register("parentProfile.firstName")} error={errors.parentProfile?.firstName?.message} disabled={!isEditing} required />
                  <Input label="Last Name" {...register("parentProfile.lastName")} error={errors.parentProfile?.lastName?.message} disabled={!isEditing} required />
                  <Input label="Phone Number" {...register("parentProfile.phoneNumber")} error={errors.parentProfile?.phoneNumber?.message} disabled={!isEditing} />
                  <Input label="Address" {...register("parentProfile.address")} error={errors.parentProfile?.address?.message} disabled={!isEditing} />
                  <Input label="Profile Image URL" {...register("parentProfile.profileImageUrl")} error={errors.parentProfile?.profileImageUrl?.message} disabled={!isEditing} />
                </div>
              </>
            )}
            
            {selectedRole === "ADMIN" && (
              <>
                <h3 className="text-md font-medium text-gray-700 border-b pb-2 pt-4">Admin Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="First Name" {...register("adminProfile.firstName")} error={errors.adminProfile?.firstName?.message} disabled={!isEditing} required />
                  <Input label="Last Name" {...register("adminProfile.lastName")} error={errors.adminProfile?.lastName?.message} disabled={!isEditing} required />
                  <Input label="Department" {...register("adminProfile.department")} error={errors.adminProfile?.department?.message} disabled={!isEditing} />
                </div>
              </>
            )}
            
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    if (userId === 'new') navigate({ to: "/admin/users/" });
                    else reset(); // Reset to original values if editing existing user
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  {userId === 'new' ? "Create User" : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
          
          {/* Placeholder for additional user management sections */}
          {userId !== 'new' && !isEditing && (
            <div className="mt-8 space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-700">User Activity</h3>
                <p className="text-sm text-gray-500">View user activity logs (placeholder).</p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-700">Permissions</h3>
                <p className="text-sm text-gray-500">Manage user permissions (placeholder).</p>
              </div>
              <div className="border-t pt-4">
                <Button variant="danger" onClick={() => toast.error("Delete user functionality not yet implemented.")}>
                  Delete User Account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
