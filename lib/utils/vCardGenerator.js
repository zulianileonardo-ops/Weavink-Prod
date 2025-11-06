/**
 * vCard Generator Utility
 * Generates vCard 3.0 compliant contact files
 * Compatible with Google Contacts, Apple Contacts, Outlook, and all major CRM systems
 * Compliant with RFC 2426 (vCard MIME Directory Profile)
 */

/**
 * Generate a single vCard from contact data
 * @param {Object} contact - Contact object
 * @returns {string} vCard 3.0 formatted string
 */
export function generateVCard(contact) {
  const lines = [];

  // Header
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  // Formatted Name (FN) - Required field
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.name || 'Unknown';
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  // Structured Name (N) - Format: Family;Given;Additional;Prefix;Suffix
  const familyName = escapeVCardValue(contact.lastName || '');
  const givenName = escapeVCardValue(contact.firstName || '');
  lines.push(`N:${familyName};${givenName};;;`);

  // Organization and Title
  if (contact.company) {
    lines.push(`ORG:${escapeVCardValue(contact.company)}`);
  }

  if (contact.position || contact.jobTitle) {
    lines.push(`TITLE:${escapeVCardValue(contact.position || contact.jobTitle)}`);
  }

  // Email
  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(contact.email)}`);
  }

  // Phone numbers
  if (contact.phone) {
    // Determine phone type
    const phoneType = contact.phoneType || 'WORK';
    lines.push(`TEL;TYPE=${phoneType}:${escapeVCardValue(contact.phone)}`);
  }

  if (contact.mobilePhone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.mobilePhone)}`);
  }

  // Address
  if (contact.address) {
    // vCard ADR format: PO Box;Extended Address;Street;Locality;Region;Postal Code;Country
    const addr = typeof contact.address === 'string' ? { street: contact.address } : contact.address;
    const poBox = '';
    const extAddr = '';
    const street = escapeVCardValue(addr.street || addr.address || '');
    const locality = escapeVCardValue(addr.city || '');
    const region = escapeVCardValue(addr.state || addr.region || '');
    const postalCode = escapeVCardValue(addr.postalCode || addr.zip || '');
    const country = escapeVCardValue(addr.country || '');

    lines.push(`ADR;TYPE=WORK:${poBox};${extAddr};${street};${locality};${region};${postalCode};${country}`);
  }

  // Website/URL
  if (contact.website) {
    lines.push(`URL:${escapeVCardValue(contact.website)}`);
  }

  // Social media links
  if (contact.linkedin) {
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardValue(contact.linkedin)}`);
  }

  if (contact.twitter) {
    lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardValue(contact.twitter)}`);
  }

  // Notes (private notes from Weavink)
  if (contact.notes) {
    lines.push(`NOTE:${escapeVCardValue(contact.notes)}`);
  }

  // Tags/Categories
  if (contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0) {
    const categories = contact.tags.map(t => escapeVCardValue(t)).join(',');
    lines.push(`CATEGORIES:${categories}`);
  }

  // Custom Weavink fields
  if (contact.metAt || contact.location) {
    const metInfo = [contact.metAt, contact.location].filter(Boolean).join(' - ');
    lines.push(`X-WEAVINK-MET:${escapeVCardValue(metInfo)}`);
  }

  if (contact.created) {
    lines.push(`REV:${formatVCardDate(contact.created)}`);
  }

  // Photo/Avatar (if available)
  if (contact.photoUrl || contact.avatarUrl) {
    // Note: For actual production, you'd want to embed the image as base64
    // For now, we'll just include the URL
    lines.push(`PHOTO;VALUE=URI:${escapeVCardValue(contact.photoUrl || contact.avatarUrl)}`);
  }

  // Footer
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Generate multiple vCards as a single file
 * @param {Array<Object>} contacts - Array of contact objects
 * @returns {string} Multiple vCard entries concatenated
 */
export function generateVCards(contacts) {
  if (!contacts || !Array.isArray(contacts)) {
    return '';
  }

  return contacts.map(contact => generateVCard(contact)).join('\r\n\r\n');
}

/**
 * Escape special characters for vCard format
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeVCardValue(value) {
  if (!value) return '';

  // Convert to string
  let str = String(value);

  // Escape special characters per RFC 2426
  str = str.replace(/\\/g, '\\\\'); // Backslash
  str = str.replace(/;/g, '\\;'); // Semicolon
  str = str.replace(/,/g, '\\,'); // Comma
  str = str.replace(/\n/g, '\\n'); // Newline
  str = str.replace(/\r/g, ''); // Remove carriage returns

  return str;
}

/**
 * Format date for vCard (ISO 8601)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date (YYYYMMDDTHHMMSSZ)
 */
function formatVCardDate(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } catch (error) {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
}

/**
 * Create a vCard file blob (for browser download)
 * @param {Array<Object>} contacts - Array of contacts
 * @returns {Blob} vCard file blob
 */
export function createVCardBlob(contacts) {
  const vCardContent = generateVCards(contacts);
  return new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
}

/**
 * Convert contact from Weavink format to standard vCard fields
 * @param {Object} weavinkContact - Contact in Weavink format
 * @returns {Object} Normalized contact object
 */
export function normalizeContact(weavinkContact) {
  return {
    firstName: weavinkContact.firstName || weavinkContact.name?.split(' ')[0] || '',
    lastName: weavinkContact.lastName || weavinkContact.name?.split(' ').slice(1).join(' ') || '',
    name: weavinkContact.name || [weavinkContact.firstName, weavinkContact.lastName].filter(Boolean).join(' '),
    email: weavinkContact.email || '',
    phone: weavinkContact.phone || weavinkContact.phoneNumber || '',
    mobilePhone: weavinkContact.mobilePhone || weavinkContact.mobile || '',
    company: weavinkContact.company || weavinkContact.organization || '',
    position: weavinkContact.position || weavinkContact.jobTitle || weavinkContact.title || '',
    address: weavinkContact.address || weavinkContact.location || '',
    website: weavinkContact.website || weavinkContact.url || '',
    linkedin: weavinkContact.linkedin || weavinkContact.linkedinUrl || '',
    twitter: weavinkContact.twitter || weavinkContact.twitterHandle || '',
    notes: weavinkContact.notes || weavinkContact.note || '',
    tags: weavinkContact.tags || weavinkContact.categories || [],
    metAt: weavinkContact.metAt || weavinkContact.whereWeMet || '',
    location: weavinkContact.locationMet || '',
    photoUrl: weavinkContact.photoUrl || weavinkContact.avatarUrl || weavinkContact.profilePicture || '',
    created: weavinkContact.createdAt || weavinkContact.created || new Date(),
  };
}

/**
 * Export contacts to vCard format with normalization
 * @param {Array<Object>} weavinkContacts - Contacts in Weavink format
 * @returns {string} vCard formatted string
 */
export function exportContactsToVCard(weavinkContacts) {
  const normalizedContacts = weavinkContacts.map(contact => normalizeContact(contact));
  return generateVCards(normalizedContacts);
}
