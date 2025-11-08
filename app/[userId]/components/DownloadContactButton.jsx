// app/[userId]/components/DownloadContactButton.jsx
"use client"
import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { hexToRgba } from "@/lib/utilities";
import { availableFonts_Classic } from "@/lib/FontsList";
import Image from "next/image";
import { toast } from 'react-hot-toast';
import ContactPreviewModal from './ContactPreviewModal';

export default function DownloadContactButton({
    username,
    userId,
    userData,
    preVerified = true,
    verificationLoading = false,
    themeData = {}
}) {
    const { t } = useTranslation();

    // Theme state - Get from props passed from House.jsx
    const [btnType, setBtnType] = useState(themeData.btnType || 0);
    const [btnShadowColor, setBtnShadowColor] = useState(themeData.btnShadowColor || '#000');
    const [btnFontColor, setBtnFontColor] = useState(themeData.btnFontColor || '#000');
    const [btnColor, setBtnColor] = useState(themeData.btnColor || '#fff');
    const [selectedTheme, setSelectedTheme] = useState(themeData.selectedTheme || '');
    const [themeTextColour, setThemeTextColour] = useState(themeData.themeFontColor || '');
    const [selectedFontClass, setSelectedFontClass] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Update theme when props change
    useEffect(() => {
        if (themeData) {
            setBtnType(themeData.btnType || 0);
            setBtnShadowColor(themeData.btnShadowColor || "#000");
            setBtnFontColor(themeData.btnFontColor || "#000");
            setBtnColor(themeData.btnColor || "#fff");
            setSelectedTheme(themeData.selectedTheme || '');
            setThemeTextColour(themeData.themeFontColor || "");

            // Set font class
            const fontName = availableFonts_Classic[themeData.fontType ? themeData.fontType - 1 : 0];
            setSelectedFontClass(fontName?.class || '');
        }
    }, [themeData]);

    // Handle button click - open preview modal
    const handleDownload = () => {
        if (verificationLoading || isDownloading) {
            return;
        }

        if (!preVerified) {
            toast.error(t('download_contact.profile_unavailable') || 'This profile is not available for download');
            return;
        }

        // Open preview modal instead of downloading directly
        setShowPreviewModal(true);
    };

    // Handle actual download after field selection
    const handleConfirmDownload = async (selectedFields) => {
        setIsDownloading(true);

        try {
            console.log('📇 Downloading vCard for:', { username, userId, selectedFields });

            // Call API to generate vCard with selected fields
            const response = await fetch('/api/user/contacts/download-vcard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: userId || username,
                    type: userId ? 'userId' : 'username',
                    selectedFields  // Pass selected fields
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate vCard');
            }

            // Create blob and trigger download
            const blob = new Blob([data.vcard], { type: 'text/vcard;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = data.filename || `${username || 'contact'}.vcf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(t('download_contact.success') || 'Contact downloaded successfully!');

            // Close modal on success
            setShowPreviewModal(false);

        } catch (error) {
            console.error('❌ Error downloading vCard:', error);
            toast.error(t('download_contact.error') || 'Failed to download contact');
        } finally {
            setIsDownloading(false);
        }
    };

    // Update button text based on loading/verification state
    const getButtonText = () => {
        if (verificationLoading) {
            return {
                desktop: t('download_contact.button_verifying') || 'Verifying...',
                mobile: t('download_contact.button_verifying_short') || 'Verifying...'
            };
        }

        if (!preVerified) {
            return {
                desktop: t('download_contact.button_unavailable') || 'Download Unavailable',
                mobile: t('download_contact.button_unavailable_short') || 'Unavailable'
            };
        }

        if (isDownloading) {
            return {
                desktop: t('download_contact.downloading') || 'Downloading...',
                mobile: t('download_contact.downloading') || 'Downloading...'
            };
        }

        return {
            desktop: t('download_contact.button_text') || 'Download Contact',
            mobile: t('download_contact.button_text_short') || 'Download'
        };
    };

    const buttonText = getButtonText();

    // Button styling functions
    const getButtonClasses = () => {
        let baseClasses = "userBtn relative justify-between items-center flex hover:scale-[1.025] w-full";

        // Add disabled cursor if not ready
        if (verificationLoading || !preVerified || isDownloading) {
            baseClasses += " cursor-not-allowed";
        } else {
            baseClasses += " cursor-pointer";
        }

        if (selectedTheme === "3D Blocks") {
            return `${baseClasses} relative after:absolute after:h-2 after:w-[100.5%] after:bg-black bg-white after:-bottom-2 after:left-[1px] after:skew-x-[57deg] after:ml-[2px] before:absolute before:h-[107%] before:w-3 before:bg-[currentColor] before:top-[1px] before:border-2 before:border-black before:-right-3 before:skew-y-[30deg] before:grid before:grid-rows-2 border-2 border-black inset-2 ml-[-20px] btn`;
        }

        if (selectedTheme === "New Mario") {
            return "userBtn relative overflow-x-hidden overflow-y-hidden flex justify-between items-center h-16 w-full";
        }

        switch (btnType) {
            case 0:
                return `${baseClasses}`;
            case 1:
                return `${baseClasses} rounded-lg`;
            case 2:
                return `${baseClasses} rounded-3xl`;
            case 3:
                return `${baseClasses} border border-black bg-opacity-0`;
            case 4:
                return `${baseClasses} border border-black rounded-lg bg-opacity-0`;
            case 5:
                return `${baseClasses} border border-black rounded-3xl bg-opacity-0`;
            case 6:
                return `${baseClasses} bg-white border border-black`;
            case 7:
                return `${baseClasses} bg-white border border-black rounded-lg`;
            case 8:
                return `${baseClasses} bg-white border border-black rounded-3xl`;
            case 9:
                return `${baseClasses} bg-white`;
            case 10:
                return `${baseClasses} bg-white rounded-lg`;
            case 11:
                return `${baseClasses} bg-white rounded-3xl`;
            case 12:
                return `${baseClasses} relative border border-black bg-black`;
            case 13:
                return `${baseClasses} relative border border-black bg-black`;
            case 14:
                return `${baseClasses} border border-black relative after:-translate-y-1/2 after:-translate-x-1/2 after:top-1/2 after:left-1/2 after:h-[88%] after:w-[104%] after:absolute after:border after:border-black after:mix-blend-difference`;
            case 15:
                return `${baseClasses} border border-black bg-black rounded-3xl`;
            case 16:
                return `${baseClasses} relative border border-black bg-black`;
            default:
                return baseClasses;
        }
    };

    const getButtonStyles = () => {
        if (selectedTheme === "3D Blocks") {
            return {
                color: "#fff",
                backgroundColor: "#191414",
                opacity: (verificationLoading || !preVerified || isDownloading) ? 0.6 : 1
            };
        }

        if (selectedTheme === "New Mario") {
            return {
                color: "#fff",
                backgroundColor: "transparent",
                backgroundImage: `url('https://linktree.sirv.com/Images/Scene/Mario/mario-brick.png')`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                opacity: (verificationLoading || !preVerified || isDownloading) ? 0.6 : 1
            };
        }

        let styles = {
            color: btnFontColor || "#000",
            backgroundColor: btnColor || "#fff"
        };

        // Apply disabled styling if not verified or loading
        if (verificationLoading || !preVerified || isDownloading) {
            styles.opacity = 0.6;
        }

        switch (btnType) {
            case 6:
            case 7:
            case 8:
                styles.boxShadow = `4px 4px 0 0 ${hexToRgba(btnShadowColor)}`;
                break;
            case 9:
            case 10:
            case 11:
                styles.boxShadow = `0 4px 4px 0 ${hexToRgba(btnShadowColor, 0.16)}`;
                break;
            case 12:
            case 13:
            case 15:
            case 16:
                styles.color = "#fff";
                styles.backgroundColor = btnColor || "#000";
                break;
        }

        if (selectedTheme === "Matrix") {
            styles.borderColor = themeTextColour;
        }

        return styles;
    };

    const getSpecialElements = () => {
        switch (btnType) {
            case 12:
                return (
                    <>
                        <span className="w-full absolute left-0 bottom-0 translate-y-[6px]">
                            <Image src={"https://linktree.sirv.com/Images/svg%20element/torn.svg"} alt="ele" width={1000} height={100} priority className="w-full scale-[-1]" />
                        </span>
                        <span className="w-full absolute left-0 top-0 -translate-y-[6px]">
                            <Image src={"https://linktree.sirv.com/Images/svg%20element/torn.svg"} alt="ele" width={1000} height={1000} priority className="w-full" />
                        </span>
                    </>
                );
            case 13:
                return (
                    <>
                        <span className="w-full absolute left-0 bottom-0 translate-y-[4px]">
                            <Image src={"https://linktree.sirv.com/Images/svg%20element/jiggy.svg"} alt="ele" width={1000} height={8} priority className="w-full" />
                        </span>
                        <span className="w-full absolute left-0 top-0 -translate-y-[3px]">
                            <Image src={"https://linktree.sirv.com/Images/svg%20element/jiggy.svg"} alt="ele" width={1000} height={8} priority className="w-full scale-[-1]" />
                        </span>
                    </>
                );
            case 16:
                return (
                    <>
                        <div className={"h-2 w-2 border border-black bg-white absolute -top-1 -left-1"}></div>
                        <div className={"h-2 w-2 border border-black bg-white absolute -top-1 -right-1"}></div>
                        <div className={"h-2 w-2 border border-black bg-white absolute -bottom-1 -left-1"}></div>
                        <div className={"h-2 w-2 border border-black bg-white absolute -bottom-1 -right-1"}></div>
                    </>
                );
            default:
                return null;
        }
    };

    const getFontStyle = () => {
        if (selectedTheme === "3D Blocks") {
            return { color: "#fff" };
        }

        if (selectedTheme === "New Mario") {
            return { color: "#fff" };
        }

        switch (btnType) {
            case 12:
            case 13:
            case 15:
            case 16:
                return { color: "#fff" };
            default:
                return { color: btnFontColor || "#000" };
        }
    };

    const specialElements = getSpecialElements();
    const fontStyle = getFontStyle();

    // Get the appropriate icon based on state
    const getButtonIcon = () => {
        if (verificationLoading || isDownloading) {
            return (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
            );
        }

        if (!preVerified) {
            return (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        }

        // Download icon
        return (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        );
    };

    return (
        <>
            {/* Mario Theme Rendering */}
            {selectedTheme === "New Mario" ? (
                <div className={getButtonClasses()}>
                    {/* Mario brick background */}
                    {Array(4).fill("").map((_, brick_index) => (
                        <Image
                            key={brick_index}
                            src="https://linktree.sirv.com/Images/Scene/Mario/mario-brick.png"
                            alt="Mario Brick"
                            width={650}
                            height={660}
                            onClick={handleDownload}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`h-16 w-1/4 object-cover transition-transform ${
                                verificationLoading || !preVerified || isDownloading
                                    ? 'cursor-not-allowed'
                                    : 'hover:-translate-y-2 cursor-pointer'
                            }`}
                        />
                    ))}

                    {/* Mario box with download icon */}
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-30">
                        <div className="relative">
                            <Image
                                src="https://linktree.sirv.com/Images/Scene/Mario/mario-box.png"
                                alt="Mario Box"
                                width={650}
                                height={660}
                                className={`h-8 w-auto object-contain transition-all ${
                                    verificationLoading || !preVerified || isDownloading
                                        ? 'cursor-not-allowed opacity-60'
                                        : `hover:-translate-y-2 hover:rotate-2 cursor-pointer ${isHovered ? "rotate-2" : ""}`
                                }`}
                                onClick={handleDownload}
                            />
                            {/* Download icon overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {getButtonIcon()}
                            </div>
                        </div>
                    </div>

                    {/* Button text overlay */}
                    <div
                        className="absolute top-0 left-0 z-20 w-full h-full flex items-center justify-center"
                        onClick={handleDownload}
                        style={{
                            paddingLeft: '3rem' // Space for the box
                        }}
                    >
                        <div className={`${selectedFontClass}`} style={fontStyle}>
                            {/* Desktop text */}
                            <span className={`hidden md:block md:text-2xl sm:text-xl text-lg drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] font-semibold ${
                                verificationLoading || !preVerified || isDownloading
                                    ? "text-gray-400"
                                    : isHovered ? "text-blue-500" : "text-white"
                            }`}>
                                {buttonText.desktop}
                            </span>

                            {/* Mobile text */}
                            <span className={`block md:hidden text-sm drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] font-semibold ${
                                verificationLoading || !preVerified || isDownloading
                                    ? "text-gray-400"
                                    : isHovered ? "text-blue-500" : "text-white"
                            }`}>
                                {buttonText.mobile}
                            </span>
                        </div>
                    </div>
                </div>
            ) : selectedTheme === "3D Blocks" ? (
                <div className="userBtn relative justify-between items-center flex hover:scale-[1.025] w-full">
                    <div
                        onClick={handleDownload}
                        className={getButtonClasses()}
                        style={{...getButtonStyles(), borderColor: selectedTheme === "Matrix" ? `${themeTextColour}` : ""}}
                    >
                        <div className="flex gap-3 items-center min-h-10 py-3 px-3 flex-1">
                            {specialElements}

                            {/* Download Icon */}
                            {getButtonIcon()}

                            <div className={`${selectedFontClass} font-semibold truncate max-w-[90%] flex-1`} style={fontStyle}>
                                {/* Desktop text */}
                                <span className="hidden md:block">
                                    {buttonText.desktop}
                                </span>

                                {/* Mobile text */}
                                <span className="block md:hidden text-sm">
                                    {buttonText.mobile}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={getButtonClasses()}
                    style={{...getButtonStyles(), borderColor: selectedTheme === "Matrix" ? `${themeTextColour}` : ""}}
                >
                    <div
                        onClick={handleDownload}
                        className="flex gap-3 items-center min-h-10 py-3 px-3 flex-1"
                    >
                        {specialElements}

                        {/* Download Icon */}
                        {getButtonIcon()}

                        <div className={`${selectedFontClass} font-semibold truncate max-w-[90%] flex-1`} style={fontStyle}>
                            {/* Desktop text */}
                            <span className="hidden md:block">
                                {buttonText.desktop}
                            </span>

                            {/* Mobile text */}
                            <span className="block md:hidden text-sm">
                                {buttonText.mobile}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Preview Modal */}
            <ContactPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onDownload={handleConfirmDownload}
                userData={userData}
                allowedFields={userData?.settings?.downloadContactFields}
                isDownloading={isDownloading}
            />
        </>
    );
}
