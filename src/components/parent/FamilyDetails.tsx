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

// Define contact info type
type ContactInfo = {
  primaryParent?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  secondaryParent?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
};

// Define home details type
type HomeDetails = {
  homeType?: string;
  numberOfBedrooms?: number;
  hasOutdoorSpace?: boolean;
  petDetails?: string;
  safetyInstructions?: string;
  routines?: string;
  dietaryRestrictions?: string;
  householdMembers?: {
    relationship: string;
    name?: string;
    age?: number;
  }[];
  importantNotes?: string;
  preferredActivities?: string[];
  houseRules?: string[];
};

// Define parent profile type
type ParentProfileType = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  profileImageUrl?: string;
  family?: {
    id: string;
    name: string;
    homeDetails?: string;
    parsedHomeDetails?: HomeDetails;
    contactInfo?: string;
    parsedContactInfo?: ContactInfo;
  };
};

// Define form validation schema
const familyDetailsSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  address: z.string().optional(),
  // Primary parent
  primaryParentName: z.string().min(1, "Primary parent name is required"),
  primaryParentPhone: z.string().optional(),
  primaryParentEmail: z.string().email("Invalid email").optional(),
  // Secondary parent
  secondaryParentName: z.string().optional(),
  secondaryParentPhone: z.string().optional(),
  secondaryParentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  // Home details
  homeType: z.string().optional(),
  numberOfBedrooms: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  hasOutdoorSpace: z.boolean().optional(),
  petDetails: z.string().optional(),
  safetyInstructions: z.string().optional(),
  routines: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  importantNotes: z.string().optional(),
  preferredActivities: z.string().optional(),
  houseRules: z.string().optional(),
});

type FamilyDetailsFormValues = z.infer<typeof familyDetailsSchema>;

// Component props
interface FamilyDetailsProps {
  profile: ParentProfileType;
  onProfileUpdated?: () => void;
}

