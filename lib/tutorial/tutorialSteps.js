/**
 * Tutorial Steps Configuration
 * Defines the 23-step interactive tutorial for Weavink dashboard
 *
 * Step Flow:
 * 1. Welcome - Centered modal introduction
 * 2. Navbar - Highlight entire navbar
 * 3-9. Navbar Pages - Individual page introductions with highlights
 *    3. Links Page
 *    4. Appearance Page
 *    5. Analytics Page
 *    6. Contacts Page
 *    7. Settings Page
 *    8. Share Button
 *    9. Account Page (auto-navigate to /dashboard/account)
 * 10. Privacy Overview - Account page privacy section
 * 11. Privacy Tabs - Walkthrough of privacy tabs
 * 12-18. Individual Privacy Tabs - Brief introduction to each tab
 *    12. Overview Tab
 *    13. Export Data Tab
 *    14. Delete Account Tab
 *    15. Consents Tab
 *    16. Privacy Settings Tab
 *    17. Contact Download Tab
 *    18. Website Configuration Tab
 * 19. Tutorial Progression - Tutorial progress tracking section
 * 20. Create Link - Highlight Add Link button, wait for user click
 * 21. Link Form - Highlight opened form
 * 22. Appearance Customization - Auto-navigate to /dashboard/appearance
 * 23. Completion - Success message
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
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.welcome.description')}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mt-2">
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
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar',
  },

  // ============================================
  // STEP 3: LINKS PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-links"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_links.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_links.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_links',
    navbarItemId: 'links', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 4: APPEARANCE PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-appearance"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_appearance.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_appearance.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_appearance',
    navbarItemId: 'appearance', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 5: ANALYTICS PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-analytics"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_analytics.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_analytics.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_analytics',
    navbarItemId: 'analytics', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 6: CONTACTS PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-contacts"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_contacts.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_contacts.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_contacts',
    navbarItemId: 'contacts', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 7: SETTINGS PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-settings"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_settings.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_settings.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_settings',
    navbarItemId: 'settings', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 8: SHARE BUTTON
  // ============================================
  {
    target: '[data-tutorial="navbar-share"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_share.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_share.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_share',
    navbarItemId: 'share', // For useNavbarHighlight hook
  },

  // ============================================
  // STEP 9: ACCOUNT PAGE
  // ============================================
  {
    target: '[data-tutorial="navbar-account"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.navbar_account.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.navbar_account.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'navbar_account',
    navbarItemId: 'account', // For useNavbarHighlight hook
    autoNavigate: '/dashboard/account', // Navigate to account page
  },

  // ============================================
  // STEP 10: PRIVACY OVERVIEW SECTION
  // ============================================
  {
    target: '[data-tutorial="privacy-overview-section"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_privacy_overview.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_privacy_overview.description')}
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: false,
    stepId: 'account_privacy_overview',
  },

  // ============================================
  // STEP 11: PRIVACY TABS
  // ============================================
  {
    target: '[data-tutorial="privacy-overview-tabs"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_privacy_tabs.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_privacy_tabs.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_privacy_tabs',
  },

  // ============================================
  // STEP 12: OVERVIEW TAB
  // ============================================
  {
    target: '[data-tutorial="tab-overview"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_overview.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_overview.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_overview',
  },

  // ============================================
  // STEP 13: EXPORT DATA TAB
  // ============================================
  {
    target: '[data-tutorial="tab-export"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_export.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_export.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_export',
  },

  // ============================================
  // STEP 14: DELETE ACCOUNT TAB
  // ============================================
  {
    target: '[data-tutorial="tab-delete"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_delete.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_delete.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_delete',
  },

  // ============================================
  // STEP 15: CONSENTS TAB
  // ============================================
  {
    target: '[data-tutorial="tab-consents"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_consents.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_consents.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_consents',
  },

  // ============================================
  // STEP 16: PRIVACY SETTINGS TAB
  // ============================================
  {
    target: '[data-tutorial="tab-settings"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_settings.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_settings.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_settings',
  },

  // ============================================
  // STEP 17: CONTACT DOWNLOAD TAB
  // ============================================
  {
    target: '[data-tutorial="tab-contact-download"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_contact_download.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_contact_download.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_contact_download',
  },

  // ============================================
  // STEP 18: WEBSITE CONFIGURATION TAB
  // ============================================
  {
    target: '[data-tutorial="tab-website-config"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tab_website_config.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tab_website_config.description')}
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: false,
    stepId: 'account_tab_website_config',
  },

  // ============================================
  // STEP 19: TUTORIAL PROGRESSION
  // ============================================
  {
    target: '[data-tutorial="tutorial-progression-section"]',
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.account_tutorial_progression.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.account_tutorial_progression.description')}
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: false,
    stepId: 'account_tutorial_progression',
  },

  // ============================================
  // STEP 20: CREATE LINK (Wait for User Action)
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
  // STEP 21: LINK FORM
  // ============================================
  {
    target: 'form, .link-form, [data-tutorial="link-form"]', // Form that appears after clicking
    content: (
      <div className="tutorial-step-content">
        <h3 className="text-xl font-semibold mb-2">
          {t('tutorial.steps.link_form.title')}
        </h3>
        <p className="text-base text-gray-900 dark:text-gray-100">
          {t('tutorial.steps.link_form.description')}
        </p>
        <ul className="mt-3 text-sm text-gray-900 dark:text-gray-100 space-y-1">
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
  // STEP 22: APPEARANCE CUSTOMIZATION (Auto-navigate)
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
        <ul className="mt-3 text-sm text-gray-900 dark:text-gray-100 space-y-1">
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
  // STEP 23: COMPLETION
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
  // Navbar page introductions
  NAVBAR_LINKS: 'navbar_links',
  NAVBAR_APPEARANCE: 'navbar_appearance',
  NAVBAR_ANALYTICS: 'navbar_analytics',
  NAVBAR_CONTACTS: 'navbar_contacts',
  NAVBAR_SETTINGS: 'navbar_settings',
  NAVBAR_SHARE: 'navbar_share',
  NAVBAR_ACCOUNT: 'navbar_account',
  // Account & Privacy page
  ACCOUNT_PRIVACY_OVERVIEW: 'account_privacy_overview',
  ACCOUNT_PRIVACY_TABS: 'account_privacy_tabs',
  ACCOUNT_TAB_OVERVIEW: 'account_tab_overview',
  ACCOUNT_TAB_EXPORT: 'account_tab_export',
  ACCOUNT_TAB_DELETE: 'account_tab_delete',
  ACCOUNT_TAB_CONSENTS: 'account_tab_consents',
  ACCOUNT_TAB_SETTINGS: 'account_tab_settings',
  ACCOUNT_TAB_CONTACT_DOWNLOAD: 'account_tab_contact_download',
  ACCOUNT_TAB_WEBSITE_CONFIG: 'account_tab_website_config',
  ACCOUNT_TUTORIAL_PROGRESSION: 'account_tutorial_progression',
  // Detailed walkthroughs
  CREATE_LINK: 'create_link',
  LINK_FORM: 'link_form',
  APPEARANCE: 'appearance',
  COMPLETION: 'completion',
};

export default getTutorialSteps;
