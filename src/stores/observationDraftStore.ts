import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ObservationDraft = {
  id: string;
  childId: string;
  type: "TEXT" | "PHOTO" | "VIDEO" | "AUDIO" | "CHECKLIST" | "RICHTEXT";
  content: string;
  notes?: string;
  isPermanent: boolean;
  mediaUrl?: string;
  checklistItems?: { id: string; text: string; checked: boolean }[];
  lastModified: string;
};

interface ObservationDraftState {
  drafts: ObservationDraft[];
  
  // Actions
  addDraft: (draft: Omit<ObservationDraft, "id" | "lastModified">) => string;
  updateDraft: (id: string, updates: Partial<Omit<ObservationDraft, "id" | "lastModified">>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => ObservationDraft | undefined;
  clearDrafts: () => void;
}

export const useObservationDraftStore = create<ObservationDraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      
      addDraft: (draft) => {
        const id = crypto.randomUUID();
        set((state) => ({
          drafts: [
            ...state.drafts,
            {
              ...draft,
              id,
              lastModified: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      
      updateDraft: (id, updates) => set((state) => ({
        drafts: state.drafts.map(draft => 
          draft.id === id 
            ? { 
                ...draft, 
                ...updates,
                lastModified: new Date().toISOString() 
              } 
            : draft
        ),
      })),
      
      deleteDraft: (id) => set((state) => ({
        drafts: state.drafts.filter(draft => draft.id !== id),
      })),
      
      getDraft: (id) => {
        return get().drafts.find(draft => draft.id === id);
      },
      
      clearDrafts: () => set({ drafts: [] }),
    }),
    {
      name: "indaba-observation-drafts-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
