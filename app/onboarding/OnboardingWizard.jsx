'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useOnboarding } from './OnboardingContext';
import LanguageStep from './steps/LanguageStep';

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const {
    currentStep,
    totalSteps,
    answers,
    isSubmitting,
    nextStep,
    previousStep,
    completeOnboarding,
    isFirstStep,
    isLastStep,
  } = useOnboarding();

  // Map step numbers to components
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <LanguageStep />;
      // Future steps will be added here
      // case 2:
      //   return <InterestsStep />;
      // case 3:
      //   return <EventsStep />;
      default:
        return <LanguageStep />;
    }
  };

  // Check if current step is valid (has required answers)
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return answers.language !== null;
      // Future validations
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Banner */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('onboarding.welcome.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('onboarding.welcome.subtitle')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {t('onboarding.progress.step_of', { current: currentStep, total: totalSteps })}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={previousStep}
            disabled={isFirstStep || isSubmitting}
            className={`
              inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium
              transition-all duration-200
              ${isFirstStep || isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:shadow-md'
              }
            `}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('onboarding.buttons.back')}</span>
          </button>

          {/* Next/Complete Button */}
          <button
            onClick={handleNext}
            disabled={!isStepValid() || isSubmitting}
            className={`
              inline-flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold
              transition-all duration-200
              ${!isStepValid() || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('onboarding.saving')}</span>
              </>
            ) : isLastStep ? (
              <>
                <span>{t('onboarding.buttons.complete')}</span>
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>{t('onboarding.buttons.next')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {isLastStep
              ? t('onboarding.ready_to_complete')
              : t('onboarding.step_indicator', { current: currentStep, total: totalSteps })
            }
          </p>
        </div>
      </div>
    </div>
  );
}
