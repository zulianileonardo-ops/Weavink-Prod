// app/dashboard/(dashboard pages)/contacts/components/GroupModalComponents/CreateGroupTab.jsx
"use client"
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ContactSelector from './creategroup/ContactSelector';
import TimeFrameSelector from './creategroup/TimeFrameSelector';
import LocationSelector from './creategroup/LocationSelector'; // TODO: Uncomment when LocationSelector is refactored

export default function CreateGroupTab({
    contacts,
    formState,
    updateFormState,
    onCreateGroup,
    isSubmitting
}) {
    return (
        <form onSubmit={onCreateGroup} className="space-y-6">
            <div className="space-y-6">
                <GroupBasicInfo
                    formState={formState}
                    updateFormState={updateFormState}
                    isSubmitting={isSubmitting}
                />

                 <LocationSelector
                    eventLocation={formState.eventLocation}
                    onLocationSelect={(location) => updateFormState({ eventLocation: location })}
                /> 

                <TimeFrameSelector
                    useTimeFrame={formState.useTimeFrame}
                    startDate={formState.startDate}
                    endDate={formState.endDate}
                    timeFramePreset={formState.timeFramePreset}
                    contacts={contacts}
                    onToggleTimeFrame={(useTimeFrame) => updateFormState({ useTimeFrame })}
                    onDateChange={(field, value) => updateFormState({ [field]: value })}
                    onPresetChange={(preset, dates) => updateFormState({
                        timeFramePreset: preset,
                        ...dates
                    })}
                    onContactsChange={(contactIds) => updateFormState({ selectedContacts: contactIds })}
                    isSubmitting={isSubmitting}
                />

                {!formState.useTimeFrame && (
                    <ContactSelector
                        contacts={contacts}
                        selectedContacts={formState.selectedContacts}
                        onSelectionChange={(contactIds) => updateFormState({ selectedContacts: contactIds })}
                        isSubmitting={isSubmitting}
                    />
                )}

                <SubmissionFeedback formState={formState} />
            </div>

            <ActionButtons
                formState={formState}
                isSubmitting={isSubmitting}
                onClose={() => updateFormState({ showCreateModal: false })}
            />
        </form>
    );
}

// Supporting Components

function GroupBasicInfo({ formState, updateFormState, isSubmitting }) {
    return (
        <>
            <GroupNameInput
                value={formState.newGroupName}
                onChange={(value) => updateFormState({ newGroupName: value })}
                isSubmitting={isSubmitting}
            />

            <GroupTypeSelector
                value={formState.newGroupType}
                onChange={(value) => updateFormState({ newGroupType: value })}
                isSubmitting={isSubmitting}
            />

            <GroupDescriptionInput
                value={formState.newGroupDescription}
                onChange={(value) => updateFormState({ newGroupDescription: value })}
                isSubmitting={isSubmitting}
                suggestionMetadata={formState.suggestionMetadata}
                groupName={formState.newGroupName}
            />
        </>
    );
}

function GroupNameInput({ value, onChange, isSubmitting }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={isSubmitting}
            />
        </div>
    );
}

function GroupTypeSelector({ value, onChange, isSubmitting }) {
    const groupTypes = [
        { value: 'custom', label: '👥 Custom Group' },
        { value: 'company', label: '🏢 Company/Organization' },
        { value: 'event', label: '📅 Event-based' }
    ];

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Type</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isSubmitting}
            >
                {groupTypes.map(type => (
                    <option key={type.value} value={type.value}>
                        {type.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function GroupDescriptionInput({ value, onChange, isSubmitting, suggestionMetadata, groupName }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const { currentUser } = useAuth();

    const generateDescription = async () => {
        if (!suggestionMetadata || !currentUser) return;

        setIsGenerating(true);
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/user/contacts/graph/generate-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupName: groupName || suggestionMetadata?.name,
                    type: suggestionMetadata?.type,
                    metadata: suggestionMetadata?.metadata,
                    memberNames: suggestionMetadata?.members?.slice(0, 10).map(m => m.name)
                })
            });
            const data = await response.json();
            if (data.success && data.description) {
                onChange(data.description);
            } else {
                console.error('Failed to generate description:', data.error);
            }
        } catch (error) {
            console.error('Failed to generate description:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                {suggestionMetadata && (
                    <button
                        type="button"
                        onClick={generateDescription}
                        disabled={isGenerating || isSubmitting}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                                Generate with AI
                            </>
                        )}
                    </button>
                )}
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter group description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-vertical"
                disabled={isSubmitting || isGenerating}
            />
        </div>
    );
}

function SubmissionFeedback({ formState }) {
    if (formState.selectedContacts.length === 0) return null;

    return (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <FeedbackHeader selectedCount={formState.selectedContacts.length} />
            {formState.useTimeFrame && formState.startDate && formState.endDate && (
                <TimeFrameDisplay
                    startDate={formState.startDate}
                    endDate={formState.endDate}
                />
            )}
        </div>
    );
}

function FeedbackHeader({ selectedCount }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-green-800">
                Ready to create group with {selectedCount} contact{selectedCount !== 1 ? 's' : ''}
            </span>
        </div>
    );
}

function TimeFrameDisplay({ startDate, endDate }) {
    return (
        <div className="text-sm text-green-700">
            Time frame: {new Date(startDate).toLocaleString()} - {new Date(endDate).toLocaleString()}
        </div>
    );
}

function ActionButtons({ formState, isSubmitting, onClose }) {
    const isDisabled = !formState.newGroupName.trim() || formState.selectedContacts.length === 0 || isSubmitting;

    return (
        <div className="flex gap-3 pt-2">
            <CancelButton onClick={onClose} isSubmitting={isSubmitting} />
            <SubmitButton
                isDisabled={isDisabled}
                isSubmitting={isSubmitting}
                selectedCount={formState.selectedContacts.length}
            />
        </div>
    );
}

function CancelButton({ onClick, isSubmitting }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isSubmitting}
        >
            Cancel
        </button>
    );
}

function SubmitButton({ isDisabled, isSubmitting, selectedCount }) {
    return (
        <button
            type="submit"
            disabled={isDisabled}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
            {isSubmitting ? (
                <SubmittingState />
            ) : (
                `Create Group (${selectedCount})`
            )}
        </button>
    );
}

function SubmittingState() {
    return (
        <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Creating...</span>
        </>
    );
}
