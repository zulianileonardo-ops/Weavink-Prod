'use client';

import { createContext, useContext, useState } from 'react';

const TutorialTabContext = createContext(null);

/**
 * Custom hook to access tutorial tab context
 * @throws {Error} If used outside TutorialTabProvider
 */
export const useTutorialTab = () => {
  const context = useContext(TutorialTabContext);
  if (!context) {
    throw new Error('useTutorialTab must be used within TutorialTabProvider');
  }
  return context;
};

/**
 * Tutorial Tab Provider Component
 * Manages active tab state for the tutorial progression section
 */
export function TutorialTabProvider({ children }) {
  const [activeTutorialTab, setActiveTutorialTab] = useState('overview');

  const value = {
    activeTutorialTab,
    setActiveTutorialTab,
  };

  return (
    <TutorialTabContext.Provider value={value}>
      {children}
    </TutorialTabContext.Provider>
  );
}
