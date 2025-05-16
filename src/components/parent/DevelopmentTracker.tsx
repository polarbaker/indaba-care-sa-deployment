import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// Define milestone types
type MilestoneResource = {
  id: string;
  title: string;
  description: string;
  contentUrl: string;
  resourceType: string;
  tags: string;
};

type Milestone = {
  id: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  category: string;
  resources: MilestoneResource[];
};

type CustomMilestone = {
  id: string;
  name: string;
  description: string;
  category: string;
  ageRangeStart?: number;
  ageRangeEnd?: number;
};

type AchievedMilestone = {
  id: string;
  milestone: Milestone;
  customMilestone?: CustomMilestone;
  achievedDate: Date | null;
  notes: string | null;
  resources: MilestoneResource[];
  createdAt: Date;
};

type ChildMilestoneData = {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    ageInMonths: number;
  };
  achievedMilestones: AchievedMilestone[];
  upcomingMilestones: Milestone[];
};

// Define form validation schema
const milestoneSchema = z.object({
  notes: z.string().optional(),
  achievedDate: z.string().optional(),
});

const customMilestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  ageRangeStart: z.preprocess(val => Number(val), z.number().min(0).optional()),
  ageRangeEnd: z.preprocess(val => Number(val), z.number().min(0).optional()),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;
type CustomMilestoneFormValues = z.infer<typeof customMilestoneSchema>;

