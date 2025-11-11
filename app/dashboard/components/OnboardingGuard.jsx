'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';

/**
 * OnboardingGuard - Ensures users complete onboarding before accessing dashboard
 * Prevents the flash issue by blocking dashboard render until check completes
 */
export default function OnboardingGuard({ children }) {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Wait for auth to be ready
      if (authLoading) {
        return;
      }

      // If no user, ProtectedRoute will handle redirect to login
      if (!currentUser) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        // Check onboarding status from Firestore
        const userDocRef = doc(fireApp, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const completed = userData.onboardingCompleted || false;

          setOnboardingCompleted(completed);

          // If onboarding not completed, redirect to onboarding page
          if (!completed) {
            console.log('🚫 [OnboardingGuard] Onboarding not completed, redirecting to /onboarding');
            router.push('/onboarding');
            return;
          }

          console.log('✅ [OnboardingGuard] Onboarding completed, allowing dashboard access');
        } else {
          // User document doesn't exist, send to onboarding
          console.log('🚫 [OnboardingGuard] No user document found, redirecting to /onboarding');
          router.push('/onboarding');
          return;
        }
      } catch (error) {
        console.error('❌ [OnboardingGuard] Error checking onboarding status:', error);
        // On error, allow access (fail open) to prevent blocking users
        setOnboardingCompleted(true);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser, authLoading, router, pathname]);

  // Show loading spinner while checking auth or onboarding
  if (authLoading || checkingOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  // Don't render dashboard if onboarding not completed (will be redirected)
  if (!onboardingCompleted) {
    return null;
  }

  // Render dashboard content only if onboarding is completed
  return children;
}
