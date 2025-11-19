'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import Link from 'next/link';

/**
 * Account Deletion Warning Component
 *
 * Displays a prominent warning banner when an account has a pending deletion request.
 * Shows the scheduled deletion date and allows users to see they can cancel.
 *
 * @param {Object} props - Component props
 * @param {Object} props.pendingDeletion - Deletion request data
 * @param {string} props.pendingDeletion.scheduledDeletionDate - ISO date string or Firestore Timestamp
 * @param {string} props.locale - Current user locale for date formatting (e.g., 'en', 'fr', 'es')
 * @param {string} [props.variant] - Display variant: 'default', 'navbar-desktop', 'navbar-mobile'
 * @param {string} [props.className] - Optional additional CSS classes
 */
export default function AccountDeletionWarning({
  pendingDeletion,
  locale,
  variant = 'default',
  className = ''
}) {
  const { t } = useTranslation();

  if (!pendingDeletion) {
    return null;
  }

  // Format the deletion date for display
  const formattedDate = new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Short format for compact displays
  const shortDate = new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  });

  // Render different variants
  if (variant === 'navbar-desktop') {
    return (
      <Link
        href="/dashboard/account?tab=delete"
        className={`flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        <span className="text-red-900 font-medium text-sm whitespace-nowrap">
          {t('navbar.deletion_warning', {
            date: formattedDate,
            defaultValue: `Account deletion: ${formattedDate}`
          })}
        </span>
      </Link>
    );
  }

  if (variant === 'navbar-mobile') {
    return (
      <Link
        href="/dashboard/account?tab=delete"
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
        <span className="text-red-900 font-medium text-xs whitespace-nowrap">
          {t('navbar.deletion_warning_short', {
            date: shortDate,
            defaultValue: `Deletion: ${shortDate}`
          })}
        </span>
      </Link>
    );
  }

  // Default variant (current full banner for account page)
  return (
    <div className={`mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-red-900 font-semibold">
          {t('account.header.deletion_warning_title')}
        </h3>
        <p className="text-red-700 text-sm mt-1">
          {t('account.header.deletion_warning_message', {
            date: formattedDate
          })}
        </p>
      </div>
    </div>
  );
}
