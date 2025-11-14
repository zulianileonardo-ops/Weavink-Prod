'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from "@/lib/translation/useTranslation";
import { X } from 'lucide-react';

/**
 * Modal shown when user skips the tutorial
 * Provides option to navigate to Tutorial Progression section
 */
export default function TutorialSkipModal({ isOpen, onClose }) {
  const router = useRouter();
  const { t } = useTranslation();

  if (!isOpen) return null;

  /**
   * Navigate to Tutorial Progression section with highlight
   */
  const handleGoToTutorial = () => {
    router.push('/dashboard/account#tutorial-progression-section');
    onClose();
  };

  /**
   * Handle click on backdrop to close modal
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Modal content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            {t('tutorial.skip.modal_title')}
          </h2>

          {/* Message */}
          <p className="text-center text-gray-600 mb-6">
            {t('tutorial.skip.modal_message')}
          </p>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              {t('tutorial.skip.close')}
            </button>
            <button
              onClick={handleGoToTutorial}
              className="flex-1 px-4 py-2 text-white bg-[#8129D9] rounded-lg hover:bg-[#6d22b8] transition-colors font-medium shadow-sm"
            >
              {t('tutorial.skip.go_to_tutorial')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
