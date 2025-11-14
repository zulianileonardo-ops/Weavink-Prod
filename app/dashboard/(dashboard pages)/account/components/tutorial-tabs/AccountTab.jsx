'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import TutorialStepCard from './TutorialStepCard';

/**
 * Account Tab Component
 * Shows tutorial steps related to Account & Privacy page
 * Steps: Privacy Overview (10), Privacy Tabs (11),
 *        Individual tabs (12-18): Overview, Export, Delete, Consents, Settings, Contact Download, Website Config
 */
export default function AccountTab() {
  const { currentUser } = useAuth();
  const { tutorialCompleted, completedSteps } = useTutorial();

  const [tutorialProgress, setTutorialProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Account-specific tutorial steps
  const accountSteps = [
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_OVERVIEW,
      index: 10,
      titleKey: 'tutorial.steps.account_privacy_overview.title',
      descriptionKey: 'tutorial.steps.account_privacy_overview.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_TABS,
      index: 11,
      titleKey: 'tutorial.steps.account_privacy_tabs.title',
      descriptionKey: 'tutorial.steps.account_privacy_tabs.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_OVERVIEW,
      index: 12,
      titleKey: 'tutorial.steps.account_tab_overview.title',
      descriptionKey: 'tutorial.steps.account_tab_overview.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_EXPORT,
      index: 13,
      titleKey: 'tutorial.steps.account_tab_export.title',
      descriptionKey: 'tutorial.steps.account_tab_export.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_DELETE,
      index: 14,
      titleKey: 'tutorial.steps.account_tab_delete.title',
      descriptionKey: 'tutorial.steps.account_tab_delete.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONSENTS,
      index: 15,
      titleKey: 'tutorial.steps.account_tab_consents.title',
      descriptionKey: 'tutorial.steps.account_tab_consents.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_SETTINGS,
      index: 16,
      titleKey: 'tutorial.steps.account_tab_settings.title',
      descriptionKey: 'tutorial.steps.account_tab_settings.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONTACT_DOWNLOAD,
      index: 17,
      titleKey: 'tutorial.steps.account_tab_contact_download.title',
      descriptionKey: 'tutorial.steps.account_tab_contact_download.description',
    },
    {
      id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_WEBSITE_CONFIG,
      index: 18,
      titleKey: 'tutorial.steps.account_tab_website_config.title',
      descriptionKey: 'tutorial.steps.account_tab_website_config.description',
    },
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
   * Check if a step is completed
   */
  const isStepCompleted = (stepId) => {
    return completedSteps.includes(stepId) ||
           tutorialProgress?.completedSteps?.includes(stepId);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accountSteps.map((step) => {
        const completed = isStepCompleted(step.id);

        return (
          <TutorialStepCard
            key={step.id}
            step={step}
            completed={completed}
          />
        );
      })}
    </div>
  );
}
