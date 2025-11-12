// app/dashboard/(dashboard pages)/appearance/elements/CVItemCard.jsx
"use client"

import React, { useState, useRef, useMemo, useEffect } from "react";
import { FaTrash, FaDownload, FaFileAlt, FaUpload, FaExternalLinkAlt } from "react-icons/fa";
import { FaPencil } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import { AppearanceService } from "@/lib/services/serviceAppearance/client/appearanceService";
import { LinksService } from "@/lib/services/serviceLinks/client/LinksService";
import { useTranslation } from '@/lib/translation/useTranslation';
import { useItemNavigation } from '@/LocalHooks/useItemNavigation';
import { useDebounce } from '@/LocalHooks/useDebounce';

export default function CVItemCard({ item, onUpdate, onDelete, disabled }) {
    const { t, isInitialized } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(item.displayTitle || '');
    const [tempFile, setTempFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [linkedLinkItem, setLinkedLinkItem] = useState(null);
    const [checkboxChecked, setCheckboxChecked] = useState(false);
    const debounceCheckbox = useDebounce(checkboxChecked, 500);
    const fileInputRef = useRef(null);

    // Use navigation hook for highlighting
    const { isHighlighted, navigateToItem, highlightClass } = useItemNavigation({
        itemId: item.id,
        itemType: 'cv-item'
    });

    // Pre-compute translations
    const translations = useMemo(() => {
        if (!isInitialized) return {};
        return {
            invalidFileType: t('dashboard.appearance.cv_item.error_invalid_file_type') || 'Invalid file type. Please upload a PDF or Word document.',
            fileTooLarge: t('dashboard.appearance.cv_item.error_file_too_large') || 'File is too large. Maximum size is 10MB.',
            uploadSuccess: t('dashboard.appearance.cv_item.upload_success') || 'Document uploaded successfully',
            uploadFailed: t('dashboard.appearance.cv_item.upload_failed') || 'Failed to upload document',
            deleteConfirm: t('dashboard.appearance.cv_item.delete_confirm') || 'Are you sure you want to delete this CV item?',
            editTitle: t('dashboard.appearance.cv_item.edit_title') || 'Edit title',
            download: t('dashboard.appearance.cv_item.download') || 'Download',
            replaceDocument: t('dashboard.appearance.cv_item.replace_document') || 'Replace document',
            delete: t('dashboard.appearance.cv_item.delete') || 'Delete',
            noDocument: t('dashboard.appearance.cv_item.no_document') || 'No document uploaded',
            uploading: t('dashboard.appearance.cv_item.uploading') || 'Uploading...',
            uploadDocument: t('dashboard.appearance.cv_item.upload_document') || 'Upload Document',
            document: t('dashboard.appearance.cv_item.document') || 'Document',
            goToLink: t('dashboard.appearance.cv_item.go_to_link') || 'Go to Link',
            linkActivated: t('dashboard.appearance.cv_item.link_activated') || 'CV link automatically activated',
            chooseNewFile: t('dashboard.appearance.cv_item.choose_new_file') || 'Choose New File',
            saveChanges: t('dashboard.appearance.cv_item.save_changes') || 'Save Changes',
            cancel: t('dashboard.appearance.cv_item.cancel') || 'Cancel',
            currentFile: t('dashboard.appearance.cv_item.current_file') || 'Current file',
            newFileSelected: t('dashboard.appearance.cv_item.new_file_selected') || 'New file selected',
            displayTitle: t('dashboard.appearance.cv_item.display_title') || 'Display Title',
        };
    }, [t, isInitialized]);

    // Find linked CV link in dashboard
    useEffect(() => {
        const findLinkedItem = async () => {
            try {
                const response = await LinksService.getLinks();
                const linked = response.links?.find(link =>
                    link.type === 3 && link.cvItemId === item.id
                );
                setLinkedLinkItem(linked);
            } catch (error) {
                console.error('Error finding linked CV link:', error);
            }
        };

        findLinkedItem();

        // Subscribe to changes
        const unsubscribe = LinksService.subscribe((updatedLinks) => {
            const linked = updatedLinks.find(link =>
                link.type === 3 && link.cvItemId === item.id
            );
            setLinkedLinkItem(linked);
        });

        return () => unsubscribe();
    }, [item.id]);

    // Sync checkbox state when linkedLinkItem changes
    useEffect(() => {
        if (linkedLinkItem) {
            setCheckboxChecked(linkedLinkItem.isActive);
        }
    }, [linkedLinkItem?.isActive]);

    // Update linked link status when toggle changes
    useEffect(() => {
        if (linkedLinkItem && checkboxChecked !== linkedLinkItem.isActive) {
            const updateLinkStatus = async () => {
                try {
                    await LinksService.updateLink(linkedLinkItem.id, { isActive: checkboxChecked });
                } catch (error) {
                    console.error('Error updating CV link status:', error);
                    toast.error('Failed to update link status');
                }
            };
            updateLinkStatus();
        }
    }, [debounceCheckbox]);

    // Handle file upload
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // File validation
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            toast.error(translations.invalidFileType);
            return;
        }
        if (file.size > maxSize) {
            toast.error(translations.fileTooLarge);
            return;
        }

        setIsUploading(true);

        try {
            const result = await AppearanceService.uploadCVDocument(file);
            const defaultTitle = result.fileInfo.originalName.replace(/\.[^/.]+$/, "");

            // Update the item with new document
            onUpdate({
                ...item,
                url: result.downloadURL,
                fileName: result.fileInfo.originalName,
                displayTitle: defaultTitle,
                uploadDate: new Date().toISOString(),
                fileSize: result.fileInfo.size,
                fileType: result.fileInfo.type
            });

            toast.success(translations.uploadSuccess);

            // Auto-activate the linked CV link if it exists and is currently inactive
            if (linkedLinkItem && !linkedLinkItem.isActive) {
                try {
                    await LinksService.updateLink(linkedLinkItem.id, { isActive: true });
                    toast.success(
                        translations.linkActivated ||
                        'CV link automatically activated'
                    );
                } catch (error) {
                    console.error('Error auto-activating CV link:', error);
                    // Non-critical error - don't show to user
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.message || translations.uploadFailed);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle file selection (store in temp, don't upload yet)
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // File validation
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            toast.error(translations.invalidFileType);
            return;
        }
        if (file.size > maxSize) {
            toast.error(translations.fileTooLarge);
            return;
        }

        setTempFile(file);
        // Clear the file input so the same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Save all changes (title and/or file)
    const handleSaveChanges = async () => {
        setIsUploading(true);

        try {
            // If there's a new file, upload it first
            if (tempFile) {
                const result = await AppearanceService.uploadCVDocument(tempFile);
                const defaultTitle = result.fileInfo.originalName.replace(/\.[^/.]+$/, "");

                // Update with new file info and use filename as title
                onUpdate({
                    ...item,
                    url: result.downloadURL,
                    fileName: result.fileInfo.originalName,
                    displayTitle: defaultTitle,
                    uploadDate: new Date().toISOString(),
                    fileSize: result.fileInfo.size,
                    fileType: result.fileInfo.type
                });

                toast.success(translations.uploadSuccess);

                // Auto-activate the linked CV link if it exists and is currently inactive
                if (linkedLinkItem && !linkedLinkItem.isActive) {
                    try {
                        await LinksService.updateLink(linkedLinkItem.id, { isActive: true });
                        toast.success(translations.linkActivated);
                    } catch (error) {
                        console.error('Error auto-activating CV link:', error);
                    }
                }
            } else if (tempTitle.trim() !== '' && tempTitle.trim() !== item.displayTitle) {
                // Only title changed
                onUpdate({ ...item, displayTitle: tempTitle.trim() });
            }

            // Exit edit mode
            setIsEditing(false);
            setTempFile(null);
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.message || translations.uploadFailed);
        } finally {
            setIsUploading(false);
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setTempTitle(item.displayTitle || '');
        setTempFile(null);
        setIsEditing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Delete item
    const handleDelete = async () => {
        if (confirm(translations.deleteConfirm)) {
            // First delete the parent CV item
            onDelete();

            // Also remove the linked CV link if it exists
            if (linkedLinkItem) {
                try {
                    const links = await LinksService.getLinks();
                    const updatedLinks = links.links.filter(link => link.id !== linkedLinkItem.id);
                    await LinksService.saveLinks(updatedLinks);
                } catch (error) {
                    console.error('Error deleting linked CV link:', error);
                }
            }
        }
    };

    // Navigate to linked CV link in dashboard
    const handleGoToLink = () => {
        if (linkedLinkItem) {
            navigateToItem('/dashboard', linkedLinkItem.id, 'cv-link');
        }
    };

    // Handle toggle active/inactive
    const handleToggleActive = (event) => {
        const newValue = event.target.checked;

        // Validate: Prevent activating if no document uploaded
        if (newValue === true) {
            if (!item.url || item.url.trim() === '') {
                toast.error(
                    t('dashboard.appearance.cv_item.no_document_error') ||
                    'Cannot activate. Please upload a document first.'
                );
                return;
            }
        }

        setCheckboxChecked(newValue);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileExtension = (fileName) => {
        return fileName?.split('.').pop()?.toUpperCase() || '';
    };

    return (
        <div
            id={`cv-item-${item.id}`}
            className={`relative border-2 border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 ${highlightClass}`}
        >
            {/* Toggle at top-right - only show if there's a linked link */}
            {linkedLinkItem && (
                <div className="absolute top-2 right-2 cursor-pointer scale-[0.8] sm:scale-100 z-10">
                    <label className="relative flex justify-between items-center group p-2 text-xl">
                        <input
                            type="checkbox"
                            onChange={handleToggleActive}
                            checked={checkboxChecked}
                            className="absolute left-1/2 -translate-x-1/2 w-full h-full peer appearance-none rounded-md cursor-pointer"
                        />
                        <span className="w-9 h-6 flex items-center flex-shrink-0 ml-4 p-1 bg-gray-400 rounded-full duration-300 ease-in-out peer-checked:bg-green-600 after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow-md after:duration-300 peer-checked:after:translate-x-3 group-hover:after:translate-x-[2px]"></span>
                    </label>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Go to Link button - shown if there's a linked item */}
            {linkedLinkItem && (
                <div className="mb-3">
                    <button
                        onClick={handleGoToLink}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                        <FaExternalLinkAlt className="text-xs" />
                        {translations.goToLink}
                    </button>
                </div>
            )}

            {item.url ? (
                isEditing ? (
                    // Enhanced Edit Mode
                    <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                        <div className="space-y-4">
                            {/* Title Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {translations.displayTitle}
                                </label>
                                <input
                                    type="text"
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={translations.displayTitle}
                                />
                            </div>

                            {/* File Information & Replacement */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Document File
                                </label>

                                {/* Current File Info */}
                                <div className="bg-white rounded-md p-3 mb-2 border border-gray-200">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FaFileAlt className="text-indigo-500" />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">
                                                {translations.currentFile}: {item.fileName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatFileSize(item.fileSize)} - {getFileExtension(item.fileName)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* New File Selected Info */}
                                {tempFile && (
                                    <div className="bg-green-50 rounded-md p-3 mb-2 border border-green-200">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FaUpload className="text-green-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-green-800">
                                                    {translations.newFileSelected}: {tempFile.name}
                                                </p>
                                                <p className="text-xs text-green-600">
                                                    {formatFileSize(tempFile.size)} - {tempFile.name.split('.').pop()?.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* File Selection Button */}
                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.pdf,.doc,.docx';
                                        input.onchange = handleFileSelect;
                                        input.click();
                                    }}
                                    className="w-full px-4 py-2 bg-white border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                                >
                                    <FaUpload />
                                    {translations.chooseNewFile}
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={isUploading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? translations.uploading : translations.saveChanges}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isUploading}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {translations.cancel}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Normal Display Mode
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                            <FaFileAlt className="text-2xl text-indigo-500" />
                            <div className="flex-1">
                                <h4 className="text-md font-medium text-gray-800">
                                    {item.displayTitle || item.fileName?.replace(/\.[^/.]+$/, "") || translations.document}
                                </h4>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(item.fileSize)} - {getFileExtension(item.fileName)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setTempTitle(item.displayTitle || '');
                                    setIsEditing(true);
                                }}
                                disabled={disabled}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                                title={translations.editTitle}
                            >
                                <FaPencil />
                            </button>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                                title={translations.download}
                            >
                                <FaDownload />
                            </a>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={disabled || isUploading}
                                className="p-2 rounded-full hover:bg-blue-100 text-blue-600"
                                title={translations.replaceDocument}
                            >
                                <FaUpload />
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={disabled}
                                className="p-2 rounded-full hover:bg-red-100 text-red-600"
                                title={translations.delete}
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex-1 text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">{translations.noDocument}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || isUploading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                            {isUploading ? translations.uploading : translations.uploadDocument}
                        </button>
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={disabled}
                        className="p-2 rounded-full hover:bg-red-100 text-red-600"
                        title={translations.delete}
                    >
                        <FaTrash />
                    </button>
                </div>
            )}
        </div>
    );
}
