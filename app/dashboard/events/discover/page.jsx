"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CalendarConnectButton from '../components/CalendarConnectButton';
import EventDiscoveryList from '../components/EventDiscoveryList';

/**
 * Event Discovery Page
 * /dashboard/events/discover
 *
 * - Connect Google Calendar
 * - Discover nearby events from Eventbrite
 * - Import events to your collection
 */
export default function EventDiscoveryPage() {
    const { currentUser } = useAuth();
    const searchParams = useSearchParams();

    // State
    const [calendarStatus, setCalendarStatus] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Search parameters
    const [searchLocation, setSearchLocation] = useState({ lat: 45.1885, lng: 5.7245 }); // Default: Grenoble
    const [radius, setRadius] = useState(25);
    const [keyword, setKeyword] = useState('');

    // Check for success/error messages from OAuth callback
    useEffect(() => {
        const success = searchParams.get('success');
        const errorParam = searchParams.get('error');

        if (success === 'connected') {
            // Show success toast or notification
            console.log('Google Calendar connected successfully');
        }

        if (errorParam) {
            setError(`Connection failed: ${errorParam}`);
        }
    }, [searchParams]);

    // Get user's location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setSearchLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (err) => {
                    console.log('Geolocation error:', err.message);
                    // Keep default location
                }
            );
        }
    }, []);

    // Discover events
    const discoverEvents = async () => {
        if (!currentUser) return;

        try {
            setLoading(true);
            setError(null);

            const token = await currentUser.getIdToken();
            const params = new URLSearchParams({
                lat: searchLocation.lat.toString(),
                lng: searchLocation.lng.toString(),
                radius: radius.toString()
            });

            if (keyword) {
                params.append('keyword', keyword);
            }

            const response = await fetch(`/api/events/discover?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok) {
                setEvents(data.events || []);
            } else {
                setError(data.error || 'Failed to discover events');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = (event, eventId) => {
        // Mark event as imported in the list
        setEvents(prev => prev.map(e =>
            e.id === event.id ? { ...e, alreadyImported: true } : e
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
                    <p className="text-gray-500 mt-1">
                        Connect your calendar and discover networking opportunities nearby
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="text-sm underline mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Calendar Connection */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Integration</h2>
                    <CalendarConnectButton onStatusChange={setCalendarStatus} />
                </div>

                {/* Event Discovery */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Discover Events Nearby</h2>

                    {/* Search Controls */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Keyword Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Keyword
                                </label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="e.g., tech, networking..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            {/* Radius */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Radius
                                </label>
                                <select
                                    value={radius}
                                    onChange={(e) => setRadius(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value={10}>10 km</option>
                                    <option value={25}>25 km</option>
                                    <option value={50}>50 km</option>
                                    <option value={100}>100 km</option>
                                </select>
                            </div>

                            {/* Search Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={discoverEvents}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                            </svg>
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                            </svg>
                                            Discover Events
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Location Info */}
                        <p className="text-xs text-gray-500 mt-3">
                            Searching near: {searchLocation.lat.toFixed(4)}, {searchLocation.lng.toFixed(4)}
                            <button
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => setSearchLocation({
                                                lat: pos.coords.latitude,
                                                lng: pos.coords.longitude
                                            })
                                        );
                                    }
                                }}
                                className="ml-2 text-purple-600 underline"
                            >
                                Update location
                            </button>
                        </p>
                    </div>

                    {/* Results Count */}
                    {events.length > 0 && (
                        <p className="text-sm text-gray-500 mb-4">
                            Found {events.length} event{events.length !== 1 ? 's' : ''} nearby
                        </p>
                    )}

                    {/* Event List */}
                    <EventDiscoveryList
                        events={events}
                        loading={loading}
                        onImport={handleImport}
                        onRefresh={discoverEvents}
                    />
                </div>

                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                            <span><strong>Connect Calendar:</strong> Link your Google Calendar to automatically import your professional events.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                            <span><strong>Discover Events:</strong> Find networking opportunities, conferences, and meetups near you.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                            <span><strong>Import & Network:</strong> Add events to your collection and connect with other attendees.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
