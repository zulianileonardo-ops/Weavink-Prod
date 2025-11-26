'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Globe,
  Users,
  EyeOff,
  Ghost,
  UserPlus,
  Network,
  Search,
  GraduationCap,
  Handshake,
  DollarSign,
  ShoppingBag,
  Heart,
  Mic,
  Store,
  Calendar,
  MapPin,
  Clock,
  X,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import {
  EVENT_VISIBILITY_MODES,
  EVENT_VISIBILITY_DESCRIPTIONS,
  PARTICIPATION_INTENTS,
  PARTICIPATION_INTENT_LABELS,
  LOOKING_FOR_TYPES,
  LOOKING_FOR_LABELS,
  OFFERING_TYPES,
  OFFERING_LABELS
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

// Map icon names to Lucide components
const INTENT_ICONS = {
  UserPlus,
  Network,
  Search,
  GraduationCap,
  Handshake,
  DollarSign,
  ShoppingBag,
  Heart,
  Mic,
  Store
};

const VISIBILITY_ICONS = {
  Globe,
  Users,
  EyeOff,
  Ghost
};

// RSVP Status options
const RSVP_STATUSES = [
  { value: 'confirmed', label: 'Attending', color: 'green', icon: Check },
  { value: 'maybe', label: 'Maybe', color: 'yellow', icon: HelpCircle },
  { value: 'declined', label: 'Not Going', color: 'red', icon: X }
];

/**
 * EventPanel Component - Right-side sliding panel for event RSVP
 *
 * Features:
 * - RSVP status selection (Attending, Maybe, Not Going)
 * - Primary intent selection with icons
 * - Secondary intents multi-select chips
 * - 4-tier visibility mode selection
 * - Looking for / Offering selections (collapsible)
 */
export default function EventPanel({
  isOpen = false,
  onClose = null,
  event = null,
  contactId = null,
  existingParticipation = null,
  onSave = null,
  subscriptionLevel = 'pro'
}) {
  // Form state
  const [status, setStatus] = useState('confirmed');
  const [visibility, setVisibility] = useState(EVENT_VISIBILITY_MODES.FRIENDS);
  const [primaryIntent, setPrimaryIntent] = useState(PARTICIPATION_INTENTS.NETWORKING);
  const [secondaryIntents, setSecondaryIntents] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [offering, setOffering] = useState([]);
  const [notes, setNotes] = useState('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form from existing participation
  useEffect(() => {
    if (existingParticipation) {
      setStatus(existingParticipation.status || 'confirmed');
      setVisibility(existingParticipation.visibility || EVENT_VISIBILITY_MODES.FRIENDS);
      setPrimaryIntent(existingParticipation.intent || PARTICIPATION_INTENTS.NETWORKING);
      setSecondaryIntents(existingParticipation.secondaryIntents || []);
      setLookingFor(existingParticipation.lookingFor || []);
      setOffering(existingParticipation.offering || []);
      setNotes(existingParticipation.notes || '');
    } else {
      // Reset to defaults
      setStatus('confirmed');
      setVisibility(EVENT_VISIBILITY_MODES.FRIENDS);
      setPrimaryIntent(PARTICIPATION_INTENTS.NETWORKING);
      setSecondaryIntents([]);
      setLookingFor([]);
      setOffering([]);
      setNotes('');
    }
  }, [existingParticipation, isOpen]);

  // Toggle secondary intent
  const toggleSecondaryIntent = useCallback((intent) => {
    setSecondaryIntents(prev => {
      if (prev.includes(intent)) {
        return prev.filter(i => i !== intent);
      }
      // Max 3 secondary intents
      if (prev.length >= 3) {
        toast.error('Maximum 3 secondary intents allowed');
        return prev;
      }
      return [...prev, intent];
    });
  }, []);

  // Toggle looking for
  const toggleLookingFor = useCallback((type) => {
    setLookingFor(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  // Toggle offering
  const toggleOffering = useCallback((type) => {
    setOffering(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!event?.id || !contactId) {
      toast.error('Missing event or contact information');
      return;
    }

    setIsLoading(true);

    try {
      const participationData = {
        contactId,
        status,
        visibility,
        intent: primaryIntent,
        secondaryIntents,
        lookingFor,
        offering,
        notes
      };

      // Determine if creating or updating
      const method = existingParticipation ? 'PUT' : 'POST';

      const response = await fetch(`/api/events/${event.id}/attendance`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      toast.success(existingParticipation ? 'Attendance updated!' : 'RSVP confirmed!');

      if (onSave) {
        onSave(data.participation);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove attendance
  const handleRemove = async () => {
    if (!event?.id || !contactId || !existingParticipation) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/events/${event.id}/attendance`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove attendance');
      }

      toast.success('Removed from event');

      if (onSave) {
        onSave(null);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to remove attendance:', error);
      toast.error(error.message || 'Failed to remove');
    } finally {
      setIsLoading(false);
    }
  };

  // Check feature availability
  const hasFeature = (feature) => {
    // Pro and above have all visibility modes
    const level = subscriptionLevel?.toLowerCase() || 'pro';
    return level !== 'base';
  };

  if (!isOpen || !event) return null;

  // Format event date
  const formatEventDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Event RSVP</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-white/95 line-clamp-2">
            {event.name || event.title || 'Untitled Event'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatEventDate(event.date || event.startDate)}</span>
            </div>
          </div>
          {event.location?.name && (
            <div className="flex items-center gap-1 text-sm text-white/80">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{event.location.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* RSVP Status Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            RSVP Status
          </label>
          <div className="flex gap-2">
            {RSVP_STATUSES.map(({ value, label, color, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  status === value
                    ? color === 'green'
                      ? 'bg-green-500 text-white ring-2 ring-green-300'
                      : color === 'yellow'
                        ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                        : 'bg-red-500 text-white ring-2 ring-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Intent Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Why are you attending?
          </label>
          <select
            value={primaryIntent}
            onChange={(e) => setPrimaryIntent(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
          >
            {Object.entries(PARTICIPATION_INTENTS).map(([key, value]) => {
              const label = PARTICIPATION_INTENT_LABELS[value];
              return (
                <option key={key} value={value}>
                  {label?.label || key}
                </option>
              );
            })}
          </select>
        </div>

        {/* Secondary Intents Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Additional goals (max 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PARTICIPATION_INTENTS)
              .filter(([_, value]) => value !== primaryIntent)
              .map(([key, value]) => {
                const label = PARTICIPATION_INTENT_LABELS[value];
                const isSelected = secondaryIntents.includes(value);
                const IconComponent = INTENT_ICONS[label?.icon];

                return (
                  <button
                    key={key}
                    onClick={() => toggleSecondaryIntent(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    {label?.label || key}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Visibility Mode Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            Who can see you at this event?
          </label>
          <div className="space-y-2">
            {Object.entries(EVENT_VISIBILITY_MODES).map(([key, value]) => {
              const desc = EVENT_VISIBILITY_DESCRIPTIONS[value];
              const IconComponent = VISIBILITY_ICONS[desc?.icon];
              const isSelected = visibility === value;
              const isDisabled = (value === 'friends' || value === 'ghost') && !hasFeature('VISIBILITY');

              return (
                <button
                  key={key}
                  onClick={() => !isDisabled && setVisibility(value)}
                  disabled={isDisabled}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200'
                      : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      {IconComponent && (
                        <IconComponent className={`w-4 h-4 ${
                          isSelected ? 'text-purple-600' : 'text-gray-500'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          {desc?.title}
                        </span>
                        {isDisabled && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                            PRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {desc?.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Options (Collapsible) */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Advanced Matching Options
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 space-y-5 border-t border-gray-200">
              {/* Looking For Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {"I'm looking for..."}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(LOOKING_FOR_TYPES).map(([key, value]) => {
                    const isSelected = lookingFor.includes(value);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleLookingFor(value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {LOOKING_FOR_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Offering Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  I can offer...
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(OFFERING_TYPES).map(([key, value]) => {
                    const isSelected = offering.includes(value);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleOffering(value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {OFFERING_LABELS[value]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Personal notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about your attendance..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
        <div className="flex gap-3">
          {existingParticipation && (
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-sm text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              existingParticipation ? 'Update' : 'Confirm RSVP'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
