
// ================================================================
// app/dashboard/(dashboard pages)/contacts/components/scanner/InitialScreen.jsx
import { useTranslation } from "@/lib/translation/useTranslation";

export function InitialScreen({
    scanMode,
    setScanMode,
    startCamera,
    handleFileUpload,
    isProcessing,
    hasConsent,
    showConsentPopover,
    setShowConsentPopover,
    onNavigateToConsent
}) {
    const { t } = useTranslation();

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-full">
            {/* Scan mode selection */}
            <div className="w-full max-w-sm mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('business_card_scanner.initial_screen.scan_mode')}
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                        onClick={() => setScanMode('single')}
                        className={`flex-1 px-3 py-2 text-sm font-medium ${
                            scanMode === 'single'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {t('business_card_scanner.initial_screen.single_side')}
                    </button>
                    <button
                        onClick={() => setScanMode('double')}
                        className={`flex-1 px-3 py-2 text-sm font-medium ${
                            scanMode === 'double'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {t('business_card_scanner.initial_screen.both_sides')}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {scanMode === 'double'
                        ? t('business_card_scanner.initial_screen.double_mode_description')
                        : t('business_card_scanner.initial_screen.single_mode_description')
                    }
                </p>
            </div>

            <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {scanMode === 'double'
                        ? t('business_card_scanner.initial_screen.title_double')
                        : t('business_card_scanner.initial_screen.title_single')
                    }
                </h3>
                <p className="text-gray-600 text-sm sm:text-base max-w-sm">
                    {scanMode === 'double'
                        ? t('business_card_scanner.initial_screen.subtitle_double')
                        : t('business_card_scanner.initial_screen.subtitle_single')
                    }
                </p>
            </div>

            <div className="w-full max-w-sm space-y-3 sm:space-y-4">
                <div className="relative">
                    <button
                        onClick={startCamera}
                        onMouseEnter={() => {
                            if (!hasConsent) {
                                setShowConsentPopover('camera');
                            }
                        }}
                        onMouseLeave={() => setShowConsentPopover(false)}
                        className={`w-full flex flex-col items-center gap-3 p-4 sm:p-6 rounded-xl transition-colors ${
                            hasConsent
                                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                : 'bg-blue-300 text-white cursor-not-allowed opacity-50'
                        }`}
                        disabled={isProcessing}
                    >
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium text-sm sm:text-base">{t('business_card_scanner.initial_screen.take_photo')}</span>
                        <span className={`text-xs ${hasConsent ? 'text-blue-100' : 'text-blue-200'}`}>
                            {t('business_card_scanner.initial_screen.use_device_camera')}
                        </span>
                    </button>

                    {/* Consent Popover for Camera */}
                    {showConsentPopover === 'camera' && !hasConsent && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
                                <p className="mb-2">
                                    {t('business_card_scanner.consent_required') || 'Business Card Scanner requires your consent to use AI/OCR features'}
                                </p>
                                <button
                                    onClick={onNavigateToConsent}
                                    className="w-full text-blue-300 hover:text-blue-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors font-medium"
                                >
                                    {t('business_card_scanner.enable_consent') || 'Enable in Settings'} →
                                </button>
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={handleFileUpload}
                        onMouseEnter={() => {
                            if (!hasConsent) {
                                setShowConsentPopover('upload');
                            }
                        }}
                        onMouseLeave={() => setShowConsentPopover(false)}
                        className={`w-full flex flex-col items-center gap-3 p-4 sm:p-6 rounded-xl transition-colors ${
                            hasConsent
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        }`}
                        disabled={isProcessing}
                    >
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-medium text-sm sm:text-base">
                            {t('business_card_scanner.initial_screen.upload_image')}
                            {scanMode === 'double' ? t('business_card_scanner.initial_screen.upload_image_plural') : ''}
                        </span>
                        <span className={`text-xs ${hasConsent ? 'text-gray-500' : 'text-gray-400'}`}>
                            {t('business_card_scanner.initial_screen.from_device_gallery')}
                        </span>
                    </button>

                    {/* Consent Popover for Upload */}
                    {showConsentPopover === 'upload' && !hasConsent && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
                                <p className="mb-2">
                                    {t('business_card_scanner.consent_required') || 'Business Card Scanner requires your consent to use AI/OCR features'}
                                </p>
                                <button
                                    onClick={onNavigateToConsent}
                                    className="w-full text-blue-300 hover:text-blue-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors font-medium"
                                >
                                    {t('business_card_scanner.enable_consent') || 'Enable in Settings'} →
                                </button>
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default InitialScreen;