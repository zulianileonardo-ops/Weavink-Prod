//app/dashboard/general elements/draggables/CarouselItem.jsx
"use client"

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { FaX, FaGear } from 'react-icons/fa6';
import { ManageLinksContent } from '../../general components/ManageLinks';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { AppearanceService } from '@/lib/services/serviceAppearance/client/appearanceService.js';
import { useDebounce } from '@/LocalHooks/useDebounce';
import { useItemNavigation } from '@/LocalHooks/useItemNavigation';
import { APPEARANCE_FEATURES } from '@/lib/services/constants';
import { toast } from 'react-hot-toast';

// Carousel Item Component - Type 2
export default function CarouselItem({ item, itemRef, style, listeners, attributes, isOverlay = false }) {
    const { t, isInitialized } = useTranslation();
    const { setData } = useContext(ManageLinksContent);
    const { currentUser, permissions, subscriptionLevel, isLoading: isSessionLoading } = useDashboard();
    const [wantsToDelete, setWantsToDelete] = useState(false);
    const [carouselEnabled, setCarouselEnabled] = useState(false);
    const [hasItems, setHasItems] = useState(false);
    const [linkedCarouselName, setLinkedCarouselName] = useState(null);
    const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);
    const [checkboxChecked, setCheckboxChecked] = useState(false);
    const debounceCheckbox = useDebounce(checkboxChecked, 500);
    const router = useRouter();

    // Navigation hook for bidirectional navigation with highlighting
    const { isHighlighted, navigateToItem, highlightClass } = useItemNavigation({
        itemId: item.id,
        itemType: 'carousel-link'
    });

    // Define the feature key for this component
    const featureKey = APPEARANCE_FEATURES.CUSTOM_CAROUSEL;

    // 🔧 ROBUST FIX: Keep loading if session is busy OR if permissions object is still empty
    const isStillLoading = isSessionLoading || Object.keys(permissions).length === 0;

    // Check if user has permission to use carousel (only after permissions are fully loaded)
    const canUseCarousel = permissions[featureKey];
    const hasExistingCarousel = carouselEnabled; // User had carousel before downgrade

    // 🆕 Monitor permission changes in real-time
    useEffect(() => {
        console.log('🔄 [CarouselItem] Permissions updated:', {
            canUseCarousel,
            subscriptionLevel,
            timestamp: new Date().toISOString()
        });
    }, [canUseCarousel, subscriptionLevel]);

    // Helper function to check if carousel has items with valid media (image or video)
    const hasItemsWithMedia = useCallback((items) => {
        if (!Array.isArray(items) || items.length === 0) return false;
        return items.some(item => {
            const mediaUrl = item.mediaUrl || item.image || item.videoUrl || '';
            return Boolean(mediaUrl.trim());
        });
    }, []);

    // Pre-compute translations for performance
    const translations = useMemo(() => {
        if (!isInitialized) return {};
        return {
            carouselTitle: t('dashboard.links.item.carousel_title_default') || 'Content Carousel',
            carouselDescription: t('dashboard.links.item.carousel_description') || 'Display your content carousel here',
            customizeButton: t('dashboard.links.item.customize_carousel') || 'Customize',
            deleteTooltip: t('dashboard.links.item.delete_tooltip') || 'Delete',
            deleteHeader: t('dashboard.links.item.delete_header') || 'Delete this item?',
            deleteConfirmationQuestion: t('dashboard.links.item.delete_confirmation_question') || 'Are you sure you want to delete this?',
            cancelButton: t('dashboard.links.item.cancel_button') || 'Cancel',
            deleteButton: t('dashboard.links.item.delete_button') || 'Delete',
        };
    }, [t, isInitialized]);

    // Load linked carousel data on mount and listen for real-time updates
    useEffect(() => {
        if (!currentUser?.uid || !item.carouselId) {
            setIsLoadingCarousel(false);
            return;
        }

        // Initial load
        const loadInitialState = async () => {
            try {
                const appearance = await AppearanceService.getAppearanceData();
                const carousels = appearance.carousels || [];

                // Find the carousel this link is connected to
                const linkedCarousel = carousels.find(c => c.id === item.carouselId);

                if (linkedCarousel) {
                    setCarouselEnabled(linkedCarousel.enabled || false);
                    setLinkedCarouselName(linkedCarousel.title || 'Untitled Carousel');
                    setHasItems(hasItemsWithMedia(linkedCarousel.items));
                } else {
                    setCarouselEnabled(false);
                    setLinkedCarouselName(null);
                    setHasItems(false);
                }
            } catch (error) {
                console.error('Error loading carousel state:', error);
            } finally {
                setIsLoadingCarousel(false);
            }
        };

        loadInitialState();

        // Set up real-time listener for carousel changes
        const unsubscribe = AppearanceService.listenToAppearanceData(
            currentUser.uid,
            (appearance) => {
                const carousels = appearance.carousels || [];
                const linkedCarousel = carousels.find(c => c.id === item.carouselId);

                if (linkedCarousel) {
                    setCarouselEnabled(linkedCarousel.enabled || false);
                    setLinkedCarouselName(linkedCarousel.title || 'Untitled Carousel');
                    setHasItems(hasItemsWithMedia(linkedCarousel.items));
                } else {
                    setCarouselEnabled(false);
                    setLinkedCarouselName(null);
                    setHasItems(false);
                }
            }
        );

        // Cleanup listener on unmount
        return () => {
            unsubscribe();
        };
    }, [currentUser?.uid, item.carouselId]);

    // Debounced update effect - only triggers when debounced value changes
    useEffect(() => {
        // Skip if checkbox state matches carousel enabled state (no change needed)
        if (checkboxChecked === carouselEnabled) return;

        // Skip if still loading initial data
        if (isLoadingCarousel) return;

        // Perform the actual API update
        const updateCarouselStatus = async () => {
            try {
                const appearance = await AppearanceService.getAppearanceData();
                const carousels = appearance.carousels || [];

                const updatedCarousels = carousels.map(carousel =>
                    carousel.id === item.carouselId
                        ? { ...carousel, enabled: checkboxChecked }
                        : carousel
                );

                await AppearanceService.updateAppearanceData(
                    { carousels: updatedCarousels },
                    { origin: 'manage-links', userId: currentUser?.uid }
                );

                // Update local state to match
                setCarouselEnabled(checkboxChecked);
                setData(prevData => prevData.map(link =>
                    link.id === item.id ? { ...link, isActive: checkboxChecked } : link
                ));

                toast.success(checkboxChecked ? 'Carousel enabled' : 'Carousel disabled');
            } catch (error) {
                console.error('Error updating carousel state:', error);
                toast.error('Failed to update carousel state');
                // Revert checkbox to match carousel state on error
                setCheckboxChecked(carouselEnabled);
            }
        };

        updateCarouselStatus();
    }, [debounceCheckbox]); // Only fires when debounced value changes

    // Sync checkbox with external changes to carousel enabled state
    useEffect(() => {
        setCheckboxChecked(carouselEnabled);
    }, [carouselEnabled]);

    const handleToggleCarousel = (event) => {
        const newValue = event.target.checked;

        // VALIDATION FIRST - Prevent toggle if user doesn't have permission
        if (!canUseCarousel) {
            const requiredTier = subscriptionLevel === 'base' ? 'Pro' : 'Pro';
            toast.error(`Upgrade to ${requiredTier} to enable Content Carousel`, {
                duration: 4000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 'bold',
                }
            });
            return; // State is NOT updated
        }

        // Validate: Prevent enabling if carousel has no items with media
        if (newValue === true && !hasItems) {
            toast.error('Add at least one carousel item with an image or video before enabling.');
            return; // State is NOT updated
        }

        // Only update state if all validations pass
        setCheckboxChecked(newValue);
    };

    const handleDelete = async () => {
        setData(prevData => {
            const filtered = prevData.filter(i => i.id !== item.id);
            return filtered.map((link, index) => ({
                ...link,
                order: index
            }));
        });

        if (!item.carouselId) {
            setHasItems(false);
            return;
        }

        try {
            const appearance = await AppearanceService.getAppearanceData();
            const carousels = appearance.carousels || [];
            const filteredCarousels = carousels
                .filter(carousel => carousel.id !== item.carouselId)
                .map((carousel, index) => ({ ...carousel, order: index }));

            if (filteredCarousels.length === carousels.length) {
                return;
            }

            await AppearanceService.updateAppearanceData(
                { carousels: filteredCarousels },
                { origin: 'manage-links', userId: currentUser?.uid }
            );
            setHasItems(false);
        } catch (error) {
            console.error('Error removing linked carousel from appearance:', error);
            toast.error('Failed to delete linked carousel from appearance');
        }
    };

    const handleCustomize = () => {
        // Prevent customization if user doesn't have permission
        if (!canUseCarousel) {
            const requiredTier = subscriptionLevel === 'base' ? 'Pro' : 'Pro';
            toast.error(`Upgrade to ${requiredTier} to customize Content Carousel`, {
                duration: 4000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 'bold',
                }
            });
            return;
        }

        // Navigate using the standardized hook with reliable scroll and highlighting
        if (item.carouselId) {
            navigateToItem('/dashboard/appearance', item.carouselId, 'carousel-item');
        }
    };

    // Grey out if user doesn't have permission
    const containerClasses = `rounded-3xl border flex flex-col ${
        !canUseCarousel
            ? 'bg-gray-100 border-gray-300 opacity-60'
            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300'
    } ${isOverlay ? 'shadow-lg' : ''}`;
    const toggleDisabled = isLoadingCarousel || !canUseCarousel;

    // 🔧 ROBUST FIX: Loading state while session/permissions are loading - PREVENTS RACE CONDITION
    // This now checks BOTH isSessionLoading AND if permissions object is empty
    if (isStillLoading) {
        return (
            <div
                ref={itemRef}
                style={style}
                className="rounded-3xl border flex flex-col h-[8rem] bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 animate-pulse"
            >
                <div className="h-full flex items-center px-6">
                    <div className="w-4 h-4 bg-gray-300 rounded mr-4"></div>
                    <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-6 bg-gray-300 rounded w-24"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state while translations load
    if (!isInitialized) {
        return (
            <div ref={itemRef} style={style} className={`${containerClasses} h-[8rem] bg-gray-200 animate-pulse`}>
            </div>
        )
    }

    return (
        <div
            ref={itemRef}
            style={style}
            id={`carousel-link-${item.id}`}
            className={`${containerClasses} ${highlightClass}`}
        >
            <div className={`h-[8rem] items-center flex`}>
                {/* Drag handle */}
                <div
                    className='active:cursor-grabbing h-full px-2 grid place-items-center touch-none'
                    {...listeners}
                    {...attributes}
                >
                    <Image
                        src={"https://linktree.sirv.com/Images/icons/drag.svg"}
                        alt='drag icon'
                        height={15}
                        width={15}
                    />
                </div>

                <div className='flex-1 flex flex-col px-3 gap-2'>
                    {/* Carousel Title with Icon */}
                    <div className='flex gap-3 items-center'>
                        <span className={`font-semibold flex items-center gap-2 ${
                            !canUseCarousel ? 'text-gray-500' : 'text-purple-700'
                        }`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                            {translations.carouselTitle}
                        </span>
                        {/* Show upgrade badge if no permission */}
                        {!canUseCarousel && (
                            <span className='text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full font-semibold'>
                                Pro Required
                            </span>
                        )}
                    </div>

                    {/* Carousel Description */}
                    <div className={`text-sm opacity-80 ${
                        !canUseCarousel ? 'text-gray-500' : 'text-purple-600'
                    }`}>
                        {!canUseCarousel
                            ? 'Upgrade to Pro or Premium to use this feature'
                            : linkedCarouselName
                                ? `Linked to: ${linkedCarouselName}`
                                : 'Go to Appearance to add items to this carousel'
                        }
                    </div>

                    {/* Customize Button */}
                    <button
                        onClick={handleCustomize}
                        disabled={!canUseCarousel}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm w-fit ${
                            !canUseCarousel
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                    >
                        <FaGear className='text-xs' />
                        <span>{translations.customizeButton}</span>
                    </button>
                </div>

                {/* Toggle and Delete Buttons */}
                <div className='grid sm:pr-2 gap-2 place-items-center'>
                    {/* Individual Toggle Switch */}
                    <div className='cursor-pointer scale-[0.8] sm:scale-100'>
                        <label className="relative flex justify-between items-center group p-2 text-xl">
                            <input
                                type="checkbox"
                                onChange={handleToggleCarousel}
                                checked={checkboxChecked}
                                disabled={toggleDisabled}
                                className="absolute left-1/2 -translate-x-1/2 w-full h-full peer appearance-none rounded-md"
                            />
                            <span className="w-9 h-6 flex items-center flex-shrink-0 ml-4 p-1 bg-gray-400 rounded-full duration-300 ease-in-out peer-checked:bg-green-600 after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow-md after:duration-300 peer-checked:after:translate-x-3 group-hover:after:translate-x-[2px]"></span>
                        </label>
                    </div>

                    {/* Delete Button */}
                    <div className={`${wantsToDelete ? "bg-btnPrimary" : "hover:bg-black hover:bg-opacity-[0.05]"} relative p-2 ml-3 active:scale-90 cursor-pointer group rounded-lg`} onClick={() => setWantsToDelete(!wantsToDelete)}>
                        <Image src={"https://linktree.sirv.com/Images/icons/trash.svg"} alt="delete" className={`${wantsToDelete ? "filter invert" : "opacity-60 group-hover:opacity-100"}`} height={17} width={17} />
                        {!wantsToDelete && <div
                            className={`nopointer group-hover:block hidden absolute -translate-x-1/2 left-1/2 translate-y-3 bg-black text-white text-sm rounded-lg px-2 py-1 after:absolute after:h-0 after:w-0 after:border-l-[6px] after:border-r-[6px] after:border-l-transparent after:border-r-transparent after:border-b-[8px] after:border-b-black after:-top-2 after:-translate-x-1/2 after:left-1/2`}
                        >{translations.deleteTooltip}</div>}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <div className={`w-full flex flex-col ${wantsToDelete ? "h-[9.5rem]" : "h-0"} overflow-hidden transition-all duration-300`}>
                <div className='relative z-[1] w-full bg-purple-300 text-center sm:text-sm text-xs font-semibold py-1'>
                    {translations.deleteHeader}
                    <span className='absolute -translate-y-1/2 top-1/2 right-2 text-sm cursor-pointer' onClick={() => setWantsToDelete(false)}>
                        <FaX />
                    </span>
                </div>
                <div className='relative w-full text-center sm:text-sm text-xs font-semibold py-3'>
                    {translations.deleteConfirmationQuestion}
                </div>
                <div className='p-4 flex gap-5'>
                    <div className={`flex items-center gap-3 justify-center p-3 rounded-3xl cursor-pointer active:scale-95 active:opacity-60 active:translate-y-1 hover:scale-[1.005] w-[10rem] flex-1 text-sm border`} onClick={() => setWantsToDelete(false)}>
                        {translations.cancelButton}
                    </div>
                    <div className={`flex items-center gap-3 justify-center p-3 rounded-3xl cursor-pointer active:scale-95 active:opacity-60 active:translate-y-1 hover:scale-[1.005] w-[10rem] flex-1 text-sm bg-btnPrimary text-white`} onClick={handleDelete}>
                        {translations.deleteButton}
                    </div>
                </div>
            </div>
        </div>
    );
}
