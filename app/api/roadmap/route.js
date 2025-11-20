import { NextResponse } from 'next/server';
import { GitService } from '@/lib/services/serviceRoadmap/server/gitService';
import { GitHubService } from '@/lib/services/serviceRoadmap/server/githubService';
import { CategoryService } from '@/lib/services/serviceRoadmap/server/categoryService';

export const dynamic = 'force-dynamic'; // Prevent static generation

// Simple in-memory cache for this route
let cache = {
    data: null,
    timestamp: null,
};

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * GET /api/roadmap
 * Public endpoint - no authentication required
 * Returns category tree with commits and issues
 */
export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [/api/roadmap:${requestId}] GET request`);

    try {
        // Check cache
        const now = Date.now();
        if (cache.data && cache.timestamp && (now - cache.timestamp) < CACHE_TTL) {
            console.log(`✅ [/api/roadmap:${requestId}] Returning cached data (age: ${Math.round((now - cache.timestamp) / 1000)}s)`);
            return NextResponse.json({
                success: true,
                data: cache.data,
                cached: true,
            });
        }

        console.log(`🔍 [/api/roadmap:${requestId}] Cache miss, fetching fresh data...`);

        // Fetch commits with fallback: Try local git first, then GitHub API
        let commits = await GitService.getCommitHistory({ limit: 500 });
        if (commits.length === 0) {
            console.warn(`⚠️ [/api/roadmap:${requestId}] Local git returned no commits, trying GitHub API fallback...`);
            commits = await GitHubService.getCommitHistoryFromGitHub({ limit: 500 });
        }

        // Fetch issues
        const issues = await GitHubService.getPlannedFeatures();

        console.log(`🔍 [/api/roadmap:${requestId}] Fetched ${commits.length} commits, ${issues.length} issues`);

        // Build category tree
        const tree = CategoryService.buildCategoryTree(commits, issues);
        const stats = CategoryService.getOverallStats(tree);

        // Prepare response
        const responseData = {
            tree,
            stats,
            lastUpdated: new Date().toISOString(),
        };

        // Update cache
        cache = {
            data: responseData,
            timestamp: now,
        };

        console.log(`✅ [/api/roadmap:${requestId}] Success - ${stats.total} total items (${stats.commits} commits, ${stats.issues} issues)`);

        return NextResponse.json({
            success: true,
            data: responseData,
        });

    } catch (error) {
        console.error(`💥 [/api/roadmap:${requestId}] Error:`, error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch roadmap data',
                details: error.message,
            },
            { status: 500 }
        );
    }
}
