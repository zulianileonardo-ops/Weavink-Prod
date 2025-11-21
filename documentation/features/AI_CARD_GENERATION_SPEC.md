---
id: features-ai-card-generation-081
title: AI-Powered Custom Card Generation System
category: features
tags: [ai, card-design, image-generation, gemini, prompt-engineering, moderation, creative, planned]
status: planned
created: 2025-11-21
updated: 2025-11-21
related:
  - technical-cost-tracking-migration-024
  - technical-budget-affordability-028
  - rgpd-consent-guide-045
---

# AI-Powered Custom Card Generation System

## Overview

A creative AI-powered system that allows users to design custom digital business cards by uploading reference files and describing their vision. The system uses a multi-stage AI pipeline to verify appropriateness, engineer optimal prompts, and generate high-quality card designs.

## Business Requirements

### Core Features

1. **File Upload & Vision Input**
   - Users upload reference images/files (logos, photos, inspiration)
   - Text prompt describing desired card design
   - Support for multiple file formats (PNG, JPG, PDF)

2. **Multi-Stage AI Pipeline**
   - **Stage 1:** Content moderation & business appropriateness check
   - **Stage 2:** AI prompt engineering for optimal image generation
   - **Stage 3:** High-quality card image generation
   - **Stage 4:** Preview & refinement options

3. **Premium Feature Requirements**
   - Available to Premium+ users only
   - Cost tracking per generation
   - Monthly generation limits by tier
   - Budget affordability checks

4. **Safety & Moderation**
   - Business-appropriate content verification
   - Reject inappropriate/offensive content
   - GDPR-compliant image storage
   - User consent for AI-generated content

---

## Technical Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  CardGenerationService.js (client)                                 │
│  - uploadFiles()                                                   │
│  - submitGenerationRequest()                                       │
│  - pollGenerationStatus()                                          │
│  - downloadGeneratedCard()                                         │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API ROUTES                                   │
│  /api/user/cards/generate/route.js                                │
│  /api/user/cards/status/route.js                                  │
│  /api/user/cards/refine/route.js                                  │
│                                                                    │
│  - Authentication (createApiSession)                               │
│  - Permission checks (PREMIUM_CARD_GENERATION)                     │
│  - Budget pre-flight checks (~$0.10 per generation)               │
│  - Rate limiting (follows existing patterns)                       │
│  - File validation (size, type, content)                           │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
│  lib/services/serviceCard/server/                                 │
│  ├── CardGenerationService.js                                     │
│  │   - orchestrateGeneration()                                    │
│  │   - handleGenerationFailure()                                  │
│  │   - trackGenerationMetrics()                                   │
│  ├── ContentModerationService.js                                  │
│  │   - moderatePrompt()                                           │
│  │   - moderateFiles()                                            │
│  │   - checkBusinessAppropriateness()                             │
│  ├── PromptEngineeringService.js                                  │
│  │   - enhanceUserPrompt()                                        │
│  │   - buildImageGenerationPrompt()                               │
│  │   - optimizeForCardDesign()                                    │
│  └── ImageGenerationService.js                                    │
│      - generateCardImage()                                        │
│      - applyCardTemplate()                                        │
│      - optimizeForWeb()                                           │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      AI PIPELINE                                    │
│                                                                    │
│  Stage 1: Content Moderation (Gemini 3 Pro)                       │
│  - Verify business appropriateness                                 │
│  - Detect inappropriate content                                    │
│  - Flag policy violations                                          │
│  Cost: ~$0.001                                                     │
│                                                                    │
│  Stage 2: Prompt Engineering (Gemini 3 Pro)                       │
│  - Analyze user's vision + files                                   │
│  - Generate optimized image prompt                                 │
│  - Add technical parameters                                        │
│  Cost: ~$0.002                                                     │
│                                                                    │
│  Stage 3: Image Generation (Imagen 2 / Stable Diffusion)          │
│  - Generate high-quality card design                               │
│  - Apply business card constraints                                 │
│  - Multiple style options                                          │
│  Cost: ~$0.10                                                      │
│                                                                    │
│  Total Pipeline Cost: ~$0.103 per generation                       │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    STORAGE & DATABASE                               │
│  Firebase Storage:                                                 │
│  - User uploaded files (/user-uploads/{userId}/{fileId})          │
│  - Generated cards (/generated-cards/{userId}/{cardId})           │
│  - Thumbnails (/thumbnails/{userId}/{cardId})                     │
│                                                                    │
│  Firestore:                                                        │
│  - GenerationRequests/{requestId}                                 │
│    - status, userId, prompt, files                                 │
│    - moderationResult, engineeredPrompt                            │
│    - generatedImageUrl, cost, timestamp                            │
│  - UserCardGallery/{userId}/cards/{cardId}                        │
│    - metadata, usage, analytics                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. File Upload & Vision Input

