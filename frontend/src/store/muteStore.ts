// store/muteStore.ts
import { create } from "zustand";

interface MuteState {
  mute: boolean;
  toggleMute: () => void;
}

const useMuteStore = create<MuteState>((set) => ({
  mute: false,
  toggleMute: () => set((state) => ({ mute: !state.mute })),
}));

export default useMuteStore;
