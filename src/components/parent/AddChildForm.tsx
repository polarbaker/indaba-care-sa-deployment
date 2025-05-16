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

// Define form validation schema
const addChildSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required")
    .refine(val => !isNaN(new Date(val).getTime()), "Invalid date format"),
  gender: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

type AddChildFormValues = z.infer<typeof addChildSchema>;

// Component props
interface AddChildFormProps {
  onChildAdded: (childId: string) => void;
}

export function AddChildForm({ onChildAdded }: AddChildFormProps) {
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  const utils = api.useUtils();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
  });
  
  const addChildMutation = api.addChild.useMutation({ // This procedure needs to be created
    onSuccess: (data) => {
      toast.success("Child added successfully!");
      reset();
      utils.getChildrenOverview.invalidate(); // Invalidate overview query
      utils.getParentProfile.invalidate(); // Invalidate parent profile to update child list there too
      onChildAdded(data.id); // Pass new child ID for navigation
    },
    onError: (error) => {
      toast.error(`Failed to add child: ${error.message}`);
    },
  });
  
  const onSubmit = (data: AddChildFormValues) => {
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }

    const childData = {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      gender: data.gender,
      profileImageUrl: data.profileImageUrl,
    };

    if (isOnline) {
      addChildMutation.mutate({ token, ...childData });
    } else {
      // Offline handling
      const newChildId = crypto.randomUUID();
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "Child",
          recordId: newChildId,
          data: { ...childData, parentId: "" }, // parentId will be set on server during sync using token
        });
        toast.success("Child data saved. Will sync when online.");
        reset();
        utils.getChildrenOverview.invalidate();
        utils.getParentProfile.invalidate();
        onChildAdded(newChildId); // For optimistic UI update and navigation
      } catch (error) {
        toast.error("Failed to save child data offline.");
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Add New Child</h3>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Input
            label="First Name"
            {...register("firstName")}
            error={errors.firstName?.message}
          />
        </div>
        
        <div className="sm:col-span-3">
          <Input
            label="Last Name"
            {...register("lastName")}
            error={errors.lastName?.message}
          />
        </div>
        
        <div className="sm:col-span-3">
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <div className="mt-1">
            <input
              type="date"
              id="dateOfBirth"
              className={`block w-full shadow-sm sm:text-sm rounded-md p-2 ${
                errors.dateOfBirth ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              {...register("dateOfBirth")}
            />
          </div>
          {errors.dateOfBirth && (
            <p className="mt-2 text-sm text-red-600">{errors.dateOfBirth.message}</p>
          )}
        </div>
        
        <div className="sm:col-span-3">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
            Gender (Optional)
          </label>
          <div className="mt-1">
            <select
              id="gender"
              className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              {...register("gender")}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>
        
        <div className="sm:col-span-6">
          <Input
            label="Profile Image URL (Optional)"
            type="url"
            {...register("profileImageUrl")}
            error={errors.profileImageUrl?.message}
            placeholder="https://example.com/image.png"
          />
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()} // Simple back navigation
            className="mr-3"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            Add Child
          </Button>
        </div>
      </div>
    </form>
  );
}
