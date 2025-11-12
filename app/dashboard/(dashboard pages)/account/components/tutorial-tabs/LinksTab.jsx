'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import TutorialStepCard from './TutorialStepCard';

/**
 * Links Tab Component
 * Shows tutorial steps related to the Links page
 * Steps: create_link (3), link_form (4)
 */
export default function LinksTab() {
  const { currentUser } = useAuth();
  const { tutorialCompleted, completedSteps } = useTutorial();

  const [tutorialProgress, setTutorialProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Links-specific tutorial steps
  const linksSteps = [
    {
      id: TUTORIAL_STEP_IDS.CREATE_LINK,
      index: 2,
      titleKey: 'tutorial.steps.create_link.title',
      descriptionKey: 'tutorial.steps.create_link.description',
    },
    {
      id: TUTORIAL_STEP_IDS.LINK_FORM,
      index: 3,
      titleKey: 'tutorial.steps.link_form.title',
      descriptionKey: 'tutorial.steps.link_form.description',
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
      {linksSteps.map((step) => {
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
