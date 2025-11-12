'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { fireApp } from '@/important/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { TUTORIAL_STEP_IDS } from '@/lib/tutorial/tutorialSteps';
import TutorialStepCard from './TutorialStepCard';

/**
 * Completion Tab Component
 * Shows the final tutorial step - completion/congratulations
 * Steps: completion (5)
 */
export default function CompletionTab() {
  const { currentUser } = useAuth();
  const { tutorialCompleted, completedSteps } = useTutorial();

  const [tutorialProgress, setTutorialProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Completion tutorial step
  const completionSteps = [
    {
      id: TUTORIAL_STEP_IDS.COMPLETION,
      index: 5,
      titleKey: 'tutorial.steps.completion.title',
      descriptionKey: 'tutorial.steps.completion.description',
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
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {completionSteps.map((step) => {
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
