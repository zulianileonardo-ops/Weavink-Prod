// app/components/NavComponents/DesktopNavBar.jsx
"use client";
import Image from "next/image";
import Link from "next/link";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import { useNavbarHighlight } from "@/LocalHooks/useNavbarHighlight";
import { useTutorial } from '@/contexts/TutorialContext';
import AccountDeletionWarning from '@/app/dashboard/(dashboard pages)/account/components/AccountDeletionWarning';

export default function DesktopNavBar({
    activePage,
    translations,
    userIsAdmin,
    isLoading,
    profilePicture,
    handleShowShareCard,
    handleShowProfileCard,
    profileCardRef,
    shareCardRef,
    ProfileCard,
    ShareCard,
    pendingDeletion,
    locale
}) {
    // Get tutorial state for conditional z-index
    const { run, isFirstStep, stepIndex } = useTutorial();

    // Initialize highlight hooks for each navbar item
    const { highlightClass: linksHighlight } = useNavbarHighlight('links');
    const { highlightClass: appearanceHighlight } = useNavbarHighlight('appearance');
    const { highlightClass: analyticsHighlight } = useNavbarHighlight('analytics');
    const { highlightClass: contactsHighlight } = useNavbarHighlight('contacts');
    const { highlightClass: eventsHighlight } = useNavbarHighlight('events');
    const { highlightClass: settingsHighlight } = useNavbarHighlight('settings');
    const { highlightClass: shareHighlight } = useNavbarHighlight('share');
    const { highlightClass: accountHighlight } = useNavbarHighlight('account');

    return (
        <div
            data-tutorial="navbar"
            className={`w-full justify-between flex items-center rounded-[3rem] py-3 sticky top-0 ${run && (isFirstStep || stepIndex === 9) ? 'z-[9998]' : 'z-[10000]'} px-3 mx-auto bg-white border backdrop-blur-lg hidden md:flex`}
        >
            <div className="flex items-center gap-8">
                <Link href={'/dashboard'} className="ml-3">
                    <Image
                        src={"https://firebasestorage.googleapis.com/v0/b/tapit-dev-e0eed.firebasestorage.app/o/Images-Weavink%2Flogo-icon.png?alt=media&token=bcfebd8b-cbea-4a56-aed1-a0ad057b2dee"}
                        alt="logo"
                        height={35}
                        width={35}
                        priority
                    />
                </Link>
                <div className="flex items-center gap-6">
                    {/* Links */}
                    <Link
                        href={'/dashboard'}
                        data-tutorial="navbar-links"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 0 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${linksHighlight}`}
                    >
                        <Image
                            src={"https://linktree.sirv.com/Images/icons/links.svg"}
                            alt="links"
                            height={16}
                            width={16}
                        />
                        {translations.links}
                    </Link>

                    {/* Appearance */}
                    <Link
                        href={'/dashboard/appearance'}
                        data-tutorial="navbar-appearance"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 1 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${appearanceHighlight}`}
                    >
                        <Image
                            src={"https://linktree.sirv.com/Images/icons/appearance.svg"}
                            alt="appearance"
                            height={16}
                            width={16}
                        />
                        {translations.appearance}
                    </Link>

                    {/* Analytics */}
                    <Link
                        href={'/dashboard/analytics'}
                        data-tutorial="navbar-analytics"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 2 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${analyticsHighlight}`}
                    >
                        <Image
                            src={"https://linktree.sirv.com/Images/icons/analytics.svg"}
                            alt="analytics"
                            height={16}
                            width={16}
                        />
                        {translations.analytics}
                    </Link>

                    {/* Contacts */}
                    <Link
                        href={'/dashboard/contacts'}
                        data-tutorial="navbar-contacts"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 3 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${contactsHighlight}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {translations.contacts}
                    </Link>

                    {/* Events */}
                    <Link
                        href={'/dashboard/events/discover'}
                        data-tutorial="navbar-events"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 6 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${eventsHighlight}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {translations.events}
                    </Link>

                    {/* Settings */}
                    <Link
                        href={'/dashboard/settings'}
                        data-tutorial="navbar-settings"
                        className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-black hover:bg-opacity-[0.075] rounded-lg text-sm font-semibold ${activePage === 4 ? "opacity-100" : "opacity-50 hover:opacity-70"} ${settingsHighlight}`}
                    >
                        <Image
                            src={"https://linktree.sirv.com/Images/icons/setting.svg"}
                            alt="settings"
                            height={16}
                            width={16}
                        />
                        {translations.settings}
                    </Link>

                    {/* Admin Panel Button - Desktop Version */}
                    {userIsAdmin && (
                        <Link
                            href={'/admin'}
                            className={`flex items-center gap-2 px-2 py-2 active:scale-90 active:opacity-40 hover:bg-red-100 hover:bg-opacity-75 rounded-lg text-sm font-semibold border border-red-200 ${activePage === 5 ? "bg-red-100 text-red-700 opacity-100" : "text-red-600 hover:text-red-700"}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {translations.admin}
                        </Link>
                    )}
                </div>
            </div>

            {/* Center - Deletion Warning */}
            {pendingDeletion && (
                <AccountDeletionWarning
                    pendingDeletion={pendingDeletion}
                    locale={locale}
                    variant="navbar-desktop"
                />
            )}

            <div className="flex items-center gap-3">
                {/* LANGUAGE SWITCHER */}
                <LanguageSwitcher />

                {/* Share Button */}
                <button
                    id="share-button"
                    data-tutorial="navbar-share"
                    className={`p-3 flex items-center relative gap-2 rounded-3xl border cursor-pointer hover:bg-gray-100 active:scale-90 overflow-hidden disabled:cursor-not-allowed disabled:opacity-50 ${shareHighlight}`}
                    onClick={handleShowShareCard}
                    disabled={isLoading}
                >
                    <Image
                        src={"https://linktree.sirv.com/Images/icons/share.svg"}
                        alt="share"
                        height={15}
                        width={15}
                    />
                </button>

                {/* Profile Button */}
                <div className="relative">
                    <button
                        id="profile-button"
                        data-tutorial="navbar-account"
                        className={`grid place-items-center relative rounded-full border h-[2.5rem] w-[2.5rem] cursor-pointer hover:scale-110 active:scale-95 overflow-hidden disabled:cursor-not-allowed disabled:opacity-50 ${accountHighlight}`}
                        onClick={handleShowProfileCard}
                        disabled={isLoading}
                    >
                        <div className="absolute z-10 w-full h-full sm:block hidden"></div>
                        {isLoading ? (
                            <div className="h-[95%] aspect-square w-[95%] rounded-full bg-gray-200 animate-pulse"></div>
                        ) : (
                            profilePicture
                        )}
                    </button>
                    <ProfileCard ref={profileCardRef} />
                    <ShareCard ref={shareCardRef} />
                </div>
            </div>
        </div>
    );
}
