// lib/services/serviceContact/server/ContactCRUDService.js
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { ContactValidationService } from './contactValidationService';
import { VectorStorageService } from './vectorStorageService'; // NEW: Updated to use VectorStorageService
import Neo4jSyncService from './neo4j/Neo4jSyncService'; // NEW: Neo4j graph sync
import { AutoTaggingService } from './AutoTaggingService'; // NEW: Auto-tagging support

/**
 * A dedicated server-side service for all core Create, Read, Update, Delete (CRUD)
 * operations on individual contact records.
 */
export class ContactCRUDService {

    /**
     * Fetches all contacts for a given user.
     * @param {{ session: object }} { session } The authenticated user session.
     * @returns {Promise<Array>} The user's contacts.
     */
    static async getAllContacts({ session }) {
        console.log('🔍 ContactCRUDService.getAllContacts - User:', session.userId);
        
        try {
            const contactsDoc = await adminDb.collection('Contacts').doc(session.userId).get();
            
            console.log('📄 Document exists:', contactsDoc.exists);
            
            if (!contactsDoc.exists) {
                console.log('⚠️ No contacts document found for user:', session.userId);
                return [];
            }
            
            const data = contactsDoc.data();
            const contacts = data?.contacts || [];
            
            console.log('✅ Found contacts:', contacts.length);
            if (contacts.length > 0) {
                console.log('📊 Sample contact:', {
                    id: contacts[0].id,
                    name: contacts[0].name,
                    status: contacts[0].status
                });
            }
            
            return contacts;
        } catch (error) {
            console.error('❌ Error in getAllContacts:', error);
            throw error;
        }
    }


    /**
     * Creates a new contact for a user.
     * @param {{ contactData: object, session: object }} { contactData, session }
     * @returns {Promise<object>} The newly created contact.
     */
    static async createContact({ contactData, session }) {
        const validation = ContactValidationService.validateContactData(contactData);
        if (!validation.isValid) {
            throw new Error(`Invalid contact data: ${validation.errors.join(', ')}`);
        }

        const { phone, ...restOfContactData } = contactData; // Destructure to remove the old 'phone' field
        const newContact = {
            ...restOfContactData, // Use the rest of the data
            id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdBy: session.userId,
            submittedAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
        };

        // NEW: Auto-tag contact if enabled (opt-out, default: enabled)
        if (contactData.enableAutoTag !== false) {
            try {
                console.log('[ContactCRUD] 🏷️ Auto-tagging contact:', newContact.name || newContact.id);

                // Fetch user data for feature flags
                const userDoc = await adminDb.collection('AccountData').doc(session.userId).get();
                const userData = userDoc.exists ? userDoc.data() : {};

                // Call AutoTaggingService
                const taggedContact = await AutoTaggingService.tagContact(
                    newContact,
                    session.userId,
                    userData,
                    null,  // sessionId: null for manual contact creation (standalone operation)
                    null   // budgetCheck: null (will be checked inside tagContact)
                );

                // Merge tags into newContact
                if (taggedContact.tags && Array.isArray(taggedContact.tags)) {
                    newContact.tags = taggedContact.tags;
                    if (taggedContact.metadata) {
                        newContact.metadata = {
                            ...newContact.metadata,
                            ...taggedContact.metadata
                        };
                    }
                    console.log('[ContactCRUD] ✅ Tags added:', taggedContact.tags);
                } else {
                    console.log('[ContactCRUD] ⏭️ No tags generated (likely skipped or cached miss)');
                }
            } catch (error) {
                // Graceful degradation: continue without tags
                console.error('[ContactCRUD] ⚠️ Auto-tagging failed, continuing without tags:', error.message);
                newContact.tags = newContact.tags || []; // Ensure tags array exists
            }
        } else {
            console.log('[ContactCRUD] ⏭️ Auto-tagging disabled for this contact');
            newContact.tags = newContact.tags || []; // Ensure tags array exists
        }

        const contactsRef = adminDb.collection('Contacts').doc(session.userId);

        // Check if document exists
        const doc = await contactsRef.get();

        if (doc.exists) {
            // Document exists, use arrayUnion to add the contact
            await contactsRef.update({
                contacts: FieldValue.arrayUnion(newContact)
            });
        } else {
            // Document doesn't exist, create it with the first contact
            await contactsRef.set({
                contacts: [newContact],
                userId: session.userId,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            });
        }

        // Trigger vector update in the background (fire-and-forget)
        // NEW: Using VectorStorageService instead of VectorService
        console.log('[VECTOR] 🚀 Triggering background vector upsert (manual creation)', {
            contactId: newContact.id,
            subscriptionLevel: session.subscriptionLevel,
            source: 'manual_creation'
        });

        VectorStorageService.upsertContactVector(
            newContact,
            session.subscriptionLevel,
            null  // No session for manual creation (standalone operation)
        )
            .catch(err => console.error("[VECTOR] ❌ Background vector update failed on create:", err));

        // NEW: Sync to Neo4j graph (fire-and-forget)
        Neo4jSyncService.syncContactAsync(session.userId, newContact);

        return newContact;
    }

