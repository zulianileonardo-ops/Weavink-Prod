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

  if (contact.instagram) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${escapeVCardValue(contact.instagram)}`);
  }

  if (contact.facebook) {
    lines.push(`X-SOCIALPROFILE;TYPE=facebook:${escapeVCardValue(contact.facebook)}`);
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
  if (contact.photoBase64) {
    // Embedded base64 image (recommended for compatibility)
    const imageType = contact.photoType || 'JPEG';
    lines.push(`PHOTO;ENCODING=b;TYPE=${imageType}:${contact.photoBase64}`);
  } else if (contact.photoUrl || contact.avatarUrl) {
    // Fallback to URL reference (less compatible)
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

/**
 * Convert public profile data to vCard format
 * @param {Object} userData - Public profile user data
 * @param {string} baseUrl - Base URL for profile link (optional)
 * @returns {Object} Normalized contact object for vCard generation
 */
export function normalizePublicProfile(userData, baseUrl = '') {
  const profile = userData.profile || {};
  const socials = userData.socials || [];

  // Parse social media links from socials array
  const linkedin = socials.find(s => s.platform?.toLowerCase() === 'linkedin')?.url || '';
  const twitter = socials.find(s => s.platform?.toLowerCase() === 'twitter')?.url || '';
  const instagram = socials.find(s => s.platform?.toLowerCase() === 'instagram')?.url || '';
  const facebook = socials.find(s => s.platform?.toLowerCase() === 'facebook')?.url || '';

  // Build profile URL with fallback
  let profileUrl = '';
  if (userData.username) {
    if (baseUrl) {
      profileUrl = `${baseUrl}/${userData.username}`;
    } else {
      // Fallback to weavink.com if no baseUrl provided
      profileUrl = `https://weavink.com/${userData.username}`;
    }
  }

  // Split display name into first/last name if possible
  const displayName = profile.displayName || userData.displayName || userData.username || 'Unknown';
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || displayName;
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    firstName,
    lastName,
    name: displayName,
    email: userData.email || '',
    phone: '', // Not available in public profile
    mobilePhone: '', // Not available in public profile
    company: '', // Not available in public profile
    position: '', // Not available in public profile
    address: profile.location || '',
    website: profileUrl,
    linkedin,
    twitter,
    instagram,
    facebook,
    notes: profile.bio || '',
    tags: [],
    metAt: '',
    location: profile.location || '',
    photoUrl: profile.avatarUrl || userData.avatarUrl || '',
    photoBase64: userData.photoBase64 || '',
    photoType: userData.photoType || 'JPEG',
    created: userData.createdAt || new Date(),
  };
}

/**
 * Generate vCard with selective fields
 * @param {Object} contact - Contact object
 * @param {Object} selectedFields - Object with field selection (null = include all)
 * @returns {string} vCard 3.0 formatted string
 */
export function generateSelectiveVCard(contact, selectedFields = null) {
  // If no selection provided, include all fields (default behavior)
  if (!selectedFields) {
    return generateVCard(contact);
  }

  const lines = [];

  // Header
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  // Formatted Name (FN) - Always required
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.name || 'Unknown';
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  // Structured Name (N) - Always required
  const familyName = escapeVCardValue(contact.lastName || '');
  const givenName = escapeVCardValue(contact.firstName || '');
  lines.push(`N:${familyName};${givenName};;;`);

  // Email - Always required if available
  if (selectedFields.email && contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(contact.email)}`);
  }

  // Organization and Title (if available - currently empty for public profiles)
  if (contact.company) {
    lines.push(`ORG:${escapeVCardValue(contact.company)}`);
  }

  if (contact.position || contact.jobTitle) {
    lines.push(`TITLE:${escapeVCardValue(contact.position || contact.jobTitle)}`);
  }

  // Phone numbers (currently not available in public profiles)
  if (contact.phone) {
    const phoneType = contact.phoneType || 'WORK';
    lines.push(`TEL;TYPE=${phoneType}:${escapeVCardValue(contact.phone)}`);
  }

  if (contact.mobilePhone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact.mobilePhone)}`);
  }

  // Address/Location
  if (selectedFields.location && contact.address) {
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
  if (selectedFields.website && contact.website) {
    lines.push(`URL:${escapeVCardValue(contact.website)}`);
  }

  // Social media links
  if (selectedFields.linkedin && contact.linkedin) {
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardValue(contact.linkedin)}`);
  }

  if (selectedFields.twitter && contact.twitter) {
    lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardValue(contact.twitter)}`);
  }

  if (selectedFields.instagram && contact.instagram) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${escapeVCardValue(contact.instagram)}`);
  }

  if (selectedFields.facebook && contact.facebook) {
    lines.push(`X-SOCIALPROFILE;TYPE=facebook:${escapeVCardValue(contact.facebook)}`);
  }

  // Notes/Bio
  if (selectedFields.bio && contact.notes) {
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

  // Photo/Avatar
  if (selectedFields.photo) {
    if (contact.photoBase64) {
      // Embedded base64 image (recommended for compatibility)
      const imageType = contact.photoType || 'JPEG';
      lines.push(`PHOTO;ENCODING=b;TYPE=${imageType}:${contact.photoBase64}`);
    } else if (contact.photoUrl || contact.avatarUrl) {
      // Fallback to URL reference (less compatible)
      lines.push(`PHOTO;VALUE=URI:${escapeVCardValue(contact.photoUrl || contact.avatarUrl)}`);
    }
  }

  // Footer
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Generate vCard from public profile data
 * @param {Object} userData - Public profile user data
 * @param {string} baseUrl - Base URL for profile link (optional)
 * @param {Object} selectedFields - Optional field selection object
 * @returns {string} vCard 3.0 formatted string
 */
export function generatePublicProfileVCard(userData, baseUrl = '', selectedFields = null) {
  const normalizedProfile = normalizePublicProfile(userData, baseUrl);
  return generateSelectiveVCard(normalizedProfile, selectedFields);
}
