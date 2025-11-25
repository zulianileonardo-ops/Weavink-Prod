export const dynamic = 'force-dynamic';

// app/api/admin/run-tests/route.js
// API endpoint for running integration tests from the admin panel
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { AdminService } from '@/lib/services/serviceAdmin/server/adminService';
import { spawn } from 'child_process';
import path from 'path';

// Whitelist of allowed test files (security: prevent arbitrary code execution)
const ALLOWED_TEST_FILES = {
  'contactAnonymization.test.js': {
    name: 'Contact Anonymization',
    description: 'GDPR Article 17 compliance tests',
    category: 'privacy'
  },
  'anonymousAnalytics.test.js': {
    name: 'Anonymous Analytics',
    description: 'Anonymous view/click tracking',
    category: 'analytics'
  },
  'autoTagging.comprehensive.test.js': {
    name: 'Auto-Tagging',
    description: 'Auto-tagging comprehensive tests',
    category: 'ai'
  },
  'cv-features.integration.test.js': {
    name: 'CV Features',
    description: 'CV link and appearance tests',
    category: 'features'
  },
  'media-features.integration.test.js': {
    name: 'Media Features',
    description: 'Media upload and display tests',
    category: 'features'
  },
  'queryEnhancement.comprehensive.test.js': {
    name: 'Query Enhancement',
    description: 'Search query enhancement tests',
    category: 'search'
  },
  'exchangeService.security.test.js': {
    name: 'Exchange Security',
    description: 'Rate limiting and fingerprinting tests',
    category: 'security'
  }
};

/**
 * Verify Firebase Auth token and check admin status
 */
async function verifyAdminToken(token) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      isValid: true,
      email: decodedToken.email,
      isAdmin: AdminService.isServerAdmin(decodedToken.email),
      uid: decodedToken.uid
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      isValid: false,
      isAdmin: false,
      error: error.code || 'Invalid token'
    };
  }
}

/**
 * Run a test file and capture output
 */
function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const testPath = path.join(process.cwd(), 'tests', testFile);

    // Spawn node process with dotenv
    const child = spawn('node', ['-r', 'dotenv/config', testPath], {
      cwd: process.cwd(),
      env: { ...process.env },
      timeout: 120000 // 2 minute timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const output = stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : '');

      // Parse test results from output
      const passedMatch = output.match(/Passed:\s*(\d+)/i);
      const failedMatch = output.match(/Failed:\s*(\d+)/i);
      const totalMatch = output.match(/Total:\s*(\d+)/i);

      resolve({
        success: code === 0,
        exitCode: code,
        output: output.slice(-10000), // Limit output to last 10KB
        duration,
        passed: passedMatch ? parseInt(passedMatch[1]) : null,
        failed: failedMatch ? parseInt(failedMatch[1]) : null,
        total: totalMatch ? parseInt(totalMatch[1]) : null
      });
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start test: ${error.message}`));
    });

    // Handle timeout
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Test execution timed out after 2 minutes'));
    }, 120000);
  });
}

/**
 * GET /api/admin/run-tests
 * Returns list of available tests
 */
export async function GET(request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { isValid, isAdmin, error } = await verifyAdminToken(token);

    if (!isValid) {
      return NextResponse.json({ error: `Unauthorized: ${error}` }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Return list of available tests
    const tests = Object.entries(ALLOWED_TEST_FILES).map(([file, config]) => ({
      file,
      ...config
    }));

    return NextResponse.json({
      success: true,
      tests,
      count: tests.length
    });

  } catch (error) {
    console.error('Error in GET /api/admin/run-tests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/run-tests
 * Run a specific test file
 * Body: { testFile: "contactAnonymization.test.js" }
 */
export async function POST(request) {
  const startTime = Date.now();

  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { isValid, email, isAdmin, error } = await verifyAdminToken(token);

    if (!isValid) {
      return NextResponse.json({ error: `Unauthorized: ${error}` }, { status: 401 });
    }

    if (!isAdmin) {
      console.warn(`Unauthorized test run attempt by: ${email}`);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { testFile } = body;

    if (!testFile) {
      return NextResponse.json({ error: 'Missing testFile parameter' }, { status: 400 });
    }

    // Security: Only allow whitelisted test files
    if (!ALLOWED_TEST_FILES[testFile]) {
      console.warn(`Blocked attempt to run non-whitelisted test: ${testFile} by ${email}`);
      return NextResponse.json({ error: 'Invalid test file' }, { status: 400 });
    }

    console.log(`Running test: ${testFile} (requested by ${email})`);

    // Run the test
    const result = await runTestFile(testFile);

    const totalTime = Date.now() - startTime;
    console.log(`Test ${testFile} completed in ${totalTime}ms - ${result.success ? 'PASSED' : 'FAILED'}`);

    return NextResponse.json({
      success: result.success,
      testFile,
      testName: ALLOWED_TEST_FILES[testFile].name,
      ...result,
      requestedBy: email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error running test:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
