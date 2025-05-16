import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '~/trpc/react';
import { useAuthStore } from '~/stores/authStore';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input'; // Assuming Input component exists
import toast from 'react-hot-toast';
import { Link } from '@tanstack/react-router'; // For linking back

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  role: "NANNY" | "PARENT" | "ADMIN";
};

type CommentType = {
  id: string;
  userId: string;
  userName: string; // Combined first and last name
  userRole: "NANNY" | "PARENT" | "ADMIN";
  content: string;
  createdAt: string; // ISO date string
};

type ObservationDetailType = {
  id: string;
  childId: string;
  childName: string;
  nannyId: string;
  nannyName: string;
  type: string; // TEXT, PHOTO, VIDEO, AUDIO, CHECKLIST, RICHTEXT
  content: string; // Text content or URL to media
  notes?: string | null; // Private notes for nanny
  aiTags?: string | null; // JSON string of tags
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  comments: CommentType[];
  // Add mediaUrl if applicable for PHOTO, VIDEO, AUDIO types
  mediaUrl?: string | null; 
  // For checklist type
  checklistItems?: { id: string; text: string; checked: boolean }[] | null;
};

interface ObservationDetailProps {
  observationId: string;
  initialObservation?: ObservationDetailType; // Optional, if fetched by parent route
  currentUser: User; // To check permissions for edit/delete/comment
}

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});
type CommentFormValues = z.infer<typeof commentSchema>;

