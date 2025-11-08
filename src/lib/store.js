import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth store - with persistence
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      session: undefined, // undefined = not initialized, null = no session
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      clearAuth: () => set({ user: null, session: null })
    }),
    {
      name: 'edgeiq-auth-storage',
      // Only persist user info, not the full session (Supabase handles that)
      partialize: (state) => ({ user: state.user })
    }
  )
);

// Theme store with immediate DOM update
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        // Update DOM immediately
        const root = window.document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        set({ theme });
      }
    }),
    {
      name: 'edgeiq-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme from localStorage on page load
        if (state?.theme) {
          const root = window.document.documentElement;
          if (state.theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      }
    }
  )
);

// Course store
export const useCourseStore = create((set) => ({
  courses: [],
  currentCourse: null,
  setCourses: (courses) => set({ courses }),
  setCurrentCourse: (course) => set({ currentCourse: course }),
  clearCurrentCourse: () => set({ currentCourse: null })
}));

// Progress store
export const useProgressStore = create((set) => ({
  progress: {},
  setProgress: (courseId, progressData) =>
    set((state) => ({
      progress: { ...state.progress, [courseId]: progressData }
    })),
  clearProgress: () => set({ progress: {} })
}));
