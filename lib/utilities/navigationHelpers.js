// lib/utilities/navigationHelpers.js

/**
 * Generate navigation hash for an item
 * @param {string} itemType - Type of item (e.g., 'cv-item', 'cv-link')
 * @param {string} itemId - ID of the item
 * @returns {string} Hash string (e.g., '#cv-item-123')
 */
export function getItemHash(itemType, itemId) {
    return `#${itemType}-${itemId}`;
}

/**
 * Navigate from appearance item to dashboard link
 * @param {Object} router - Next.js router instance
 * @param {string} linkId - ID of the link to navigate to
 */
export function navigateToDashboardLink(router, linkId) {
    const hash = getItemHash('link', linkId);
    router.push(`/dashboard${hash}`);
}

/**
 * Navigate from dashboard link to appearance item
 * @param {Object} router - Next.js router instance
 * @param {string} itemType - Type of item (e.g., 'cv-item', 'carousel')
 * @param {string} itemId - ID of the item
 */
export function navigateToAppearanceItem(router, itemType, itemId) {
    const hash = getItemHash(itemType, itemId);
    router.push(`/dashboard/appearance${hash}`);
}

/**
 * Scroll to element with retry mechanism
 * @param {string} elementId - ID of the element to scroll to
 * @param {Object} options - Scroll options
 * @param {number} options.maxAttempts - Maximum number of retry attempts (default: 10)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 200)
 * @param {string} options.behavior - Scroll behavior (default: 'smooth')
 * @param {string} options.block - Vertical alignment (default: 'center')
 * @param {number} options.initialDelay - Delay before first attempt in ms (default: 500)
 */
export function scrollToElement(elementId, options = {}) {
    const {
        maxAttempts = 10,
        retryDelay = 200,
        behavior = 'smooth',
        block = 'center',
        initialDelay = 500
    } = options;

    const attemptScroll = (attempts = 0) => {
        if (attempts >= maxAttempts) {
            console.warn(`Failed to scroll to element: ${elementId}`);
            return;
        }

        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({
                behavior,
                block
            });
        } else {
            setTimeout(() => attemptScroll(attempts + 1), retryDelay);
        }
    };

    // Delay initial attempt to allow page to render
    setTimeout(() => attemptScroll(), initialDelay);
}
