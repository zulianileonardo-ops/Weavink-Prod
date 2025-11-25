// app/api/user/contacts/exchange/submit/route.js
import { NextResponse } from 'next/server';
import { ExchangeService } from '@/lib/services/serviceContact/server/exchangeService';
import { RATE_LIMITS } from '@/lib/services/constants/rateLimits';

/**
 * PUBLIC endpoint for contact exchange form submissions
 * No authentication required - this is for public profile visitors
 */
export async function POST(request) {
  const requestStartTime = Date.now();

  try {
    console.log('🔄 API: Processing exchange contact submission');

    // CSRF Protection
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];

    if (process.env.NODE_ENV === 'development') {
      const isDevelopmentOrigin = origin?.includes('localhost') || origin?.includes('127.0.0.1');
      if (!isDevelopmentOrigin && !allowedOrigins.includes(origin)) {
        console.warn(`🚨 CSRF Warning: Request from invalid origin: ${origin}`);
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    } else if (!allowedOrigins.includes(origin)) {
      console.warn(`🚨 CSRF Warning: Request from invalid origin: ${origin}`);
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    // Extract request metadata for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';

    // Generate fingerprint for enhanced rate limiting
    const fingerprint = ExchangeService.generateExchangeFingerprint({
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding
    });

    // Dual rate limiting: IP-based AND fingerprint-based
    // Both must pass to continue (defense in depth)
    try {
      // Check 1: IP-based rate limit
      await ExchangeService.checkExchangeRateLimit(
        ip,
        RATE_LIMITS.EXCHANGE.IP.MAX_REQUESTS,
        RATE_LIMITS.EXCHANGE.IP.WINDOW_MINUTES
      );

      // Check 2: Fingerprint-based rate limit (stricter)
      await ExchangeService.checkExchangeFingerprintRateLimit(
        fingerprint,
        RATE_LIMITS.EXCHANGE.FINGERPRINT.MAX_REQUESTS,
        RATE_LIMITS.EXCHANGE.FINGERPRINT.WINDOW_MINUTES
      );
    } catch (rateLimitError) {
      console.warn(`🚨 Rate limit exceeded - IP: ${ip}, Fingerprint: ${fingerprint}`);

      // Log violation for security monitoring (non-blocking, fire and forget)
      ExchangeService.logRateLimitViolation({
        ip,
        fingerprint,
        limitType: rateLimitError.message.includes('device') ? 'fingerprint' : 'ip',
        userAgent
      }).catch(() => {});

      return NextResponse.json({
        error: rateLimitError.message,
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }

    // Parse request body
    const body = await request.json();

    // Enhance metadata with request info and fingerprint
    const submissionData = {
      ...body,
      metadata: {
        ...body.metadata,
        ip,
        fingerprint,
        userAgent: body.metadata?.userAgent || userAgent,
        referrer: body.metadata?.referrer || request.headers.get('referer') || '',
        language: body.metadata?.language || acceptLanguage?.split(',')[0] || 'unknown',
      }
    };

    // Submit through exchange service
    console.log('[VECTOR] 📨 Exchange form submission received', {
      targetUserId: submissionData.userId,
      targetUsername: submissionData.username,
      contactEmail: submissionData.contact?.email
    });

    const result = await ExchangeService.submitExchangeContact(submissionData);

    const totalTime = Date.now() - requestStartTime;
    console.log('[VECTOR] ✅ Exchange submission complete (vector creation in background)', {
      contactId: result.contactId
    });
    console.log(`✅ Exchange contact submitted successfully in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Contact submitted successfully!',
      contactId: result.contactId,
      submittedAt: result.submittedAt,
      targetProfile: result.targetProfile,
      features: {
        dynamicFields: body.contact?.dynamicFields?.length || 0,
        hasLocation: !!(body.contact?.location),
        hasScannedData: !!(body.metadata?.scannedCard)
      },
      timing: `${totalTime}ms`
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`❌ API Error in exchange submission after ${totalTime}ms:`, error);

    // Handle specific error types
    if (error.message.includes('not found') || error.message.includes('Profile not found')) {
      return NextResponse.json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
        timing: `${totalTime}ms`
      }, { status: 404 });
    }

    if (error.message.includes('not enabled') || error.message.includes('Exchange not enabled')) {
      return NextResponse.json({
        error: 'Exchange not enabled for this profile',
        code: 'EXCHANGE_DISABLED',
        timing: `${totalTime}ms`
      }, { status: 403 });
    }

    if (error.message.includes('required') || error.message.includes('Validation')) {
      return NextResponse.json({
        error: error.message,
        code: 'VALIDATION_ERROR',
        timing: `${totalTime}ms`
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to submit contact. Please try again.',
      code: 'SUBMISSION_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timing: `${totalTime}ms`
    }, { status: 500 });
  }
}
