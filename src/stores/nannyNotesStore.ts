import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NoteCategory = "evergreen" | "child-specific";

export type PrivateNote = {
  id: string;
  content: string;
  category: NoteCategory;
  childId?: string; // Only for child-specific notes
  childName?: string; // For display purposes
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

interface NannyNotesState {
  notes: PrivateNote[];
  
  // Actions
  addNote: (note: Omit<PrivateNote, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, updates: Partial<Omit<PrivateNote, "id" | "createdAt">>) => void;
  deleteNote: (id: string) => void;
  searchNotes: (query: string, category?: NoteCategory, childId?: string) => PrivateNote[];
}

export const useNannyNotesStore = create<NannyNotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      
      addNote: (note) => set((state) => ({
        notes: [
          ...state.notes,
          {
            ...note,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })),
      
      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map(note => 
          note.id === id 
            ? { 
                ...note, 
                ...updates,
                updatedAt: new Date().toISOString() 
              } 
            : note
        ),
      })),
      
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter(note => note.id !== id),
      })),
      
      searchNotes: (query, category, childId) => {
        const { notes } = get();
        
        return notes.filter(note => {
          // Filter by category if provided
          if (category && note.category !== category) {
            return false;
          }
          
          // Filter by childId if provided
          if (childId && note.childId !== childId) {
            return false;
          }
          
          // Search in content and tags
          const searchTerms = query.toLowerCase().split(' ');
          const noteContent = note.content.toLowerCase();
          const noteTags = note.tags.map(tag => tag.toLowerCase());
          
          // Check if any search term is found in content or tags
          return searchTerms.some(term => 
            noteContent.includes(term) || noteTags.some(tag => tag.includes(term))
          );
        });
      },
    }),
    {
      name: "indaba-nanny-notes-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
