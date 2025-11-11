# Weavink Documentation Index

**Last Updated:** 2025-11-11
**Total Guides:** 52

## Quick Navigation
- [Admin System](#admin-system) (9 guides)
- [Analytics & Tracking](#analytics-&-tracking) (3 guides)
- [RGPD/GDPR Compliance](#rgpdgdpr-compliance) (7 guides)
- [Feature Implementations](#feature-implementations) (11 guides)
- [Technical Infrastructure](#technical-infrastructure) (13 guides)
- [Testing & QA](#testing-&-qa) (5 guides)
- [General Documentation](#general-documentation) (4 guides)

---

## Admin System
*Admin dashboard, analytics, security, and management features*

### ADMIN_ANALYTICS_INTEGRATION_GUIDE.md
**Summary:** Complete guide for integrating new API/AI features into admin analytics dashboard with cost tracking and session management.
**Tags:** admin, analytics, cost-tracking, sessions, free-tier, google-maps, api-integration, dashboard
**Related:** [ADMIN_ANALYTICS_API_USAGE_GUIDE.md](#admin_analytics_api_usage_guidemd), [ADMIN_DASHBOARD_SESSION_AGGREGATION_FIX.md](#admin_dashboard_session_aggregation_fixmd), [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd)

### ADMIN_ANALYTICS_API_USAGE_GUIDE.md
**Summary:** Comprehensive technical guide showing how admin analytics service integrates AI and API usage tracking with detailed data flow and response structures.
**Tags:** admin, analytics, api-usage, ai-tracking, firestore, data-flow, cost-monitoring, dashboard-integration
**Related:** [ADMIN_ANALYTICS_INTEGRATION_GUIDE.md](#admin_analytics_integration_guidemd), [ANALYTICS_SERVICE_SUMMARY.md](#analytics_service_summarymd)

### ADMIN_VIEW_ONLY_IMPLEMENTATION.md
**Summary:** Complete implementation of view-only admin role system allowing designated users read-only admin access with multi-layer security verification.
**Tags:** admin, security, permissions, rbac, view-only, authorization, multi-layer-security, env-variables
**Related:** [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin_security_layers_guidemd), [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd)

### ADMIN_VECTOR_PANEL_REFACTOR_SUMMARY.md
**Summary:** Documents the refactoring of AdminVectorContactTestPanel from monolithic component to clean layered service architecture following admin patterns.
**Tags:** admin, vector-search, refactoring, service-layer, api-routes, component-architecture, pinecone, semantic-search
**Related:** [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd), [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin_security_layers_guidemd), [COMPREHENSIVE_REFACTORING_GUIDE.md](#comprehensive_refactoring_guidemd)

### ADMIN_SERVICE_SEPARATION_GUIDE.md
**Summary:** Documents separation of admin functionality into distinct services (User Management and Analytics) for better organization and scalability.
**Tags:** admin, architecture, service-separation, scalability, analytics, user-management, client-server-separation
**Related:** [ADMIN_REFACTOR_SUMMARY.md](#admin_refactor_summarymd), [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin_security_layers_guidemd)

### ADMIN_SECURITY_LOGS_IMPLEMENTATION.md
**Summary:** Implementation of TopLevelSecurityLogs component in admin dashboard for platform-wide security event monitoring without organization context.
**Tags:** admin, security, logging, monitoring, audit-trail, firestore, security-events, compliance
**Related:** [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin_security_layers_guidemd), [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd)

### ADMIN_SECURITY_LAYERS_GUIDE.md
**Summary:** Step-by-step implementation guide for 7-layer security verification system for admin operations.
**Tags:** admin, security, multi-layer-security, authentication, authorization, rate-limiting, middleware, jwt
**Related:** [ADMIN_VIEW_ONLY_IMPLEMENTATION.md](#admin_view_only_implementationmd), [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd)

### ADMIN_REFACTOR_SUMMARY.md
**Summary:** Documents Phase 1 refactoring of admin service from monolithic API routes to clean layered architecture with separated concerns.
**Tags:** admin, refactoring, architecture, service-layer, api-routes, security, testability, scalability
**Related:** [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd), [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin_security_layers_guidemd), [COMPREHENSIVE_REFACTORING_GUIDE.md](#comprehensive_refactoring_guidemd)

### ADMIN_DASHBOARD_SESSION_AGGREGATION_FIX.md
**Summary:** Fixes admin dashboard showing zero API/AI usage by implementing dual-write architecture for session-based operations.
**Tags:** admin, analytics, bug-fix, sessions, dual-write, aggregation, firestore, dashboard, cost-tracking
**Related:** [ADMIN_ANALYTICS_INTEGRATION_GUIDE.md](#admin_analytics_integration_guidemd), [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd)

---

## Analytics & Tracking
*Analytics implementation, tracking, and reporting*

### ANALYTICS_TESTING_GUIDE.md
**Summary:** Comprehensive testing and debugging guide for analytics click tracking system with browser console logs and network activity.
**Tags:** analytics, testing, debugging, click-tracking, sendBeacon, browser-console, troubleshooting
**Related:** [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd), [ANALYTICS_SERVICE_SUMMARY.md](#analytics_service_summarymd)

### ANALYTICS_SERVICE_SUMMARY.md
**Summary:** Documents complete analytics service architecture processing flattened Firestore structure for platform-wide insights and user-specific analytics.
**Tags:** analytics, firestore, flattened-structure, aggregation, platform-analytics, user-analytics, service-layer
**Related:** [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd), [ADMIN_ANALYTICS_API_USAGE_GUIDE.md](#admin_analytics_api_usage_guidemd)

### ANALYTICS_IMPLEMENTATION_GUIDE.md
**Summary:** Complete technical guide covering analytics system architecture with rate limiting, fingerprinting, session management, and data flow.
**Tags:** analytics, rate-limiting, fingerprinting, session-management, sendBeacon, bot-detection, firestore, api-design
**Related:** [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd), [BOT_DETECTION_FIX_V2.md](#bot_detection_fix_v2md), [ANALYTICS_TESTING_GUIDE.md](#analytics_testing_guidemd)

---

## RGPD/GDPR Compliance
*Data protection, privacy, and compliance features*

### RGPD_Conformite_Tapit.md
**Summary:** Complete GDPR/RGPD compliance roadmap and implementation plan for Weavink (Tapit SAS).
**Tags:** gdpr, rgpd, compliance, privacy, legal, data-protection, consent-management, cookies
**Related:** [COMMIT_SUMMARY.md](#commit_summarymd)

### COMMIT_SUMMARY.md
**Summary:** Complete implementation summary of RGPD Phase 1-2 with consent management, data export, account deletion, and cookie consent.
**Tags:** gdpr, rgpd, compliance, commit-summary, implementation, privacy-center, cookies, data-export
**Related:** [RGPD_Conformite_Tapit.md](#rgpd_conformite_tapitmd)

### RGPD_IMPLEMENTATION_SUMMARY.md
**Summary:** Complete summary of RGPD Phase 1-4 implementation with consent management, data portability, breach notifications, and compliance features.
**Tags:** gdpr, rgpd, compliance, consent, data-protection, privacy, implementation, phase-summary
**Related:** [RGPD_MASTER_PROGRESS.md](#rgpd_master_progressmd), [RGPD_PHASE4_SUMMARY.md](#rgpd_phase4_summarymd), [RGPD_Conformite_Tapit.md](#rgpd_conformite_tapitmd)

### RGPD_MASTER_PROGRESS.md
**Summary:** Master progress tracking document for RGPD implementation phases, features, testing, and compliance scores.
**Tags:** gdpr, rgpd, project-management, progress-tracking, compliance-score, testing, implementation
**Related:** [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd_implementation_summarymd), [RGPD_PHASE4_SUMMARY.md](#rgpd_phase4_summarymd), [RGPD_TESTING_GUIDE.md](#rgpd_testing_guidemd)

### RGPD_PHASE4_SUMMARY.md
**Summary:** Phase 4 implementation summary covering enhanced data portability, automated breach notifications, and compliance monitoring.
**Tags:** gdpr, rgpd, phase4, data-portability, breach-notifications, compliance, xml-export, pdf-export
**Related:** [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd_implementation_summarymd), [RGPD_MASTER_PROGRESS.md](#rgpd_master_progressmd), [RGPD_TEST_RESULTS.md](#rgpd_test_resultsmd)

### CONSENT_IMPLEMENTATION_GUIDE.md
**Summary:** Comprehensive guide for implementing GDPR-compliant consent checks with greyed-out buttons and consent popovers in React/Next.js applications. Includes automated test coverage (12/12 passing tests).
**Tags:** gdpr, rgpd, consent, ui-implementation, react, nextjs, consent-popovers, blocked-features, testing, test-coverage
**Related:** [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd_implementation_summarymd), [RGPD_Conformite_Tapit.md](#rgpd_conformite_tapitmd), [RGPD_TESTING_GUIDE.md](#rgpd_testing_guidemd)

### ANONYMOUS_ANALYTICS_PLAN.md
**Summary:** Implementation plan for anonymous aggregated analytics tracking for users who withdraw consent, using legitimate interest legal basis.
**Tags:** gdpr, rgpd, analytics, anonymous-tracking, legitimate-interest, privacy, planning, dual-track
**Related:** [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd_implementation_summarymd)

---

## Feature Implementations
*Product features and user-facing functionality*

### BOT_DETECTION_FIX_V2.md
**Summary:** Improved bot detection by including current request in calculations, catching rapid-fire bots with 50ms intervals.
**Tags:** bot-detection, rate-limiting, security, bug-fix, multi-factor-detection, analytics
**Related:** [BOT_DETECTION_FIX.md](#bot_detection_fixmd), [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd), [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd)

### BOT_DETECTION_FIX.md
**Summary:** Implements multi-factor bot detection using 3 criteria (requests per second, average rate, burst windows) to catch sophisticated bots.
**Tags:** bot-detection, rate-limiting, security, multi-factor-analysis, analytics, firestore-logging
**Related:** [BOT_DETECTION_FIX_V2.md](#bot_detection_fix_v2md), [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd)

### CAROUSEL_IMPLEMENTATION.md
**Summary:** Documents multi-carousel support system allowing users to create multiple independent carousels with grouped item structure.
**Tags:** carousel, features, data-structure, component-architecture, multi-carousel, firestore, ui-components

### EVENT_GROUPING_ENHANCEMENT.md
**Summary:** Enhances contact timeline by grouping related events (exchanges, follow-ups, meetings) for better readability and context.
**Tags:** contacts, timeline, event-grouping, ui-enhancement, ux-improvement
**Related:** [ENHANCED_REVIEW_FEATURES.md](#enhanced_review_featuresmd)

### ENHANCED_REVIEW_FEATURES.md
**Summary:** Adds structured review system to contacts with ratings, categories, sentiment analysis, and follow-up suggestions.
**Tags:** contacts, reviews, ratings, sentiment-analysis, follow-ups, ui-components
**Related:** [EVENT_GROUPING_ENHANCEMENT.md](#event_grouping_enhancementmd)

### VIDEO_EMBED_FEATURE_SUMMARY.md
**Summary:** Documents video embed feature allowing users to add YouTube, Vimeo, and custom videos to profiles.
**Tags:** video, embeds, youtube, vimeo, features, responsive-design

### VENUE_ENRICHMENT_FEATURE.md
**Summary:** Automatically enriches venue/location contacts with details from Google Maps API.
**Tags:** contacts, google-maps, api-integration, venue-enrichment, automation

### LANDING_PAGE_REDESIGN.md
**Summary:** Documents complete redesign of landing page with modern UI, feature highlights, and improved conversion.
**Tags:** landing-page, ui-design, marketing, conversion-optimization

### REAL_TIME_SUBSCRIPTION_UPDATES.md
**Summary:** Implements real-time subscription updates using Firestore listeners for instant UI synchronization.
**Tags:** subscription, real-time, firestore, listeners, state-management
**Related:** [SUBSCRIPTION_REVALIDATION_SETUP.md](#subscription_revalidation_setupmd)

### CONTACT_DOWNLOAD_SETTINGS.md
**Summary:** Feature implementation allowing profile owners to control who can download their contact information with granular field-level permissions.
**Tags:** contacts, download, vcard, privacy, permissions, dashboard, settings, field-control

### ONBOARDING_SYSTEM_GUIDE.md
**Summary:** Technical guide for mandatory multi-step onboarding wizard with language selection and iPhone-style rotating language headers.
**Tags:** onboarding, user-flow, language-selection, wizard, authentication, multi-step, ui-animation

---

## Technical Infrastructure
*Architecture, refactoring, and technical improvements*

### COST_TRACKING_MIGRATION_GUIDE.md
**Summary:** Complete migration guide for refactored CostTrackingService supporting multiple resource types (AI, API) with backward compatibility.
**Tags:** cost-tracking, migration, ai-usage, api-usage, firestore, backward-compatibility, subscription-limits
**Related:** [BUDGET_CHECK_USAGE_GUIDE.md](#budget_check_usage_guidemd), [BUDGET_DISPLAY_IMPLEMENTATION.md](#budget_display_implementationmd), [ADMIN_ANALYTICS_INTEGRATION_GUIDE.md](#admin_analytics_integration_guidemd)

### COMPREHENSIVE_REFACTORING_GUIDE.md
**Summary:** Best practices and patterns reference for refactoring Next.js codebase covering components, services, API routes, and state management.
**Tags:** refactoring, best-practices, architecture, nextjs, design-patterns, testing, code-quality
**Related:** [ADMIN_REFACTOR_SUMMARY.md](#admin_refactor_summarymd), [ADMIN_SERVICE_SEPARATION_GUIDE.md](#admin_service_separation_guidemd), [ADMIN_VECTOR_PANEL_REFACTOR_SUMMARY.md](#admin_vector_panel_refactor_summarymd)

### BUDGET_DISPLAY_IMPLEMENTATION.md
**Summary:** Documents budget information display system showing users real-time monthly AI operation usage and cost budget.
**Tags:** budget, dashboard, ui-components, cost-tracking, subscription, real-time-display
**Related:** [BUDGET_CHECK_USAGE_GUIDE.md](#budget_check_usage_guidemd), [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd)

### BUDGET_CHECK_USAGE_GUIDE.md
**Summary:** Guide for using real-time budget tracking and permission checking system before expensive API operations.
**Tags:** budget, cost-tracking, permissions, session-management, api-design, pre-flight-checks
**Related:** [BUDGET_DISPLAY_IMPLEMENTATION.md](#budget_display_implementationmd), [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd)

### BUDGET_AFFORDABILITY_CHECK_GUIDE.md
**Summary:** Documents affordability checking system preventing users from exceeding subscription limits.
**Tags:** budget, permissions, subscription, cost-control, validation
**Related:** [BUDGET_CHECK_USAGE_GUIDE.md](#budget_check_usage_guidemd), [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd)

### DYNAMICFIELDS_FIX_SUMMARY.md
**Summary:** Fixes dynamic field system for contacts with improved data validation and error handling.
**Tags:** contacts, dynamic-fields, bug-fix, validation, data-integrity

### SESSION_TRACKING_FIX.md
**Summary:** Fixes session tracking issues ensuring proper session lifecycle management.
**Tags:** sessions, bug-fix, tracking, lifecycle-management
**Related:** [ADMIN_DASHBOARD_SESSION_AGGREGATION_FIX.md](#admin_dashboard_session_aggregation_fixmd)

### SUBSCRIPTION_REVALIDATION_SETUP.md
**Summary:** Documents subscription revalidation system ensuring user tier limits are enforced correctly.
**Tags:** subscription, validation, security, tier-enforcement
**Related:** [REAL_TIME_SUBSCRIPTION_UPDATES.md](#real_time_subscription_updatesmd)

### SEMANTIC_SEARCH_ARCHITECTURE_CURRENT.md
**Summary:** Documents current semantic search architecture using vector embeddings and Pinecone.
**Tags:** semantic-search, vector-database, pinecone, embeddings, ai-features
**Related:** [ADMIN_VECTOR_PANEL_REFACTOR_SUMMARY.md](#admin_vector_panel_refactor_summarymd)

### QUICK_START_INTEGRATION.md
**Summary:** Quick 30-minute integration guide for new features and components.
**Tags:** integration, quick-start, onboarding, documentation

### lib/services/serviceContact/server/costTracking/REFACTORING_GUIDE.md
**Summary:** Specific refactoring guide for cost tracking service.
**Tags:** refactoring, cost-tracking, service-layer
**Related:** [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd), [COMPREHENSIVE_REFACTORING_GUIDE.md](#comprehensive_refactoring_guidemd)

### RULES_GROUPING_FIXES.md
**Summary:** Fixes for rules grouping system.
**Tags:** rules-engine, bug-fix, grouping

### REFACTORING_GUIDE.md
**Summary:** Major refactoring of cost tracking system supporting generalized API cost tracking, session-based tracking, and centralized cost constants.
**Tags:** refactoring, cost-tracking, api-costs, sessions, architecture, service-layer
**Related:** [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd), [lib/services/serviceContact/server/costTracking/REFACTORING_GUIDE.md](#lib/services/servicecontact/server/costtracking/refactoring_guidemd)

---

## Testing & QA
*Testing guides and quality assurance*

### RATE_LIMIT_TESTING.md
**Summary:** Testing guide for rate limiting system with various attack scenarios and verification methods.
**Tags:** testing, rate-limiting, security-testing, bot-simulation
**Related:** [BOT_DETECTION_FIX_V2.md](#bot_detection_fix_v2md), [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd)

### RATE_LIMITS_COLLECTION_GUIDE.md
**Summary:** Complete guide to RateLimits Firestore collection monitoring security events and rate limit violations.
**Tags:** rate-limiting, security, monitoring, firestore, logging, security-events
**Related:** [BOT_DETECTION_FIX_V2.md](#bot_detection_fix_v2md), [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd)

### RGPD_TESTING_GUIDE.md
**Summary:** Comprehensive testing documentation for RGPD Phase 1-4 implementation with 116 tests covering consent, privacy settings, and compliance features.
**Tags:** testing, rgpd, gdpr, test-suite, compliance-testing, consent-testing, phase-testing
**Related:** [RGPD_TESTING_QUICKSTART.md](#rgpd_testing_quickstartmd), [RGPD_TEST_RESULTS.md](#rgpd_test_resultsmd), [RGPD_MASTER_PROGRESS.md](#rgpd_master_progressmd)

### RGPD_TESTING_QUICKSTART.md
**Summary:** Quick 30-second guide to running RGPD tests via browser console with one-liner commands for all test suites.
**Tags:** testing, rgpd, quick-start, browser-console, test-runner, one-liner
**Related:** [RGPD_TESTING_GUIDE.md](#rgpd_testing_guidemd), [RGPD_TEST_RESULTS.md](#rgpd_test_resultsmd)

### RGPD_TEST_RESULTS.md
**Summary:** Complete test results showing 116/116 passing tests across all RGPD phases with detailed coverage breakdown.
**Tags:** testing, rgpd, test-results, compliance, 100-percent-pass, test-coverage
**Related:** [RGPD_TESTING_GUIDE.md](#rgpd_testing_guidemd), [RGPD_TESTING_QUICKSTART.md](#rgpd_testing_quickstartmd), [RGPD_MASTER_PROGRESS.md](#rgpd_master_progressmd)

---

## General Documentation
*Project overview, setup, and general information*

### README.md
**Summary:** Main project README with setup instructions and overview.
**Tags:** readme, setup, getting-started, overview, installation

### Preview.md
**Summary:** Preview/demo documentation.
**Tags:** preview, demo, features

### updates.md
**Summary:** Project changelog and update history.
**Tags:** changelog, updates, version-history

### RESTART_INSTRUCTIONS.md
**Summary:** Server restart procedures and troubleshooting steps.
**Tags:** operations, restart, troubleshooting, server-management

---

## Status Legend
- ✅ **Active** - Current and maintained
- ⚠️ **Superseded** - Replaced by newer guide
- 🚧 **Draft** - Work in progress
- ⛔ **Deprecated** - No longer relevant

---

## Search Tips
1. Use Ctrl+F to search by keyword
2. Check "Related" sections for connected topics
3. Tags help find guides by theme
4. Status indicators show guide relevance