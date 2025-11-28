"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

/**
 * EventDiscoveryList - Displays discovered events from Eventbrite etc.
 */
export default function EventDiscoveryList({ events = [], loading, onImport, onRefresh }) {
    const { currentUser } = useAuth();
    const [importingId, setImportingId] = useState(null);

    const handleImport = async (event) => {
        if (!currentUser) return;

        try {
            setImportingId(event.id);
            const token = await currentUser.getIdToken();

            const response = await fetch('/api/events/import/eventbrite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ eventId: event.id })
            });

            const data = await response.json();

            if (response.ok) {
                onImport?.(event, data.eventId);
            } else if (data.alreadyExists) {
                alert('This event has already been imported.');
            } else {
                alert(data.error || 'Failed to import event');
            }
        } catch (err) {
            console.error('Import error:', err);
            alert('Failed to import event');
        } finally {
            setImportingId(null);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1">
                                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
                <p className="text-gray-500 mb-4">
                    Try adjusting your search location or increasing the search radius.
                </p>
                <button
                    onClick={onRefresh}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    Search Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map(event => (
                <div
                    key={event.id}
                    className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${
                        event.alreadyImported ? 'opacity-60' : ''
                    }`}
                >
                    <div className="flex gap-4">
                        {/* Event Image */}
                        {event.imageUrl ? (
                            <Image
                                src={event.imageUrl}
                                alt={event.name}
                                width={96}
                                height={96}
                                className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                unoptimized
                            />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        )}

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {event.name}
                                    </h3>
                                    <p className="text-sm text-purple-600 font-medium">
                                        {formatDate(event.startDate)}
                                    </p>
                                </div>

                                {/* Price Badge */}
                                {event.isFree && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        Free
                                    </span>
                                )}
                            </div>

                            {/* Location */}
                            {event.location && (
                                <p className="text-sm text-gray-500 mt-1 truncate">
                                    <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    {event.location.venue || event.location.city || event.location.address}
                                </p>
                            )}

                            {/* Tags */}
                            {event.tags && event.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {event.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                                {event.alreadyImported ? (
                                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                        </svg>
                                        Already Imported
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleImport(event)}
                                        disabled={importingId === event.id}
                                        className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {importingId === event.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                                </svg>
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                </svg>
                                                Import
                                            </>
                                        )}
                                    </button>
                                )}

                                {event.url && (
                                    <a
                                        href={event.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                        </svg>
                                        View
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
