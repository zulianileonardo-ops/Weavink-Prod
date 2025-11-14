"use client"
import { useState, useEffect, useMemo } from 'react';
import { useAccount } from '../AccountContext';
import { Download, Check, X, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function ContactDownloadTab() {
    const { privacySettings, isLoading, updateContactDownloadSettings } = useAccount();
    const [saving, setSaving] = useState(false);

    // Master toggle state
    const [isEnabled, setIsEnabled] = useState(true);

    // Field selection state
    const [selectedFields, setSelectedFields] = useState({
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
    });

    // Initialize from privacy settings
    useEffect(() => {
        if (privacySettings) {
            setIsEnabled(privacySettings.downloadContactEnabled !== false);

            if (privacySettings.downloadContactFields) {
                setSelectedFields(privacySettings.downloadContactFields);
            }
        }
    }, [privacySettings]);

    // Count selected fields
    const selectedCount = useMemo(() => {
        return Object.values(selectedFields).filter(Boolean).length;
    }, [selectedFields]);

    // Handle master toggle
    const handleToggle = async () => {
        const newValue = !isEnabled;
        setIsEnabled(newValue);
        await saveSettings(newValue, selectedFields);
    };

    // Handle field toggle
    const handleFieldToggle = async (field) => {
        // Prevent toggling required fields
        if (field === 'displayName' || field === 'email') return;

        const newFields = {
            ...selectedFields,
            [field]: !selectedFields[field]
        };
        setSelectedFields(newFields);
        await saveSettings(isEnabled, newFields);
    };

    // Select all fields
    const selectAll = async () => {
        const allSelected = {
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
        setSelectedFields(allSelected);
        await saveSettings(isEnabled, allSelected);
    };

    // Deselect all optional fields
    const deselectAll = async () => {
        const onlyRequired = {
            displayName: true,
            email: true,
            bio: false,
            location: false,
            website: false,
            photo: false,
            linkedin: false,
            twitter: false,
            instagram: false,
            facebook: false
        };
        setSelectedFields(onlyRequired);
        await saveSettings(isEnabled, onlyRequired);
    };

    // Save settings to backend
    const saveSettings = async (enabled, fields) => {
        setSaving(true);
        try {
            await updateContactDownloadSettings(enabled, fields);
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving contact download settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Field configuration
    const fields = [
        { key: 'displayName', icon: '👤', label: 'Display Name', required: true, category: 'basic' },
        { key: 'email', icon: '📧', label: 'Email', required: true, category: 'basic' },
        { key: 'photo', icon: '📷', label: 'Profile Photo', required: false, category: 'basic' },
        { key: 'bio', icon: '📝', label: 'Bio / Notes', required: false, category: 'additional' },
        { key: 'location', icon: '📍', label: 'Location', required: false, category: 'additional' },
        { key: 'website', icon: '🔗', label: 'Profile URL', required: false, category: 'additional' },
        { key: 'linkedin', icon: '💼', label: 'LinkedIn', required: false, category: 'social' },
        { key: 'twitter', icon: '🐦', label: 'Twitter', required: false, category: 'social' },
        { key: 'instagram', icon: '📸', label: 'Instagram', required: false, category: 'social' },
        { key: 'facebook', icon: '👥', label: 'Facebook', required: false, category: 'social' }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Master Toggle Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Download className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Enable Contact Downloads
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            Allow visitors to download your contact information as a vCard file.
                            When disabled, the download button will not appear on your public profile.
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isEnabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {isEnabled ? (
                                    <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Enabled
                                    </>
                                ) : (
                                    <>
                                        <X className="w-3 h-3 mr-1" />
                                        Disabled
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={handleToggle}
                        disabled={saving}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                            ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            ${isEnabled ? 'bg-blue-600' : 'bg-gray-300'}
                        `}
                    >
                        <span className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `} />
                    </button>
                </div>
            </div>

            {/* Field Selection Card */}
            <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm transition-opacity ${
                !isEnabled ? 'opacity-50 pointer-events-none' : ''
            }`}>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Available Fields
                    </h3>
                    <p className="text-sm text-gray-600">
                        Choose which fields visitors can include when downloading your contact. Required fields cannot be disabled.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={selectAll}
                        disabled={saving || !isEnabled}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Select All
                    </button>
                    <button
                        onClick={deselectAll}
                        disabled={saving || !isEnabled}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Deselect All
                    </button>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">{selectedCount}</span>
                        <span>fields selected</span>
                    </div>
                </div>

                {/* Field List */}
                <div className="space-y-2">
                    {/* Basic Fields */}
                    <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Basic Information
                        </h4>
                        {fields.filter(f => f.category === 'basic').map((field) => (
                            <label
                                key={field.key}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    selectedFields[field.key]
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                } ${
                                    field.required || !isEnabled
                                        ? 'opacity-75 cursor-not-allowed'
                                        : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFields[field.key]}
                                    onChange={() => handleFieldToggle(field.key)}
                                    disabled={field.required || saving || !isEnabled}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-2xl">{field.icon}</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm">
                                            {field.label}
                                        </span>
                                        {field.required && (
                                            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Additional Info */}
                    <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Additional Information
                        </h4>
                        {fields.filter(f => f.category === 'additional').map((field) => (
                            <label
                                key={field.key}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    selectedFields[field.key]
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                } ${
                                    field.required || !isEnabled
                                        ? 'opacity-75 cursor-not-allowed'
                                        : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFields[field.key]}
                                    onChange={() => handleFieldToggle(field.key)}
                                    disabled={field.required || saving || !isEnabled}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-2xl">{field.icon}</span>
                                <div className="flex-1">
                                    <span className="font-medium text-gray-900 text-sm">
                                        {field.label}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Social Media */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Social Media
                        </h4>
                        {fields.filter(f => f.category === 'social').map((field) => (
                            <label
                                key={field.key}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    selectedFields[field.key]
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                } ${
                                    field.required || !isEnabled
                                        ? 'opacity-75 cursor-not-allowed'
                                        : 'cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFields[field.key]}
                                    onChange={() => handleFieldToggle(field.key)}
                                    disabled={field.required || saving || !isEnabled}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-2xl">{field.icon}</span>
                                <div className="flex-1">
                                    <span className="font-medium text-gray-900 text-sm">
                                        {field.label}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-blue-900 mb-1">
                            How It Works
                        </h3>
                        <p className="text-sm text-blue-800">
                            When visitors click the Download Contact button on your profile, they&apos;ll see a modal
                            where they can choose which of your enabled fields to include in the vCard file.
                            Fields you disable here won&apos;t be available for visitors to download.
                        </p>
                    </div>
                </div>
            </div>

            {/* Saving Indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-700">Saving...</span>
                </div>
            )}
        </div>
    );
}
