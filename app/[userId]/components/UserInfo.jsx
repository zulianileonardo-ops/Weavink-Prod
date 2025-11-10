// app/[userId]/components/UserInfo.jsx - Enhanced for banner overlay
"use client"
import { filterProperly } from "@/lib/utilities";
import { useContext, useState } from "react";
import { HouseContext } from "../House";

export default function UserInfo() {
    const { userData } = useContext(HouseContext);
    const {
        displayName = "",
        bio = "",
        themeFontColor = "",
        themeTextColour = "",
        sensitiveStatus = false,
        bannerType = 'None'
    } = userData;

    const [isBioExpanded, setIsBioExpanded] = useState(false);

    const filteredDisplayName = sensitiveStatus ? displayName : filterProperly(displayName);
    const filteredBio = sensitiveStatus ? bio : filterProperly(bio);
    const displayColor = themeFontColor === "#000" ? themeTextColour : themeFontColor;

    // Bio truncation logic
    const BIO_PREVIEW_LENGTH = 100;
    const shouldTruncateBio = filteredBio.length > BIO_PREVIEW_LENGTH;
    const displayedBio = !isBioExpanded && shouldTruncateBio
        ? filteredBio.slice(0, BIO_PREVIEW_LENGTH) + "..."
        : filteredBio;

    // Add text shadow and better contrast when banner is active
    const hasBanner = bannerType !== 'None';
    const textShadowStyle = hasBanner ? {
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.7), 0 1px 2px rgba(0, 0, 0, 0.8)',
        fontWeight: '600'
    } : {};

    const nameStyle = {
        color: displayColor,
        ...textShadowStyle
    };

    const bioStyle = {
        color: displayColor,
        ...textShadowStyle,
        fontWeight: hasBanner ? '500' : 'normal'
    };

    return (
        <>
            {filteredDisplayName.length > 0 && 
                <span 
                    style={nameStyle} 
                    className={`font-semibold text-lg py-2 text-center ${hasBanner ? 'text-white' : ''}`}
                >
                    {displayName.split(" ").length > 1 ? filteredDisplayName : `@${filteredDisplayName}`}
                </span>
            }
            {filteredBio.length > 0 &&
                <div className="flex items-center gap-2 max-w-[85%]">
                    <span
                        style={bioStyle}
                        className={`opacity-90 text-center text-base transition-all duration-300 ${hasBanner ? 'text-white' : ''}`}
                    >
                        {displayedBio}
                    </span>
                    {shouldTruncateBio && (
                        <button
                            onClick={() => setIsBioExpanded(!isBioExpanded)}
                            className="flex-shrink-0 transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-1"
                            style={{ color: displayColor }}
                            aria-expanded={isBioExpanded}
                            aria-label={isBioExpanded ? "Show less bio" : "Show more bio"}
                        >
                            <svg
                                className={`w-5 h-5 transition-transform duration-300 ${isBioExpanded ? 'rotate-180' : 'rotate-0'} ${hasBanner ? 'text-white' : ''}`}
                                style={hasBanner ? textShadowStyle : {}}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            }
        </>
    );
}