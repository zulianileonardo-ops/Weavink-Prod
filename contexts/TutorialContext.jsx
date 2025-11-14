'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/translation/useTranslation';
import { getAuth } from 'firebase/auth';
import TutorialSkipModal from '@/app/components/tutorial/TutorialSkipModal';

const TutorialContext = createContext(null);

/**
 * Custom hook to access tutorial context
 * @throws {Error} If used outside TutorialProvider
 */
export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

/**
 * Tutorial Provider Component
 * Manages tutorial state, step navigation, and API interactions
 */
export function TutorialProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  // Tutorial state
  const [run, setRun] = useState(false); // Controls if tour is running
  const [stepIndex, setStepIndex] = useState(0); // Current step (0-based)
  const [completedSteps, setCompletedSteps] = useState([]); // Array of completed step IDs
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for API calls
  const [tutorialCompleted, setTutorialCompleted] = useState(false); // Tutorial completion status
  const [isMounted, setIsMounted] = useState(false); // SSR safety flag
  const [showSkipModal, setShowSkipModal] = useState(false); // Skip modal visibility

  // Total number of steps in the tutorial
  const totalSteps = 23;

  // SSR safety - only enable tutorial after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Start the tutorial
   */
  const startTutorial = useCallback(() => {
    if (isMounted) {
      setRun(true);
      setStepIndex(0);
      setCompletedSteps([]);
    }
  }, [isMounted]);

  /**
   * Stop the tutorial
   */
  const stopTutorial = useCallback(() => {
    setRun(false);
  }, []);

  /**
   * Reset tutorial to beginning
   */
  const resetTutorial = useCallback(() => {
    setStepIndex(0);
    setCompletedSteps([]);
    setRun(true);
  }, []);

  /**
   * Advance to the next step
   * Saves progress to Firestore after each step
   */
  const advanceToNextStep = useCallback(async (stepId) => {
    try {
      const newStepIndex = stepIndex + 1;
      const newCompletedSteps = [...completedSteps, stepId];

      setStepIndex(newStepIndex);
      setCompletedSteps(newCompletedSteps);

      // Save progress to Firestore after each step
      await saveProgress(newStepIndex, newCompletedSteps);

      // If this was the last step, mark tutorial as complete
      if (newStepIndex >= totalSteps) {
        await completeTutorial();
      }
    } catch (error) {
      console.error('Error advancing tutorial step:', error);
      // Don't show error to user, continue tutorial anyway
    }
  }, [stepIndex, completedSteps, totalSteps]);

  /**
   * Go back to previous step
   */
  const goToPreviousStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  }, [stepIndex]);

  /**
   * Jump to a specific step
   */
  const goToStep = useCallback((index) => {
    if (index >= 0 && index < totalSteps) {
      setStepIndex(index);
    }
  }, [totalSteps]);

  /**
   * Jump to a specific tutorial step with navigation and tutorial start
   * Used by the Tutorial Progression component in account settings
   * @param {number} targetStepIndex - The step index to jump to (0-5)
   * @param {string} stepId - The step ID for logging
   */
  const jumpToStep = useCallback((targetStepIndex, stepId) => {
    console.log(`🎯 Jumping to tutorial step: ${stepId} (index: ${targetStepIndex})`);

    // Step navigation requirements
    const stepNavigationMap = {
      0: '/dashboard',           // welcome - best on dashboard
      1: '/dashboard',           // navbar - needs navbar visible
      2: '/dashboard',           // create_link - needs dashboard with add button
      3: '/dashboard',           // link_form - continues from create_link
      4: '/dashboard/appearance', // appearance - auto-navigates here
      5: '/dashboard',           // completion - can be anywhere
    };

    const requiredPage = stepNavigationMap[targetStepIndex];

    // Navigate to required page if needed
    if (requiredPage && pathname !== requiredPage) {
      console.log(`📍 Navigating to ${requiredPage} for step ${stepId}`);
      router.push(requiredPage);

      // Wait for navigation to complete before setting step
      setTimeout(() => {
        setStepIndex(targetStepIndex);

        // Start tutorial if not running
        if (!run) {
          setRun(true);
        }
      }, 300);
    } else {
      // Already on correct page, jump immediately
      setStepIndex(targetStepIndex);

      // Start tutorial if not running
      if (!run) {
        setRun(true);
      }
    }
  }, [pathname, router, run]);

  /**
   * Save tutorial progress to Firestore
   * Called after each step completion
   */
  const saveProgress = useCallback(async (currentStep, completed) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.warn('No authenticated user, cannot save tutorial progress');
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/tutorial/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentStep,
          completedSteps: completed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tutorial progress');
      }
    } catch (error) {
      console.error('Error saving tutorial progress:', error);
      // Don't interrupt tutorial flow for save errors
    }
  }, []);

  /**
   * Mark tutorial as complete
   * Saves completion status to Firestore
   */
  const completeTutorial = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User must be authenticated');
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/tutorial/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          completedSteps,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete tutorial');
      }

      setTutorialCompleted(true);
      setRun(false);

      toast.success(t('tutorial.completion.success'));

      // Navigate back to dashboard home if not already there
      if (pathname !== '/dashboard') {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Error completing tutorial:', error);
      toast.error(t('tutorial.completion.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [completedSteps, pathname, router, t]);

  /**
   * Skip the tutorial
   * Marks as complete without finishing all steps
   */
  const skipTutorial = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User must be authenticated');
      }

      const token = await user.getIdToken();

      const response = await fetch('/api/tutorial/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to skip tutorial');
      }

      setTutorialCompleted(true);
      setRun(false);

      // Show modal instead of toast
      setShowSkipModal(true);
    } catch (error) {
      console.error('Error skipping tutorial:', error);
      toast.error(t('tutorial.skip.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [t]);

  /**
   * Close the skip modal
   */
  const handleCloseSkipModal = useCallback(() => {
    setShowSkipModal(false);
  }, []);

  /**
   * Navigate to a specific page as part of tutorial flow
   * Used for auto-navigation in certain steps
   */
  const navigateToPage = useCallback((path) => {
    router.push(path);
  }, [router]);

  // Context value
  const value = {
    // State
    run,
    stepIndex,
    totalSteps,
    completedSteps,
    isSubmitting,
    tutorialCompleted,
    isMounted,

    // Actions
    startTutorial,
    stopTutorial,
    resetTutorial,
    advanceToNextStep,
    goToPreviousStep,
    goToStep,
    jumpToStep,
    completeTutorial,
    skipTutorial,
    navigateToPage,
    saveProgress,

    // Helpers
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === totalSteps - 1,
    currentStepNumber: stepIndex + 1, // 1-based for display
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TutorialSkipModal
        isOpen={showSkipModal}
        onClose={handleCloseSkipModal}
      />
    </TutorialContext.Provider>
  );
}