export function ObservationDetail({ observationId, initialObservation, currentUser }: ObservationDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { token } = useAuthStore();
  const utils = api.useUtils();

  // Fetch observation details if not provided or if an update is needed
  const { data: observation, isLoading, error, refetch } = api.getObservationDetail.useQuery(
    { token: token!, observationId },
    {
      initialData: initialObservation, // Use initial data if available
      enabled: !!token && !!observationId, // Only run if we have a token and ID
      onError: (err) => toast.error(`Failed to load observation: ${err.message}`),
    }
  );

  const addCommentMutation = api.addObservationComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added!");
      utils.getObservationDetail.invalidate({ observationId }); // Refetch to show new comment
      commentForm.reset();
    },
    onError: (err) => toast.error(`Failed to add comment: ${err.message}`),
  });

  const updateObservationMutation = api.updateObservation.useMutation({
    onSuccess: () => {
      toast.success("Observation updated!");
      setIsEditing(false);
      utils.getObservationDetail.invalidate({ observationId });
      utils.getObservations.invalidate(); // Invalidate feed as well
    },
    onError: (err) => toast.error(`Failed to update observation: ${err.message}`),
  });
  
  const deleteObservationMutation = api.deleteObservation.useMutation({
    onSuccess: () => {
      toast.success("Observation deleted!");
      // TODO: Navigate back to observations list or handle UI update
      utils.getObservations.invalidate();
      // Consider using router.navigate here if on a detail page
    },
    onError: (err) => toast.error(`Failed to delete observation: ${err.message}`),
  });

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  const handleAddComment = (data: CommentFormValues) => {
    addCommentMutation.mutate({
      token: token!,
      observationId,
      content: data.content,
    });
  };
  
  const handleDeleteObservation = () => {
    if (window.confirm("Are you sure you want to delete this observation?")) {
      deleteObservationMutation.mutate({ token: token!, observationId });
    }
  };

  // TODO: Implement edit form and logic similar to ObservationForm.tsx
  // For now, just a placeholder for the edit state.
  const handleEditObservation = (formData: any /* Should be ObservationFormValues from ObservationForm */) => {
    if (!observation) return;
    updateObservationMutation.mutate({
      token: token!,
      observationId: observation.id,
      childId: observation.childId, // May not be editable, or fetched if not present
      type: formData.type, // From edit form
      content: formData.content, // From edit form
      notes: formData.notes, // From edit form
    });
  };


  if (isLoading && !observation) {
    return <div className="text-center p-8">Loading observation...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600">Error loading observation: {error.message}</div>;
  }

  if (!observation) {
    return <div className="text-center p-8">Observation not found.</div>;
  }
  
  const canEditOrDelete = currentUser.role === "ADMIN" || (currentUser.role === "NANNY" && currentUser.id === observation.nannyId);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();
  const parseTags = (tagsString?: string | null): string[] => {
    if (!tagsString) return [];
    try {
      const parsed = JSON.parse(tagsString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Observation for {observation.childName}</h2>
            <p className="text-sm text-gray-500">
              Logged by {observation.nannyName} on {formatDate(observation.createdAt)}
            </p>
          </div>
          {canEditOrDelete && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
              <Button variant="destructive" onClick={handleDeleteObservation}>Delete</Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div>
            {/* TODO: Embed or adapt ObservationForm here, passing observation data as defaultValues */}
            <h3 className="text-lg font-semibold mb-2">Edit Observation</h3>
            <p className="text-gray-600 mb-4">Editing form will be here. For now, click "Cancel" or implement the form based on ObservationForm.tsx.</p>
            <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                {/* <Button onClick={handleSubmit(handleEditObservation)}>Save Changes</Button> */}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                Type: {observation.type}
              </span>
            </div>

            {/* Content Display */}
            <div className="prose max-w-none mb-4">
              {observation.type === "TEXT" && <p>{observation.content}</p>}
              {observation.type === "RICHTEXT" && <div dangerouslySetInnerHTML={{ __html: observation.content /* Ensure sanitization if content is user-generated HTML */ }} />}
              {observation.type === "PHOTO" && observation.mediaUrl && <img src={observation.mediaUrl} alt="Observation photo" className="max-w-full h-auto rounded-md shadow" />}
              {observation.type === "VIDEO" && observation.mediaUrl && <video src={observation.mediaUrl} controls className="max-w-full rounded-md shadow">Your browser does not support the video tag.</video>}
              {observation.type === "AUDIO" && observation.mediaUrl && <audio src={observation.mediaUrl} controls className="w-full">Your browser does not support the audio element.</audio>}
              {observation.type === "CHECKLIST" && observation.checklistItems && (
                <ul className="list-none p-0">
                  {observation.checklistItems.map(item => (
                    <li key={item.id} className="flex items-center mb-1">
                      <input type="checkbox" checked={item.checked} readOnly className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {parseTags(observation.aiTags).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {parseTags(observation.aiTags).map(tag => (
                    <span key={tag} className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {observation.notes && currentUser.role === 'NANNY' && currentUser.id === observation.nannyId && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800">Private Notes:</h4>
                <p className="text-sm text-yellow-700">{observation.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Comments ({observation.comments.length})</h3>
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {observation.comments.length === 0 ? (
            <p className="text-gray-500">No comments yet.</p>
          ) : (
            observation.comments.map(comment => (
              <div key={comment.id} className="p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700">{comment.userName} <span className="text-xs text-gray-500">({comment.userRole.toLowerCase()})</span></p>
                  <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                </div>
                <p className="text-sm text-gray-600">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-3">
          <div>
            <textarea
              {...commentForm.register("content")}
              rows={3}
              className={`w-full rounded-md border p-2 text-sm focus:outline-none focus:ring-2 ${commentForm.formState.errors.content ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="Write a comment..."
            />
            {commentForm.formState.errors.content && (
              <p className="mt-1 text-xs text-red-600">{commentForm.formState.errors.content.message}</p>
            )}
          </div>
          <div className="text-right">
            <Button type="submit" isLoading={addCommentMutation.isLoading}>
              Add Comment
            </Button>
          </div>
        </form>
      </div>
      <div className="mt-6">
        <Link to={currentUser.role === 'NANNY' ? "/nanny/observations/" : "/parent/observations/"} className="text-blue-600 hover:underline">&larr; Back to Observations</Link>
      </div>
    </div>
  );
}
