'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { Menu, Link2, Palette, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useTutorialTab } from '../TutorialTabContext';
import { TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';

/**
 * Overview Tab Component
 * Shows category cards for different tutorial sections
 * Similar to Privacy Overview pattern
 */
export default function OverviewTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { tutorialCompleted, completedSteps } = useTutorial();
  const { setActiveTutorialTab } = useTutorialTab();

  const [tutorialProgress, setTutorialProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // All 13 tutorial steps for progress calculation
  const allSteps = [
    TUTORIAL_STEP_IDS.WELCOME,
    TUTORIAL_STEP_IDS.NAVBAR,
    TUTORIAL_STEP_IDS.NAVBAR_LINKS,
    TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
    TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
    TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
    TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
    TUTORIAL_STEP_IDS.NAVBAR_SHARE,
    TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
    TUTORIAL_STEP_IDS.CREATE_LINK,
    TUTORIAL_STEP_IDS.LINK_FORM,
    TUTORIAL_STEP_IDS.APPEARANCE,
    TUTORIAL_STEP_IDS.COMPLETION,
  ];

  /**
   * Fetch tutorial progress from Firestore
   */
  useEffect(() => {
    const fetchTutorialProgress = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(fireApp, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setTutorialProgress({
            completed: userData.tutorialCompleted || false,
            skipped: userData.tutorialProgress?.skipped || false,
            completedSteps: userData.tutorialProgress?.completedSteps || [],
          });
        }
      } catch (error) {
        console.error('Error fetching tutorial progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorialProgress();
  }, [currentUser, tutorialCompleted]);

  /**
   * Get overall progress percentage
   */
  const getProgressPercentage = () => {
    const completed = tutorialProgress?.completedSteps?.length || completedSteps.length;
    return Math.round((completed / allSteps.length) * 100);
  };

  /**
   * Get progress text
   */
  const getProgressText = () => {
    const completed = tutorialProgress?.completedSteps?.length || completedSteps.length;
    return t('account.tutorial_progression.steps_completed', {
      completed,
      total: allSteps.length,
    });
  };

  /**
   * Get completed steps count for a category
   */
  const getCategoryProgress = (stepIds) => {
    const allCompletedSteps = tutorialProgress?.completedSteps || completedSteps;
    const completed = stepIds.filter(id => allCompletedSteps.includes(id)).length;
    return { completed, total: stepIds.length };
  };

  // Category configuration
  const categories = [
    {
      id: 'navbar',
      icon: Menu,
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-100',
      titleKey: 'tutorial.overview_cards.navbar.title',
      descriptionKey: 'tutorial.overview_cards.navbar.description',
      ctaKey: 'tutorial.overview_cards.navbar.cta',
      steps: [
        TUTORIAL_STEP_IDS.WELCOME,
        TUTORIAL_STEP_IDS.NAVBAR,
        TUTORIAL_STEP_IDS.NAVBAR_LINKS,
        TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
        TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
        TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
        TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
        TUTORIAL_STEP_IDS.NAVBAR_SHARE,
        TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
      ],
    },
    {
      id: 'links',
      icon: Link2,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100',
      titleKey: 'tutorial.overview_cards.links.title',
      descriptionKey: 'tutorial.overview_cards.links.description',
      ctaKey: 'tutorial.overview_cards.links.cta',
      steps: [TUTORIAL_STEP_IDS.CREATE_LINK, TUTORIAL_STEP_IDS.LINK_FORM],
    },
    {
      id: 'appearance',
      icon: Palette,
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
      titleKey: 'tutorial.overview_cards.appearance.title',
      descriptionKey: 'tutorial.overview_cards.appearance.description',
      ctaKey: 'tutorial.overview_cards.appearance.cta',
      steps: [TUTORIAL_STEP_IDS.APPEARANCE],
    },
    {
      id: 'completion',
      icon: Trophy,
      iconColor: 'text-yellow-600',
      iconBgColor: 'bg-yellow-100',
      titleKey: 'tutorial.overview_cards.completion.title',
      descriptionKey: 'tutorial.overview_cards.completion.description',
      ctaKey: 'tutorial.overview_cards.completion.cta',
      steps: [TUTORIAL_STEP_IDS.COMPLETION],
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('account.tutorial_progression.subtitle')}
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-semibold text-gray-700">
            {getProgressText()}
          </div>
          <div className="w-24 h-2 bg-gray-300 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-[#3AE09A] rounded-full transition-all duration-500"
              style={{
                width: `${getProgressPercentage()}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const progress = getCategoryProgress(category.steps);

          return (
            <div key={category.id} className="border border-gray-200 rounded-lg p-6">
              <div className={`${category.iconBgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-6 h-6 ${category.iconColor}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {t(category.titleKey)}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {t(category.descriptionKey)}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {progress.completed}/{progress.total} {t('tutorial.overview_cards.steps_completed', 'steps')}
                </span>
                <button
                  onClick={() => setActiveTutorialTab(category.id)}
                  className="text-[#8129D9] hover:text-[#6B1FB5] text-sm font-medium transition-colors"
                >
                  {t(category.ctaKey)} →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tutorial Completed Message */}
      {tutorialProgress?.completed && (
        <div className="border border-[#3AE09A] bg-white rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('tutorial.steps.completion.title')}
          </h3>
          <p className="text-sm text-[#3AE09A]">
            {t('tutorial.steps.completion.description')}
          </p>
        </div>
      )}

      {/* Tutorial Skipped Message */}
      {tutorialProgress?.skipped && !tutorialProgress?.completed && (
        <div className="border border-gray-300 bg-white rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500">
            {t('account.tutorial_progression.skipped_message')}
          </p>
        </div>
      )}
    </div>
  );
}