export function DevelopmentTracker() {
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [selectedCustomMilestone, setSelectedCustomMilestone] = useState<CustomMilestone | null>(null); // For editing custom
  const [isEditing, setIsEditing] = useState(false);
  const [isAchieving, setIsAchieving] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Fetch children data
  const { 
    data: childrenData, 
    isLoading: isLoadingChildren 
  } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    { 
      enabled: !!token,
      onError: (error) => {
        console.error("Error fetching children:", error);
      }
    }
  );
  
  // Set first child as selected by default when data loads
  useEffect(() => {
    if (childrenData?.children && childrenData.children.length > 0 && !selectedChild) {
      setSelectedChild(childrenData.children[0].id);
    }
  }, [childrenData, selectedChild]);
  
  // Fetch milestones for selected child
  const {
    data: milestonesData,
    isLoading: isLoadingMilestones,
    error: milestonesError,
    refetch: refetchMilestones
  } = api.getChildMilestones.useQuery(
    {
      token: token || "",
      childId: selectedChild || ""
    },
    {
      enabled: !!token && !!selectedChild,
      onError: (error) => {
        console.error("Error fetching milestones:", error);
      }
    }
  );
  
  // Add these tRPC mutation hooks
  const achieveMilestoneMutation = api.achieveMilestone.useMutation({
    onSuccess: () => {
      toast.success(`Milestone "${selectedMilestone?.name || selectedCustomMilestone?.name}" marked as achieved!`);
      setIsAchieving(false);
      setSelectedMilestone(null);
      setSelectedCustomMilestone(null);
      refetchMilestones();
    },
    onError: (error) => {
      toast.error(`Failed to mark milestone as achieved: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  const updateMilestoneMutation = api.updateMilestone.useMutation({
    onSuccess: () => {
      toast.success(`Milestone "${selectedMilestone?.name || selectedCustomMilestone?.name}" updated!`);
      setIsEditing(false);
      setSelectedMilestone(null);
      setSelectedCustomMilestone(null);
      refetchMilestones();
    },
    onError: (error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  const addCustomMilestoneMutation = api.addCustomMilestone.useMutation({ // New mutation
    onSuccess: () => {
      toast.success("Custom milestone added successfully!");
      setIsAddingCustom(false);
      customMilestoneForm.reset();
      refetchMilestones(); // Refetch to include the new custom milestone
    },
    onError: (error) => toast.error(`Failed to add custom milestone: ${error.message}`),
  });
  
  // Initialize form for standard milestones
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
    reset,
    setValue
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema)
  });

  // Initialize form for custom milestones
  const customMilestoneForm = useForm<CustomMilestoneFormValues>({
    resolver: zodResolver(customMilestoneSchema),
  });
  
  // Find achieved milestone data for the selected milestone
  const achievedMilestoneData = selectedMilestone ? 
    milestonesData?.achievedMilestones.find(am => am.milestone?.id === selectedMilestone.id) : 
    selectedCustomMilestone ?
    milestonesData?.achievedMilestones.find(am => am.customMilestone?.id === selectedCustomMilestone.id) :
    null;
  
  // Handle milestone achieved
  const handleMilestoneAchieved = (milestone: Milestone | CustomMilestone, isCustom: boolean) => {
    if (isCustom) {
      setSelectedCustomMilestone(milestone as CustomMilestone);
      setSelectedMilestone(null);
    } else {
      setSelectedMilestone(milestone as Milestone);
      setSelectedCustomMilestone(null);
    }
    setIsAchieving(true);
    setIsEditing(false);
    reset({ notes: "", achievedDate: new Date().toISOString().split('T')[0] });
  };
  
  // Handle milestone edit
  const handleMilestoneEdit = (achievedMilestone: AchievedMilestone) => {
    if (achievedMilestone.milestone) {
      setSelectedMilestone(achievedMilestone.milestone);
      setSelectedCustomMilestone(null);
    } else if (achievedMilestone.customMilestone) {
      setSelectedCustomMilestone(achievedMilestone.customMilestone);
      setSelectedMilestone(null);
    }
    setIsAchieving(false);
    setIsEditing(true);
    reset({
      notes: achievedMilestone.notes || "",
      achievedDate: achievedMilestone.achievedDate 
        ? new Date(achievedMilestone.achievedDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]
    });
  };

  const onSubmitCustomMilestone = (data: CustomMilestoneFormValues) => {
    if (!selectedChild) {
      toast.error("Please select a child first.");
      return;
    }
    addCustomMilestoneMutation.mutate({
      token: token!,
      childId: selectedChild, // Optional: link custom milestone to a child
      name: data.name,
      description: data.description,
      category: data.category,
      // ageRangeStart and ageRangeEnd are optional for custom milestones in this setup
    });
  };
  
  // Handle form submission for achieving a milestone
  const onSubmitAchieve = (data: MilestoneFormValues) => {
    if (!selectedChild || (!selectedMilestone && !selectedCustomMilestone)) return;
    setIsSubmitting(true);
    
    const milestoneData = {
      childId: selectedChild,
      milestoneId: selectedMilestone?.id,
      customMilestoneId: selectedCustomMilestone?.id,
      achievedDate: data.achievedDate ? new Date(data.achievedDate) : new Date(),
      notes: data.notes || null
    };
    
    if (isOnline) {
      achieveMilestoneMutation.mutate({ token: token || "", ...milestoneData });
    } else {
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "ChildMilestone",
          recordId: crypto.randomUUID(),
          data: {
            childId: milestoneData.childId,
            milestoneId: milestoneData.milestoneId,
            customMilestoneId: milestoneData.customMilestoneId,
            achievedDate: milestoneData.achievedDate.toISOString(),
            notes: milestoneData.notes,
            createdAt: new Date().toISOString()
          }
        });
        toast.success(`Milestone marked as achieved and will sync when back online!`);
        setIsAchieving(false);
        setSelectedMilestone(null);
        setSelectedCustomMilestone(null);
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to save milestone achievement offline");
        setIsSubmitting(false);
      }
    }
  };
  
  // Handle form submission for editing a milestone
  const onSubmitEdit = (data: MilestoneFormValues) => {
    if (!selectedChild || (!selectedMilestone && !selectedCustomMilestone) || !achievedMilestoneData) return;
    setIsSubmitting(true);
    
    const milestoneData = {
      id: achievedMilestoneData.id,
      achievedDate: data.achievedDate ? new Date(data.achievedDate) : null,
      notes: data.notes || null
    };
    
    if (isOnline) {
      updateMilestoneMutation.mutate({ token: token || "", ...milestoneData });
    } else {
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "ChildMilestone",
          recordId: milestoneData.id,
          data: {
            achievedDate: milestoneData.achievedDate?.toISOString() || null,
            notes: milestoneData.notes,
            updatedAt: new Date().toISOString()
          }
        });
        toast.success(`Milestone updated and will sync when back online!`);
        setIsEditing(false);
        setSelectedMilestone(null);
        setSelectedCustomMilestone(null);
        setIsSubmitting(false);
      } catch (error) {
        toast.error("Failed to update milestone offline");
        setIsSubmitting(false);
      }
    }
  };
  
  // Cancel form
  const handleCancel = () => {
    setIsAchieving(false);
    setIsEditing(false);
    setIsAddingCustom(false);
    setIsEditingCustom(false);
    setSelectedMilestone(null);
    setSelectedCustomMilestone(null);
    reset();
    customMilestoneForm.reset();
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  // Get age description
  const getAgeDescription = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${months} month${months === 1 ? '' : 's'}`;
    } else if (remainingMonths === 0) {
      return `${years} year${years === 1 ? '' : 's'}`;
    } else {
      return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Add a resources section at the top */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Development Resources</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Access educational resources to support your child's development
            </p>
          </div>
          <Link
            to="/parent/resources/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Resources Hub
          </Link>
        </div>
      </div>
      
      {/* Progress Dashboard - Conceptual */}
      {milestonesData && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Progress Dashboard</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {/* TODO: Implement actual progress calculation and display */}
            <p className="text-sm text-gray-500">Progress by domain (e.g., Motor Skills: 75%, Language: 60%) will be shown here.</p>
            <p className="text-sm text-gray-500 mt-2">Upcoming milestone reminders will appear here.</p>
          </div>
        </div>
      )}

      {/* Visual Timeline - Conceptual */}
      {milestonesData && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Milestone Timeline</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Visual representation of milestones by age.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {/* TODO: Implement actual visual timeline (e.g., using a chart library or custom CSS) */}
            <p className="text-sm text-gray-500">A visual timeline of milestones will be displayed here.</p>
          </div>
        </div>
      )}
      
      {/* Child selector */}
      <div>
        <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Child
        </label>
        {isLoadingChildren ? (
          <div className="animate-pulse h-10 w-full bg-gray-200 rounded"></div>
        ) : !childrenData?.children.length ? (
          <div className="text-gray-500">No children available</div>
        ) : (
          <select
            id="child-select"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            value={selectedChild || ""}
            onChange={(e) => {
              setSelectedChild(e.target.value);
              setSelectedMilestone(null);
              setSelectedCustomMilestone(null);
              setIsEditing(false);
              setIsAchieving(false);
              setIsAddingCustom(false);
            }}
          >
            {childrenData.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {isLoadingMilestones ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : milestonesError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Failed to load milestone data. Please try again.</span>
        </div>
      ) : !milestonesData ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Please select a child to view milestones.</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Child info */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {milestonesData.child.firstName} {milestonesData.child.lastName}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Age: {getAgeDescription(milestonesData.child.ageInMonths)} ({milestonesData.child.ageInMonths} months)
                </p>
              </div>
            </div>
          </div>
          
          {/* Add Custom Milestone Form */}
          {isAddingCustom && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Add Custom Milestone</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <form onSubmit={customMilestoneForm.handleSubmit(onSubmitCustomMilestone)} className="space-y-4">
                  <Input label="Milestone Name" {...customMilestoneForm.register("name")} error={customMilestoneForm.formState.errors.name?.message} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea {...customMilestoneForm.register("description")} rows={3} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full" />
                    {customMilestoneForm.formState.errors.description && <p className="mt-1 text-sm text-red-600">{customMilestoneForm.formState.errors.description.message}</p>}
                  </div>
                  <Input label="Category (e.g., Cognitive, Physical)" {...customMilestoneForm.register("category")} error={customMilestoneForm.formState.errors.category?.message} />
                  {/* Optional age range for custom milestones */}
                  {/* <Input label="Typical Age Start (months, optional)" type="number" {...customMilestoneForm.register("ageRangeStart")} /> */}
                  {/* <Input label="Typical Age End (months, optional)" type="number" {...customMilestoneForm.register("ageRangeEnd")} /> */}
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                    <Button type="submit" isLoading={customMilestoneForm.formState.isSubmitting}>Add Milestone</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Button to toggle custom milestone form */}
          {!isAddingCustom && !isEditing && !isAchieving && selectedChild && (
             <div className="mt-6 text-right">
                <Button variant="outline" onClick={() => setIsAddingCustom(true)}>
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Custom Milestone
                </Button>
            </div>
          )}
          
          {/* Milestone form */}
          {(isEditing || isAchieving) && (selectedMilestone || selectedCustomMilestone) && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {isAchieving ? "Mark Milestone as Achieved" : "Edit Milestone"}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {selectedMilestone?.name || selectedCustomMilestone?.name} ({(selectedMilestone || selectedCustomMilestone)?.category})
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <form onSubmit={handleSubmit(isAchieving ? onSubmitAchieve : onSubmitEdit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Achieved
                    </label>
                    <input
                      type="date"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      {...register("achievedDate")}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      placeholder="Add any observations or notes about this milestone"
                      {...register("notes")}
                    ></textarea>
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
                      isLoading={isSubmitting || isFormSubmitting}
                    >
                      {isAchieving ? "Mark as Achieved" : "Update Milestone"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Achieved milestones */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Achieved Milestones</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Milestones that {milestonesData.child.firstName} has already accomplished
              </p>
            </div>
            <div className="border-t border-gray-200">
              {milestonesData.achievedMilestones.length === 0 ? (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No milestones achieved yet. Track your child's progress by marking milestones as achieved.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {milestonesData.achievedMilestones.map((achievedMilestone) => (
                    <li key={achievedMilestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{achievedMilestone.milestone.name}</h4>
                          <p className="text-xs text-gray-500">
                            {achievedMilestone.milestone.category} • 
                            Typical age: {achievedMilestone.milestone.ageRangeStart}-{achievedMilestone.milestone.ageRangeEnd} months
                          </p>
                          <p className="mt-1 text-sm text-gray-600">{achievedMilestone.milestone.description}</p>
                          
                          {achievedMilestone.achievedDate && (
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Achieved on {formatDate(achievedMilestone.achievedDate)}
                            </div>
                          )}
                          
                          {achievedMilestone.notes && (
                            <div className="mt-2 text-sm text-gray-500">
                              <p className="font-medium text-xs">Notes:</p>
                              <p>{achievedMilestone.notes}</p>
                            </div>
                          )}
                          
                          {achievedMilestone.milestone.resources.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500">Resources:</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {achievedMilestone.milestone.resources.map((resource) => (
                                  <a
                                    key={resource.id}
                                    href={resource.contentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100"
                                  >
                                    {resource.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleMilestoneEdit(achievedMilestone)}
                        >
                          Edit
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Upcoming milestones */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Milestones</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Milestones that {milestonesData.child.firstName} may achieve in the coming months
              </p>
            </div>
            <div className="border-t border-gray-200">
              {milestonesData.upcomingMilestones.length === 0 ? (
                <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                  No upcoming milestones to display.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {milestonesData.upcomingMilestones.map((milestone) => (
                    <li key={milestone.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{milestone.name}</h4>
                          <p className="text-xs text-gray-500">
                            {milestone.category} • 
                            Typical age: {milestone.ageRangeStart}-{milestone.ageRangeEnd} months
                          </p>
                          <p className="mt-1 text-sm text-gray-600">{milestone.description}</p>
                          
                          {milestone.resources.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500">Resources:</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {milestone.resources.map((resource) => (
                                  <a
                                    key={resource.id}
                                    href={resource.contentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100"
                                  >
                                    {resource.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleMilestoneAchieved(milestone, false)}
                        >
                          Achieved
                        </Button>
                      </div>
                    </li>
                  ))}
                  {/* TODO: Display upcoming custom milestones, if any, for the selected child */}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
