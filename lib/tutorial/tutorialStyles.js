/**
 * Joyride Tutorial Styles
 * Custom styling for the interactive tutorial with Weavink branding
 * Brand colors: Purple gradient (#8129D9 → #5D18A2)
 */

/**
 * Main Joyride styles configuration
 * Applies Weavink's purple gradient theme
 */
export const tutorialStyles = {
  options: {
    // Arrow color (matches tooltip background)
    arrowColor: '#ffffff',

    // Background color (white for clean look)
    backgroundColor: '#ffffff',

    // Overlay color (semi-transparent black)
    overlayColor: 'rgba(0, 0, 0, 0.6)',

    // Primary color (purple gradient start)
    primaryColor: '#8129D9',

    // Spotlight border color
    spotlightShadow: '0 0 15px rgba(129, 41, 217, 0.5)',

    // Text color
    textColor: '#1f2937',

    // Width of tooltip
    width: 380,

    // Z-index (standard for modal overlays, higher than navbar)
    zIndex: 9999,
  },

  // Tooltip container
  tooltip: {
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(129, 41, 217, 0.1)',
    padding: '20px',
    fontSize: '15px',
    lineHeight: '1.6',
  },

  // Tooltip content
  tooltipContainer: {
    textAlign: 'left',
  },

  // Tooltip title
  tooltipTitle: {
    color: '#111827',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },

  // Tooltip content text
  tooltipContent: {
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '1.6',
    padding: '0',
  },

  // Footer (button container)
  tooltipFooter: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Footer separator line
  tooltipFooterSpacer: {
    flex: 1,
  },

  // Button container
  buttonNext: {
    background: 'linear-gradient(135deg, #8129D9 0%, #5D18A2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 20px',
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(129, 41, 217, 0.4)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },

  // Back button
  buttonBack: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginRight: '10px',
    padding: '10px 16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: '#9ca3af',
      color: '#374151',
    },
  },

  // Skip button
  buttonSkip: {
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    padding: '8px 12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      color: '#6b7280',
      backgroundColor: '#f3f4f6',
    },
  },

  // Close button (X in corner)
  buttonClose: {
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '18px',
    height: '32px',
    width: '32px',
    padding: '0',
    position: 'absolute',
    right: '12px',
    top: '12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      color: '#374151',
      backgroundColor: '#f3f4f6',
    },
  },

  // Spotlight (highlighted element)
  spotlight: {
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 15px rgba(129, 41, 217, 0.5)',
    backgroundColor: 'transparent',  // Make spotlight div invisible
    pointerEvents: 'none',           // Allow clicks through to button
  },

  // Beacon (pulsing dot)
  beacon: {
    display: 'none', // Disabled for cleaner experience
  },

  // Overlay
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    mixBlendMode: 'normal',
  },
};

/**
 * Mobile-specific style overrides
 * Applied when viewport width < 768px
 */
export const mobileTutorialStyles = {
  options: {
    ...tutorialStyles.options,
    width: 'calc(100vw - 40px)', // Almost full width on mobile
  },

  tooltip: {
    ...tutorialStyles.tooltip,
    maxWidth: '90vw',
    fontSize: '14px',
  },

  tooltipTitle: {
    ...tutorialStyles.tooltipTitle,
    fontSize: '16px',
  },

  tooltipContent: {
    ...tutorialStyles.tooltipContent,
    fontSize: '14px',
  },
};

/**
 * Dark mode style overrides
 * Applied when dark mode is active
 */
export const darkModeTutorialStyles = {
  options: {
    ...tutorialStyles.options,
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
  },

  tooltip: {
    ...tutorialStyles.tooltip,
    backgroundColor: '#1f2937',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(129, 41, 217, 0.2)',
  },

  tooltipTitle: {
    ...tutorialStyles.tooltipTitle,
    color: '#f9fafb',
  },

  tooltipContent: {
    ...tutorialStyles.tooltipContent,
    color: '#d1d5db',
  },

  buttonBack: {
    ...tutorialStyles.buttonBack,
    borderColor: '#4b5563',
    color: '#9ca3af',
    '&:hover': {
      borderColor: '#6b7280',
      color: '#d1d5db',
    },
  },

  buttonSkip: {
    ...tutorialStyles.buttonSkip,
    color: '#6b7280',
    '&:hover': {
      color: '#9ca3af',
      backgroundColor: '#374151',
    },
  },

  buttonClose: {
    ...tutorialStyles.buttonClose,
    color: '#6b7280',
    '&:hover': {
      color: '#d1d5db',
      backgroundColor: '#374151',
    },
  },
};

/**
 * Locale configuration for Joyride buttons
 * Provides default English text (override with translations)
 */
export const tutorialLocale = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  open: 'Open',
  skip: 'Skip Tutorial',
};

/**
 * Get styles based on viewport and theme
 * @param {boolean} isMobile - Whether viewport is mobile
 * @param {boolean} isDarkMode - Whether dark mode is active
 * @returns {Object} Merged styles object
 */
export const getTutorialStyles = (isMobile = false, isDarkMode = false) => {
  let styles = { ...tutorialStyles };

  if (isMobile) {
    styles = {
      ...styles,
      options: { ...styles.options, ...mobileTutorialStyles.options },
      tooltip: { ...styles.tooltip, ...mobileTutorialStyles.tooltip },
      tooltipTitle: { ...styles.tooltipTitle, ...mobileTutorialStyles.tooltipTitle },
      tooltipContent: { ...styles.tooltipContent, ...mobileTutorialStyles.tooltipContent },
    };
  }

  if (isDarkMode) {
    styles = {
      ...styles,
      options: { ...styles.options, ...darkModeTutorialStyles.options },
      tooltip: { ...styles.tooltip, ...darkModeTutorialStyles.tooltip },
      tooltipTitle: { ...styles.tooltipTitle, ...darkModeTutorialStyles.tooltipTitle },
      tooltipContent: { ...styles.tooltipContent, ...darkModeTutorialStyles.tooltipContent },
      buttonBack: { ...styles.buttonBack, ...darkModeTutorialStyles.buttonBack },
      buttonSkip: { ...styles.buttonSkip, ...darkModeTutorialStyles.buttonSkip },
      buttonClose: { ...styles.buttonClose, ...darkModeTutorialStyles.buttonClose },
    };
  }

  return styles;
};

export default tutorialStyles;
