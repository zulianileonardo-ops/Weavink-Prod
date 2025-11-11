// LocalHooks/useItemNavigation.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook for bidirectional navigation between dashboard and appearance pages
 * with visual highlighting
 *
 * @param {Object} options
 * @param {string} options.itemId - The ID of the current item
 * @param {string} options.itemType - Type identifier (e.g., 'cv-item', 'cv-link', 'media-link')
 * @param {number} options.highlightDuration - Duration in ms (default: 3000)
 * @returns {Object} Navigation utilities
 */
export function useItemNavigation({ itemId, itemType, highlightDuration = 3000 }) {
    const router = useRouter();
    const [isHighlighted, setIsHighlighted] = useState(false);

    // Check if this item should be highlighted based on URL hash
    useEffect(() => {
        const checkHighlight = () => {
            const hash = window.location.hash;
            const targetHash = `#${itemType}-${itemId}`;

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

        // Check immediately
        checkHighlight();

        // Also check when hash changes
        window.addEventListener('hashchange', checkHighlight);
        return () => window.removeEventListener('hashchange', checkHighlight);
    }, [itemId, itemType, highlightDuration]);

    /**
     * Navigate to another page and highlight a target item
     *
     * @param {string} targetPath - Path to navigate to (e.g., '/dashboard')
     * @param {string} targetItemId - ID of the item to highlight
     * @param {string} targetItemType - Type of the item (e.g., 'cv-link')
     * @param {Object} options - Additional options
     */
    const navigateToItem = useCallback((targetPath, targetItemId, targetItemType, options = {}) => {
        const hash = `#${targetItemType}-${targetItemId}`;
        router.push(`${targetPath}${hash}`);

        // Scroll to target with retry mechanism
        const scrollToTarget = (attempts = 0) => {
            const maxAttempts = options.maxAttempts || 10;
            if (attempts >= maxAttempts) {
                console.warn(`Failed to scroll to: ${targetItemType}-${targetItemId}`);
                return;
            }

            const element = document.getElementById(`${targetItemType}-${targetItemId}`);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: options.scrollBlock || 'center'
                });
            } else {
                setTimeout(() => scrollToTarget(attempts + 1), 200);
            }
        };

        setTimeout(() => scrollToTarget(), 500);
    }, [router]);

    return {
        isHighlighted,
        navigateToItem,
        // CSS classes for highlighting effect
        highlightClass: isHighlighted
            ? 'ring-4 ring-amber-400 shadow-xl scale-[1.02] transition-all duration-300'
            : 'transition-all duration-300'
    };
}
