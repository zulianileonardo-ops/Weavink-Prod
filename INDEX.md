# Weavink Documentation Index

**Last Updated:** 2025-11-20
**Total Guides:** 76

## Quick Navigation
- [Admin System](#admin-system) (9 guides)
- [Analytics & Tracking](#analytics-tracking) (3 guides)
- [RGPD/GDPR Compliance](#rgpd-gdpr-compliance) (9 guides)
- [Feature Implementations](#feature-implementations) (22 guides)
- [Technical Infrastructure](#technical-infrastructure) (17 guides)
- [Testing & QA](#testing-qa) (8 guides)
- [General Documentation](#general-documentation) (4 guides)
- [Tutorials & Guides](#tutorials-guides) (3 guides)
- [Meta Documentation](#meta-documentation) (2 guides)

---

## Admin System
*Admin dashboard, analytics, security, and management features*

### ADMIN_ANALYTICS_API_USAGE_GUIDE.md
**Summary:** Comprehensive technical guide showing how admin analytics service integrates AI and API usage tracking with detailed data flow and response structures.
**Tags:** admin, analytics, api-usage, ai-tracking, firestore, data-flow, cost-monitoring, dashboard-integration
**Related:** [admin-analytics-integration-001](#admin-analytics-integration-001), [analytics-service-summary-011](#analytics-service-summary-011)

### ADMIN_ANALYTICS_INTEGRATION_GUIDE.md
**Summary:** Complete guide for integrating new API/AI features into admin analytics dashboard with cost tracking and session management.
**Tags:** admin, analytics, cost-tracking, sessions, free-tier, google-maps, api-integration, dashboard
**Related:** [admin-analytics-api-usage-002](#admin-analytics-api-usage-002), [admin-dashboard-session-fix-009](#admin-dashboard-session-fix-009), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024)

### ADMIN_DASHBOARD_SESSION_AGGREGATION_FIX.md
**Summary:** Fixes admin dashboard showing zero API/AI usage by implementing dual-write architecture for session-based operations.
**Tags:** admin, analytics, bug-fix, sessions, dual-write, aggregation, firestore, dashboard, cost-tracking
**Related:** [admin-analytics-integration-001](#admin-analytics-integration-001), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024)

### ADMIN_REFACTOR_SUMMARY.md
**Summary:** Documents Phase 1 refactoring of admin service from monolithic API routes to clean layered architecture with separated concerns.
**Tags:** admin, refactoring, architecture, service-layer, api-routes, security, testability, scalability
**Related:** [admin-service-separation-005](#admin-service-separation-005), [admin-security-layers-007](#admin-security-layers-007), [technical-comprehensive-refactoring-025](#technical-comprehensive-refactoring-025)

### ADMIN_SECURITY_LAYERS_GUIDE.md
**Summary:** Step-by-step implementation guide for 7-layer security verification system for admin operations.
**Tags:** admin, security, multi-layer-security, authentication, authorization, rate-limiting, middleware, jwt
**Related:** [admin-view-only-003](#admin-view-only-003), [admin-service-separation-005](#admin-service-separation-005)

### ADMIN_SECURITY_LOGS_IMPLEMENTATION.md
**Summary:** Implementation of TopLevelSecurityLogs component in admin dashboard for platform-wide security event monitoring without organization context.
**Tags:** admin, security, logging, monitoring, audit-trail, firestore, security-events, compliance
**Related:** [admin-security-layers-007](#admin-security-layers-007), [admin-service-separation-005](#admin-service-separation-005)

### ADMIN_SERVICE_SEPARATION_GUIDE.md
**Summary:** Documents separation of admin functionality into distinct services (User Management and Analytics) for better organization and scalability.
**Tags:** admin, architecture, service-separation, scalability, analytics, user-management, client-server-separation
**Related:** [admin-refactor-summary-008](#admin-refactor-summary-008), [admin-security-layers-007](#admin-security-layers-007)

### ADMIN_VECTOR_PANEL_REFACTOR_SUMMARY.md
**Summary:** Documents the refactoring of AdminVectorContactTestPanel from monolithic component to clean layered service architecture following admin patterns.
**Tags:** admin, vector-search, refactoring, service-layer, api-routes, component-architecture, pinecone, semantic-search
**Related:** [admin-service-separation-005](#admin-service-separation-005), [admin-security-layers-007](#admin-security-layers-007), [technical-comprehensive-refactoring-025](#technical-comprehensive-refactoring-025)

### ADMIN_VIEW_ONLY_IMPLEMENTATION.md
**Summary:** Complete implementation of view-only admin role system allowing designated users read-only admin access with multi-layer security verification.
**Tags:** admin, security, permissions, rbac, view-only, authorization, multi-layer-security, env-variables
**Related:** [admin-security-layers-007](#admin-security-layers-007), [admin-service-separation-005](#admin-service-separation-005)

---

## Analytics & Tracking
*Analytics implementation, tracking, and reporting*

### ANALYTICS_IMPLEMENTATION_GUIDE.md
**Summary:** Complete technical guide covering analytics system architecture with rate limiting, fingerprinting, session management, and data flow.
**Tags:** analytics, rate-limiting, fingerprinting, session-management, sendBeacon, bot-detection, firestore, api-design
**Related:** [testing-rate-limits-collection-v2-041](#testing-rate-limits-collection-v2-041), [features-bot-detection-v2-015](#features-bot-detection-v2-015), [analytics-testing-guide-010](#analytics-testing-guide-010)

### ANALYTICS_SERVICE_SUMMARY.md
**Summary:** Documents complete analytics service architecture processing flattened Firestore structure for platform-wide insights and user-specific analytics.
**Tags:** analytics, firestore, flattened-structure, aggregation, platform-analytics, user-analytics, service-layer
**Related:** [analytics-implementation-012](#analytics-implementation-012), [admin-analytics-api-usage-002](#admin-analytics-api-usage-002)

### ANALYTICS_TESTING_GUIDE.md
**Summary:** Comprehensive testing and debugging guide for analytics click tracking system with browser console logs and network activity.
**Tags:** analytics, testing, debugging, click-tracking, sendBeacon, browser-console, troubleshooting
**Related:** [analytics-implementation-012](#analytics-implementation-012), [analytics-service-summary-011](#analytics-service-summary-011)

---

## RGPD/GDPR Compliance
*Data protection, privacy, and compliance features*

### ACCOUNT_DELETION_TECHNICAL_FLOW.md
**Summary:** Complete technical walkthrough of account deletion process from User A requesting deletion to User B receiving notifications. Includes 10-phase breakdown, database schema changes, timeline analysis (2-second backend, 5-second email), parallel operations, multi-language handling, and future non-user deletion feature specification.
**Tags:** account-deletion, gdpr, notifications, cascade-deletion, email, firestore, privacy, technical-flow, database-operations, multilingual
**Related:** [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](#email-notification-manual-test-guide-md), [RGPD_COMPLIANCE_MATRIX.md](#rgpd-compliance-matrix-md), [RGPD_COMPLIANCE_MATRIX.PREVIOUS.md](#rgpd-compliance-matrix-previous-md), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [RGPD_ARCHITECTURE_COMPLIANCE.md](#rgpd-architecture-compliance-md)

### ANONYMOUS_ANALYTICS_PLAN.md
**Summary:** Implementation plan for anonymous aggregated analytics tracking for users who withdraw consent, using legitimate interest legal basis.
**Tags:** gdpr, rgpd, analytics, anonymous-tracking, legitimate-interest, privacy, planning, dual-track
**Related:** [analytics-implementation-012](#analytics-implementation-012), [rgpd-implementation-summary-042](#rgpd-implementation-summary-042)

### COMMIT_SUMMARY.md
**Summary:** Complete implementation summary of RGPD Phase 1-2 with consent management, data export, account deletion, and cookie consent.
**Tags:** gdpr, rgpd, compliance, commit-summary, implementation, privacy-center, cookies, data-export
**Related:** [rgpd-conformite-tapit-013](#rgpd-conformite-tapit-013)

### RGPD_Conformite_Tapit.md
**Summary:** Complete GDPR/RGPD compliance roadmap and implementation plan for Weavink (Tapit SAS).
**Tags:** gdpr, rgpd, compliance, privacy, legal, data-protection, consent-management, cookies
**Related:** [rgpd-commit-summary-014](#rgpd-commit-summary-014)

### CONSENT_IMPLEMENTATION_GUIDE.md
**Summary:** Comprehensive guide for implementing GDPR-compliant consent checks with greyed-out buttons and consent popovers in React/Next.js applications. Includes automated test coverage (12/12 passing tests).
**Tags:** gdpr, rgpd, consent, ui-implementation, react, nextjs, consent-popovers, blocked-features, testing, test-coverage
**Related:** [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [rgpd-conformite-tapit-013](#rgpd-conformite-tapit-013), [testing-rgpd-guide-038](#testing-rgpd-guide-038)

### CONTACT_DELETION_WARNING_IMPLEMENTATION.md
**Summary:** Implementation of comprehensive warning system that notifies users when viewing or editing contacts whose Weavink accounts are scheduled for deletion. Supports both userId-based matching (for Weavink user accounts) and email-based matching (for form-submitted contacts), ensuring GDPR transparency requirements are met.
**Tags:** contact-deletion, gdpr, notifications, ui-warnings, email-matching, api-endpoint, service-layer, firestore, multilingual
**Related:** [ACCOUNT_DELETION_TECHNICAL_FLOW.md](#account-deletion-technical-flow-md), [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](#email-notification-manual-test-guide-md), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [CONTACTS_COMPONENT_INTERNATIONALIZATION.md](#contacts-component-internationalization-md)

### RGPD_IMPLEMENTATION_SUMMARY.md
**Summary:** Complete summary of RGPD Phase 1-4 implementation with consent management, data portability with multilingual export support, breach notifications, compliance features, and multilingual API error messages.
**Tags:** gdpr, rgpd, compliance, consent, data-protection, privacy, implementation, phase-summary, translation, multilingual-errors, server-side-translation, data-export-i18n
**Related:** [rgpd-master-progress-043](#rgpd-master-progress-043), [rgpd-phase4-summary-044](#rgpd-phase4-summary-044), [rgpd-conformite-tapit-013](#rgpd-conformite-tapit-013)

### RGPD_MASTER_PROGRESS.md
**Summary:** Master progress tracking document for RGPD implementation phases, features, testing, and compliance scores.
**Tags:** gdpr, rgpd, project-management, progress-tracking, compliance-score, testing, implementation
**Related:** [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [rgpd-phase4-summary-044](#rgpd-phase4-summary-044), [testing-rgpd-guide-038](#testing-rgpd-guide-038)

### RGPD_PHASE4_SUMMARY.md
**Summary:** Phase 4 implementation summary covering enhanced data portability, automated breach notifications, and compliance monitoring.
**Tags:** gdpr, rgpd, phase4, data-portability, breach-notifications, compliance, xml-export, pdf-export
**Related:** [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [rgpd-master-progress-043](#rgpd-master-progress-043), [testing-rgpd-results-040](#testing-rgpd-results-040)

---

## Feature Implementations
*Product features and user-facing functionality*

### BOT_DETECTION_FIX.md
**Summary:** Implements multi-factor bot detection using 3 criteria (requests per second, average rate, burst windows) to catch sophisticated bots.
**Tags:** bot-detection, rate-limiting, security, multi-factor-analysis, analytics, firestore-logging
**Related:** [features-bot-detection-v2-015](#features-bot-detection-v2-015), [testing-rate-limits-collection-v2-041](#testing-rate-limits-collection-v2-041)

### BOT_DETECTION_FIX_V2.md
**Summary:** Improved bot detection by including current request in calculations, catching rapid-fire bots with 50ms intervals.
**Tags:** bot-detection, rate-limiting, security, bug-fix, multi-factor-detection, analytics
**Related:** [features-bot-detection-v1-016](#features-bot-detection-v1-016), [testing-rate-limits-collection-v2-041](#testing-rate-limits-collection-v2-041), [analytics-implementation-012](#analytics-implementation-012)

### CAROUSEL_IMPLEMENTATION.md
**Summary:** Documents multi-carousel support system allowing users to create multiple independent carousels with grouped item structure.
**Tags:** carousel, features, data-structure, component-architecture, multi-carousel, firestore, ui-components

### CONTACT_DELETION_STATUS_API.md
**Summary:** API endpoint documentation for checking if a contact has a pending account deletion, enabling real-time warning displays in ContactCard and EditContactModal components.
**Tags:** contacts, deletion, api, gdpr, notifications, warnings, real-time, firestore
**Related:** [rgpd-contact-deletion-warning-048](#rgpd-contact-deletion-warning-048), [rgpd-account-deletion-flow-047](#rgpd-account-deletion-flow-047), [features-contacts-i18n-028](#features-contacts-i18n-028)

### CONTACT_DOWNLOAD_SETTINGS.md
**Summary:** Feature implementation allowing profile owners to control who can download their contact information with granular field-level permissions.
**Tags:** contacts, download, vcard, privacy, permissions, dashboard, settings, field-control

### CONTACTS_COMPONENT_INTERNATIONALIZATION.md
**Summary:** Complete internationalization of ContactCard and EditContactModal components, translating 54 hardcoded English strings across 5 languages (English, French, Spanish, Chinese, Vietnamese) to enable full multilingual support for contact management features.
**Tags:** contacts, i18n, multilingual, translation, contactcard, editcontactmodal, react, nextjs
**Related:** [CONTACT_DELETION_WARNING_IMPLEMENTATION.md](#contact-deletion-warning-implementation-md), [RGPD_ARCHITECTURE_COMPLIANCE.md](#rgpd-architecture-compliance-md)

### CV_FEATURES_ENHANCEMENT.md
**Summary:** Comprehensive implementation of CV/resume features including service-level caching, individual link activation with toggle in appearance page, bidirectional navigation with visual highlighting, document validation with auto-activation, and real-time synchronization. Includes 35 passing tests covering all functionality.
**Tags:** cv, caching, navigation, validation, real-time-sync, firestore, appearance, links, user-experience, toggle, debounce, testing
**Related:** [features-realtime-subscription-023](#features-realtime-subscription-023), [technical-refactoring-guide-034](#technical-refactoring-guide-034)

### ENHANCED_REVIEW_FEATURES.md
**Summary:** Adds structured review system to contacts with ratings, categories, sentiment analysis, and follow-up suggestions.
**Tags:** contacts, reviews, ratings, sentiment-analysis, follow-ups, ui-components
**Related:** [features-event-grouping-018](#features-event-grouping-018)

### EVENT_GROUPING_ENHANCEMENT.md
**Summary:** Enhances contact timeline by grouping related events (exchanges, follow-ups, meetings) for better readability and context.
**Tags:** contacts, timeline, event-grouping, ui-enhancement, ux-improvement
**Related:** [features-enhanced-reviews-019](#features-enhanced-reviews-019)

### IMAGE_HANDLING_IMPROVEMENTS.md
**Summary:** Fixes three critical image handling issues: IndexSizeError in cropping, white line bug with 'Free' aspect ratio, and incorrect aspect ratio display in carousel items.
**Tags:** carousel, image-cropping, aspect-ratio, object-fit, bug-fix, image-display, react-easy-crop, ui-enhancement
**Related:** [features-carousel-017](#features-carousel-017), [features-cv-enhancement-026](#features-cv-enhancement-026)

### LANDING_PAGE_REDESIGN.md
**Summary:** Documents complete redesign of landing page with modern UI, feature highlights, and improved conversion.
**Tags:** landing-page, ui-design, marketing, conversion-optimization

### MEDIA_FEATURES_ENHANCEMENT.md
**Summary:** Comprehensive fixes for media upload features including image cropping bug (black images), server validation for modern media types, state management race conditions, and bidirectional deletion between appearance and links.
**Tags:** media, carousel, upload, image-cropping, validation, state-management, firestore, appearance, links, canvas-api, cors
**Related:** [features-cv-enhancement-026](#features-cv-enhancement-026)

### ONBOARDING_SYSTEM_GUIDE.md
**Summary:** Technical guide for mandatory multi-step onboarding wizard with language selection and iPhone-style rotating language headers.
**Tags:** onboarding, user-flow, language-selection, wizard, authentication, multi-step, ui-animation

### REAL_TIME_SUBSCRIPTION_UPDATES.md
**Summary:** Implements real-time subscription updates using Firestore listeners for instant UI synchronization.
**Tags:** subscription, real-time, firestore, listeners, state-management
**Related:** [technical-subscription-revalidation-031](#technical-subscription-revalidation-031)

### ROADMAP_CHANGELOG_FEATURE_GUIDE.md
**Summary:** Complete roadmap/changelog system with hybrid data source (local git + GitHub API fallback), GitHub Issues integration, interactive SVG graph visualization, production-ready deployment, public page (/roadmap), dashboard integration, category tree structure, and multilingual support. Includes automatic serverless environment detection.
**Tags:** roadmap, changelog, git-commits, github-issues, github-api, graph-visualization, svg, interactive-ui, category-tree, public-page, dashboard, caching, redis, production-fallback, serverless
**Related:** [features-roadmap-production-spec-071](#features-roadmap-production-spec-071), [features-roadmap-checklist-072](#features-roadmap-checklist-072), [features-roadmap-gaps-073](#features-roadmap-gaps-073), [features-roadmap-summary-074](#features-roadmap-summary-074)

### ROADMAP_IMPLEMENTATION_CHECKLIST.md
**Summary:** Comprehensive implementation checklist covering all aspects of roadmap feature development, testing, and deployment. Updated 2025-11-20 with completed production deployment tasks including shared parsing utilities and GitHub API fallback implementation.
**Tags:** roadmap, checklist, implementation, testing, deployment, project-management, production-ready
**Related:** [features-roadmap-changelog-070](#features-roadmap-changelog-070), [features-roadmap-production-spec-071](#features-roadmap-production-spec-071)

### ROADMAP_GAPS_AND_RISKS.md
**Summary:** Analysis of implementation gaps, known risks, and areas requiring future attention in the roadmap feature. Updated 2025-11-20: Risk 2 (Git unavailability in production) marked as RESOLVED with GitHub API fallback solution.
**Tags:** roadmap, risks, gaps, analysis, future-work, technical-debt, mitigations
**Related:** [features-roadmap-changelog-070](#features-roadmap-changelog-070), [features-roadmap-summary-074](#features-roadmap-summary-074)

### ROADMAP_CHANGELOG_PRODUCTION_SPEC.md
**Summary:** Detailed production specification for roadmap system including GitHub API configuration, environment variables setup, serverless deployment support, security considerations, performance optimizations, error handling strategies, and production deployment checklist. Updated 2025-11-20 with GitHub API fallback solution.
**Tags:** roadmap, production, specification, security, performance, deployment, error-handling, monitoring, github-api, serverless, environment-variables
**Related:** [features-roadmap-changelog-070](#features-roadmap-changelog-070), [features-roadmap-checklist-072](#features-roadmap-checklist-072)

### ROADMAP_IMPLEMENTATION_SUMMARY.md
**Summary:** Executive summary of roadmap feature implementation, key decisions, and final architecture. Updated 2025-11-20 with Production Deployment Fix section documenting GitHub API fallback solution for serverless environments.
**Tags:** roadmap, summary, implementation, architecture, decisions, production-fix, github-api-fallback
**Related:** [features-roadmap-changelog-070](#features-roadmap-changelog-070), [features-roadmap-gaps-073](#features-roadmap-gaps-073)

### TUTORIAL_ACCOUNT_PAGE_STRUCTURE.md
**Summary:** Documents restructured tutorial progression and account page with complete independence between Privacy Overview and Tutorial Progression sections. Tutorial now renders at page level, always visible regardless of active Privacy tab.
**Tags:** tutorial, account, tabs, navigation, ui, structure, progressive-disclosure, independence, component-separation

### VENUE_ENRICHMENT_FEATURE.md
**Summary:** Automatically enriches venue/location contacts with details from Google Maps API.
**Tags:** contacts, google-maps, api-integration, venue-enrichment, automation

### VIDEO_EMBED_FEATURE_SUMMARY.md
**Summary:** Documents video embed feature allowing users to add YouTube, Vimeo, and custom videos to profiles.
**Tags:** video, embeds, youtube, vimeo, features, responsive-design

---

## Technical Infrastructure
*Architecture, refactoring, and technical improvements*

### FIREBASE_AUDIT_LOG_MONITORING.md
**Summary:** Automated 5-year audit log retention using Firestore TTL with monthly monitoring function for GDPR Article 5(2) accountability compliance.
**Tags:** firebase, firestore-ttl, scheduled-functions, cloud-functions, gdpr, rgpd, audit-logging, retention-policy, accountability, monitoring, compliance
**Related:** [FIREBASE_SCHEDULED_CLEANUP.md](#firebase-scheduled-cleanup-md), [RGPD_COMPLIANCE_MATRIX.md](#rgpd-compliance-matrix-md), [RGPD_ARCHITECTURE_COMPLIANCE.md](#rgpd-architecture-compliance-md), [ACCOUNT_PRIVACY_TESTING_GUIDE.md](#account-privacy-testing-guide-md)

### FIREBASE_SCHEDULED_CLEANUP.md
**Summary:** Automated daily cleanup of expired GDPR data export requests via Firebase Scheduled Functions for GDPR Article 5(1)(c) data minimization compliance.
**Tags:** firebase, scheduled-functions, cloud-functions, gdpr, rgpd, data-minimization, retention-policy, automated-cleanup, cron, firestore, audit-logging
**Related:** [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [RGPD_ARCHITECTURE_COMPLIANCE.md](#rgpd-architecture-compliance-md), [ACCOUNT_PRIVACY_TESTING_GUIDE.md](#account-privacy-testing-guide-md), [SUBSCRIPTION_REVALIDATION_SETUP.md](#subscription-revalidation-setup-md)

### BUDGET_AFFORDABILITY_CHECK_GUIDE.md
**Summary:** Documents affordability checking system preventing users from exceeding subscription limits.
**Tags:** budget, permissions, subscription, cost-control, validation
**Related:** [technical-budget-check-usage-027](#technical-budget-check-usage-027), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024)

### BUDGET_CHECK_USAGE_GUIDE.md
**Summary:** Guide for using real-time budget tracking and permission checking system before expensive API operations.
**Tags:** budget, cost-tracking, permissions, session-management, api-design, pre-flight-checks
**Related:** [technical-budget-display-026](#technical-budget-display-026), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024)

### BUDGET_DISPLAY_IMPLEMENTATION.md
**Summary:** Documents budget information display system showing users real-time monthly AI operation usage and cost budget.
**Tags:** budget, dashboard, ui-components, cost-tracking, subscription, real-time-display
**Related:** [technical-budget-check-usage-027](#technical-budget-check-usage-027), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024)

### BUILD_FIX_IMPORT_PATHS.md
**Summary:** Fixed critical build errors by correcting import paths in API routes and adding missing function exports in privacy services, enabling successful compilation.
**Tags:** build-fix, imports, exports, path-alias, eslint, nextjs, gdpr, rgpd, privacy-services
**Related:** [ADMIN_SECURITY_LAYERS_GUIDE.md](#admin-security-layers-guide-md), [RGPD_PHASE4_SUMMARY.md](#rgpd-phase4-summary-md)

### COMPREHENSIVE_REFACTORING_GUIDE.md
**Summary:** Best practices and patterns reference for refactoring Next.js codebase covering components, services, API routes, and state management.
**Tags:** refactoring, best-practices, architecture, nextjs, design-patterns, testing, code-quality
**Related:** [admin-refactor-summary-008](#admin-refactor-summary-008), [admin-service-separation-005](#admin-service-separation-005), [admin-vector-panel-refactor-004](#admin-vector-panel-refactor-004)

### COST_TRACKING_MIGRATION_GUIDE.md
**Summary:** Complete migration guide for refactored CostTrackingService supporting multiple resource types (AI, API) with backward compatibility.
**Tags:** cost-tracking, migration, ai-usage, api-usage, firestore, backward-compatibility, subscription-limits
**Related:** [technical-budget-check-usage-027](#technical-budget-check-usage-027), [technical-budget-display-026](#technical-budget-display-026), [admin-analytics-integration-001](#admin-analytics-integration-001)

### DYNAMICFIELDS_FIX_SUMMARY.md
**Summary:** Fixes dynamic field system for contacts with improved data validation and error handling.
**Tags:** contacts, dynamic-fields, bug-fix, validation, data-integrity

### QUICK_START_INTEGRATION.md
**Summary:** Quick 30-minute integration guide for new features and components.
**Tags:** integration, quick-start, onboarding, documentation

### REFACTORING_GUIDE.md
**Summary:** Major refactoring of cost tracking system supporting generalized API cost tracking, session-based tracking, and centralized cost constants.
**Tags:** refactoring, cost-tracking, api-costs, sessions, architecture, service-layer
**Related:** [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024), [technical-refactoring-guide-034](#technical-refactoring-guide-034)

### REFACTORING_GUIDE.md
**Summary:** Specific refactoring guide for cost tracking service.
**Tags:** refactoring, cost-tracking, service-layer
**Related:** [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024), [technical-comprehensive-refactoring-025](#technical-comprehensive-refactoring-025)

### RGPD_ARCHITECTURE_COMPLIANCE.md
**Summary:** Comprehensive refactoring report documenting architectural alignment of RGPD implementation with Weavink 5-layer pattern. Achieved 95% compliance (from 34%), eliminated 12 raw fetch() calls, implemented permission-based security, centralized constants management, and multilingual error translation system. Documents 21 files modified across client services, API routes, server services, translation files, and context layers.
**Tags:** rgpd, gdpr, architecture, refactoring, compliance, 5-layer-pattern, security, constants, session-manager, contact-api-client, permissions, code-quality, translation, multilingual-errors, i18n
**Related:** [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [rgpd-master-progress-043](#rgpd-master-progress-043), [rgpd-consent-guide-045](#rgpd-consent-guide-045), [technical-comprehensive-refactoring-025](#technical-comprehensive-refactoring-025), [admin-security-layers-007](#admin-security-layers-007)

### RULES_GROUPING_FIXES.md
**Summary:** Fixes for rules grouping system.
**Tags:** rules-engine, bug-fix, grouping

### SEMANTIC_SEARCH_ARCHITECTURE_CURRENT.md
**Summary:** Documents current semantic search architecture using vector embeddings and Pinecone.
**Tags:** semantic-search, vector-database, pinecone, embeddings, ai-features
**Related:** [admin-vector-panel-refactor-004](#admin-vector-panel-refactor-004)

### SESSION_TRACKING_FIX.md
**Summary:** Fixes session tracking issues ensuring proper session lifecycle management.
**Tags:** sessions, bug-fix, tracking, lifecycle-management
**Related:** [admin-dashboard-session-fix-009](#admin-dashboard-session-fix-009)

### SUBSCRIPTION_REVALIDATION_SETUP.md
**Summary:** Documents subscription revalidation system ensuring user tier limits are enforced correctly.
**Tags:** subscription, validation, security, tier-enforcement
**Related:** [features-realtime-subscription-023](#features-realtime-subscription-023)

---

## Testing & QA
*Testing guides and quality assurance*

### EMAIL_NOTIFICATION_BUG_FIXES.md
**Summary:** Documents 3 bugs discovered during email notification system testing: completion email fetch-after-delete bug, Firebase composite index requirement, and contact deletion notifications not updating on completion. Includes root cause analysis, fixes, and verification.
**Tags:** email, notifications, bug-fixes, rgpd, testing, account-deletion, firebase, debugging, root-cause-analysis, notification-update, notifications-collection, contacts-ui
**Related:** [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](#email-notification-manual-test-guide-md), [RGPD_ACCOUNT_DELETION_GUIDE.md](#rgpd-account-deletion-guide-md)

### EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md
**Summary:** Comprehensive manual testing guide for multilingual email notification system covering i18n bug fixes, account deletion emails, and data export emails. Includes Test 2.2 results (immediate deletion variant).
**Tags:** email, notifications, multilingual, i18n, rgpd, manual-testing, phase1, phase2, phase3, data-export, gdpr, brevo, troubleshooting, immediate-deletion
**Related:** [RGPD_TESTING_GUIDE.md](#rgpd-testing-guide-md), [ACCOUNT_PRIVACY_TESTING_GUIDE.md](#account-privacy-testing-guide-md), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [EMAIL_INTEGRATION_GUIDE.md](#email-integration-guide-md), [EMAIL_NOTIFICATION_BUG_FIXES.md](#email-notification-bug-fixes-md)

### RATE_LIMIT_TESTING.md
**Summary:** Testing guide for rate limiting system with various attack scenarios and verification methods.
**Tags:** testing, rate-limiting, security-testing, bot-simulation
**Related:** [features-bot-detection-v2-015](#features-bot-detection-v2-015), [testing-rate-limits-collection-v2-041](#testing-rate-limits-collection-v2-041)

### RATE_LIMITS_COLLECTION_GUIDE_V1_DEPRECATED.md
**Summary:** Original rate limits collection guide (deprecated - use V2).
**Tags:** rate-limiting, security, monitoring, firestore, logging, security-events
**Related:** [testing-rate-limits-collection-v2-041](#testing-rate-limits-collection-v2-041), [features-bot-detection-v2-015](#features-bot-detection-v2-015), [analytics-implementation-012](#analytics-implementation-012)

### RATE_LIMITS_COLLECTION_GUIDE_V2.md
**Summary:** Complete reference guide to RateLimits Firestore collection with comprehensive field documentation, 21 event types across analytics/privacy/application, multi-threshold bot detection (200ms/500ms/1s windows), and detailed monitoring queries for security event analysis.
**Tags:** rate-limiting, security, monitoring, firestore, logging, security-events, bot-detection
**Related:** [features-bot-detection-v2-015](#features-bot-detection-v2-015), [analytics-implementation-012](#analytics-implementation-012), [testing-rate-limit-036](#testing-rate-limit-036)

### RGPD_TESTING_GUIDE.md
**Summary:** Comprehensive testing documentation for RGPD Phase 1-4 implementation with 116 tests covering consent, privacy settings, and compliance features.
**Tags:** testing, rgpd, gdpr, test-suite, compliance-testing, consent-testing, phase-testing
**Related:** [testing-rgpd-quickstart-039](#testing-rgpd-quickstart-039), [testing-rgpd-results-040](#testing-rgpd-results-040), [rgpd-master-progress-043](#rgpd-master-progress-043)

### RGPD_TESTING_QUICKSTART.md
**Summary:** Quick 30-second guide to running RGPD tests via browser console with one-liner commands for all test suites.
**Tags:** testing, rgpd, quick-start, browser-console, test-runner, one-liner
**Related:** [testing-rgpd-guide-038](#testing-rgpd-guide-038), [testing-rgpd-results-040](#testing-rgpd-results-040)

### RGPD_TEST_RESULTS.md
**Summary:** Complete test results showing 116/116 passing tests across all RGPD phases with detailed coverage breakdown.
**Tags:** testing, rgpd, test-results, compliance, 100-percent-pass, test-coverage
**Related:** [testing-rgpd-guide-038](#testing-rgpd-guide-038), [testing-rgpd-quickstart-039](#testing-rgpd-quickstart-039), [rgpd-master-progress-043](#rgpd-master-progress-043)

---

## General Documentation
*Project overview, setup, and general information*

### Preview.md
**Summary:** Preview/demo documentation.
**Tags:** preview, demo, features

### README.md
**Summary:** Main project README with setup instructions and overview.
**Tags:** readme, setup, getting-started, overview, installation

### RESTART_INSTRUCTIONS.md
**Summary:** Server restart procedures and troubleshooting steps.
**Tags:** operations, restart, troubleshooting, server-management

### updates.md
**Summary:** Project changelog and update history.
**Tags:** changelog, updates, version-history

---

## Tutorials & Guides
*Implementation guides, tutorials, and how-tos*

### CONVERSATION_MANAGER_SKILL_GUIDE.md
**Summary:** Design and implementation plan for a conversation-manager-skill that automatically saves conversation history from Claude Code sessions, linking them to git commits and enabling smart conversation continuation detection.
**Tags:** skill, conversation, git-integration, automation, documentation, claude-code, implementation-guide, planned
**Related:** [git-manager-skill](#git-manager-skill), [docs-manager-skill](#docs-manager-skill)

### EMAIL_INTEGRATION_GUIDE.md
**Summary:** Step-by-step developer guide for adding new multilingual email notifications to the Weavink email system. Includes code examples, translation structure, testing checklist, best practices, and cross-reference to API error translation pattern.
**Tags:** email, notifications, multilingual, i18n, rgpd, development, tutorial, integration, brevo, gdpr, developer-guide, api-errors, translation-service
**Related:** [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](#email-notification-manual-test-guide-md), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [RGPD_ARCHITECTURE_COMPLIANCE.md](#rgpd-architecture-compliance-md)

### RATE_LIMIT_UI_PATTERN_GUIDE.md
**Summary:** Comprehensive guide for implementing a reusable UI pattern for handling rate limit errors (HTTP 429) with real-time countdown timer, greyed-out button, localStorage persistence, multi-tab synchronization, and accurate timing using server's absolute resetTime.
**Tags:** rate-limiting, ui-patterns, countdown-timer, localStorage, state-management, user-feedback, 429-handling, react, persistence, multi-tab-sync
**Related:** [RATE_LIMIT_TESTING.md](#rate-limit-testing-md), [ACCOUNT_PRIVACY_TESTING_GUIDE.md](#account-privacy-testing-guide-md), [RATE_LIMITS_COLLECTION_GUIDE_V2.md](#rate-limits-collection-guide-v2-md), [CONSENT_IMPLEMENTATION_GUIDE.md](#consent-implementation-guide-md)

---

## Meta Documentation
*Project meta-documentation, reorganizations, and documentation about documentation*

### DOCUMENTATION_REORGANIZATION_2025.md
**Summary:** Complete reorganization of project documentation from root directory into structured documentation/ folder with 9 subfolders, updating all skills and tracking systems.
**Tags:** documentation, reorganization, structure, skills, maintenance, meta
**Related:** [rgpd-commit-summary-014](#rgpd-commit-summary-014)

### COMMIT_SUMMARY.md
**Summary:** Complete implementation summary of RGPD Phase 1-2 with consent management, data export, account deletion, and cookie consent.
**Tags:** gdpr, rgpd, compliance, commit-summary, implementation, privacy-center, cookies, data-export
**Related:** [rgpd-conformite-tapit-013](#rgpd-conformite-tapit-013)

---

