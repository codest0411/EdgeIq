import { createContext, useContext, useState } from 'react';

const SupportContext = createContext();

export function SupportProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSupport = () => setIsOpen(true);
  const closeSupport = () => setIsOpen(false);

  return (
    <SupportContext.Provider value={{ isOpen, openSupport, closeSupport }}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
}
