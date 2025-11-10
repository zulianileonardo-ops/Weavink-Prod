/**
 * THIS FILE HAS BEEN REFRACTORED 
 */
// app/dashboard/(dashboard pages)/appearance/elements/TextDetails.jsx
"use client"

import React, { useEffect, useState, useMemo, useContext, useRef } from "react";
import { useTranslation } from "@/lib/translation/useTranslation";
import { useDebounce } from "@/LocalHooks/useDebounce";
import { AppearanceContext } from "../AppearanceContext";

export default function TextDetails() {
    const { t, isInitialized } = useTranslation();
    const { appearance, updateAppearance, isSaving } = useContext(AppearanceContext);

    // ✅ STEP 1: Initialize state directly from the context.
    // If the context's `appearance` is null, start with an empty string.
    // This prevents the initial state from being out of sync.
    const [displayName, setDisplayName] = useState(appearance?.displayName || "");
    const [bio, setBio] = useState(appearance?.bio || "");

    const debouncedDisplayName = useDebounce(displayName, 1000);
    const debouncedBio = useDebounce(bio, 1000);

    // ✅ STEP 2: Add a ref to track if the initial sync has happened.
    const hasSyncedWithContext = useRef(false);

    const translations = useMemo(() => {
        if (!isInitialized) return {};
        return {
            profileTitle: t('dashboard.appearance.text_details.profile_title') || 'Profile Title',
            bio: t('dashboard.appearance.text_details.bio') || 'Bio',
        };
    }, [t, isInitialized]);

    // This effect is now ONLY for syncing if the context changes from an EXTERNAL source
    // (like another component or a real-time update).
    useEffect(() => {
        if (appearance) {
            setDisplayName(appearance.displayName || '');
            setBio(appearance.bio || '');
            // ✅ Mark that we have successfully loaded data from the context.
            hasSyncedWithContext.current = true;
        }
    }, [appearance]);

    // ✅ STEP 3: Guard the debounced effects.
    // They should NOT run until the component has synced with the context at least once.
    useEffect(() => {
        // Do not run this effect until the initial data is loaded.
        if (!hasSyncedWithContext.current) return;
        
        if (debouncedDisplayName !== appearance.displayName) {
            updateAppearance('displayName', debouncedDisplayName);
        }
    }, [debouncedDisplayName, appearance, updateAppearance]);

    useEffect(() => {
        // Do not run this effect until the initial data is loaded.
        if (!hasSyncedWithContext.current) return;

        if (debouncedBio !== appearance.bio) {
            updateAppearance('bio', debouncedBio);
        }
    }, [debouncedBio, appearance, updateAppearance]);

    if (!appearance) {
        return (
            <div className="flex px-6 pb-6 pt-2 flex-col gap-2 animate-pulse">
                <div className="h-[58px] rounded-lg bg-gray-200"></div>
                <div className="h-[74px] rounded-lg bg-gray-200"></div>
            </div>
        );
    }
    
    return (
        <div className="flex px-6 pb-6 pt-2 flex-col gap-2">
            {/* Display Name Input */}
            <div className={`flex-1 relative pt-2 flex items-center rounded-lg bg-black bg-opacity-[0.05] focus-within:border-black focus-within:border-2 border border-transparent transition-opacity ${
                isSaving ? 'opacity-75' : ''
            }`}>
                <input
                    type="text"
                    className="flex-1 px-4 placeholder-shown:px-3 py-4 sm:text-base text-sm font-semibold outline-none opacity-100 bg-transparent peer appearance-none"
                    placeholder=" "
                    onChange={(e) => setDisplayName(e.target.value)}
                    value={displayName}
                    maxLength={100}
                    disabled={isSaving}
                />
                <label className="absolute px-3 pointer-events-none top-[.25rem] left-1 text-sm text-main-green peer-placeholder-shown:top-2/4 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-slate-500 peer-placeholder-shown:left-0 opacity-70 transition duration-[250] ease-linear">
                    {translations.profileTitle}
                </label>
                
                {/* Loading indicator for display name (now uses global isSaving) */}
                {isSaving && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                )}
                
                {/* Character counter */}
                <div className="absolute right-3 bottom-1 text-xs text-gray-500">
                    {displayName.length}/100
                </div>
            </div>

            {/* Bio Textarea */}
            <div className={`flex-1 relative pt-2 flex items-center rounded-lg bg-black bg-opacity-[0.05] focus-within:border-black focus-within:border-[2px] border border-transparent transition-opacity ${
                isSaving ? 'opacity-75' : ''
            }`}>
                <textarea
                    className="flex-1 px-4 placeholder-shown:px-3 py-4 sm:text-md text-sm outline-none opacity-100 bg-transparent peer appearance-none resize-none"
                    cols="30"
                    rows="2"
                    onChange={(e) => setBio(e.target.value)}
                    value={bio}
                    placeholder=" "
                    maxLength={500}
                    disabled={isSaving}
                ></textarea>
                <label className="absolute px-3 pointer-events-none top-[.25rem] left-1 text-sm text-main-green peer-placeholder-shown:top-2/4 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-slate-500 peer-placeholder-shown:left-0 opacity-70 transition duration-[250] ease-linear">
                    {translations.bio}
                </label>
                
                {/* Loading indicator for bio (now uses global isSaving) */}
                {isSaving && (
                    <div className="absolute right-10 top-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                )}
                
                {/* Character counter */}
                <div className="absolute right-3 bottom-1 text-xs text-gray-500">
                    {bio.length}/500
                </div>
            </div>

            {/* Bio Length Warning - appears when bio exceeds 100 characters */}
            {bio.length > 100 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                    <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <p className="text-sm text-blue-800">
                        Your bio exceeds 100 characters. On your public profile, only the first 100 characters will be shown initially, with an expand option to view the full bio.
                    </p>
                </div>
            )}
        </div>
    );
}