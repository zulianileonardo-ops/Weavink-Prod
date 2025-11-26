# Weavink Documentation Index

**Last Updated:** 2025-11-27
**Total Guides:** 100

## Quick Navigation
- [Admin System](#admin-system) (9 guides)
- [Analytics & Tracking](#analytics-tracking) (3 guides)
- [RGPD/GDPR Compliance](#rgpd-gdpr-compliance) (13 guides)
- [Feature Implementations](#feature-implementations) (29 guides)
- [Technical Infrastructure](#technical-infrastructure) (23 guides)
- [Testing & QA](#testing-qa) (15 guides)
- [General Documentation](#general-documentation) (4 guides)
- [Tutorials & Guides](#tutorials-guides) (3 guides)
- [Meta Documentation](#meta-documentation) (2 guides)
- [Security](#security) (1 guides)

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
**Summary:** Implementation plan and completed implementation for anonymous aggregated analytics tracking for users who withdraw consent, using legitimate interest legal basis. Includes Phase 1-3 complete with TTL configuration, translations, and automated tests.
**Tags:** gdpr, rgpd, analytics, anonymous-tracking, legitimate-interest, privacy, implementation, dual-track, firestore-ttl, multilingual, testing
**Related:** [analytics-implementation-012](#analytics-implementation-012), [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [testing-anonymous-analytics-077](#testing-anonymous-analytics-077)

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

### CONTACT_ANONYMIZATION_IMPLEMENTATION_GUIDE.md
**Summary:** Comprehensive implementation guide for anonymizing User A's contact data in User B's contact list when User A deletes their account. Implements GDPR Article 17 (Right to be Forgotten) with Option B (Preserve Context) strategy, anonymizing all PII while preserving business context and User B's notes/tags.
**Tags:** gdpr, rgpd, anonymization, contact-deletion, right-to-be-forgotten, privacy, data-protection, firestore, pinecone
**Related:** [rgpd-account-deletion-flow-047](#rgpd-account-deletion-flow-047), [rgpd-contact-deletion-warning-048](#rgpd-contact-deletion-warning-048), [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [rgpd-consent-guide-045](#rgpd-consent-guide-045), [rgpd-anonymous-analytics-046](#rgpd-anonymous-analytics-046)

### CONTACT_ANONYMIZATION_BUGFIX.md
**Summary:** Complete documentation of four critical bugs discovered and fixed in the contact anonymization system: Bug #1 (Execution order causing anonymization to never execute), Bug #2 (Pinecone API method error), Bug #3 (Missing vector integration in ExchangeService), and Bug #4 (Field name mismatch causing premium accounts to be treated as base tier). All bugs fixed and tested, achieving full GDPR Article 17 compliance.
**Tags:** gdpr, rgpd, bug-fixes, contact-anonymization, execution-order, pinecone-api, vector-storage, field-mismatch, subscription-tier, accountType, exchangeService
**Related:** [rgpd-contact-anonymization-049](#rgpd-contact-anonymization-049), [testing-contact-anonymization-078](#testing-contact-anonymization-078), [rgpd-account-deletion-flow-047](#rgpd-account-deletion-flow-047), [technical-semantic-search-032](#technical-semantic-search-032)

### CONTACT_ANONYMIZATION_FINAL_REPORT.md
**Summary:** Final implementation report for contact anonymization system implementing GDPR Article 17 Right to be Forgotten. Documents complete implementation including all bug fixes, testing results, and deployment status.
**Tags:** gdpr, rgpd, contact-anonymization, final-report, implementation-complete, right-to-be-forgotten, article-17
**Related:** [rgpd-contact-anonymization-049](#rgpd-contact-anonymization-049), [rgpd-contact-anonymization-bugfix-080](#rgpd-contact-anonymization-bugfix-080), [testing-contact-anonymization-078](#testing-contact-anonymization-078), [rgpd-account-deletion-flow-047](#rgpd-account-deletion-flow-047)

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

### CONTACT_CREATION_ENRICHMENT_FLOW.md
**Summary:** Complete end-to-end contact creation flow with 3-step enrichment pipeline: Step 1 (Reverse Geocoding $0.005) → Step 2 (Venue Search $0.032 API / $0 cached) → Step 3 (AI Auto-Tagging $0.0000002). Includes session-based tracking, dual budget system (API + AI), database schema, graceful degradation, and testing guide. Updated 2025-11-22 with Phase 5 auto-tagging integration.
**Tags:** contact-creation, enrichment-flow, multi-step-pipeline, session-tracking, geocoding, venue-search, auto-tagging, phase-5, cost-tracking, budget-management
**Related:** [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [SESSION_BASED_ENRICHMENT.md](#session-based-enrichment-md), [GEOCODING_SYSTEM_GUIDE.md](#geocoding-system-guide-md), [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md)

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

### EVENT_SOCIAL_INTELLIGENCE.md
**Summary:** Comprehensive guide to the Event Social Intelligence system including Ghost Mode, AI matching, meeting zones, and the 4-tier visibility system for professional events.
**Tags:** events, social-intelligence, ghost-mode, ai-matching, meeting-zones, neo4j, map, visibility, testing
**Related:** [features-intelligent-groups-neo4j-083](#features-intelligent-groups-neo4j-083), [rgpd-compliance-matrix-001](#rgpd-compliance-matrix-001)

### GEOCODING_SYSTEM_GUIDE.md
**Summary:** Comprehensive technical guide for the geocoding system using Google Maps API. Covers 3-step enrichment pipeline: Step 1 (Reverse Geocoding $0.005), Step 2 (Venue Search $0.032), Step 3 (AI Auto-Tagging $0.0000002). Includes session-based tracking, dual budget system (API + AI), cost tracking in SessionUsage/ApiUsage collections, budget management, location data model (PII vs business context), GDPR compliance with anonymization, subscription tier limits, monitoring, debugging, and troubleshooting. Updated 2025-11-22 with Phase 5 integration and tier validation bug fixes.
**Tags:** geocoding, google-maps, reverse-geocoding, cost-tracking, location, gps, api, budget, subscription, gdpr, venue-enrichment, places-api, exchange-contacts, session-tracking, troubleshooting, bug-fixes, tier-validation, auto-tagging, phase-5
**Related:** [features-venue-enrichment-021](#features-venue-enrichment-021), [rgpd-contact-anonymization-049](#rgpd-contact-anonymization-049), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024), [technical-semantic-search-032](#technical-semantic-search-032), [SESSION_BASED_ENRICHMENT.md](#session-based-enrichment-md), [SESSION_VS_STANDALONE_TRACKING.md](#session-vs-standalone-tracking-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [CONTACT_CREATION_ENRICHMENT_FLOW.md](#contact-creation-enrichment-flow-md)

### IMAGE_HANDLING_IMPROVEMENTS.md
**Summary:** Fixes three critical image handling issues: IndexSizeError in cropping, white line bug with 'Free' aspect ratio, and incorrect aspect ratio display in carousel items.
**Tags:** carousel, image-cropping, aspect-ratio, object-fit, bug-fix, image-display, react-easy-crop, ui-enhancement
**Related:** [features-carousel-017](#features-carousel-017), [features-cv-enhancement-026](#features-cv-enhancement-026)

### INTELLIGENT_GROUPS_NEO4J_SPEC.md
**Summary:** AI-powered intelligent group creation using Neo4j graph database for relationship discovery. Supports 4 suggestion types: company (WORKS_AT), tag (HAS_TAG), semantic (SIMILAR_TO), and knows (KNOWS). Includes GroupNamingService for Gemini-powered creative group names with Redis caching, 2D/3D visualization modes (react-force-graph-2d/3d), and Advanced Filters for filtering by specific company or tag names.
**Tags:** neo4j, graph-database, intelligent-groups, pinecone, gemini, visualization, react-force-graph, react-force-graph-3d, 3d-visualization, advanced-filters, relationship-discovery, ai-groups, ai-naming, tag-suggestions, knows-suggestions, redis-cache
**Related:** [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md)

### LANDING_PAGE_REDESIGN.md
**Summary:** Documents complete redesign of landing page with modern UI, feature highlights, and improved conversion.
**Tags:** landing-page, ui-design, marketing, conversion-optimization

### LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
**Summary:** Advanced location-based contact management system with 4-step enrichment: geocoding → venue search → AI tagging → vector embedding. Features Redis caching with optimized cache key (name excluded for ~30% better hit rate), session-based tracking, metadata tracking for skip scenarios, budget independence (AI/API budgets separated), and graceful degradation. Phase 5 complete: Auto-tagging at save time with 3-tier caching.
**Tags:** location, gps, google-places, auto-tagging, event-detection, redis-cache, ai, gemini, premium-features, partially-implemented, session-tracking, venue-enrichment, auto-enrichment, cost-optimization, tier-validation, bug-fixes, settings-service, phase-5, migration-guide
**Related:** [SESSION_BASED_ENRICHMENT.md](#session-based-enrichment-md), [SESSION_VS_STANDALONE_TRACKING.md](#session-vs-standalone-tracking-md), [GEOCODING_SYSTEM_GUIDE.md](#geocoding-system-guide-md), [features-venue-enrichment-021](#features-venue-enrichment-021), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [CONTACT_CREATION_ENRICHMENT_FLOW.md](#contact-creation-enrichment-flow-md)

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

### SESSION_BASED_ENRICHMENT.md
**Summary:** Three-step location enrichment with session-based cost tracking: Step 1 (Reverse Geocoding), Step 2 (Venue Search), Step 3 (AI Auto-Tagging). Session tracking groups multi-step operations, single-step uses ApiUsage. Updated 2025-11-22 with Phase 5 auto-tagging integration showing dual budget system (API + AI budgets) and complete 3-step pipeline.
**Tags:** session-tracking, location-enrichment, cost-tracking, geocoding, venue-search, location-services, bug-fixes, multi-step-detection, session-creation, auto-tagging, phase-5
**Related:** [GEOCODING_SYSTEM_GUIDE.md](#geocoding-system-guide-md), [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md), [SESSION_TRACKING_FIX.md](#session-tracking-fix-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [CONTACT_CREATION_ENRICHMENT_FLOW.md](#contact-creation-enrichment-flow-md)

### TIERED_CONFIDENCE_DISCOVERY_GUIDE.md
**Summary:** Three-tier confidence system for relationship discovery: HIGH (auto-save), MEDIUM (review with LLM), LOW (potential). Reduces false positives by classifying relationships based on semantic similarity scores and tag overlap, with user review for uncertain matches.
**Tags:** neo4j, graph, relationships, discovery, confidence, llm, review, pinecone, semantic-similarity
**Related:** [INTELLIGENT_GROUPS_NEO4J_SPEC.md](#intelligent-groups-neo4j-spec-md), [NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md](#neo4j-graph-explorer-testing-guide-md)

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

### SESSION_VS_STANDALONE_TRACKING.md
**Summary:** Comprehensive comparison and decision guide for choosing between session-based and standalone cost tracking approaches. Includes troubleshooting section for single-step vs multi-step detection bug (fixed 2025-11-22).
**Tags:** session-tracking, cost-tracking, api-usage, architecture, decision-guide, bug-fixes, troubleshooting, multi-step-detection
**Related:** [SESSION_BASED_ENRICHMENT.md](#session-based-enrichment-md), [SESSION_TRACKING_FIX.md](#session-tracking-fix-md), [COST_TRACKING_MIGRATION_GUIDE.md](#cost-tracking-migration-guide-md)

### PHASE5_AUTO_TAGGING_MIGRATION.md
**Summary:** Comprehensive migration guide for moving AI tag generation from search time to contact save time. Achieves 98.75% cost savings and 50ms faster searches. Includes AutoTaggingService with 3-tier caching (static → Redis → AI), cache key optimization (name excluded for ~30% better hit rate), metadata tracking for skip scenarios (budget_exceeded, no_taggable_data, disabled, error), budget management, and graceful degradation.
**Tags:** auto-tagging, migration, phase-5, semantic-search, cost-optimization, ai, gemini, session-tracking, redis-cache, location-services
**Related:** [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [SEMANTIC_SEARCH_ARCHITECTURE_CURRENT.md](#semantic-search-architecture-current-md), [CONTACT_CREATION_ENRICHMENT_FLOW.md](#contact-creation-enrichment-flow-md), [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md), [SESSION_BASED_ENRICHMENT.md](#session-based-enrichment-md)

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

### DISCOVERY_JOB_MANAGER_GUIDE.md
**Summary:** Comprehensive technical guide for the in-memory job storage system that enables background relationship discovery operations. Covers singleton Map pattern, job lifecycle, progress tracking, security considerations, and integration with Neo4j discovery services.
**Tags:** background-jobs, job-manager, in-memory-storage, progress-tracking, discovery, neo4j, polling, singleton, api-pattern
**Related:** [INTELLIGENT_GROUPS_NEO4J_SPEC.md](#intelligent-groups-neo4j-spec-md), [NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md](#neo4j-graph-explorer-testing-guide-md)

### DYNAMICFIELDS_FIX_SUMMARY.md
**Summary:** Fixes dynamic field system for contacts with improved data validation and error handling.
**Tags:** contacts, dynamic-fields, bug-fix, validation, data-integrity

### GIT_DUAL_REMOTE_SETUP.md
**Summary:** Complete setup guide for configuring repository to push to both GitHub and GitLab simultaneously. Covers initial setup, authentication (SSH for GitLab, HTTPS for GitHub), troubleshooting common issues including GitLab SSO/SAML messages, and integration with git-manager-skill.
**Tags:** git, github, gitlab, repository, deployment, version-control, multi-remote, infrastructure, setup, ssh, authentication
**Related:** [git-manager-skill](#git-manager-skill), [features-roadmap-changelog-070](#features-roadmap-changelog-070)

### QUERY_TAGGING_ARCHITECTURE.md
**Summary:** Query Tagging enhancement for semantic search that generates tags for search queries using the same vocabulary as contact auto-tagging. Creates better alignment between query embeddings and contact document embeddings. Uses 3-tier caching (Static → Redis → Gemini), default ON, with 80% cache hit rate and minimal latency impact (~12ms average). Includes Rerank Tag Integration (Option B) for Cohere.
**Tags:** query-tagging, semantic-search, vector-embedding, ai-features, gemini, caching, search-optimization, reranking
**Related:** [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md)

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
**Related:** [admin-vector-panel-refactor-004](#admin-vector-panel-refactor-004), [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](#semantic-search-architecture-v2-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md)

### SEMANTIC_SEARCH_ARCHITECTURE_V2.md
**Summary:** V2 semantic search architecture with pre-generated tags at contact save time. Removes STEP 0 query enhancement (now handled by auto-tagging), reducing pipeline from 12 to 11 steps. Tags included in vector embeddings for better search quality, 50ms faster searches, and 98.75% cost savings. Uses Pinecone vector database, Gemini 2.5 Flash for embeddings, and graceful degradation for budget limits.
**Tags:** semantic-search, vector-database, pinecone, embeddings, ai-features, auto-tagging, architecture-v2, performance-optimization, cost-optimization
**Related:** [SEMANTIC_SEARCH_ARCHITECTURE_CURRENT.md](#semantic-search-architecture-current-md), [PHASE5_AUTO_TAGGING_MIGRATION.md](#phase5-auto-tagging-migration-md), [CONTACT_CREATION_ENRICHMENT_FLOW.md](#contact-creation-enrichment-flow-md)

### SESSION_TRACKING_FIX.md
**Summary:** Fixes session tracking issues ensuring proper session lifecycle management.
**Tags:** sessions, bug-fix, tracking, lifecycle-management, budget-tracking
**Related:** [admin-dashboard-session-fix-009](#admin-dashboard-session-fix-009)

### SUBSCRIPTION_REVALIDATION_SETUP.md
**Summary:** Documents subscription revalidation system ensuring user tier limits are enforced correctly.
**Tags:** subscription, validation, security, tier-enforcement
**Related:** [features-realtime-subscription-023](#features-realtime-subscription-023)

---

## Testing & QA
*Testing guides and quality assurance*

### ANONYMOUS_ANALYTICS_MANUAL_TEST_GUIDE.md
**Summary:** Comprehensive manual testing guide for Phase 3.3 of anonymous analytics implementation. Covers 8 test categories with 35+ individual tests including consent withdrawal scenarios, Firestore verification, TTL validation, GDPR compliance, multi-language testing, rate limiting, edge cases, and client-side integration.
**Tags:** testing, manual-testing, anonymous-analytics, gdpr, rgpd, consent-withdrawal, firestore-verification, ttl, rate-limiting, multi-language, troubleshooting
**Related:** [rgpd-anonymous-analytics-046](#rgpd-anonymous-analytics-046), [testing-rgpd-guide-038](#testing-rgpd-guide-038), [testing-email-notifications-065](#testing-email-notifications-065), [analytics-implementation-012](#analytics-implementation-012)

### CONTACT_ANONYMIZATION_MANUAL_TEST_GUIDE.md
**Summary:** Comprehensive manual testing guide for contact anonymization system implementing GDPR Article 17 Right to be Forgotten. Covers 6 test scenarios including end-to-end anonymization flow, Firestore verification, Pinecone vector metadata verification, semantic search functionality, edge cases & idempotency, and multi-language UI testing across 5 languages.
**Tags:** testing, manual-testing, contact-anonymization, gdpr, rgpd, right-to-be-forgotten, article-17, firestore-verification, pinecone-verification, semantic-search, multi-language, edge-cases, troubleshooting
**Related:** [rgpd-contact-anonymization-049](#rgpd-contact-anonymization-049), [testing-rgpd-guide-038](#testing-rgpd-guide-038), [rgpd-account-deletion-flow-047](#rgpd-account-deletion-flow-047), [rgpd-contact-deletion-warning-048](#rgpd-contact-deletion-warning-048)

### DUAL_SYSTEM_TESTING_GUIDE.md
**Summary:** Comprehensive manual testing guide for both Auto-Tagging (contact save) and Query Tagging (semantic search) systems. 10 general tests with dual sections per test capturing server logs, Firestore state, Pinecone vectors, and SessionUsage tracking.
**Tags:** testing, auto-tagging, query-tagging, semantic-search, dual-system, manual-testing
**Related:** [testing-phase5-manual-080](#testing-phase5-manual-080), [infrastructure-query-tagging-079](#infrastructure-query-tagging-079), [infrastructure-phase5-auto-tagging-077](#infrastructure-phase5-auto-tagging-077), [infrastructure-semantic-search-v2-050](#infrastructure-semantic-search-v2-050)

### EMAIL_NOTIFICATION_BUG_FIXES.md
**Summary:** Documents 3 bugs discovered during email notification system testing: completion email fetch-after-delete bug, Firebase composite index requirement, and contact deletion notifications not updating on completion. Includes root cause analysis, fixes, and verification.
**Tags:** email, notifications, bug-fixes, rgpd, testing, account-deletion, firebase, debugging, root-cause-analysis, notification-update, notifications-collection, contacts-ui
**Related:** [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](#email-notification-manual-test-guide-md), [RGPD_ACCOUNT_DELETION_GUIDE.md](#rgpd-account-deletion-guide-md)

### EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md
**Summary:** Comprehensive manual testing guide for multilingual email notification system covering i18n bug fixes, account deletion emails, and data export emails. Includes Test 2.2 results (immediate deletion variant).
**Tags:** email, notifications, multilingual, i18n, rgpd, manual-testing, phase1, phase2, phase3, data-export, gdpr, brevo, troubleshooting, immediate-deletion
**Related:** [RGPD_TESTING_GUIDE.md](#rgpd-testing-guide-md), [ACCOUNT_PRIVACY_TESTING_GUIDE.md](#account-privacy-testing-guide-md), [RGPD_IMPLEMENTATION_SUMMARY.md](#rgpd-implementation-summary-md), [EMAIL_INTEGRATION_GUIDE.md](#email-integration-guide-md), [EMAIL_NOTIFICATION_BUG_FIXES.md](#email-notification-bug-fixes-md)

### EXCHANGE_SECURITY_TESTING_GUIDE.md
**Summary:** Integration tests for ExchangeService security: rate limiting, fingerprinting, validation, and audit logging with real Firestore.
**Tags:** testing, exchange-service, security, rate-limiting, fingerprinting, integration-tests
**Related:** [security-exchange-service-001](#security-exchange-service-001), [testing-rate-limit-036](#testing-rate-limit-036)

### LOCATION_SERVICES_PHASE3_TEST_PLAN.md
**Summary:** Comprehensive testing guide for Phase 3 auto-enrichment implementation covering 80+ test scenarios including happy path, settings integration, budget tracking, Redis caching, error handling, subscription tiers, performance, data integrity, and graceful degradation with detailed verification procedures.
**Tags:** location-services, auto-enrichment, phase-3, testing, qa, redis-cache, google-places, budget-tracking, exchange-contacts, venue-enrichment, manual-testing, integration-testing
**Related:** [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](#location-services-auto-tagging-spec-md), [GEOCODING_SYSTEM_GUIDE.md](#geocoding-system-guide-md), [RATE_LIMIT_TESTING.md](#rate-limit-testing-md), [RGPD_TESTING_GUIDE.md](#rgpd-testing-guide-md)

### NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md
**Summary:** End-to-end manual testing guide for Neo4j integration, Graph Explorer visualization, and Intelligent Group creation. 16 tests covering contact sync to Neo4j, graph API endpoints, visualization rendering, relationship discovery, all 4 suggestion types (company, tag, semantic, knows), AI-generated group naming with Gemini, Redis caching, 3D mode toggle, and Advanced Filters (company/tag selection).
**Tags:** testing, manual-testing, neo4j, graph-explorer, graph-visualization, intelligent-groups, relationship-discovery, contacts, ai-naming, tag-suggestions, knows-suggestions, redis-cache, 3d-visualization, advanced-filters, react-force-graph-3d
**Related:** [testing-dual-system-guide-082](#testing-dual-system-guide-082), [testing-phase5-manual-080](#testing-phase5-manual-080), [features-intelligent-groups-neo4j-083](#features-intelligent-groups-neo4j-083), [infrastructure-semantic-search-v2-050](#infrastructure-semantic-search-v2-050)

### PHASE5_MANUAL_TESTING_GUIDE.md
**Summary:** Comprehensive manual testing guide for Phase 5 Auto-Tagging with 15+ test scenarios covering all feature combinations, budget states, cache tiers, and subscription tiers. Includes sections for server logs, database state, Pinecone data, and usage tracking validation.
**Tags:** testing, manual-testing, phase-5, auto-tagging, ai, session-tracking, budget-validation, feature-combinations, firestore-verification, pinecone-verification
**Related:** [technical-auto-tagging-migration-033](#technical-auto-tagging-migration-033), [features-session-enrichment-001](#features-session-enrichment-001), [features-geocoding-system-082](#features-geocoding-system-082), [features-location-services-auto-tagging-080](#features-location-services-auto-tagging-080), [features-contact-enrichment-021](#features-contact-enrichment-021)

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
**Summary:** Comprehensive README for Weavink enterprise-grade professional networking platform with AI-powered contact management, full GDPR compliance, complete tech stack documentation, installation guide, and proprietary licensing information.
**Tags:** readme, setup, getting-started, overview, installation, weavink, enterprise, gdpr-compliant, ai-features, license, proprietary
**Related:** [rgpd-implementation-summary-042](#rgpd-implementation-summary-042), [features-geocoding-system-082](#features-geocoding-system-082), [technical-cost-tracking-migration-024](#technical-cost-tracking-migration-024), [testing-rgpd-guide-038](#testing-rgpd-guide-038)

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

## Security
*Security architecture, authentication, authorization, and API protection*

### EXCHANGE_SERVICE_SECURITY.md
**Summary:** Comprehensive security documentation for the public contact exchange service, covering dual rate limiting (IP + fingerprint), CSRF protection, profile authorization, input validation, and audit logging.
**Tags:** exchange, security, authentication, authorization, rate-limiting, CSRF, public-api, contact-exchange, fingerprinting

---

