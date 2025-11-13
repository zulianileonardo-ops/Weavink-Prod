'use client';

import { useEffect, useState } from 'react';

/**
 * Custom Tutorial Tooltip Component with Cooldown
 *
 * Renders Joyride tooltip with a 3-second cooldown on the Next button.
 * Shows a horizontal progress bar inside the button that fills as the cooldown progresses.
 *
 * @param {Object} props - Joyride TooltipRenderProps
 */
export default function CustomTutorialTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}) {
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  const COOLDOWN_DURATION = 3000; // 3 seconds
  const UPDATE_INTERVAL = 50; // Update every 50ms for smooth animation

  // Reset and start cooldown timer when step changes
  useEffect(() => {
    setCooldownProgress(0);
    setIsButtonEnabled(false);

    const totalUpdates = COOLDOWN_DURATION / UPDATE_INTERVAL;
    let currentUpdate = 0;

    const timer = setInterval(() => {
      currentUpdate++;
      const progress = (currentUpdate / totalUpdates) * 100;

      setCooldownProgress(progress);

      if (progress >= 100) {
        setIsButtonEnabled(true);
        clearInterval(timer);
      }
    }, UPDATE_INTERVAL);

    return () => clearInterval(timer);
  }, [step.stepId]); // Reset on step change

  return (
    <div
      {...tooltipProps}
      className="relative"
      style={{
        backgroundColor: 'var(--tooltip-bg, #ffffff)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '380px',
        ...tooltipProps.style,
      }}
    >
      {/* Close button */}
      {step.hideCloseButton !== true && (
        <button
          {...closeProps}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close tutorial"
        >
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Tooltip content */}
      <div className="mb-5">
        {step.content}
      </div>

      {/* Footer with buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Skip button */}
        <div className="flex-shrink-0">
          {continuous && !isLastStep && (
            <button
              {...skipProps}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {skipProps.title || 'Skip Tutorial'}
            </button>
          )}
        </div>

        {/* Right side: Back and Next buttons */}
        <div className="flex items-center gap-2">
          {/* Back button */}
          {index > 0 && (
            <button
              {...backProps}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {backProps.title || 'Back'}
            </button>
          )}

          {/* Next/Finish button with progress bar */}
          {continuous && (
            <button
              {...primaryProps}
              onClick={isButtonEnabled ? primaryProps.onClick : undefined}
              disabled={!isButtonEnabled}
              className={`relative overflow-hidden px-6 py-2 text-sm font-semibold text-white rounded-lg transition-all ${
                isButtonEnabled
                  ? 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 cursor-pointer shadow-md hover:shadow-lg'
                  : 'bg-gradient-to-r from-purple-400 to-purple-600 cursor-not-allowed opacity-75'
              }`}
              style={{
                minWidth: '100px',
              }}
            >
              {/* Button text */}
              <span className="relative z-10">
                {primaryProps.title || (isLastStep ? 'Finish' : 'Next')}
              </span>

              {/* Progress bar - fills from left to right */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-100 ease-linear"
                style={{
                  width: `${cooldownProgress}%`,
                }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      {step.showProgress !== false && (
        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Step {index + 1} of {step.totalSteps || 16}
        </div>
      )}
    </div>
  );
}
