'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTutorial } from '@/contexts/TutorialContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { getTutorialSteps, getStepNavigation, TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import { getTutorialStyles, tutorialLocale } from '@/lib/tutorial/tutorialStyles';

// Dynamically import Joyride to prevent SSR issues
const Joyride = dynamic(
  () => import('react-joyride'),
  { ssr: false }
);

/**
 * Tutorial Overlay Component
 * Renders the interactive Joyride tour for first-time users
 *
 * Features:
 * - Auto-starts 1 second after dashboard load
 * - Saves progress after each step
 * - Auto-navigates to appearance page (step 5)
 * - Waits for user action on step 3 (Create Link)
 * - Responsive and multi-language support
 */
export default function TutorialOverlay() {
  const { t, isInitialized } = useTranslation();
  const {
    run,
    stepIndex,
    advanceToNextStep,
    goToPreviousStep,
    skipTutorial,
    completeTutorial,
    navigateToPage,
    isMounted,
  } = useTutorial();

  // Local state
  const [steps, setSteps] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize steps when translation is ready
  useEffect(() => {
    if (isInitialized && isMounted) {
      const tutorialSteps = getTutorialSteps(t);
      setSteps(tutorialSteps);
    }
  }, [t, isInitialized, isMounted]);

  // Detect mobile viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect dark mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  /**
   * Handle Joyride callback events
   * Manages step navigation, auto-navigation, and completion
   */
  const handleJoyrideCallback = useCallback((data) => {
    const { action, index, status, type, step } = data;

    console.log('📍 Tutorial Callback:', { action, index, status, type, stepId: step?.stepId });

    // Handle tour status changes
    if (status === 'finished' || status === 'skipped') {
      if (status === 'skipped') {
        skipTutorial();
      } else {
        completeTutorial();
      }
      return;
    }

    // Handle step changes
    if (type === 'step:after') {
      const currentStepId = step?.stepId;

      // Auto-navigate for appearance step
      const navigationPath = getStepNavigation(index, t);
      if (navigationPath) {
        console.log(`🚀 Auto-navigating to: ${navigationPath}`);
        navigateToPage(navigationPath);

        // Wait for navigation before advancing
        setTimeout(() => {
          advanceToNextStep(currentStepId);
        }, 500);
        return;
      }

      // Normal step advancement
      if (action === 'next') {
        // Don't advance on step 3 (Create Link) - wait for manual trigger
        if (currentStepId !== TUTORIAL_STEP_IDS.CREATE_LINK) {
          advanceToNextStep(currentStepId);
        }
      } else if (action === 'prev') {
        goToPreviousStep();
      }
    }

    // Handle close/skip actions
    if (action === 'close' || action === 'skip') {
      skipTutorial();
    }
  }, [t, advanceToNextStep, goToPreviousStep, skipTutorial, completeTutorial, navigateToPage]);

  // Don't render if not mounted (SSR safety)
  if (!isMounted || !isInitialized) {
    return null;
  }

  // Don't render if no steps loaded
  if (steps.length === 0) {
    return null;
  }

  // Get appropriate styles
  const styles = getTutorialStyles(isMobile, isDarkMode);

  // Merge locale with translations
  const locale = {
    ...tutorialLocale,
    back: t('tutorial.actions.back'),
    close: t('tutorial.actions.close'),
    last: t('tutorial.actions.finish'),
    next: t('tutorial.actions.next'),
    skip: t('tutorial.actions.skip'),
  };

  return (
    <>
      {run && (
        <Joyride
          steps={steps}
          stepIndex={stepIndex}
          run={run}
          continuous={true}
          scrollToFirstStep={true}
          showProgress={true}
          showSkipButton={true}
          disableOverlayClose={false}
          disableCloseOnEsc={false}
          spotlightClicks={false} // Overridden per step
          spotlightPadding={8}
          callback={handleJoyrideCallback}
          styles={styles}
          locale={locale}
          floaterProps={{
            disableAnimation: false,
            styles: {
              arrow: {
                length: 8,
                spread: 12,
              },
            },
          }}
        />
      )}

      {/* Progress indicator (optional - shown in top-right) */}
      {run && (
        <div
          className="fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 z-[10001]"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            style={{ width: '100px' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((stepIndex + 1) / steps.length) * 100}%`,
                background: 'linear-gradient(135deg, #8129D9 0%, #5D18A2 100%)',
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {stepIndex + 1} / {steps.length}
          </span>
        </div>
      )}
    </>
  );
}
