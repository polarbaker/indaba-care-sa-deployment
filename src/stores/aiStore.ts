import { create } from 'zustand';
import { isAIAvailable } from '~/env';

interface AIStore {
  isAIAvailable: boolean;
  setAIAvailable: (available: boolean) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  isAIAvailable: isAIAvailable(), // Initialize with the current availability
  setAIAvailable: (available: boolean) => set({ isAIAvailable: available }),
}));