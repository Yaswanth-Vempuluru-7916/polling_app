// lib/store.ts
import { create } from 'zustand';

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  isClosed: boolean;
}

interface User {
  username: string;
  id: string;
}

interface AppState {
  user: User | null;
  polls: Poll[];
  setUser: (user: User | null) => void;
  setPolls: (polls: Poll[]) => void;
  updatePoll: (poll: Poll) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  polls: [],
  setUser: (user) => set({ user }),
  setPolls: (polls) => set({ polls }),
  updatePoll: (updatedPoll) =>
    set((state) => ({
      polls: state.polls.map((poll) =>
        poll.id === updatedPoll.id ? updatedPoll : poll
      ),
    })),
  clearState: () => set({ user: null, polls: [] }),
}));