// app/dashboard/(dashboard pages)/account/components/DeleteAccountTab.jsx
'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';

export default function DeleteAccountTab() {
  const { t } = useTranslation();
  const { pendingDeletion, requestDeletion, cancelDeletion, refreshData } = useAccount();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      // Use context's requestDeletion method
      await requestDeletion(
        confirmationText,
        'User requested',
        false
      );

      // Refresh data
      await refreshData();
      setShowConfirmation(false);
      setConfirmationText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      // Use context's cancelDeletion method
      await cancelDeletion();
      await refreshData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (pendingDeletion) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-4">{t('account.delete.pending.title', 'Account Deletion Pending')}</h2>
          <p className="text-red-800 mb-4">
            {t('account.delete.pending.message', 'Your account is scheduled for permanent deletion on {{date}}.', {
              date: new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString()
            })}
          </p>
          <p className="text-red-800 mb-6">
            {t('account.delete.pending.warning', 'All your data, including contacts, groups, and settings, will be permanently deleted. This action cannot be undone after the deletion date.')}
          </p>

          <button
            onClick={handleCancelDeletion}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            {t('account.delete.pending.cancel_button', 'Cancel Deletion')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('account.delete.title', 'Delete Your Account')}</h2>
        <p className="text-gray-600">
          {t('account.delete.description', 'Permanently delete your account and all associated data. This action cannot be undone.')}
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-900 font-semibold mb-3">{t('account.delete.warning.title', 'Before you delete:')}</h3>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li>✓ {t('account.delete.warning.export', 'Consider exporting your data first (you won\'t be able to access it after deletion)')}</li>
          <li>✓ {t('account.delete.warning.all_data', 'This will delete all your contacts, groups, and settings')}</li>
          <li>✓ {t('account.delete.warning.notify', 'Users who have you as a contact will be notified')}</li>
          <li>✓ {t('account.delete.warning.grace_period', 'You have 30 days to cancel the deletion before it\'s final')}</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
        >
          {t('account.delete.button.delete', 'Delete My Account')}
        </button>
      ) : (
        <div className="bg-white border-2 border-red-300 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('account.delete.confirmation.title', 'Confirm Account Deletion')}</h3>
          <p className="text-sm text-gray-600">
            {t('account.delete.confirmation.instruction', 'Type {{text}} to confirm:', { text: t('account.delete.confirmation.text', 'DELETE MY ACCOUNT') })}
          </p>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder={t('account.delete.confirmation.placeholder', 'DELETE MY ACCOUNT')}
          />
          <div className="flex space-x-3">
            <button
              onClick={handleDelete}
              disabled={confirmationText !== 'DELETE MY ACCOUNT' || deleting}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {deleting ? t('account.delete.button.deleting', 'Deleting...') : t('account.delete.button.confirm', 'Confirm Deletion')}
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmationText('');
                setError(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              {t('account.delete.button.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
