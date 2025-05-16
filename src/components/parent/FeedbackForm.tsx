import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useSyncQueue } from "~/hooks/useSyncQueue";

// Define feedback types
type FeedbackType = "care" | "progress" | "communication" | "general";

type Feedback = {
  id: string;
  parentId: string;
  nannyId: string;
  nannyName: string;
  childId?: string;
  childName?: string;
  type: FeedbackType;
  rating: number;
  content: string;
  followUp?: string;
  nannyResponse?: string;
  createdAt: Date;
  status: "pending" | "acknowledged" | "responded";
};

// Define form validation schema
const feedbackSchema = z.object({
  nannyId: z.string().min(1, "Please select a nanny"),
  childId: z.string().optional(),
  type: z.enum(["care", "progress", "communication", "general"]),
  rating: z.number().min(1).max(5),
  content: z.string().min(10, "Please provide more detailed feedback"),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState("");
  const { token } = useAuthStore();
  const { isOnline } = useNetworkStatus();
  const { addOperation } = useSyncQueue();
  
  // Fetch nannies
  const { 
    data: profileData, 
    isLoading: isLoadingProfile
  } = api.getParentProfile.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching parent profile:", err);
      },
    }
  );
  
  // Add these tRPC mutation hooks
  const submitFeedbackMutation = api.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted successfully!");
      setIsSubmitting(false);
      reset();
      // Refresh feedback history after submission
      refetchFeedbackHistory();
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  const updateFeedbackMutation = api.updateFeedback.useMutation({
    onSuccess: () => {
      toast.success("Follow-up added successfully!");
      setResponseText("");
      setSelectedFeedback(null);
      // Refresh feedback history after update
      refetchFeedbackHistory();
    },
    onError: (error) => {
      toast.error(`Failed to add follow-up: ${error.message}`);
    }
  });

  // Add this query to fetch feedback history
  const { data: feedbackHistoryData, isLoading: isLoadingFeedbackHistory, refetch: refetchFeedbackHistory } = 
    api.getFeedbackHistory.useQuery(
      { token: token || "" },
      {
        enabled: !!token && showHistory,
        onError: (error) => {
          toast.error(`Failed to load feedback history: ${error.message}`);
        }
      }
    );
  
  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "general",
      rating: 5
    }
  });
  
  // Watch rating value for stars UI
  const ratingValue = watch("rating");
  
  // Set rating value
  const setRating = (value: number) => {
    setValue("rating", value);
  };
  
  // Use real feedback history data instead of mock data
  const feedbackHistory = feedbackHistoryData?.feedback || [];
  
  // Handle form submission
  const onSubmit = (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    
    if (isOnline) {
      // If online, use the mutation
      submitFeedbackMutation.mutate({ 
        token: token || "", 
        ...data 
      });
    } else {
      // If offline, store in sync queue
      try {
        addOperation({
          operationType: "CREATE",
          modelName: "Feedback",
          recordId: crypto.randomUUID(),
          data: {
            ...data,
            createdAt: new Date().toISOString(),
            status: "pending"
          }
        });
        
        toast.success("Feedback saved for syncing when back online");
        setIsSubmitting(false);
        reset();
      } catch (error) {
        toast.error("Failed to save feedback offline");
        setIsSubmitting(false);
      }
    }
  };
  
  // Handle follow-up submission
  const handleFollowUpSubmit = () => {
    if (!selectedFeedback || !responseText.trim()) return;
    
    if (isOnline) {
      // If online, use the mutation
      updateFeedbackMutation.mutate({ 
        token: token || "", 
        id: selectedFeedback.id, 
        followUp: responseText 
      });
    } else {
      // If offline, store in sync queue
      try {
        addOperation({
          operationType: "UPDATE",
          modelName: "Feedback",
          recordId: selectedFeedback.id,
          data: {
            followUp: responseText,
            updatedAt: new Date().toISOString()
          }
        });
        
        toast.success("Follow-up saved for syncing when back online");
        setResponseText("");
        setSelectedFeedback(null);
      } catch (error) {
        toast.error("Failed to save follow-up offline");
      }
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  // Get feedback type display name
  const getFeedbackTypeDisplay = (type: FeedbackType) => {
    switch (type) {
      case "care": return "Care Quality";
      case "progress": return "Child Progress";
      case "communication": return "Communication";
      case "general": return "General Feedback";
    }
  };
  
  // Get nannies from profile data
  const nannies = profileData?.family?.nannies.map(n => ({
    id: n.nanny.id,
    name: `${n.nanny.firstName} ${n.nanny.lastName}`
  })) || [];
  
  // Get children from profile data
  const children = profileData?.children.map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`
  })) || [];
  
  return (
    <div className="space-y-6">
      {/* Toggle between new feedback and history */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {showHistory ? "Feedback History" : "New Feedback"}
        </h3>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Give New Feedback" : "View Feedback History"}
        </Button>
      </div>
      
      {showHistory ? (
        /* Feedback history */
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {feedbackHistory.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
              No feedback history available.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {feedbackHistory.map((feedback) => (
                <li key={feedback.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900">
                          Feedback for {feedback.nannyName}
                        </h4>
                        <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          feedback.status === "responded" ? "bg-green-100 text-green-800" :
                          feedback.status === "acknowledged" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {feedback.status === "responded" ? "Responded" :
                           feedback.status === "acknowledged" ? "Acknowledged" :
                           "Pending"}
                        </span>
                      </div>
                      
                      <p className="mt-1 text-xs text-gray-500">
                        {feedback.childName ? `About ${feedback.childName} • ` : ""}
                        {getFeedbackTypeDisplay(feedback.type)} • 
                        Submitted on {formatDate(feedback.createdAt)}
                      </p>
                      
                      <div className="mt-1 flex items-center">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`h-4 w-4 ${star <= feedback.rating ? "text-yellow-400" : "text-gray-300"}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600">{feedback.content}</p>
                      
                      {feedback.followUp && (
                        <div className="mt-3 bg-blue-50 p-3 rounded-md">
                          <p className="text-xs font-medium text-blue-800">Your follow-up:</p>
                          <p className="text-sm text-blue-800">{feedback.followUp}</p>
                        </div>
                      )}
                      
                      {feedback.nannyResponse && (
                        <div className="mt-3 bg-green-50 p-3 rounded-md">
                          <p className="text-xs font-medium text-green-800">Response from {feedback.nannyName}:</p>
                          <p className="text-sm text-green-800">{feedback.nannyResponse}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 sm:mt-0 sm:ml-4">
                      {feedback.status !== "responded" && !feedback.followUp && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFeedback(feedback)}
                        >
                          Add Follow-up
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {/* Follow-up modal */}
          {selectedFeedback && (
            <div className="fixed inset-0 z-10 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-medium text-gray-900">Add Follow-up</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add additional information or questions to your feedback for {selectedFeedback.nannyName}.
                    </p>
                    
                    <div className="mt-4">
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your follow-up message..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <Button
                      type="button"
                      onClick={handleFollowUpSubmit}
                      disabled={!responseText.trim()}
                    >
                      Submit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="sm:mr-3"
                      onClick={() => setSelectedFeedback(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* New feedback form */
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Nanny selection */}
              <div>
                <label htmlFor="nannyId" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Nanny
                </label>
                {isLoadingProfile ? (
                  <div className="animate-pulse h-10 w-full bg-gray-200 rounded"></div>
                ) : nannies.length === 0 ? (
                  <p className="text-sm text-red-500">
                    No nannies are currently assigned to your family.
                  </p>
                ) : (
                  <select
                    id="nannyId"
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      errors.nannyId ? "border-red-500" : ""
                    }`}
                    {...register("nannyId")}
                  >
                    <option value="">Select a nanny</option>
                    {nannies.map((nanny) => (
                      <option key={nanny.id} value={nanny.id}>
                        {nanny.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.nannyId && (
                  <p className="mt-1 text-sm text-red-600">{errors.nannyId.message}</p>
                )}
              </div>
              
              {/* Child selection (optional) */}
              <div>
                <label htmlFor="childId" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Child (Optional)
                </label>
                {isLoadingProfile ? (
                  <div className="animate-pulse h-10 w-full bg-gray-200 rounded"></div>
                ) : children.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No children found in your profile.
                  </p>
                ) : (
                  <select
                    id="childId"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    {...register("childId")}
                  >
                    <option value="">General feedback (not specific to a child)</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Feedback type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback Type
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="care"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("type")}
                    />
                    <span className="ml-2 text-sm text-gray-700">Care Quality</span>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="progress"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("type")}
                    />
                    <span className="ml-2 text-sm text-gray-700">Child Progress</span>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="communication"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("type")}
                    />
                    <span className="ml-2 text-sm text-gray-700">Communication</span>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="general"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      {...register("type")}
                    />
                    <span className="ml-2 text-sm text-gray-700">General</span>
                  </label>
                </div>
              </div>
              
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none focus:ring-0"
                    >
                      <svg
                        className={`h-8 w-8 ${star <= ratingValue ? "text-yellow-400" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Feedback content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Feedback
                </label>
                <textarea
                  id="content"
                  rows={5}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    errors.content ? "border-red-500" : ""
                  }`}
                  placeholder="Please provide detailed feedback..."
                  {...register("content")}
                ></textarea>
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>
              
              {/* Submit button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={nannies.length === 0}
                >
                  Submit Feedback
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
