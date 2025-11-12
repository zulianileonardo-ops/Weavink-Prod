'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';

/**
 * Tutorial Guard Component
 * Checks if user should see the tutorial and auto-starts it
 *
 * Logic:
 * 1. User must be authenticated
 * 2. User must have completed onboarding
 * 3. User must NOT have completed tutorial
 * 4. User must be on /dashboard page (not sub-pages)
 * 5. Auto-start tutorial 1 second after conditions met
 */
export default function TutorialGuard() {
  const { currentUser, loading: authLoading } = useAuth();
  const { startTutorial, run, isMounted } = useTutorial();
  const pathname = usePathname();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  /**
   * Check if tutorial should be shown
   */
  useEffect(() => {
    const checkTutorialStatus = async () => {
      // Wait for auth to finish loading
      if (authLoading || !isMounted) {
        return;
      }

      // User must be authenticated
      if (!currentUser) {
        setCheckingStatus(false);
        return;
      }

      try {
        // Fetch user document from Firestore
        const userDocRef = doc(fireApp, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.warn('User document not found');
          setCheckingStatus(false);
          return;
        }

        const userData = userDocSnap.data();

        // Check conditions for showing tutorial
        const onboardingCompleted = userData.onboardingCompleted || false;
        const tutorialCompleted = userData.tutorialCompleted || false;
        const tutorialSkipped = userData.tutorialProgress?.skipped || false;

        console.log('📊 Tutorial Status Check:', {
          onboardingCompleted,
          tutorialCompleted,
          tutorialSkipped,
          pathname,
        });

        // Show tutorial if:
        // 1. Onboarding is complete
        // 2. Tutorial is NOT complete
        // 3. Tutorial was NOT skipped
        // 4. User is on main dashboard page
        if (
          onboardingCompleted &&
          !tutorialCompleted &&
          !tutorialSkipped &&
          pathname === '/dashboard'
        ) {
          setShouldShowTutorial(true);
        } else {
          setShouldShowTutorial(false);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkTutorialStatus();
  }, [currentUser, authLoading, pathname, isMounted]);

  /**
   * Auto-start tutorial with 1-second delay
   */
  useEffect(() => {
    if (shouldShowTutorial && !run && !hasAutoStarted && !checkingStatus) {
      console.log('✨ Auto-starting tutorial...');

      const timer = setTimeout(() => {
        startTutorial();
        setHasAutoStarted(true);
      }, 1000); // 1 second delay

      return () => clearTimeout(timer);
    }
  }, [shouldShowTutorial, run, hasAutoStarted, checkingStatus, startTutorial]);

  // This component doesn't render anything
  return null;
}
