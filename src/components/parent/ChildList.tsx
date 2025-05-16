import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Link } from "@tanstack/react-router";
import toast from "react-hot-toast";

// Define child type
type ChildType = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  gender?: string;
  medicalInfo?: string;
  parsedMedicalInfo?: {
    conditions?: string[];
    medications?: {
      name: string;
      dosage: string;
      frequency: string;
      notes?: string;
    }[];
    doctorName?: string;
    doctorPhone?: string;
    bloodType?: string;
    emergencyNotes?: string;
  };
  allergies?: string;
  parsedAllergies?: {
    allergen: string;
    severity: "Mild" | "Moderate" | "Severe";
    symptoms?: string[];
    treatment?: string;
  }[];
  profileImageUrl?: string;
};

// Define form validation schema
const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyNotes: z.string().optional(),
  conditions: z.string().optional(),
  profileImageUrl: z.string().optional(),
  // For allergies
  allergies: z.string().optional(),
});

type ChildFormValues = z.infer<typeof childSchema>;

// Component props
interface ChildListProps {
  children: ChildType[];
  onChildUpdated?: () => void;
}

export function ChildList({ children, onChildUpdated }: ChildListProps) {
  const [selectedChild, setSelectedChild] = useState<ChildType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [childToDelete, setChildToDelete] = useState<ChildType | null>(null);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Initialize form with child data
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
  });
  
  // Update child mutation
  const updateChildMutation = api.updateChild.useMutation({
    onSuccess: () => {
      toast.success("Child details updated successfully");
      setIsEditing(false);
      setSelectedChild(null);
      if (onChildUpdated) {
        onChildUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to update child details: ${error.message}`);
    },
  });
  
  // Archive child mutation
  const archiveChildMutation = api.archiveChild.useMutation({
    onSuccess: () => {
      toast.success("Child archived successfully");
      setShowDeleteConfirm(false);
      setChildToDelete(null);
      if (onChildUpdated) {
        onChildUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to archive child: ${error.message}`);
    },
  });
  
  // Start editing a child
  const handleEditChild = (child: ChildType) => {
    setSelectedChild(child);
    setIsEditing(true);
    
    // Format date to YYYY-MM-DD for input
    const formattedDate = new Date(child.dateOfBirth).toISOString().split('T')[0];
    
    // Set form values
    setValue("firstName", child.firstName);
    setValue("lastName", child.lastName);
    setValue("dateOfBirth", formattedDate);
    setValue("gender", child.gender || "");
    setValue("profileImageUrl", child.profileImageUrl || "");
    
    // Set medical info fields
    if (child.parsedMedicalInfo) {
      setValue("doctorName", child.parsedMedicalInfo.doctorName || "");
      setValue("doctorPhone", child.parsedMedicalInfo.doctorPhone || "");
      setValue("bloodType", child.parsedMedicalInfo.bloodType || "");
      setValue("emergencyNotes", child.parsedMedicalInfo.emergencyNotes || "");
      setValue("conditions", child.parsedMedicalInfo.conditions?.join(", ") || "");
    }
    
    // Set allergies
    if (child.parsedAllergies) {
      const allergiesText = child.parsedAllergies
        .map(a => `${a.allergen} (${a.severity})${a.treatment ? ': ' + a.treatment : ''}`)
        .join("\n");
      setValue("allergies", allergiesText);
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    reset();
    setIsEditing(false);
    setSelectedChild(null);
  };
  
  const handleOpenArchiveConfirm = (child: ChildType) => {
    setChildToDelete(child);
    setShowDeleteConfirm(true);
  };

  const handleConfirmArchive = () => {
    if (!childToDelete) return;

    if (isOnline) {
      archiveChildMutation.mutate({
        token: token!,
        childId: childToDelete.id,
      });
    } else {
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "Child",
          recordId: childToDelete.id,
          data: { isArchived: true }, // Assuming an isArchived field
        });
        toast.success("Child scheduled for archival. Changes will sync when back online.");
        setShowDeleteConfirm(false);
        setChildToDelete(null);
        if (onChildUpdated) {
          onChildUpdated();
        }
      } catch (error) {
        toast.error("Failed to schedule child archival offline.");
      }
    }
  };
  
  // Handle form submission
  const onSubmit = (data: ChildFormValues) => {
    if (!selectedChild) return;
    
    // Format medical info
    const medicalInfo = {
      conditions: data.conditions ? data.conditions.split(",").map(c => c.trim()).filter(Boolean) : [],
      doctorName: data.doctorName,
      doctorPhone: data.doctorPhone,
      bloodType: data.bloodType,
      emergencyNotes: data.emergencyNotes,
    };
    
    // Format allergies (simple parsing for demo)
    const allergiesLines = data.allergies?.split("\n").filter(Boolean) || [];
    const allergies = allergiesLines.map(line => {
      const severityMatch = line.match(/\((Mild|Moderate|Severe)\)/i);
      const severity = severityMatch ? 
        severityMatch[1] as "Mild" | "Moderate" | "Severe" : 
        "Moderate";
      
      const allergen = line.replace(/\((Mild|Moderate|Severe)\).*$/i, "").trim();
      const treatment = line.includes(":") ? line.split(":")[1].trim() : undefined;
      
      return {
        allergen,
        severity,
        treatment
      };
    });

    if (isOnline) {
      // If online, update directly
      updateChildMutation.mutate({
        token: token!,
        childId: selectedChild.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        medicalInfo,
        allergies,
        profileImageUrl: data.profileImageUrl,
      });
    } else {
      // If offline, add to sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "Child",
          recordId: selectedChild.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            medicalInfo: JSON.stringify(medicalInfo),
            allergies: JSON.stringify(allergies),
            profileImageUrl: data.profileImageUrl,
          },
        });
        
        toast.success("Child details saved for syncing when back online");
        setIsEditing(false);
        setSelectedChild(null);
        if (onChildUpdated) {
          onChildUpdated();
        }
      } catch (error) {
        toast.error("Failed to save child details offline");
      }
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Children</h3>
        <Link
          to="/parent/children/add"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Child
        </Link>
      </div>
      
      {isEditing && selectedChild ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900">Edit Child Details</h4>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="First Name"
              {...register("firstName")}
              error={errors.firstName?.message}
            />
            
            <Input
              label="Last Name"
              {...register("lastName")}
              error={errors.lastName?.message}
            />
            
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
              )}
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                {...register("gender")}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            
            <Input
              label="Profile Image URL"
              {...register("profileImageUrl")}
              error={errors.profileImageUrl?.message}
            />
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Medical Information</h4>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Doctor's Name"
                {...register("doctorName")}
              />
              
              <Input
                label="Doctor's Phone"
                {...register("doctorPhone")}
              />
              
              <Input
                label="Blood Type"
                {...register("bloodType")}
              />
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Medical Conditions (comma-separated)
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Asthma, Eczema, etc."
                  {...register("conditions")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Emergency Notes
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Any important emergency information"
                  {...register("emergencyNotes")}
                ></textarea>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Allergies</h4>
            <p className="text-sm text-gray-500 mb-2">
              List one allergy per line in format: "Allergen (Severity): Treatment"
              <br />
              Example: "Peanuts (Severe): Requires EpiPen"
            </p>
            
            <div>
              <textarea
                rows={4}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                placeholder="Peanuts (Severe): Requires EpiPen"
                {...register("allergies")}
              ></textarea>
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
            >
              Save Changes
            </Button>
          </div>
        </form>
      ) : (
        <div>
          {children.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-500">No children added yet. Click "Add Child" to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {children.map((child) => (
                  <li key={child.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            {child.profileImageUrl ? (
                              <img 
                                src={child.profileImageUrl} 
                                alt={child.firstName} 
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              child.firstName.charAt(0)
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {child.firstName} {child.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {child.age} years old (Born: {formatDate(child.dateOfBirth)})
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            to={`/parent/profile/?tab=development&childId=${child.id}`}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Milestones
                          </Link>
                          <button
                            onClick={() => handleEditChild(child)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenArchiveConfirm(child)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                            disabled={!isOnline && selectedChild?.id === child.id && isEditing} // Disable if offline and editing same child
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                      
                      {/* Medical info and allergies summary */}
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          {child.parsedMedicalInfo?.conditions && 
                           child.parsedMedicalInfo.conditions.length > 0 && (
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                              </svg>
                              <span>{child.parsedMedicalInfo.conditions.join(", ")}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          {child.parsedAllergies && child.parsedAllergies.length > 0 ? (
                            <>
                              <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                              <span>
                                Allergies: {child.parsedAllergies.map(a => a.allergen).join(", ")}
                              </span>
                            </>
                          ) : (
                            <>
                              <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>No known allergies</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Archiving Child */}
      {showDeleteConfirm && childToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900">Archive Child</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to archive {childToDelete.firstName} {childToDelete.lastName}? 
              This will hide the child's profile but will not permanently delete their data.
            </p>
            <div className="mt-4 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setChildToDelete(null);
                }}
                disabled={archiveChildMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmArchive}
                isLoading={archiveChildMutation.isLoading}
                disabled={!isOnline}
              >
                Archive
              </Button>
            </div>
            {!isOnline && (
               <p className="mt-2 text-xs text-amber-600">Archiving is disabled while offline.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
