// app/api/user/contacts/download-vcard/route.js
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { generatePublicProfileVCard } from '@/lib/utils/vCardGenerator';

/**
 * Fetch image from URL and convert to base64
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<Object>} Object with base64 data and type
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    console.log('🖼️ Fetching image from:', imageUrl);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Determine image type from content-type
    let imageType = 'JPEG';
    if (contentType.includes('png')) {
      imageType = 'PNG';
    } else if (contentType.includes('gif')) {
      imageType = 'GIF';
    } else if (contentType.includes('webp')) {
      imageType = 'WEBP';
    }

    console.log('✅ Image converted to base64:', {
      type: imageType,
      size: `${(base64.length / 1024).toFixed(2)} KB`
    });

    return {
      base64,
      type: imageType
    };
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    const { identifier, type, selectedFields } = await request.json();

    console.log('📇 API: Generating vCard for profile:', { identifier, type });

    if (!identifier || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identifier and type are required'
        },
        { status: 400 }
      );
    }

    let userDoc;
    let userId;

    if (type === 'userId') {
      // Look up by user ID
      userDoc = await adminDb.collection('users').doc(identifier).get();
      userId = identifier;

      if (!userDoc.exists) {
        return NextResponse.json({
          success: false,
          error: 'Profile not found'
        }, { status: 404 });
      }
    } else if (type === 'username') {
      // Look up by username
      const querySnapshot = await adminDb
        .collection('users')
        .where('username', '==', identifier.trim().toLowerCase())
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return NextResponse.json({
          success: false,
          error: 'Profile not found'
        }, { status: 404 });
      }

      userDoc = querySnapshot.docs[0];
      userId = userDoc.id;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid type. Must be "userId" or "username"'
        },
        { status: 400 }
      );
    }

    const userData = userDoc.data();
    const settings = userData.settings || {};
    const profile = userData.profile || {};

    // Check if user is active
    if (userData.accountStatus === 'suspended' || userData.accountStatus === 'deleted') {
      return NextResponse.json({
        success: false,
        error: 'Profile is not available'
      }, { status: 403 });
    }

    // Check if download contact is enabled (default to true)
    const downloadContactEnabled = settings.downloadContactEnabled !== false;

    if (!downloadContactEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Contact download is not enabled for this profile'
      }, { status: 403 });
    }

    // Get allowed fields from user settings (default to all enabled)
    const defaultAllowedFields = {
      displayName: true,
      email: true,
      bio: true,
      location: true,
      website: true,
      photo: true,
      linkedin: true,
      twitter: true,
      instagram: true,
      facebook: true
    };

    const allowedFields = settings.downloadContactFields || defaultAllowedFields;

    // Filter selectedFields to only include fields allowed by owner (security measure)
    let filteredSelectedFields = selectedFields;
    if (selectedFields && typeof selectedFields === 'object') {
      filteredSelectedFields = {};
      for (const [field, value] of Object.entries(selectedFields)) {
        // Only include field if visitor selected it AND owner allows it
        if (value && allowedFields[field] !== false) {
          filteredSelectedFields[field] = true;
        }
      }
      console.log('🔒 Filtered selected fields based on owner permissions:', filteredSelectedFields);
    }

    // Check if profile has required info
    const hasContactInfo = profile.displayName || userData.displayName || userData.email;

    if (!hasContactInfo) {
      return NextResponse.json({
        success: false,
        error: 'Profile does not have sufficient contact information'
      }, { status: 400 });
    }

    // Get base URL from request headers (for profile URL in vCard)
    // Always use production domain for vCard URLs (not localhost)
    let host = request.headers.get('host') || 'weavink.com';
    let protocol = request.headers.get('x-forwarded-proto') || 'https';

    // Force production domain if on localhost/development
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      host = 'weavink.com';
      protocol = 'https'; // Always use https for production
    }

    const baseUrl = `${protocol}://${host}`;

    console.log('🔧 Generating vCard with base URL:', baseUrl);
    console.log('🌐 Profile URL will be:', `${baseUrl}/${userData.username}`);

    // Fetch and convert avatar image to base64 for embedding
    let photoBase64 = null;
    let photoType = null;
    const avatarUrl = profile.avatarUrl || userData.avatarUrl;

    if (avatarUrl) {
      const imageData = await fetchImageAsBase64(avatarUrl);
      if (imageData) {
        photoBase64 = imageData.base64;
        photoType = imageData.type;
      }
    }

    // Prepare user data for vCard generation
    const userDataForVCard = {
      uid: userId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName,
      profile: {
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        location: profile.location
      },
      socials: userData.socials || [],
      avatarUrl: userData.avatarUrl,
      createdAt: userData.createdAt,
      // Add base64 photo data for embedding
      photoBase64,
      photoType
    };

    // Generate vCard with filtered selected fields
    const vcard = generatePublicProfileVCard(userDataForVCard, baseUrl, filteredSelectedFields);

    console.log('✅ API: vCard generated with filtered fields:', filteredSelectedFields ? Object.keys(filteredSelectedFields).filter(k => filteredSelectedFields[k]).length + ' fields' : 'all fields');

    // Generate filename from username
    const filename = userData.username
      ? `${userData.username}.vcf`
      : `contact-${userId}.vcf`;

    console.log('✅ API: vCard generated successfully:', filename);

    return NextResponse.json({
      success: true,
      vcard,
      filename,
      profile: {
        username: userData.username,
        displayName: profile.displayName || userData.displayName || userData.username
      }
    });

  } catch (error) {
    console.error('❌ API: Error generating vCard:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}