    /**
     * Updates an existing contact.
     * @param {{ contactId: string, updates: object, session: object }} { contactId, updates, session }
     * @returns {Promise<object>} The updated contact data.
     */
    static async updateContact({ contactId, updates, session }) {
        const contactsRef = adminDb.collection('Contacts').doc(session.userId);
        const contactsDoc = await contactsRef.get();
        if (!contactsDoc.exists) throw new Error("User contacts not found.");

        const allContacts = contactsDoc.data().contacts || [];
        let contactToUpdate = null;
        const updatedContacts = allContacts.map(contact => {
            if (contact.id === contactId) {
                contactToUpdate = { 
                    ...contact, 
                    ...updates, 
                    lastModified: new Date().toISOString() 
                };
                return contactToUpdate;
            }
            return contact;
        });

        if (!contactToUpdate) throw new Error(`Contact with ID ${contactId} not found.`);

        await contactsRef.update({ contacts: updatedContacts });

        // Trigger vector update in the background
        // NEW: Using VectorStorageService instead of VectorService
        VectorStorageService.upsertContactVector(
            contactToUpdate,
            session.subscriptionLevel,
            null  // No session for manual update (standalone operation)
        )
            .catch(err => console.error("[VECTOR] ❌ Background vector update failed on update:", err));

        // NEW: Sync to Neo4j graph (fire-and-forget)
        Neo4jSyncService.syncContactAsync(session.userId, contactToUpdate);

        return contactToUpdate;
    }

    /**
     * Deletes a contact.
     * @param {{ contactId: string, session: object }} { contactId, session }
     * @returns {Promise<{success: boolean}>}
     */
    static async deleteContact({ contactId, session }) {
        const contactsRef = adminDb.collection('Contacts').doc(session.userId);
        const contactsDoc = await contactsRef.get();
        if (!contactsDoc.exists) return { success: true }; // Already gone

        const allContacts = contactsDoc.data().contacts || [];
        const updatedContacts = allContacts.filter(contact => contact.id !== contactId);

        if (allContacts.length === updatedContacts.length) {
            console.warn(`Attempted to delete non-existent contact ${contactId} for user ${session.userId}`);
            return { success: true };
        }

        await contactsRef.update({ contacts: updatedContacts });

        // Trigger vector deletion in the background
        // NEW: Using VectorStorageService instead of VectorService
        VectorStorageService.deleteContactVector(contactId, session.userId)
            .catch(err => console.error("[VECTOR] ❌ Background vector deletion failed:", err));

        // NEW: Delete from Neo4j graph (fire-and-forget)
        Neo4jSyncService.deleteContactAsync(session.userId, contactId);

        return { success: true };
    }
}