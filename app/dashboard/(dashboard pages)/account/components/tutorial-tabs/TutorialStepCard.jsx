'use client';

import { useTranslation } from '@/lib/translation/useTranslation';
import { useTutorial } from '@/contexts/TutorialContext';

/**
 * Tutorial Step Card Component
 * Reusable component for displaying a single tutorial step
 *
 * @param {Object} step - Step configuration object
 * @param {boolean} completed - Whether this step is completed
 */
export default function TutorialStepCard({ step, completed }) {
  const { t } = useTranslation();
  const { run, jumpToStep } = useTutorial();

  const handleJumpToStep = (stepIndex, stepId) => {
    jumpToStep(stepIndex, stepId);
  };

  const getStepStatus = (stepId) => {
    if (completed) {
      return t('account.tutorial_progression.status.completed');
    }
    return t('account.tutorial_progression.status.not_started');
  };

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all duration-200 bg-white
        ${completed
          ? 'border-[#3AE09A]'
          : 'border-gray-300'
        }
        hover:shadow-md
      `}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Step Number & Title */}
        <div className="flex items-center gap-4 flex-1">
          {/* Step Icon */}
          <div
            className={`
              flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0
              ${completed
                ? 'bg-[#3AE09A] text-white'
                : 'bg-gray-300 text-gray-500'
              }
            `}
          >
            {completed ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="font-semibold">{step.index + 1}</span>
            )}
          </div>

          {/* Step Info */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold truncate ${completed ? 'text-gray-900' : 'text-gray-400'}`}>
              {t(step.titleKey)}
            </h3>
            <p className={`text-sm line-clamp-1 ${completed ? 'text-gray-600' : 'text-gray-400'}`}>
              {t(step.descriptionKey)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status Badge */}
          <span
            className={`
              text-xs font-medium px-3 py-1 rounded-full
              ${completed
                ? 'bg-[#3AE09A]/10 text-[#3AE09A]'
                : 'bg-gray-300 text-gray-500'
              }
            `}
          >
            {getStepStatus(step.id)}
          </span>

          {/* Jump to Step Button */}
          <button
            onClick={() => handleJumpToStep(step.index, step.id)}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-[#3AE09A] hover:bg-[#32C889] text-white
              transition-all duration-200
              hover:scale-105 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            disabled={run}
          >
            {t('account.tutorial_progression.actions.jump_to_step')}
          </button>
        </div>
      </div>
    </div>
  );
}
