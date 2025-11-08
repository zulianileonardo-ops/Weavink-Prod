// app/[userId]/components/ContactPreviewModal.jsx
"use client"
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/translation/useTranslation';
import Image from 'next/image';

export default function ContactPreviewModal({
    isOpen,
    onClose,
    onDownload,
    userData,
    allowedFields = null,
    isDownloading = false
}) {
    const { t } = useTranslation();

    // Default allowed fields (all enabled by default if not specified)
    const defaultAllowedFields = {
        displayName: true,
        email: true,
        bio: true,
        location: true,
        website: true,
        photo: true,
        linkedin: true,
        twitter: true,
        instagram: true,
        facebook: true
    };

    // Use allowedFields from props or default to all enabled
    const effectiveAllowedFields = allowedFields || defaultAllowedFields;

    // Initialize selected fields based on what's allowed
    const [selectedFields, setSelectedFields] = useState({
        displayName: true,  // Always required
        email: true,        // Always required
        bio: effectiveAllowedFields.bio !== false,
        location: effectiveAllowedFields.location !== false,
        website: effectiveAllowedFields.website !== false,
        photo: effectiveAllowedFields.photo !== false,
        linkedin: false,
        twitter: false,
        instagram: false,
        facebook: false
    });

    // Extract available data from userData
    const contactData = useMemo(() => {
        const profile = userData?.profile || {};
        const socials = userData?.socials || [];

        return {
            displayName: profile.displayName || userData?.displayName || userData?.username || 'Unknown',
            email: userData?.email || '',
            bio: profile.bio || '',
            location: profile.location || '',
            website: userData?.username ? `https://weavink.com/${userData.username}` : '',
            photo: profile.avatarUrl || userData?.avatarUrl || '',
            linkedin: socials.find(s => s.platform?.toLowerCase() === 'linkedin')?.url || '',
            twitter: socials.find(s => s.platform?.toLowerCase() === 'twitter')?.url || '',
            instagram: socials.find(s => s.platform?.toLowerCase() === 'instagram')?.url || '',
            facebook: socials.find(s => s.platform?.toLowerCase() === 'facebook')?.url || ''
        };
    }, [userData]);

    // Auto-enable social fields that have data AND are allowed
    useEffect(() => {
        if (isOpen) {
            setSelectedFields(prev => ({
                ...prev,
                linkedin: !!contactData.linkedin && effectiveAllowedFields.linkedin !== false,
                twitter: !!contactData.twitter && effectiveAllowedFields.twitter !== false,
                instagram: !!contactData.instagram && effectiveAllowedFields.instagram !== false,
                facebook: !!contactData.facebook && effectiveAllowedFields.facebook !== false
            }));
        }
    }, [isOpen, contactData, effectiveAllowedFields]);

    // Count selected fields
    const selectedCount = useMemo(() => {
        return Object.values(selectedFields).filter(Boolean).length;
    }, [selectedFields]);

    // Handle field toggle
    const toggleField = (field) => {
        // Prevent disabling required fields
        if (field === 'displayName' || field === 'email') return;

        // Prevent enabling fields that are disabled by owner
        if (!selectedFields[field] && effectiveAllowedFields[field] === false) {
            return;
        }

        setSelectedFields(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Select all optional fields that are allowed
    const selectAll = () => {
        setSelectedFields({
            displayName: true,
            email: true,
            bio: effectiveAllowedFields.bio !== false,
            location: effectiveAllowedFields.location !== false,
            website: effectiveAllowedFields.website !== false,
            photo: effectiveAllowedFields.photo !== false,
            linkedin: !!contactData.linkedin && effectiveAllowedFields.linkedin !== false,
            twitter: !!contactData.twitter && effectiveAllowedFields.twitter !== false,
            instagram: !!contactData.instagram && effectiveAllowedFields.instagram !== false,
            facebook: !!contactData.facebook && effectiveAllowedFields.facebook !== false
        });
    };

    // Deselect all optional fields
    const selectNone = () => {
        setSelectedFields({
            displayName: true,  // Always keep required
            email: true,        // Always keep required
            bio: false,
            location: false,
            website: false,
            photo: false,
            linkedin: false,
            twitter: false,
            instagram: false,
            facebook: false
        });
    };

    // Handle download
    const handleDownload = () => {
        onDownload(selectedFields);
    };

    if (!isOpen) return null;

    // Field configuration with icons and labels
    const fieldConfig = [
        {
            key: 'displayName',
            icon: '👤',
            label: t('contact_preview.fields.display_name') || 'Display Name',
            value: contactData.displayName,
            required: true,
            category: 'basic'
        },
        {
            key: 'email',
            icon: '📧',
            label: t('contact_preview.fields.email') || 'Email',
            value: contactData.email,
            required: true,
            category: 'basic'
        },
        {
            key: 'photo',
            icon: '📷',
            label: t('contact_preview.fields.photo') || 'Profile Photo',
            value: contactData.photo ? 'Included' : '',
            required: false,
            category: 'basic'
        },
        {
            key: 'bio',
            icon: '📝',
            label: t('contact_preview.fields.bio') || 'Bio / Notes',
            value: contactData.bio ? (contactData.bio.substring(0, 50) + (contactData.bio.length > 50 ? '...' : '')) : '',
            required: false,
            category: 'other'
        },
        {
            key: 'location',
            icon: '📍',
            label: t('contact_preview.fields.location') || 'Location',
            value: contactData.location,
            required: false,
            category: 'other'
        },
        {
            key: 'website',
            icon: '🔗',
            label: t('contact_preview.fields.website') || 'Profile URL',
            value: contactData.website,
            required: false,
            category: 'other'
        },
        {
            key: 'linkedin',
            icon: '💼',
            label: t('contact_preview.fields.linkedin') || 'LinkedIn',
            value: contactData.linkedin,
            required: false,
            category: 'social'
        },
        {
            key: 'twitter',
            icon: '🐦',
            label: t('contact_preview.fields.twitter') || 'Twitter',
            value: contactData.twitter,
            required: false,
            category: 'social'
        },
        {
            key: 'instagram',
            icon: '📸',
            label: t('contact_preview.fields.instagram') || 'Instagram',
            value: contactData.instagram,
            required: false,
            category: 'social'
        },
        {
            key: 'facebook',
            icon: '👥',
            label: t('contact_preview.fields.facebook') || 'Facebook',
            value: contactData.facebook,
            required: false,
            category: 'social'
        }
    ];

    // Filter out fields with no value (except required ones) AND fields not allowed by owner
    const availableFields = fieldConfig.filter(field =>
        (field.required || field.value) && effectiveAllowedFields[field.key] !== false
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[10001] backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container - Responsive */}
            <div className="fixed inset-0 z-[10002] flex items-center justify-center p-0 sm:p-4">
                <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-2xl sm:max-h-[85vh] flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                        <div className="flex-1">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                                {t('contact_preview.title') || 'Select Contact Information'}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {t('contact_preview.subtitle') || 'Choose which information to include in the vCard'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isDownloading}
                            className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {/* Preview Section */}
                        <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-4">
                                {contactData.photo && (
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 ring-4 ring-white shadow-lg">
                                        <Image
                                            src={contactData.photo}
                                            alt={contactData.displayName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                                        {contactData.displayName}
                                    </h3>
                                    {contactData.email && (
                                        <p className="text-sm text-gray-600 truncate">{contactData.email}</p>
                                    )}
                                    <p className="text-xs text-blue-600 mt-1">
                                        {selectedCount} {selectedCount === 1 ? 'field' : 'fields'} selected
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={selectAll}
                                disabled={isDownloading}
                                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {t('contact_preview.select_all') || 'Select All'}
                            </button>
                            <button
                                onClick={selectNone}
                                disabled={isDownloading}
                                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {t('contact_preview.select_none') || 'Select None'}
                            </button>
                        </div>

                        {/* Field Selection List */}
                        <div className="space-y-1">
                            {availableFields.map((field) => (
                                <label
                                    key={field.key}
                                    className={`flex items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all min-h-[56px] sm:min-h-0 ${
                                        selectedFields[field.key]
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                    } ${
                                        field.required || isDownloading
                                            ? 'opacity-75 cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFields[field.key]}
                                        onChange={() => toggleField(field.key)}
                                        disabled={field.required || isDownloading}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span className="text-2xl flex-shrink-0">{field.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                                                {field.label}
                                            </span>
                                            {field.required && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                                    {t('contact_preview.required') || 'Required'}
                                                </span>
                                            )}
                                        </div>
                                        {field.value && (
                                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                                                {field.value}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer - Sticky on mobile */}
                    <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end flex-shrink-0 bg-white">
                        <button
                            onClick={onClose}
                            disabled={isDownloading}
                            className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 order-2 sm:order-1"
                        >
                            {t('contact_preview.cancel') || 'Cancel'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || selectedCount === 0}
                            className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>{t('download_contact.downloading') || 'Downloading...'}</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>
                                        {(t('contact_preview.download_button') || 'Download vCard ({{count}} fields)').replace('{{count}}', selectedCount)}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
