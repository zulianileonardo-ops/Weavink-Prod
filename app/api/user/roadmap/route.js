import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { GitService } from '@/lib/services/serviceRoadmap/server/gitService';
import { GitHubService } from '@/lib/services/serviceRoadmap/server/githubService';
import { CategoryService } from '@/lib/services/serviceRoadmap/server/categoryService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/roadmap
 * Authenticated endpoint - requires Firebase token
 * Returns enhanced category tree (same as public for now, but can be extended)
 */
export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [/api/user/roadmap:${requestId}] GET request`);

    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`🔴 [/api/user/roadmap:${requestId}] Missing auth header`);
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Missing token' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const { uid } = decodedToken;

        console.log(`✅ [/api/user/roadmap:${requestId}] Authenticated user: ${uid}`);

        // 2. Fetch data (same as public for now, but can add user-specific features later)
        const [commits, issues] = await Promise.all([
            GitService.getCommitHistory({ limit: 500 }),
            GitHubService.getPlannedFeatures(),
        ]);

        console.log(`🔍 [/api/user/roadmap:${requestId}] Fetched ${commits.length} commits, ${issues.length} issues`);

        // 3. Build tree
        const tree = CategoryService.buildCategoryTree(commits, issues);
        const stats = CategoryService.getOverallStats(tree);

        // 4. Return response
        console.log(`✅ [/api/user/roadmap:${requestId}] Success - ${stats.total} total items`);

        return NextResponse.json({
            success: true,
            data: {
                tree,
                stats,
                lastUpdated: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error(`💥 [/api/user/roadmap:${requestId}] Error:`, error);

        // Check if it's an auth error
        if (error.code?.startsWith('auth/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
