'use client';

import { useEffect, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useLanguage } from '@/lib/translation/languageContext';
import { useOnboarding } from '../OnboardingContext';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'vm', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

// Header translations for rotating effect (iPhone-style)
const HEADER_TRANSLATIONS = {
  en: {
    title: "Choose Your Language",
    description: "Select your preferred language for the interface. You can change this later in your account settings."
  },
  fr: {
    title: "Choisissez Votre Langue",
    description: "Sélectionnez votre langue préférée pour l'interface. Vous pourrez la modifier plus tard dans les paramètres de votre compte."
  },
  es: {
    title: "Elige Tu Idioma",
    description: "Selecciona tu idioma preferido para la interfaz. Puedes cambiarlo más tarde en la configuración de tu cuenta."
  },
  vm: {
    title: "Chọn Ngôn Ngữ Của Bạn",
    description: "Chọn ngôn ngữ ưa thích của bạn cho giao diện. Bạn có thể thay đổi điều này sau trong cài đặt tài khoản."
  },
  zh: {
    title: "选择您的语言",
    description: "选择您喜欢的界面语言。您稍后可以在账户设置中更改。"
  }
};

const LANGUAGE_ROTATION_ORDER = ['en', 'fr', 'es', 'vm', 'zh'];

export default function LanguageStep() {
  const { t } = useTranslation();
  const { locale: currentLanguage, changeLanguage } = useLanguage();
  const { answers, updateAnswer } = useOnboarding();

  // State for rotating language display (iPhone-style)
  const [displayLanguageIndex, setDisplayLanguageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize with current language if not already set
  useEffect(() => {
    if (!answers.language && currentLanguage) {
      updateAnswer('language', currentLanguage);
    }
  }, [currentLanguage, answers.language, updateAnswer]);

  // iPhone-style language rotation effect
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setIsTransitioning(true);

      // After fade out (300ms), change language
      setTimeout(() => {
        setDisplayLanguageIndex((prevIndex) =>
          (prevIndex + 1) % LANGUAGE_ROTATION_ORDER.length
        );
        setIsTransitioning(false);
      }, 300);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(rotationInterval);
  }, []);

  const handleLanguageSelect = async (languageCode) => {
    // Update onboarding context
    updateAnswer('language', languageCode);

    // Apply language change immediately
    await changeLanguage(languageCode);
  };

  const selectedLanguage = answers.language || currentLanguage;
  const displayLanguageCode = LANGUAGE_ROTATION_ORDER[displayLanguageIndex];
  const displayText = HEADER_TRANSLATIONS[displayLanguageCode];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Header with iPhone-style rotating text */}
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div
          className={`transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <h2 className="text-3xl font-bold text-gray-900">
            {displayText.title}
          </h2>
          <p className="text-gray-600 text-lg mt-3">
            {displayText.description}
          </p>
        </div>
      </div>

      {/* Language Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LANGUAGES.map((language) => {
          const isSelected = selectedLanguage === language.code;

          return (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Language content */}
              <div className="flex items-center space-x-4">
                {/* Flag */}
                <div className="text-5xl">
                  {language.flag}
                </div>

                {/* Language names */}
                <div className="text-left flex-1">
                  <div className={`text-xl font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {language.nativeName}
                  </div>
                  <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    {language.name}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current selection indicator */}
      {selectedLanguage && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {t('onboarding.language.current', {
                language: LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName
              })}
            </span>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          💡 {t('onboarding.language.description')}
        </p>
      </div>
    </div>
  );
}
