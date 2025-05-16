import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "~/components/layouts/DashboardLayout";
import { ObservationForm } from "~/components/observations/ObservationForm";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { api } from "~/trpc/react";
import { useNannyNotesStore, NoteCategory } from "~/stores/nannyNotesStore";
import { Input } from "~/components/ui/Input";

const nannyNavigation = [
  {
    name: "Dashboard",
    to: "/nanny/dashboard/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "My Profile",
    to: "/nanny/profile/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    name: "Observations & Notes",
    to: "/nanny/observations-notes/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Messages",
    to: "/nanny/messages/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    name: "Professional Dev",
    to: "/nanny/professional-development/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: "Hours Log",
    to: "/nanny/hours-log/",
    icon: (className: string) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

type NotesTab = "observations" | "private-notes";

export const Route = createFileRoute("/nanny/observations-notes/")({
  component: ObservationsAndNotes,
});

function ObservationsAndNotes() {
  const [activeTab, setActiveTab] = useState<NotesTab>("observations");
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [showPrivateNoteForm, setShowPrivateNoteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteCategory, setNoteCategory] = useState<NoteCategory | "all">("all");
  const [selectedChild, setSelectedChild] = useState<string | "all">("all");
  
  const utils = api.useUtils();
  const { token } = useAuthStore();
  const { notes, addNote, updateNote, deleteNote, searchNotes } = useNannyNotesStore();
  
  // Fetch assigned children
  const { data: childrenData, isLoading: isLoadingChildren } = api.getAssignedChildren.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      onError: (err) => {
        console.error("Error fetching children:", err);
      }
    }
  );

  // Fetch observations with pagination
  const { 
    data: observationsData, 
    isLoading: isLoadingObservations,
    error: observationsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.getObservations.useInfiniteQuery(
    { 
      token: token || "",
      childId: selectedChild !== "all" ? selectedChild : undefined,
      limit: 10
    },
    {
      enabled: !!token && activeTab === "observations",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      onError: (err) => {
        console.error("Error fetching observations:", err);
      }
    }
  );

  // Handle observation creation success
  const handleObservationSuccess = () => {
    setShowObservationForm(false);
    // Invalidate the observations query to refresh the list
    void utils.getObservations.invalidate();
  };
  
  // Handle private note creation
  const handlePrivateNoteSubmit = (content: string, category: NoteCategory, childId?: string, childName?: string) => {
    addNote({
      content,
      category,
      childId,
      childName,
      tags: extractTags(content),
    });
    setShowPrivateNoteForm(false);
  };
  
  // Handle note deletion
  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      deleteNote(noteId);
    }
  };
  
  // Extract hashtags from content
  const extractTags = (content: string): string[] => {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    if (!matches) return [];
    return matches.map(tag => tag.substring(1)); // Remove the # character
  };
  
  // Filter private notes based on search and category
  const filteredNotes = searchQuery
    ? searchNotes(searchQuery, noteCategory === "all" ? undefined : noteCategory, selectedChild === "all" ? undefined : selectedChild)
    : notes.filter(note => {
        if (noteCategory !== "all" && note.category !== noteCategory) return false;
        if (selectedChild !== "all" && note.childId !== selectedChild) return false;
        return true;
      });
  
  // Flatten the observations from all pages
  const observations = observationsData?.pages.flatMap(page => page.data) || [];
  
  return (
    <DashboardLayout 
      title="Observations & Notes" 
      navigation={nannyNavigation}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("observations")}
              className={`${
                activeTab === "observations"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Child Observations
            </button>
            <button
              onClick={() => setActiveTab("private-notes")}
              className={`${
                activeTab === "private-notes"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Notes to Self
            </button>
          </nav>
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            {activeTab === "observations" ? "Child Observations" : "Private Notes"}
          </h2>
          <Button
            onClick={() => {
              if (activeTab === "observations") {
                setShowObservationForm(!showObservationForm);
                setShowPrivateNoteForm(false);
              } else {
                setShowPrivateNoteForm(!showPrivateNoteForm);
                setShowObservationForm(false);
              }
            }}
          >
            {activeTab === "observations" 
              ? (showObservationForm ? "Cancel" : "New Observation") 
              : (showPrivateNoteForm ? "Cancel" : "New Note")
            }
          </Button>
        </div>
        
        {/* Search and filters */}
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                id="search"
                type="text"
                placeholder="Search by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="child-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by child
              </label>
              <select
                id="child-filter"
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All children</option>
                {childrenData?.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            {activeTab === "private-notes" && (
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by category
                </label>
                <select
                  id="category-filter"
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as NoteCategory | "all")}
                  className="rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All categories</option>
                  <option value="evergreen">Evergreen (permanent)</option>
                  <option value="child-specific">Child-specific</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Observation form */}
        {activeTab === "observations" && showObservationForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Observation</h3>
            <ObservationForm 
              onSuccess={handleObservationSuccess}
              children={childrenData?.children || []}
            />
          </div>
        )}
        
        {/* Private note form */}
        {activeTab === "private-notes" && showPrivateNoteForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Private Note</h3>
            <PrivateNoteForm 
              onSubmit={handlePrivateNoteSubmit}
              onCancel={() => setShowPrivateNoteForm(false)}
              children={childrenData?.children || []}
            />
          </div>
        )}
        
        {/* Observations list */}
        {activeTab === "observations" && (
          <div className="bg-white shadow rounded-lg">
            <div className="divide-y divide-gray-200">
              {isLoadingObservations && !observations.length ? (
                <div className="px-6 py-8 text-center">
                  <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  <p className="mt-2 text-gray-500">Loading observations...</p>
                </div>
              ) : observationsError ? (
                <div className="px-6 py-8 text-center text-red-500">
                  <p>Error loading observations. Please try again later.</p>
                </div>
              ) : observations.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No observations yet. Create your first one!</p>
                </div>
              ) : (
                <>
                  {observations.map((observation) => {
                    // Parse aiTags if it exists and is a string
                    const tags = observation.aiTags ? 
                      (() => {
                        try { return JSON.parse(observation.aiTags); } 
                        catch { return []; }
                      })() : [];
                      
                    return (
                      <div key={observation.id} className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-medium text-gray-900">{observation.childName}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(observation.createdAt).toLocaleDateString()} at {new Date(observation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {observation.type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-gray-700">{observation.content}</p>
                        </div>
                        
                        {tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((tag: string) => (
                              <span key={tag} className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Load more button */}
                  {hasNextPage && (
                    <div className="px-6 py-4 text-center">
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        {isFetchingNextPage ? 'Loading more...' : 'Load more observations'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Private notes list */}
        {activeTab === "private-notes" && (
          <div className="bg-white shadow rounded-lg">
            <div className="divide-y divide-gray-200">
              {filteredNotes.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>No notes found. Create your first note!</p>
                </div>
              ) : (
                <>
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          {note.childName && (
                            <h4 className="text-base font-medium text-gray-900">
                              {note.childName} - {note.category === "evergreen" ? "Evergreen" : "Child-specific"}
                            </h4>
                          )}
                          {!note.childName && (
                            <h4 className="text-base font-medium text-gray-900">
                              {note.category === "evergreen" ? "Evergreen Note" : "Personal Note"}
                            </h4>
                          )}
                          <p className="text-sm text-gray-500">
                            {new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      </div>
                      
                      {note.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {note.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Private Note Form Component
interface PrivateNoteFormProps {
  onSubmit: (content: string, category: NoteCategory, childId?: string, childName?: string) => void;
  onCancel: () => void;
  children: { id: string; firstName: string; lastName: string }[];
}

function PrivateNoteForm({ onSubmit, onCancel, children }: PrivateNoteFormProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategory>("evergreen");
  const [childId, setChildId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Find child name if childId is provided
    let childName;
    if (childId) {
      const child = children.find(c => c.id === childId);
      childName = child ? `${child.firstName} ${child.lastName}` : undefined;
    }
    
    onSubmit(content, category, category === "child-specific" ? childId : undefined, childName);
    setIsSubmitting(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Note Category
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center justify-center space-x-2 p-3 border rounded-md cursor-pointer ${
              category === "evergreen"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
          >
            <input
              type="radio"
              value="evergreen"
              checked={category === "evergreen"}
              onChange={() => setCategory("evergreen")}
              className="sr-only"
            />
            <span
              className={
                category === "evergreen" ? "text-blue-700 font-medium" : ""
              }
            >
              Evergreen (Permanent)
            </span>
          </label>
          <label
            className={`flex items-center justify-center space-x-2 p-3 border rounded-md cursor-pointer ${
              category === "child-specific"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
          >
            <input
              type="radio"
              value="child-specific"
              checked={category === "child-specific"}
              onChange={() => setCategory("child-specific")}
              className="sr-only"
            />
            <span
              className={
                category === "child-specific" ? "text-blue-700 font-medium" : ""
              }
            >
              Child-specific
            </span>
          </label>
        </div>
      </div>
      
      {category === "child-specific" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Child
          </label>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={category === "child-specific"}
          >
            <option value="">Select a child</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Note Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Write your note here... Use #tags to categorize your notes."
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Use #hashtags to tag your notes. For example: #important #followup
        </p>
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          Save Note
        </Button>
      </div>
    </form>
  );
}
