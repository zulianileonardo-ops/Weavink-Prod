'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import TutorialStepCard from './TutorialStepCard';

/**
 * Navbar Tab Component
 * Shows tutorial steps related to navbar navigation and all page intros
 * Steps: navbar (1), Links (2), Appearance (3), Analytics (4),
 *        Contacts (5), Settings (6), Share (7), Account (8)
 */
export default function NavbarTab() {
  const { currentUser } = useAuth();
  const { tutorialCompleted, completedSteps } = useTutorial();

  const [tutorialProgress, setTutorialProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Navbar-specific tutorial steps
  const navbarSteps = [
    {
      id: TUTORIAL_STEP_IDS.NAVBAR,
      index: 1,
      titleKey: 'tutorial.steps.navbar.title',
      descriptionKey: 'tutorial.steps.navbar.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_LINKS,
      index: 2,
      titleKey: 'tutorial.steps.navbar_links.title',
      descriptionKey: 'tutorial.steps.navbar_links.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
      index: 3,
      titleKey: 'tutorial.steps.navbar_appearance.title',
      descriptionKey: 'tutorial.steps.navbar_appearance.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
      index: 4,
      titleKey: 'tutorial.steps.navbar_analytics.title',
      descriptionKey: 'tutorial.steps.navbar_analytics.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
      index: 5,
      titleKey: 'tutorial.steps.navbar_contacts.title',
      descriptionKey: 'tutorial.steps.navbar_contacts.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
      index: 6,
      titleKey: 'tutorial.steps.navbar_settings.title',
      descriptionKey: 'tutorial.steps.navbar_settings.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_SHARE,
      index: 7,
      titleKey: 'tutorial.steps.navbar_share.title',
      descriptionKey: 'tutorial.steps.navbar_share.description',
    },
    {
      id: TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
      index: 8,
      titleKey: 'tutorial.steps.navbar_account.title',
      descriptionKey: 'tutorial.steps.navbar_account.description',
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
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {navbarSteps.map((step) => {
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
