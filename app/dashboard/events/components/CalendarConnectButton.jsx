"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * CalendarConnectButton - Google Calendar connection management
 */
export default function CalendarConnectButton({ onStatusChange }) {
    const { currentUser } = useAuth();
    const [status, setStatus] = useState({
        connected: false,
        status: 'disconnected',
        email: null,
        lastSyncAt: null
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    // Fetch connection status on mount
    useEffect(() => {
        fetchStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const fetchStatus = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/events/import/google', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setStatus(data);
                onStatusChange?.(data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/auth/google/calendar', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok && data.authUrl) {
                // Redirect to Google OAuth consent screen
                window.location.href = data.authUrl;
            } else {
                setError(data.error || 'Failed to initiate connection');
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
            return;
        }

        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/auth/google/disconnect', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setStatus({
                    connected: false,
                    status: 'disconnected',
                    email: null,
                    lastSyncAt: null
                });
                onStatusChange?.({ connected: false, status: 'disconnected' });
            } else {
                const data = await response.json();
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            setError(null);
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/events/import/google', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (response.ok) {
                // Refresh status
                await fetchStatus();
                alert(`Sync complete!\nImported: ${data.imported}\nSkipped: ${data.skipped}\nFailed: ${data.failed}`);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    <span className="text-gray-500">Checking connection...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {/* Google Calendar Icon */}
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                        </svg>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                        {status.connected ? (
                            <div className="text-sm text-gray-500">
                                <p className="text-green-600 font-medium">Connected</p>
                                {status.email && <p>{status.email}</p>}
                                {status.lastSyncAt && (
                                    <p>Last sync: {new Date(status.lastSyncAt).toLocaleString()}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Import events from your Google Calendar
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {status.connected ? (
                        <>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {syncing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                        </svg>
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                        </svg>
                                        Sync Now
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
                            >
                                Disconnect
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Connect Google Calendar
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Status Messages */}
            {status.status === 'token_expired' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                    Your connection has expired. Please reconnect your Google Calendar.
                </div>
            )}
        </div>
    );
}
