'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTutorial } from '@/contexts/TutorialContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { getTutorialSteps, getStepNavigation, TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import { getTutorialStyles, tutorialLocale } from '@/lib/tutorial/tutorialStyles';
import CustomTutorialTooltip from './CustomTutorialTooltip';

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

    // Handle entering a step - check for special actions
    if (type === 'step:before') {
      // Set hash for navbar highlighting if step has navbarItemId metadata
      if (step?.navbarItemId) {
        console.log('📖 Tutorial: Setting navbar highlight hash for', step.stepId, '→', step.navbarItemId);

        // Clear any existing hash to force immediate cleanup of previous highlights
        window.location.hash = '';

        // Small delay to:
        // 1. Let useNavbarHighlight hooks detect empty hash and clear previous highlights
        // 2. Let Joyride stabilize spotlight position before DOM updates
        setTimeout(() => {
          window.location.hash = `navbar-${step.navbarItemId}`;
        }, 100);
      }

      // Open Share modal if this step requires it
      if (step?.openShareModal) {
        console.log('📖 Tutorial: Opening Share modal for step', step.stepId);
        // Dispatch custom event to trigger Share modal opening
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('tutorial:open-share'));
        }, 500); // Small delay to ensure step is visible first
      }
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
          tooltipComponent={CustomTutorialTooltip}
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

  
    </>
  );
}
