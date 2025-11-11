# Weavink Documentation Index

**Last Updated:** 2025-11-11
**Total Guides:** 41

## Quick Navigation
- [Admin System](#admin-system) (9 guides)
- [Analytics & Tracking](#analytics--tracking) (3 guides)
- [RGPD/GDPR Compliance](#rgpdgdpr-compliance) (2 guides)
- [Feature Implementations](#feature-implementations) (9 guides)
- [Technical Infrastructure](#technical-infrastructure) (12 guides)
- [Testing & QA](#testing--qa) (2 guides)
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

---

## Feature Implementations
*Product features and user-facing functionality*

### BOT_DETECTION_FIX_V2.md
**Summary:** Improved bot detection by including current request in calculations, catching rapid-fire bots with 50ms intervals.
**Tags:** bot-detection, rate-limiting, security, bug-fix, multi-factor-detection, analytics
**Related:** [BOT_DETECTION_FIX.md](#bot_detection_fixmd), [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd), [ANALYTICS_IMPLEMENTATION_GUIDE.md](#analytics_implementation_guidemd)

### BOT_DETECTION_FIX.md
**Summary:** Implements multi-factor bot detection using 3 criteria (requests per second, average rate, burst windows) to catch sophisticated bots.
**Status:** ⚠️ Superseded by BOT_DETECTION_FIX_V2.md
**Tags:** bot-detection, rate-limiting, security, multi-factor-analysis, analytics, firestore-logging
**Related:** [BOT_DETECTION_FIX_V2.md](#bot_detection_fix_v2md), [RATE_LIMITS_COLLECTION_GUIDE.md](#rate_limits_collection_guidemd)

### CAROUSEL_IMPLEMENTATION.md
**Summary:** Documents multi-carousel support system allowing users to create multiple independent carousels with grouped item structure.
**Tags:** carousel, features, data-structure, component-architecture, multi-carousel, firestore, ui-components
**Related:** None

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
**Related:** None

### VENUE_ENRICHMENT_FEATURE.md
**Summary:** Automatically enriches venue/location contacts with details from Google Maps API.
**Tags:** contacts, google-maps, api-integration, venue-enrichment, automation
**Related:** None

### LANDING_PAGE_REDESIGN.md
**Summary:** Documents complete redesign of landing page with modern UI, feature highlights, and improved conversion.
**Tags:** landing-page, ui-design, marketing, conversion-optimization
**Related:** None

### REAL_TIME_SUBSCRIPTION_UPDATES.md
**Summary:** Implements real-time subscription updates using Firestore listeners for instant UI synchronization.
**Tags:** subscription, real-time, firestore, listeners, state-management
**Related:** [SUBSCRIPTION_REVALIDATION_SETUP.md](#subscription_revalidation_setupmd)

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
**Related:** None

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
**Related:** None

### costTracking/REFACTORING_GUIDE.md
**Summary:** Specific refactoring guide for cost tracking service.
**Tags:** refactoring, cost-tracking, service-layer
**Related:** [COST_TRACKING_MIGRATION_GUIDE.md](#cost_tracking_migration_guidemd), [COMPREHENSIVE_REFACTORING_GUIDE.md](#comprehensive_refactoring_guidemd)

### RULES_GROUPING_FIXES.md
**Summary:** Fixes for rules grouping system.
**Tags:** rules-engine, bug-fix, grouping
**Related:** None

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

---

## General Documentation
*Project overview, setup, and general information*

### README.md
**Summary:** Main project README with setup instructions and overview.
**Tags:** readme, setup, getting-started, overview, installation
**Related:** None

### Preview.md
**Summary:** Preview/demo documentation.
**Tags:** preview, demo, features
**Related:** None

### updates.md
**Summary:** Project changelog and update history.
**Tags:** changelog, updates, version-history
**Related:** None

### RESTART_INSTRUCTIONS.md
**Summary:** Server restart procedures and troubleshooting steps.
**Tags:** operations, restart, troubleshooting, server-management
**Related:** None

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
5. Category sections organize guides by domain

---

## Documentation Clusters

### Admin Architecture Cluster
Core admin system guides with interconnected security, analytics, and service architecture:
- ADMIN_REFACTOR_SUMMARY.md → ADMIN_SERVICE_SEPARATION_GUIDE.md → ADMIN_SECURITY_LAYERS_GUIDE.md

### Cost Tracking & Budget Cluster
Comprehensive cost management system from service layer to UI:
- COST_TRACKING_MIGRATION_GUIDE.md → BUDGET_CHECK_USAGE_GUIDE.md → BUDGET_DISPLAY_IMPLEMENTATION.md

### Analytics & Tracking Cluster
Complete analytics implementation from architecture to testing:
- ANALYTICS_IMPLEMENTATION_GUIDE.md → ANALYTICS_SERVICE_SUMMARY.md → ANALYTICS_TESTING_GUIDE.md

### Security & Rate Limiting Cluster
Multi-layered security with bot detection and monitoring:
- ADMIN_SECURITY_LAYERS_GUIDE.md → BOT_DETECTION_FIX_V2.md → RATE_LIMITS_COLLECTION_GUIDE.md
