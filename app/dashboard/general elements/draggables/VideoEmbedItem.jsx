//app/dashboard/general elements/draggables/VideoEmbedItem.jsx
"use client"

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useContext, useMemo, useState, useEffect } from 'react';
import { FaX } from 'react-icons/fa6';
import { ManageLinksContent } from '../../general components/ManageLinks';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { AppearanceService } from '@/lib/services/serviceAppearance/client/appearanceService.js';
import { useDebounce } from '@/LocalHooks/useDebounce';
import { useItemNavigation } from '@/LocalHooks/useItemNavigation';
import { APPEARANCE_FEATURES } from '@/lib/services/constants';
import { toast } from 'react-hot-toast';

// Video Embed Item Component - Type 4
export default function VideoEmbedItem({ item, itemRef, style, listeners, attributes, isOverlay = false }) {
    const { t, isInitialized } = useTranslation();
    const { setData } = useContext(ManageLinksContent);
    const { currentUser, permissions, subscriptionLevel, isLoading: isSessionLoading } = useDashboard();
    const [wantsToDelete, setWantsToDelete] = useState(false);
    const [checkboxChecked, setCheckboxChecked] = useState(item.isActive);
    const [linkedMedia, setLinkedMedia] = useState(null);
    const router = useRouter();
    const debounceCheckbox = useDebounce(checkboxChecked, 500);

    // Use navigation hook for highlighting
    const { isHighlighted, navigateToItem, highlightClass } = useItemNavigation({
        itemId: item.id,
        itemType: 'media-link'
    });

    // Define the feature key for this component
    const featureKey = APPEARANCE_FEATURES.CUSTOM_MEDIA_EMBED;

    // 🔧 ROBUST FIX: Keep loading if session is busy OR if permissions object is still empty
    const isStillLoading = isSessionLoading || Object.keys(permissions).length === 0;

    // Check if user has permission to use video embed (only after permissions are fully loaded)
    const canUseVideoEmbed = permissions[featureKey];

    // 🆕 Monitor permission changes in real-time
    useEffect(() => {
        console.log('🔄 [VideoEmbedItem] Permissions updated:', {
            canUseVideoEmbed,
            subscriptionLevel,
            timestamp: new Date().toISOString()
        });
    }, [canUseVideoEmbed, subscriptionLevel]);

    // Pre-compute translations for performance
    const translations = useMemo(() => {
        if (!isInitialized) return {};
        return {
            videoEmbedTitle: t('dashboard.links.item.video_embed_title_default') || 'Video Embed',
            videoEmbedDescription: t('dashboard.links.item.video_embed_description') || 'Drag to position where your video will appear',
            videoEmbedUpgradeMessage: t('dashboard.links.item.video_embed_upgrade_message') || 'Upgrade to Pro or Premium to use this feature',
            linkedBadge: t('dashboard.links.item.linked_badge') || 'Linked',
            customizeButton: t('dashboard.links.item.customize_video_embed') || 'Customize',
            deleteTooltip: t('dashboard.links.item.delete_tooltip') || 'Delete',
            deleteHeader: t('dashboard.links.item.delete_header') || 'Delete this item?',
            deleteConfirmationQuestion: t('dashboard.links.item.delete_confirmation_question') || 'Are you sure you want to delete this?',
            cancelButton: t('dashboard.links.item.cancel_button') || 'Cancel',
            deleteButton: t('dashboard.links.item.delete_button') || 'Delete',
        };
    }, [t, isInitialized]);

    // Load linked media item for validation
    useEffect(() => {
        if (!currentUser?.uid) return;

        // Initial load
        const loadLinkedMedia = async () => {
            try {
                const appearance = await AppearanceService.getAppearanceData();

                // Find the linked media item by ID
                if (item.mediaItemId) {
                    const mediaItems = appearance.mediaItems || [];
                    const linkedMediaItem = mediaItems.find(m => m.id === item.mediaItemId);
                    if (linkedMediaItem) {
                        setLinkedMedia(linkedMediaItem);
                    } else {
                        setLinkedMedia(null);
                    }
                }
            } catch (error) {
                console.error('Error loading media:', error);
            }
        };

        loadLinkedMedia();

        // Set up real-time listener for media changes
        const unsubscribe = AppearanceService.listenToAppearanceData(
            currentUser.uid,
            (appearance) => {
                // Update linked media object in real-time
                if (item.mediaItemId) {
                    const mediaItems = appearance.mediaItems || [];
                    const linkedMediaItem = mediaItems.find(m => m.id === item.mediaItemId);
                    if (linkedMediaItem) {
                        setLinkedMedia(linkedMediaItem);
                    } else {
                        setLinkedMedia(null);
                    }
                }
            }
        );

        // Cleanup listener on unmount
        return () => {
            unsubscribe();
        };
    }, [currentUser?.uid, item.mediaItemId]);

    // Update link's active status in the data array
    const editArrayActiveStatus = () => {
        setData(prevData =>
            prevData.map(i =>
                i.id === item.id ? { ...i, isActive: checkboxChecked } : i
            )
        );
    };

    // Trigger update when checkbox changes (debounced)
    useEffect(() => {
        if (checkboxChecked !== item.isActive) {
            editArrayActiveStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounceCheckbox]); // Only trigger on debounce changes (guard condition checks other values)

    const handleCheckboxChange = (event) => {
        const newValue = event.target.checked;

        // Validate: Prevent activating if no media content configured
        if (newValue === true) {
            // Check if linked media item has content
            if (!linkedMedia?.url || linkedMedia.url.trim() === '') {
                toast.error(
                    t('dashboard.links.item.media_no_content_error') ||
                    'Cannot activate. Please add media content first.'
                );
                return; // Prevent activation
            }
        }

        // Prevent toggle if user doesn't have permission
        if (!canUseVideoEmbed) {
            const requiredTier = subscriptionLevel === 'base' ? 'Pro' : 'Pro';
            toast.error(`Upgrade to ${requiredTier} to enable Video Embed`, {
                duration: 4000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 'bold',
                }
            });
            return;
        }

        setCheckboxChecked(newValue);
    };

    const handleDelete = async () => {
        // Remove from links
        setData(prevData => prevData.filter(i => i.id !== item.id));

        // Also remove the corresponding media item from appearance
        if (item.mediaItemId) {
            try {
                const appearance = await AppearanceService.getAppearanceData();
                const updatedMediaItems = (appearance.mediaItems || [])
                    .filter(m => m.id !== item.mediaItemId)
                    .map((m, index) => ({ ...m, order: index }));

                await AppearanceService.updateAppearanceData({
                    mediaItems: updatedMediaItems
                }, { origin: 'manage-links', userId: currentUser?.uid });
            } catch (error) {
                console.error('Error deleting media item from appearance:', error);
            }
        }
    };

    const handleCustomize = () => {
        // Prevent customization if user doesn't have permission
        if (!canUseVideoEmbed) {
            const requiredTier = subscriptionLevel === 'base' ? 'Pro' : 'Pro';
            toast.error(`Upgrade to ${requiredTier} to customize Video Embed`, {
                duration: 4000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 'bold',
                }
            });
            return;
        }

        // Navigate to specific media item in appearance page
        if (item.mediaItemId) {
            navigateToItem('/dashboard/appearance', item.mediaItemId, 'media-item');
        } else {
            // Fallback to section navigation if no specific item ID
            router.push('/dashboard/appearance#video-embed');
        }
    };

    // Grey out if user doesn't have permission, add highlight effect if highlighted
    const containerClasses = `rounded-3xl border flex flex-col ${
        !canUseVideoEmbed
            ? 'bg-gray-100 border-gray-300 opacity-60'
            : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
    } ${isOverlay ? 'shadow-lg' : ''} ${highlightClass}`;

    // 🔧 ROBUST FIX: Loading state while session/permissions are loading - PREVENTS RACE CONDITION
    // This now checks BOTH isSessionLoading AND if permissions object is empty
    if (isStillLoading) {
        return (
            <div
                ref={itemRef}
                style={style}
                className="rounded-3xl border flex flex-col h-[8rem] bg-gradient-to-r from-red-50 to-orange-50 border-red-300 animate-pulse"
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
            id={`media-link-${item.id}`}
            ref={itemRef}
            style={style}
            className={containerClasses}
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
                    {/* Video Embed Title with Icon */}
                    <div className='flex gap-3 items-center'>
                        <span className={`font-semibold flex items-center gap-2 ${
                            !canUseVideoEmbed ? 'text-gray-500' : 'text-red-700'
                        }`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            {(linkedMedia?.title && linkedMedia?.url?.trim()) ? linkedMedia.title : translations.videoEmbedTitle}
                        </span>
                        {/* Show upgrade badge if no permission */}
                        {!canUseVideoEmbed && (
                            <span className='text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full font-semibold'>
                                Pro Required
                            </span>
                        )}
                        {/* Show link indicator if video is linked */}
                        {linkedMedia?.title && linkedMedia?.url?.trim() && canUseVideoEmbed && (
                            <span className='text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold border border-green-300'>
                                {translations.linkedBadge}
                            </span>
                        )}
                    </div>

                    {/* Video Embed Description */}
                    <div className={`text-sm opacity-80 ${
                        !canUseVideoEmbed ? 'text-gray-500' : 'text-red-600'
                    }`}>
                        {!canUseVideoEmbed
                            ? translations.videoEmbedUpgradeMessage
                            : translations.videoEmbedDescription
                        }
                    </div>

                    {/* Customize Button */}
                    <button
                        onClick={handleCustomize}
                        disabled={!canUseVideoEmbed}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm w-fit ${
                            !canUseVideoEmbed
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>{translations.customizeButton}</span>
                    </button>
                </div>

                {/* Toggle and Delete Buttons */}
                <div className='grid sm:pr-2 gap-2 place-items-center'>
                    {/* Toggle Switch */}
                    <div className={`scale-[0.8] sm:scale-100 ${canUseVideoEmbed ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <label className="relative flex justify-between items-center group p-2 text-xl">
                            <input
                                type="checkbox"
                                onChange={handleCheckboxChange}
                                checked={checkboxChecked}
                                disabled={!canUseVideoEmbed}
                                className="absolute left-1/2 -translate-x-1/2 w-full h-full peer appearance-none rounded-md"
                            />
                            <span className={`w-9 h-6 flex items-center flex-shrink-0 ml-4 p-1 rounded-full duration-300 ease-in-out after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow-md after:duration-300 ${
                                !canUseVideoEmbed
                                    ? 'bg-gray-300 opacity-50'
                                    : 'bg-gray-400 peer-checked:bg-green-600 peer-checked:after:translate-x-3 group-hover:after:translate-x-[2px]'
                            }`}></span>
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
                <div className='relative z-[1] w-full bg-red-300 text-center sm:text-sm text-xs font-semibold py-1'>
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
