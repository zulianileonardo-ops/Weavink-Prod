//app/dashboard/(dashboard pages)/account/components/TutorialProgressionSection.jsx
'use client';

import Image from 'next/image';
import { Info, Menu, Trophy } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { TutorialTabProvider, useTutorialTab } from './TutorialTabContext';

// Import tab components
import OverviewTab from './tutorial-tabs/OverviewTab';
import NavbarTab from './tutorial-tabs/NavbarTab';
import LinksTab from './tutorial-tabs/LinksTab';
import AppearanceTab from './tutorial-tabs/AppearanceTab';
import CompletionTab from './tutorial-tabs/CompletionTab';
import ComingSoonTab from './tutorial-tabs/ComingSoonTab';

/**
 * Tutorial Progression Section Component
 * Multi-tab interface for tutorial steps organized by page
 *
 * Shows in account page below Privacy Overview section
 */
export default function TutorialProgressionSection() {
  return (
    <TutorialTabProvider>
      <TutorialProgressionContent />
    </TutorialTabProvider>
  );
}

function TutorialProgressionContent() {
  const { t } = useTranslation();
  const { activeTutorialTab, setActiveTutorialTab } = useTutorialTab();

  // Tab configuration with icons from navbar
  const tabs = [
    {
      id: 'overview',
      labelKey: 'tutorial.tabs.overview',
      iconComponent: Info,
    },
    {
      id: 'navbar',
      labelKey: 'tutorial.tabs.navbar',
      iconComponent: Menu,
    },
    {
      id: 'links',
      labelKey: 'tutorial.tabs.links',
      icon: 'https://linktree.sirv.com/Images/icons/links.svg',
      iconAlt: 'links icon',
    },
    {
      id: 'appearance',
      labelKey: 'tutorial.tabs.appearance',
      icon: 'https://linktree.sirv.com/Images/icons/appearance.svg',
      iconAlt: 'appearance icon',
    },
    {
      id: 'completion',
      labelKey: 'tutorial.tabs.completion',
      iconComponent: Trophy,
    },
    {
      id: 'analytics',
      labelKey: 'tutorial.tabs.analytics',
      icon: 'https://linktree.sirv.com/Images/icons/analytics.svg',
      iconAlt: 'analytics icon',
    },
    {
      id: 'contacts',
      labelKey: 'tutorial.tabs.contacts',
      // SVG inline for contacts (same as navbar)
      iconSvg: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      labelKey: 'tutorial.tabs.settings',
      icon: 'https://linktree.sirv.com/Images/icons/setting.svg',
      iconAlt: 'settings icon',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('account.tutorial_progression.title')}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {t('account.tutorial_progression.subtitle')}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tutorial Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTutorialTab(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTutorialTab === tab.id
                    ? 'border-[#8129D9] text-[#8129D9]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.iconSvg ? (
                tab.iconSvg
              ) : tab.iconComponent ? (
                <tab.iconComponent className="w-4 h-4" />
              ) : (
                <Image
                  src={tab.icon}
                  alt={tab.iconAlt}
                  height={16}
                  width={16}
                />
              )}
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTutorialTab === 'overview' && <OverviewTab />}
        {activeTutorialTab === 'navbar' && <NavbarTab />}
        {activeTutorialTab === 'links' && <LinksTab />}
        {activeTutorialTab === 'appearance' && <AppearanceTab />}
        {activeTutorialTab === 'completion' && <CompletionTab />}
        {activeTutorialTab === 'analytics' && <ComingSoonTab />}
        {activeTutorialTab === 'contacts' && <ComingSoonTab />}
        {activeTutorialTab === 'settings' && <ComingSoonTab />}
      </div>
    </div>
  );
}
