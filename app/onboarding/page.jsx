'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { LanguageProvider } from '@/lib/translation/languageContext';
import { OnboardingProvider } from './OnboardingContext';
import OnboardingWizard from './OnboardingWizard';

export default function OnboardingPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Wait for auth to be ready
      if (authLoading) {
        return;
      }

      // Redirect to login if not authenticated
      if (!currentUser) {
        console.log('🔒 [Onboarding] No user, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        // Check onboarding status from user document
        const userDocRef = doc(fireApp, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const completed = userData.onboardingCompleted || false;

          // If onboarding is already completed, redirect to dashboard
          if (completed) {
            console.log('✅ [Onboarding] Already completed, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }

          // Onboarding not completed, show the wizard
          console.log('📝 [Onboarding] Not completed, showing wizard');
          setShouldShowOnboarding(true);
        } else {
          // User document doesn't exist, show onboarding
          console.log('📝 [Onboarding] No user document, showing wizard');
          setShouldShowOnboarding(true);
        }
      } catch (error) {
        console.error('❌ [Onboarding] Error checking status:', error);
        // On error, show onboarding to be safe
        setShouldShowOnboarding(true);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser, authLoading, router]);

  // Show loading while checking auth or onboarding status
  if (authLoading || checkingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Setting up your account...</p>
      </div>
    );
  }

  // Don't render if we shouldn't show onboarding (will be redirected)
  if (!shouldShowOnboarding) {
    return null;
  }

  // Render onboarding wizard
  return (
    <LanguageProvider>
      <OnboardingProvider totalSteps={1}>
        <OnboardingWizard />
      </OnboardingProvider>
    </LanguageProvider>
  );
}
