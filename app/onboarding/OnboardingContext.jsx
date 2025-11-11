'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/translation/useTranslation';
import { getAuth } from 'firebase/auth';

const OnboardingContext = createContext(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export function OnboardingProvider({ children, totalSteps = 1 }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store user's answers for all onboarding questions
  const [answers, setAnswers] = useState({
    language: null,
    // Future: interests, events, etc.
  });

  // Update an answer
  const updateAnswer = useCallback((key, value) => {
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Get Firebase auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      const data = await response.json();

      // Show success message
      toast.success(t('onboarding.success'));

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);

      return data;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(t('onboarding.error'));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, router, t]);

  const value = {
    currentStep,
    totalSteps,
    answers,
    isSubmitting,
    updateAnswer,
    nextStep,
    previousStep,
    completeOnboarding,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
