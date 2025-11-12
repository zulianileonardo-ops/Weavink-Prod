/**
 * Tutorial Steps Configuration
 * Defines the 6-step interactive tutorial for Weavink dashboard
 *
 * Step Flow:
 * 1. Welcome - Centered modal introduction
 * 2. Navbar - Highlight entire navbar
 * 3. Create Link - Highlight Add Link button, wait for user click
 * 4. Link Form - Highlight opened form
 * 5. Appearance - Auto-navigate to /dashboard/appearance, highlight page
 * 6. Completion - Success message
 */

/**
 * Get tutorial steps with translations
 * @param {Function} t - Translation function from useTranslation
 * @returns {Array} Array of Joyride step objects
 */
export const getTutorialSteps = (t) => [
  // ============================================
  // STEP 1: WELCOME
  // ============================================
  {
    target: 'body', // Centered modal (no specific target)
    content: (
      <div className="tutorial-step-content">
        <h2 className="text-2xl font-bold mb-3" style={{
          background: 'linear-gradient(135deg, #8129D9 0%, #5D18A2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('tutorial.steps.welcome.title')}
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-300">
          {t('tutorial.steps.welcome.description')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t('tutorial.steps.welcome.duration')}
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true, // Show immediately without beacon
    stepId: 'welcome',
    styles: {
      options: {
        width: 500,
      },
    },
  },

  // ============================================
  // STEP 2: NAVBAR
  // ============================================
  {
    target: '[data-tutorial="navbar"]', // Target navbar using data attribute
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar.title')}
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300">
          {t('tutorial.steps.navbar.description')}
        </p>
        <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {t('tutorial.steps.navbar.features.links')}</li>
          <li>• {t('tutorial.steps.navbar.features.appearance')}</li>
          <li>• {t('tutorial.steps.navbar.features.analytics')}</li>
          <li>• {t('tutorial.steps.navbar.features.contacts')}</li>
          <li>• {t('tutorial.steps.navbar.features.settings')}</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar',
  },

  // ============================================
  // STEP 3: CREATE LINK (Wait for User Action)
  // ============================================
  {
    target: '.bg-btnPrimary, [data-tutorial="add-link-btn"]', // Add Link button
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.create_link.title')}
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
          {t('tutorial.steps.create_link.description')}
        </p>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
            👆 {t('tutorial.steps.create_link.action_prompt')}
          </p>
        </div>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    spotlightClicks: true, // Allow clicks on the highlighted element
    stepId: 'create_link',
    // This step won't auto-advance - requires manual trigger from addBtn.jsx
    // Show back button but hide next button (handled in TutorialOverlay callback)
    locale: {
      back: t('tutorial.actions.back'),
      next: '', // Hide next button label to indicate user must click the element
    },
  },

  // ============================================
  // STEP 4: LINK FORM
  // ============================================
  {
    target: 'form, .link-form, [data-tutorial="link-form"]', // Form that appears after clicking
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.link_form.title')}
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300">
          {t('tutorial.steps.link_form.description')}
        </p>
        <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {t('tutorial.steps.link_form.features.url')}</li>
          <li>• {t('tutorial.steps.link_form.features.title')}</li>
          <li>• {t('tutorial.steps.link_form.features.icon')}</li>
        </ul>
      </div>
    ),
    placement: 'right',
    disableBeacon: false,
    stepId: 'link_form',
  },

  // ============================================
  // STEP 5: APPEARANCE (Auto-navigate)
  // ============================================
  {
    target: '.appearance-container, main, [data-tutorial="appearance-page"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.appearance.title')}
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 mb-3">
          {t('tutorial.steps.appearance.description')}
        </p>
        <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {t('tutorial.steps.appearance.features.theme')}</li>
          <li>• {t('tutorial.steps.appearance.features.colors')}</li>
          <li>• {t('tutorial.steps.appearance.features.fonts')}</li>
          <li>• {t('tutorial.steps.appearance.features.layout')}</li>
        </ul>
      </div>
    ),
    placement: 'left',
    disableBeacon: false,
    stepId: 'appearance',
    // Special behavior: Auto-navigate to /dashboard/appearance
    // This is handled in TutorialOverlay.jsx callback
    autoNavigate: '/dashboard/appearance',
  },

  // ============================================
  // STEP 6: COMPLETION
  // ============================================
  {
    target: 'body', // Centered modal
    content: (
      <div className="tutorial-step-content text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-3" style={{
          background: 'linear-gradient(135deg, #8129D9 0%, #5D18A2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('tutorial.steps.completion.title')}
        </h2>
        <p className="text-base text-gray-700 dark:text-gray-300 mb-4">
          {t('tutorial.steps.completion.description')}
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
          <p className="text-sm text-green-800 dark:text-green-300">
            ✓ {t('tutorial.steps.completion.next_steps')}
          </p>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
    stepId: 'completion',
    hideFooter: false, // Show "Finish" button
    locale: {
      last: t('tutorial.actions.finish'),
    },
  },
];

/**
 * Get step by ID
 * @param {string} stepId - Step identifier
 * @param {Function} t - Translation function
 * @returns {Object|null} Step object or null if not found
 */
export const getStepById = (stepId, t) => {
  const steps = getTutorialSteps(t);
  return steps.find(step => step.stepId === stepId) || null;
};

/**
 * Get step index by ID
 * @param {string} stepId - Step identifier
 * @param {Function} t - Translation function
 * @returns {number} Step index or -1 if not found
 */
export const getStepIndexById = (stepId, t) => {
  const steps = getTutorialSteps(t);
  return steps.findIndex(step => step.stepId === stepId);
};

/**
 * Check if step requires auto-navigation
 * @param {number} stepIndex - Step index
 * @param {Function} t - Translation function
 * @returns {string|null} Navigation path or null
 */
export const getStepNavigation = (stepIndex, t) => {
  const steps = getTutorialSteps(t);
  const step = steps[stepIndex];
  return step?.autoNavigate || null;
};

/**
 * Step IDs (for reference and type safety)
 */
export const TUTORIAL_STEP_IDS = {
  WELCOME: 'welcome',
  NAVBAR: 'navbar',
  CREATE_LINK: 'create_link',
  LINK_FORM: 'link_form',
  APPEARANCE: 'appearance',
  COMPLETION: 'completion',
};

export default getTutorialSteps;
