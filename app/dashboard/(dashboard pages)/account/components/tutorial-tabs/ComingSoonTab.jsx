'use client';

import { useTranslation } from '@/lib/translation/useTranslation';
import { Sparkles } from 'lucide-react';

/**
 * Coming Soon Tab Component
 * Placeholder for tabs that don't have tutorial steps yet
 * (Statistics, Contacts, Settings)
 */
export default function ComingSoonTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Sparkles className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {t('tutorial.coming_soon.title')}
      </h3>
      <p className="text-gray-600 text-center max-w-md">
        {t('tutorial.coming_soon.message')}
      </p>
    </div>
  );
}
