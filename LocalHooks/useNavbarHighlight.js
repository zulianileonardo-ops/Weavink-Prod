import { useState, useEffect } from 'react';

/**
 * Hook for navbar item highlighting during tutorial
 * Watches for URL hash and applies amber ring highlight effect
 *
 * @param {string} navbarItemId - The navbar item identifier (e.g., 'links', 'appearance')
 * @param {number} highlightDuration - Duration in milliseconds (default: 3000)
 * @returns {Object} { isHighlighted, highlightClass }
 *
 * @example
 * const { isHighlighted, highlightClass } = useNavbarHighlight('links');
 * <Link className={highlightClass} data-tutorial="navbar-links">Links</Link>
 */
export function useNavbarHighlight(navbarItemId, highlightDuration = 3000) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    /**
     * Check if this navbar item should be highlighted
     */
    const checkHighlight = () => {
      const hash = window.location.hash;
      const targetHash = `#navbar-${navbarItemId}`;

      if (hash === targetHash) {
        setIsHighlighted(true);

        // Auto-dismiss after duration
        const timer = setTimeout(() => {
          setIsHighlighted(false);
          // Clear hash from URL
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
        }, highlightDuration);

        return () => clearTimeout(timer);
      }
    };

    // Check on mount
    checkHighlight();

    // Listen for hash changes
    window.addEventListener('hashchange', checkHighlight);

    return () => {
      window.removeEventListener('hashchange', checkHighlight);
    };
  }, [navbarItemId, highlightDuration]);

  return {
    isHighlighted,
    /**
     * CSS classes for highlighting effect
     * Highlighted: Amber ring with scale effect
     * Normal: Smooth transition
     */
    highlightClass: isHighlighted
      ? 'ring-4 ring-amber-400 shadow-xl scale-105 transition-all duration-300'
      : 'transition-all duration-300'
  };
}

export default useNavbarHighlight;