**Component:** `app/dashboard/cards/CardGenerationWizard.jsx`

**Step 1: Upload Files**

```jsx
export default function CardGenerationWizard() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const { t } = useTranslation();

  const handleFileUpload = async (uploadedFiles) => {
    // Validate files
    const validFiles = uploadedFiles.filter(file => {
      const isValidType = ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    // Upload to Firebase Storage
    const uploadPromises = validFiles.map(async (file) => {
      const storageRef = ref(storage, `user-uploads/${userId}/${uuidv4()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { name: file.name, url, type: file.type };
    });

    const uploadedFileData = await Promise.all(uploadPromises);
    setFiles(prev => [...prev, ...uploadedFileData]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        {t('cards.generateCustomCard')}
      </h2>

      {/* File Upload Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          {t('cards.uploadReference')}
        </label>
        <FileDropzone
          onFilesSelected={handleFileUpload}
          maxFiles={5}
          accept="image/*, application/pdf"
          maxSize={10 * 1024 * 1024}
        />

        {/* Preview uploaded files */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative">
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Vision Prompt */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          {t('cards.describeVision')}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('cards.promptPlaceholder')}
          className="w-full h-32 p-4 border border-gray-300 rounded-lg"
          maxLength={1000}
        />
        <p className="text-sm text-gray-500 mt-1">
          {prompt.length}/1000 {t('common.characters')}
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={files.length === 0 || !prompt || generating}
        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
      >
        {generating ? (
          <Spinner />
        ) : (
          t('cards.generateCard')
        )}
      </button>

      {/* Cost Warning */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            {t('cards.costWarning', { cost: '$0.10' })}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Translation Keys:**

```json
// public/locales/en/common.json
{
  "cards": {
    "generateCustomCard": "Generate Custom Card",
    "uploadReference": "Upload Reference Images",
    "describeVision": "Describe Your Vision",
    "promptPlaceholder": "Describe the style, colors, and elements you want in your card. E.g., 'Modern minimalist design with purple gradient, tech company logo, clean typography'",
    "generateCard": "Generate Card ($0.10)",
    "costWarning": "Each generation costs {{cost}} and will be deducted from your monthly budget.",
    "moderationFailed": "Your request was flagged for inappropriate content. Please review our guidelines.",
    "generationInProgress": "Generating your custom card..."
  }
}
```

---

### 2. Multi-Stage AI Pipeline

**Stage 1: Content Moderation**

```javascript
// lib/services/serviceCard/server/ContentModerationService.js
export class ContentModerationService {
  /**
   * Verify that user's request is business-appropriate
   */
  static async moderateGenerationRequest(prompt, files, userId) {
    const moderationPrompt = `
You are a content moderator for a professional business card generation service.

Analyze this card generation request:

User Prompt: "${prompt}"
Uploaded Files: ${files.length} files

Determine if this request is:
1. Business-appropriate (professional context)
2. Free from offensive/inappropriate content
3. Compliant with our content policy

Return JSON:
{
  "approved": boolean,
  "reason": "explanation if rejected",
  "confidence": 0-1,
  "flags": ["flag1", "flag2"] // if any
}

Reject if:
- Sexually explicit content
- Violence or hate speech
- Illegal activities
- Spam or misleading content
- Copyright infringement (obvious brand logos without permission)

Approve if:
- Standard business card design
- Professional branding
- Corporate identity
- Creative but appropriate designs
    `;

    const response = await GeminiService.generate({
      prompt: moderationPrompt,
      model: 'gemini-3-pro',
      temperature: 0.1 // Low temperature for consistent moderation
    });

    // Log moderation decision
    await db.collection('ModerationLogs').add({
      userId,
      type: 'card_generation',
      prompt: sanitize(prompt),
      fileCount: files.length,
      decision: response.data.approved ? 'approved' : 'rejected',
      reason: response.data.reason,
      confidence: response.data.confidence,
      flags: response.data.flags || [],
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Track cost
    await CostTrackingService.recordUsage({
      userId,
      usageType: 'AIUsage',
      feature: 'card_moderation',
      cost: response.cost,
      isBillableRun: false,
      provider: 'gemini-3-pro',
      metadata: {
        approved: response.data.approved,
        flags: response.data.flags
      }
    });

    return {
      approved: response.data.approved,
      reason: response.data.reason,
      confidence: response.data.confidence,
      flags: response.data.flags || [],
      cost: response.cost
    };
  }
}
```

**Stage 2: Prompt Engineering**

```javascript
// lib/services/serviceCard/server/PromptEngineeringService.js
export class PromptEngineeringService {
  /**
   * Convert user's vision into optimized image generation prompt
   */
  static async engineerImagePrompt(userPrompt, files, context = {}) {
    const engineeringPrompt = `
You are an expert prompt engineer for AI image generation systems.

User's Vision:
"${userPrompt}"

Context:
- Generating a professional business card design
- Target size: 3.5" x 2" (standard business card)
- Output format: High-resolution digital image
- Style: Professional, modern, printable

${files.length > 0 ? `Reference Files: ${files.length} images uploaded` : ''}

Task: Create an optimized image generation prompt that:
1. Incorporates the user's vision
2. Adds technical parameters for quality
3. Specifies business card constraints
4. Includes style keywords for best results

Return JSON:
{
  "optimizedPrompt": "detailed prompt for image generation",
  "styleKeywords": ["keyword1", "keyword2"],
  "negativePrompt": "things to avoid",
  "technicalParams": {
    "aspectRatio": "1.75:1",
    "resolution": "high",
    "style": "professional"
  },
  "confidence": 0-1
}

Example Output:
{
  "optimizedPrompt": "Professional business card design, modern minimalist style, purple gradient background, clean sans-serif typography, white logo placeholder top-left, contact information bottom-right, high contrast, print-ready, 300 DPI, corporate branding, sleek and contemporary",
  "styleKeywords": ["minimalist", "corporate", "modern", "professional"],
  "negativePrompt": "cluttered, amateur, low quality, pixelated, unprofessional, cartoonish",
  "technicalParams": {
    "aspectRatio": "1.75:1",
    "resolution": "high",
    "style": "professional"
  },
  "confidence": 0.95
}
    `;

    const response = await GeminiService.generate({
      prompt: engineeringPrompt,
      model: 'gemini-3-pro',
      temperature: 0.4 // Moderate creativity
    });

    // Track cost
    await CostTrackingService.recordUsage({
      userId: context.userId,
      usageType: 'AIUsage',
      feature: 'card_prompt_engineering',
      cost: response.cost,
      isBillableRun: false,
      provider: 'gemini-3-pro',
      sessionId: context.sessionId,
      metadata: {
        userPromptLength: userPrompt.length,
        fileCount: files.length,
        confidence: response.data.confidence
      }
    });

    return {
      optimizedPrompt: response.data.optimizedPrompt,
      styleKeywords: response.data.styleKeywords,
      negativePrompt: response.data.negativePrompt,
      technicalParams: response.data.technicalParams,
      confidence: response.data.confidence,
      cost: response.cost
    };
  }
}
```

**Stage 3: Image Generation**

```javascript
// lib/services/serviceCard/server/ImageGenerationService.js
export class ImageGenerationService {
  /**
   * Generate card image using Imagen 2 or Stable Diffusion
   *
   * Note: This example uses a placeholder API.
   * Actual implementation would use:
   * - Google Imagen 2 (via Vertex AI)
   * - Stability AI (Stable Diffusion XL)
   * - OpenAI DALL-E 3
   */
  static async generateCardImage(engineeredPrompt, options = {}) {
    const {
      userId,
      sessionId,
      aspectRatio = '1.75:1',
      resolution = 'high',
      model = 'imagen-2'
    } = options;

    // Check budget before expensive operation
    const canAfford = await CostTrackingService.canAffordOperation(
      userId,
      'card_image_generation',
      0.10 // $0.10 per generation
    );

    if (!canAfford.allowed) {
      throw new Error('Insufficient budget for card generation');
    }

    // Generate image (example with Imagen 2)
    const generationRequest = {
      prompt: engineeredPrompt.optimizedPrompt,
      negativePrompt: engineeredPrompt.negativePrompt,
      aspectRatio,
      numberOfImages: 1,
      sampleCount: 1,
      seed: Math.floor(Math.random() * 1000000),
      guidanceScale: 7.5, // Balance between creativity and prompt adherence
      steps: 50 // Quality vs speed tradeoff
    };

    // Call image generation API (placeholder)
    const response = await ImagenAPI.generate(generationRequest);

    // Upload to Firebase Storage
    const imageBuffer = Buffer.from(response.imageData, 'base64');
    const cardId = uuidv4();
    const storagePath = `generated-cards/${userId}/${cardId}.png`;

    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, imageBuffer, {
      contentType: 'image/png',
      customMetadata: {
        userId,
        sessionId,
        prompt: engineeredPrompt.optimizedPrompt.substring(0, 500),
        generatedAt: Date.now().toString()
      }
    });

    const imageUrl = await getDownloadURL(storageRef);

    // Generate thumbnail
    const thumbnail = await sharp(imageBuffer)
      .resize(400, 229) // Maintain aspect ratio
      .png()
      .toBuffer();

    const thumbnailPath = `thumbnails/${userId}/${cardId}_thumb.png`;
    const thumbRef = ref(storage, thumbnailPath);
    await uploadBytes(thumbRef, thumbnail, { contentType: 'image/png' });
    const thumbnailUrl = await getDownloadURL(thumbRef);

    // Track cost
    await CostTrackingService.recordUsage({
      userId,
      usageType: 'ApiUsage',
      feature: 'card_image_generation',
      cost: 0.10,
      isBillableRun: true, // This is a billable operation
      provider: model,
      sessionId,
      metadata: {
        cardId,
        resolution,
        aspectRatio,
        promptLength: engineeredPrompt.optimizedPrompt.length
      }
    });

    return {
      cardId,
      imageUrl,
      thumbnailUrl,
      storagePath,
      metadata: {
        prompt: engineeredPrompt.optimizedPrompt,
        negativePrompt: engineeredPrompt.negativePrompt,
        styleKeywords: engineeredPrompt.styleKeywords,
        model,
        resolution,
        aspectRatio,
        generatedAt: Date.now()
      },
      cost: 0.10
    };
  }
}
```

---

### 3. Orchestration & Workflow

**Main Generation Flow:**

```javascript
// lib/services/serviceCard/server/CardGenerationService.js
export class CardGenerationService {
  /**
   * Orchestrate the complete card generation pipeline
   */
  static async generateCard(request) {
    const { userId, prompt, files, sessionId } = request;

    // Create generation request document
    const requestRef = await db.collection('GenerationRequests').add({
      userId,
      prompt,
      fileUrls: files.map(f => f.url),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionId
    });

    const requestId = requestRef.id;

    try {
      // Stage 1: Content Moderation
      console.log(`[CardGen:${requestId}] Stage 1: Moderating content`);
      await requestRef.update({ status: 'moderating' });

      const moderation = await ContentModerationService.moderateGenerationRequest(
        prompt,
        files,
        userId
      );

      if (!moderation.approved) {
        await requestRef.update({
          status: 'rejected',
          rejectionReason: moderation.reason,
          moderationFlags: moderation.flags
        });

        throw new Error(`Content moderation failed: ${moderation.reason}`);
      }

      await requestRef.update({
        moderationResult: moderation,
        moderationPassed: true
      });

      // Stage 2: Prompt Engineering
      console.log(`[CardGen:${requestId}] Stage 2: Engineering prompt`);
      await requestRef.update({ status: 'engineering_prompt' });

      const engineeredPrompt = await PromptEngineeringService.engineerImagePrompt(
        prompt,
        files,
        { userId, sessionId }
      );

      await requestRef.update({
        engineeredPrompt: engineeredPrompt.optimizedPrompt,
        styleKeywords: engineeredPrompt.styleKeywords,
        confidence: engineeredPrompt.confidence
      });

      // Stage 3: Image Generation
      console.log(`[CardGen:${requestId}] Stage 3: Generating image`);
      await requestRef.update({ status: 'generating_image' });

      const generatedCard = await ImageGenerationService.generateCardImage(
        engineeredPrompt,
        { userId, sessionId, model: 'imagen-2' }
      );

      // Stage 4: Finalize
      console.log(`[CardGen:${requestId}] Stage 4: Finalizing`);
      await requestRef.update({
        status: 'completed',
        cardId: generatedCard.cardId,
        imageUrl: generatedCard.imageUrl,
        thumbnailUrl: generatedCard.thumbnailUrl,
        metadata: generatedCard.metadata,
        totalCost: moderation.cost + engineeredPrompt.cost + generatedCard.cost,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add to user's card gallery
      await db.collection(`UserCardGallery/${userId}/cards`).doc(generatedCard.cardId).set({
        requestId,
        imageUrl: generatedCard.imageUrl,
        thumbnailUrl: generatedCard.thumbnailUrl,
        userPrompt: prompt,
        engineeredPrompt: engineeredPrompt.optimizedPrompt,
        styleKeywords: engineeredPrompt.styleKeywords,
        metadata: generatedCard.metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 0
      });

      console.log(`[CardGen:${requestId}] ✅ Completed successfully`);

      return {
        success: true,
        requestId,
        cardId: generatedCard.cardId,
        imageUrl: generatedCard.imageUrl,
        thumbnailUrl: generatedCard.thumbnailUrl,
        cost: moderation.cost + engineeredPrompt.cost + generatedCard.cost
      };

    } catch (error) {
      console.error(`[CardGen:${requestId}] ❌ Failed:`, error);

      await requestRef.update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw error;
    }
  }
}
```

---

## Cost Tracking & Budgets

**Cost Breakdown:**

| Stage | Service | Cost per Use |
|-------|---------|--------------|
| Moderation | Gemini 3 Pro | $0.001 |
| Prompt Engineering | Gemini 3 Pro | $0.002 |
| Image Generation | Imagen 2 | $0.10 |
| **Total** | | **$0.103** |

**Monthly Budget by Tier:**

| Tier | Generations/Month | Monthly Cost | Budget |
|------|-------------------|--------------|--------|
| **Premium** | 10 | $1.03 | $2.00 |
| **Business** | 50 | $5.15 | $10.00 |
| **Enterprise** | Unlimited | Variable | Custom |

**Budget Enforcement:**

```javascript
// Before generation
const canAfford = await CostTrackingService.canAffordOperation(
  userId,
  'card_generation_full_pipeline',
  0.103
);

if (!canAfford.allowed) {
  return {
    error: 'BUDGET_EXCEEDED',
    message: 'Insufficient budget for card generation',
    remaining: canAfford.remainingBudget,
    resetDate: canAfford.resetDate
  };
}
```

---

## Premium Feature Tiers

| Tier | Card Generations | Refinements | Storage | Priority |
|------|------------------|-------------|---------|----------|
| **Base** | ❌ | - | - | - |
| **Pro** | ❌ | - | - | - |
| **Premium** | ✅ 10/month | 2 per card | 1 year | Standard |
| **Business** | ✅ 50/month | Unlimited | Permanent | High |
| **Enterprise** | ✅ Unlimited | Unlimited | Permanent | Highest |

**Permission Constants:**

```javascript
// lib/services/serviceCard/constants/cardConstants.js
export const FEATURE_PERMISSIONS = {
  CARD_GENERATION: ['premium', 'business', 'enterprise'],
  CARD_REFINEMENT: ['premium', 'business', 'enterprise'],
  UNLIMITED_STORAGE: ['business', 'enterprise'],
};

export const RATE_LIMITS = {
  GENERATIONS_PER_MONTH: {
    premium: 10,
    business: 50,
    enterprise: -1 // unlimited
  },
  REFINEMENTS_PER_CARD: {
    premium: 2,
    business: -1,
    enterprise: -1
  }
};

export const GENERATION_COSTS = {
  MODERATION: 0.001,
  PROMPT_ENGINEERING: 0.002,
  IMAGE_GENERATION: 0.10,
  TOTAL: 0.103
};
```

---

## Security & Content Policy

**Content Policy Guidelines:**

```markdown
# Card Generation Content Policy

## Approved Content:
✅ Professional business cards
✅ Corporate branding
✅ Creative designs (within professional context)
✅ Company logos (if you own rights)
✅ Personal branding
✅ Contact information

## Prohibited Content:
❌ Sexually explicit imagery
❌ Violence or gore
❌ Hate speech or discriminatory content
❌ Illegal activities
❌ Copyrighted brand logos (without permission)
❌ Misleading information
❌ Spam or scam content

## Examples of Rejections:
- "Make a card with Nike logo" → Rejected (copyright)
- "Adult entertainment business card" → Rejected (inappropriate)
- "Fake CEO title at Google" → Rejected (misleading)

## Appeals Process:
If your generation is rejected and you believe it was a mistake,
contact support with your request ID for manual review.
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('CardGenerationService', () => {
  test('rejects inappropriate content', async () => {
    const result = await ContentModerationService.moderateGenerationRequest(
      'adult entertainment business card',
      [],
      'user_test'
    );

    expect(result.approved).toBe(false);
    expect(result.flags).toContain('inappropriate_content');
  });

  test('engineers optimal prompt from user vision', async () => {
    const result = await PromptEngineeringService.engineerImagePrompt(
      'Modern tech company card with purple theme',
      [],
      { userId: 'user_test' }
    );

    expect(result.optimizedPrompt).toContain('professional');
    expect(result.optimizedPrompt).toContain('purple');
    expect(result.styleKeywords).toContain('modern');
  });

  test('enforces budget limits', async () => {
    // Exhaust user budget first
    await exhaustBudget('user_test');

    await expect(
      CardGenerationService.generateCard({
        userId: 'user_test',
        prompt: 'Test card',
        files: []
      })
    ).rejects.toThrow('Insufficient budget');
  });
});
```

### Manual Testing Checklist

- [ ] Upload valid files, generate card successfully
- [ ] Submit inappropriate prompt, verify rejection
- [ ] Test budget enforcement (exhaust limit)
- [ ] Verify image quality (300 DPI, aspect ratio)
- [ ] Test refinement workflow
- [ ] Check storage cleanup for failed generations
- [ ] Test across all 5 languages
- [ ] Verify cost tracking accuracy

---

## Implementation Phases

### Phase 1: Core Pipeline (3 weeks)
- ✅ File upload system
- ✅ Content moderation with Gemini 3 Pro
- ✅ Prompt engineering service
- ✅ Image generation (Imagen 2 integration)
- ✅ Cost tracking

### Phase 2: User Experience (2 weeks)
- ✅ Wizard UI for generation workflow
- ✅ Real-time status updates
- ✅ Preview & download
- ✅ Card gallery
- ✅ i18n for 5 languages

### Phase 3: Refinement & Safety (2 weeks)
- ✅ Refinement workflow (iterate on existing card)
- ✅ Enhanced moderation
- ✅ Content policy enforcement
- ✅ Rate limiting
- ✅ Budget warnings

### Phase 4: Polish & Testing (1 week)
- ✅ Performance optimization
- ✅ Error handling & recovery
- ✅ Unit + integration tests
- ✅ Documentation
- ✅ Admin monitoring dashboard

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Moderation accuracy | >98% |
| Generation success rate | >95% |
| User satisfaction (ratings) | >4.5/5 |
| Average generation time | <60s |
| Cost per generation | <$0.12 |
| Appropriate content rate | >99% |
| Refinement usage | >40% of users |

---

## Related Technologies

- **AI Moderation:** Gemini 3 Pro
- **Prompt Engineering:** Gemini 3 Pro
- **Image Generation:** Google Imagen 2 (or Stable Diffusion XL)
- **Storage:** Firebase Storage
- **Database:** Firestore
- **Cost Tracking:** CostTrackingService
- **i18n:** 5 languages (EN, FR, ES, ZH, VI)

---

**Status:** Planned Feature (Not Yet Implemented)
**Priority:** Medium
**Estimated Effort:** 8 weeks
