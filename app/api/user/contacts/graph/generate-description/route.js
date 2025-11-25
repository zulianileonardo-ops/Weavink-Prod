// app/api/user/contacts/graph/generate-description/route.js
// POST - Generate group description using Gemini AI

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/user/contacts/graph/generate-description
 * Generates a group description using Gemini AI based on suggestion metadata
 *
 * Body params:
 * - groupName: string - The name of the group
 * - type: string - Suggestion type (company, tag, semantic, knows)
 * - metadata: object - Additional metadata (company name, tag name, etc.)
 * - memberNames: string[] - Names of group members (limited to 10)
 */
export async function POST(request) {
  console.log('POST /api/user/contacts/graph/generate-description - Request received');

  try {
    // 1. Authenticate
    const session = await createApiSession(request);
    console.log('Session created for user:', session.userId);

    // 2. Parse request body
    const { groupName, type, metadata, memberNames } = await request.json();

    if (!groupName) {
      return NextResponse.json({
        success: false,
        error: 'Group name is required'
      }, { status: 400 });
    }

    // 3. Build the prompt
    const prompt = buildDescriptionPrompt(groupName, type, metadata, memberNames);
    console.log('Generating description for:', groupName, 'type:', type);

    // 4. Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const description = response.text().trim();

    console.log('Generated description:', description.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      description
    });

  } catch (error) {
    console.error('API Error in POST /api/user/contacts/graph/generate-description:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to generate description',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Build a type-specific prompt for Gemini to generate a group description
 */
function buildDescriptionPrompt(groupName, type, metadata, memberNames) {
  const membersText = memberNames?.length > 0
    ? `Members include: ${memberNames.join(', ')}.`
    : '';

  const prompts = {
    company: `Write a brief, professional description (2-3 sentences) for a contact group named "${groupName}" containing colleagues from ${metadata?.company || 'the same company'}. ${membersText}

The description should:
- Highlight the professional connection between group members
- Be suitable for a CRM or contact management system
- Be concise but informative

Return ONLY the description text, nothing else.`,

    tag: `Write a brief description (2-3 sentences) for a contact group named "${groupName}" of contacts tagged with "${metadata?.tag || 'a common tag'}". ${membersText}

The description should:
- Explain what the tag represents and why these contacts are grouped
- Be suitable for a CRM or contact management system
- Be concise but informative

Return ONLY the description text, nothing else.`,

    semantic: `Write a brief description (2-3 sentences) for a contact group named "${groupName}" of similar professionals who share common traits. ${membersText}

The description should:
- Describe the shared characteristics that connect these contacts
- Be suitable for a CRM or contact management system
- Be concise but informative

Return ONLY the description text, nothing else.`,

    knows: `Write a brief description (2-3 sentences) for a contact group named "${groupName}" representing a social network cluster${metadata?.centralContact ? ` centered around ${metadata.centralContact}` : ''}. ${membersText}

The description should:
- Describe the social or professional connections in this network
- Be suitable for a CRM or contact management system
- Be concise but informative

Return ONLY the description text, nothing else.`
  };

  return prompts[type] || prompts.semantic;
}