export function FamilyDetails({ profile, onProfileUpdated }: FamilyDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { token } = useAuthStore();
  const { isOnline, addOperation } = useSyncStore();
  
  // Initialize form with profile data
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FamilyDetailsFormValues>({
    resolver: zodResolver(familyDetailsSchema),
    defaultValues: {
      familyName: profile.family?.name || `${profile.firstName} ${profile.lastName}'s Family`,
      address: profile.address || "",
      // Primary parent
      primaryParentName: profile.family?.parsedContactInfo?.primaryParent?.name || `${profile.firstName} ${profile.lastName}`,
      primaryParentPhone: profile.family?.parsedContactInfo?.primaryParent?.phone || profile.phoneNumber || "",
      primaryParentEmail: profile.family?.parsedContactInfo?.primaryParent?.email || "",
      // Secondary parent
      secondaryParentName: profile.family?.parsedContactInfo?.secondaryParent?.name || "",
      secondaryParentPhone: profile.family?.parsedContactInfo?.secondaryParent?.phone || "",
      secondaryParentEmail: profile.family?.parsedContactInfo?.secondaryParent?.email || "",
      // Emergency contact
      emergencyContactName: profile.family?.parsedContactInfo?.emergencyContact?.name || "",
      emergencyContactRelationship: profile.family?.parsedContactInfo?.emergencyContact?.relationship || "",
      emergencyContactPhone: profile.family?.parsedContactInfo?.emergencyContact?.phone || "",
      // Home details
      homeType: profile.family?.parsedHomeDetails?.homeType || "",
      numberOfBedrooms: profile.family?.parsedHomeDetails?.numberOfBedrooms,
      hasOutdoorSpace: profile.family?.parsedHomeDetails?.hasOutdoorSpace || false,
      petDetails: profile.family?.parsedHomeDetails?.petDetails || "",
      safetyInstructions: profile.family?.parsedHomeDetails?.safetyInstructions || "",
      routines: profile.family?.parsedHomeDetails?.routines || "",
      dietaryRestrictions: profile.family?.parsedHomeDetails?.dietaryRestrictions || "",
      importantNotes: profile.family?.parsedHomeDetails?.importantNotes || "",
      preferredActivities: profile.family?.parsedHomeDetails?.preferredActivities?.join(", ") || "",
      houseRules: profile.family?.parsedHomeDetails?.houseRules?.join(", ") || "",
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = api.updateParentProfile.useMutation({
    onSuccess: () => {
      toast.success("Family details updated successfully");
      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    },
    onError: (error) => {
      toast.error(`Failed to update family details: ${error.message}`);
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FamilyDetailsFormValues) => {
    // Format contact info
    const contactInfo = {
      primaryParent: {
        name: data.primaryParentName,
        phone: data.primaryParentPhone,
        email: data.primaryParentEmail,
        address: data.address,
      },
      secondaryParent: {
        name: data.secondaryParentName,
        phone: data.secondaryParentPhone,
        email: data.secondaryParentEmail,
      },
      emergencyContact: {
        name: data.emergencyContactName,
        relationship: data.emergencyContactRelationship,
        phone: data.emergencyContactPhone,
      },
    };
    
    // Format home details
    const homeDetails = {
      homeType: data.homeType,
      numberOfBedrooms: data.numberOfBedrooms,
      hasOutdoorSpace: data.hasOutdoorSpace,
      petDetails: data.petDetails,
      safetyInstructions: data.safetyInstructions,
      routines: data.routines,
      dietaryRestrictions: data.dietaryRestrictions,
      importantNotes: data.importantNotes,
      preferredActivities: data.preferredActivities?.split(",").map((item) => item.trim()).filter(Boolean) || [],
      houseRules: data.houseRules?.split(",").map((item) => item.trim()).filter(Boolean) || [],
    };

    if (isOnline) {
      // If online, update directly
      updateProfileMutation.mutate({
        token: token!,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: data.primaryParentPhone,
        address: data.address,
        profileImageUrl: profile.profileImageUrl,
        familyName: data.familyName,
        contactInfo,
        homeDetails,
      });
    } else {
      // If offline, add to sync queue
      try {
        // Add parent profile update operation
        addOperation({
          operationType: "UPDATE",
          modelName: "ParentProfile",
          recordId: profile.id,
          data: {
            phoneNumber: data.primaryParentPhone,
            address: data.address,
          },
        });
        
        // Add family update operation if family exists
        if (profile.family) {
          addOperation({
            operationType: "UPDATE",
            modelName: "Family",
            recordId: profile.family.id,
            data: {
              name: data.familyName,
              homeDetails: JSON.stringify(homeDetails),
              contactInfo: JSON.stringify(contactInfo),
            },
          });
        } else {
          // Create new family if it doesn't exist
          const newFamilyId = crypto.randomUUID();
          addOperation({
            operationType: "CREATE",
            modelName: "Family",
            recordId: newFamilyId,
            data: {
              name: data.familyName,
              parentId: profile.id,
              homeDetails: JSON.stringify(homeDetails),
              contactInfo: JSON.stringify(contactInfo),
            },
          });
        }
        
        toast.success("Family details saved for syncing when back online");
        setIsEditing(false);
        if (onProfileUpdated) {
          onProfileUpdated();
        }
      } catch (error) {
        toast.error("Failed to save family details offline");
      }
    }
  };
  
  // Cancel editing
  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Family Details</h3>
        {!isEditing && (
          <Button 
            type="button" 
            onClick={() => setIsEditing(true)}
            variant="outline"
          >
            Edit Details
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Family Information</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Family Name"
                {...register("familyName")}
                error={errors.familyName?.message}
              />
              
              <Input
                label="Address"
                {...register("address")}
                error={errors.address?.message}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Primary Parent</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Name"
                {...register("primaryParentName")}
                error={errors.primaryParentName?.message}
              />
              
              <Input
                label="Phone Number"
                {...register("primaryParentPhone")}
                error={errors.primaryParentPhone?.message}
              />
              
              <Input
                label="Email"
                {...register("primaryParentEmail")}
                error={errors.primaryParentEmail?.message}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Secondary Parent (Optional)</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Name"
                {...register("secondaryParentName")}
                error={errors.secondaryParentName?.message}
              />
              
              <Input
                label="Phone Number"
                {...register("secondaryParentPhone")}
                error={errors.secondaryParentPhone?.message}
              />
              
              <Input
                label="Email"
                {...register("secondaryParentEmail")}
                error={errors.secondaryParentEmail?.message}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Emergency Contact</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Name"
                {...register("emergencyContactName")}
                error={errors.emergencyContactName?.message}
              />
              
              <Input
                label="Relationship"
                {...register("emergencyContactRelationship")}
                error={errors.emergencyContactRelationship?.message}
              />
              
              <Input
                label="Phone Number"
                {...register("emergencyContactPhone")}
                error={errors.emergencyContactPhone?.message}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Home Environment</h4>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Home Type (e.g., Apartment, House)"
                {...register("homeType")}
                error={errors.homeType?.message}
              />
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Number of Bedrooms
                </label>
                <input
                  type="number"
                  min="0"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  {...register("numberOfBedrooms")}
                />
                {errors.numberOfBedrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.numberOfBedrooms.message}</p>
                )}
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    {...register("hasOutdoorSpace")}
                  />
                  <span className="ml-2 text-sm text-gray-700">Has Outdoor Space</span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Pet Details
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Type and temperament of any pets"
                  {...register("petDetails")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Safety Instructions
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Important safety information about your home"
                  {...register("safetyInstructions")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Family Routines
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Daily or weekly family routines"
                  {...register("routines")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dietary Restrictions
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Any dietary restrictions or preferences"
                  {...register("dietaryRestrictions")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Important Notes
                </label>
                <textarea
                  rows={3}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Any important information about your home environment"
                  {...register("importantNotes")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Activities (comma-separated)
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="Reading, Outdoor play, Arts and crafts"
                  {...register("preferredActivities")}
                ></textarea>
              </div>
              
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  House Rules (comma-separated)
                </label>
                <textarea
                  rows={2}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  placeholder="No shoes inside, Limited screen time, Quiet time after 8pm"
                  {...register("houseRules")}
                ></textarea>
              </div>
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
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Family Information</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Family Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.family?.name || `${profile.firstName} ${profile.lastName}'s Family`}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {profile.address || "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Information</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Primary Parent</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div>{profile.family?.parsedContactInfo?.primaryParent?.name || `${profile.firstName} ${profile.lastName}`}</div>
                    <div className="text-gray-500">
                      {profile.family?.parsedContactInfo?.primaryParent?.phone || profile.phoneNumber || "No phone provided"}
                    </div>
                    <div className="text-gray-500">
                      {profile.family?.parsedContactInfo?.primaryParent?.email || "No email provided"}
                    </div>
                  </dd>
                </div>
                
                {profile.family?.parsedContactInfo?.secondaryParent?.name && (
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Secondary Parent</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div>{profile.family.parsedContactInfo.secondaryParent.name}</div>
                      <div className="text-gray-500">
                        {profile.family.parsedContactInfo.secondaryParent.phone || "No phone provided"}
                      </div>
                      <div className="text-gray-500">
                        {profile.family.parsedContactInfo.secondaryParent.email || "No email provided"}
                      </div>
                    </dd>
                  </div>
                )}
                
                {profile.family?.parsedContactInfo?.emergencyContact?.name && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div>{profile.family.parsedContactInfo.emergencyContact.name}</div>
                      <div className="text-gray-500">
                        {profile.family.parsedContactInfo.emergencyContact.relationship || "Relationship not specified"}
                      </div>
                      <div className="text-gray-500">
                        {profile.family.parsedContactInfo.emergencyContact.phone || "No phone provided"}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Home Environment</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                {profile.family?.parsedHomeDetails ? (
                  <>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Home Details</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        <div>{profile.family.parsedHomeDetails.homeType || "Not specified"}</div>
                        <div className="text-gray-500">
                          {profile.family.parsedHomeDetails.numberOfBedrooms !== undefined ? 
                            `${profile.family.parsedHomeDetails.numberOfBedrooms} bedrooms` : 
                            "Number of bedrooms not specified"}
                        </div>
                        <div className="text-gray-500">
                          {profile.family.parsedHomeDetails.hasOutdoorSpace ? 
                            "Has outdoor space" : 
                            "No outdoor space"}
                        </div>
                      </dd>
                    </div>
                    
                    {profile.family.parsedHomeDetails.petDetails && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Pet Details</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {profile.family.parsedHomeDetails.petDetails}
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.safetyInstructions && (
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Safety Instructions</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {profile.family.parsedHomeDetails.safetyInstructions}
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.routines && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Family Routines</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {profile.family.parsedHomeDetails.routines}
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.dietaryRestrictions && (
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Dietary Restrictions</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {profile.family.parsedHomeDetails.dietaryRestrictions}
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.importantNotes && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Important Notes</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {profile.family.parsedHomeDetails.importantNotes}
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.preferredActivities && 
                      profile.family.parsedHomeDetails.preferredActivities.length > 0 && (
                      <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Preferred Activities</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <div className="flex flex-wrap gap-1">
                            {profile.family.parsedHomeDetails.preferredActivities.map((activity) => (
                              <span 
                                key={activity} 
                                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                              >
                                {activity}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>
                    )}
                    
                    {profile.family.parsedHomeDetails.houseRules && 
                      profile.family.parsedHomeDetails.houseRules.length > 0 && (
                      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">House Rules</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <ul className="list-disc pl-5 space-y-1">
                            {profile.family.parsedHomeDetails.houseRules.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">No home environment details provided yet.</p>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
