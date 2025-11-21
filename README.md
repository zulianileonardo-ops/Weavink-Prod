---
id: general-readme-038
title: Project README
category: general
tags: [readme, setup, getting-started, overview, installation, weavink, enterprise]
status: active
created: 2025-01-01
updated: 2025-11-21
related: []
---

![Weavink Banner](https://github.com/user-attachments/assets/1ca25cd4-ba50-437b-b86a-099c6d8d0ac0)

# Weavink

> Enterprise-grade professional networking and intelligent contact management platform

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.4-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.4.0-orange)](https://firebase.google.com/)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green)](documentation/rgpd/)

## Overview

Weavink is a comprehensive contact management and professional networking platform that combines intelligent contact exchange, AI-powered enrichment, and enterprise-grade analytics with full GDPR compliance. What started as a simple link-in-bio tool has evolved into a sophisticated business solution for modern professionals and enterprises.

## Key Features

### Contact Management
- **Intelligent Contact Exchange**: QR codes, NFC support, and GPS-based sharing
- **AI-Powered Enrichment**: Automatic contact enhancement using Google Gemini
- **Semantic Search**: Vector embeddings with Pinecone for intelligent contact discovery
- **GDPR Article 17 Compliance**: Complete contact anonymization and right to be forgotten
- **Dynamic Fields**: Custom metadata and flexible contact structures
- **Duplicate Detection**: AI-powered identification and smart merging (planned)

### Location Services
- **GPS-based Venue Detection**: Automatic location capture during contact exchanges
- **Google Places Integration**: Rich venue information and address standardization
- **Smart Event Detection**: Intelligent grouping of contacts by time and location
- **AI Auto-Tagging**: Automatic categorization using Gemini 2.5 Flash (planned)
- **Budget Tracking**: Real-time cost monitoring for Google Maps API usage

### Analytics & Insights
- **Real-time Dashboard**: Comprehensive analytics with interactive visualizations
- **Bot Detection**: Multi-factor analysis (browser fingerprinting, behavior patterns, rate limiting)
- **Anonymous Analytics**: GDPR-compliant tracking for users who withdraw consent (Article 6(1)(f) legitimate interest)
- **Cost Tracking**: Budget management for AI and cloud services
- **Advanced Metrics**: Click tracking, geographic distribution, temporal analysis

### GDPR/RGPD Compliance
- **Complete Implementation**: 116 automated tests passing
- **Consent Management**: Granular privacy controls with versioned consent records
- **Data Portability**: Multilingual CSV/JSON export (5 languages)
- **Account Deletion**: Full data purge with contact anonymization
- **Breach Notifications**: Automated email system with compliance timelines
- **Anonymous Analytics**: Legitimate interest basis for withdrawn consent
- **95% Compliance Score**: Comprehensive architecture review

### Internationalization
- **5 Languages**: English, French, Spanish, Chinese, Vietnamese
- **Multilingual Emails**: All system notifications translated
- **Server-side Translation**: API errors and backend messages
- **RTL Support**: Ready for Arabic/Hebrew expansion

### Subscription Management
- **Multi-tier System**: Base, Pro, Premium, Business, Enterprise
- **Feature-based Permissions**: Granular access control per subscription level
- **Usage-based Billing**: Cost tracking and budget alerts
- **Enterprise Features**: Custom branding, advanced admin controls, API access

### Developer Experience
- **Claude Code Integration**: 5 production-ready skills
  - `build-manager-skill`: Automated Next.js build management
  - `constant-manager-skill`: Professional constant management
  - `docs-manager-skill`: Comprehensive documentation system
  - `git-manager-skill`: Intelligent version control
  - `test-manager-skill`: Test management and reporting
- **Comprehensive Documentation**: 83 technical guides across 9 categories
- **Type Safety**: TypeScript with strict mode
- **Testing**: 116 GDPR tests + manual test suites

## Tech Stack

### Core Framework
- **Next.js 14.2.4**: App Router, Server Components, API Routes
- **React 18.2.0**: Modern React with hooks
- **Tailwind CSS 3.3.2**: Utility-first styling

### Backend & Database
- **Firebase 12.4.0**: Firestore, Storage, Authentication
- **Firebase Admin SDK 13.4.0**: Server-side operations
- **Redis 5.8.3**: Caching and session management

### AI & Machine Learning
- **Google Generative AI (Gemini) 0.24.1**: Contact enrichment, auto-tagging
- **Pinecone 6.1.2**: Vector database for semantic search
- **Cohere AI 7.18.1**: Text embeddings
- **Google Cloud Vision 5.3.3**: Image processing

### Location & Maps
- **Google Maps JS API Loader 1.16.10**: Map rendering
- **Geocoding API**: Address standardization
- **Places API**: Venue information and search

### UI & Interactions
- **@dnd-kit/core 6.3.1 & @dnd-kit/sortable 10.0.0**: Drag-and-drop
- **Framer Motion 12.23.24**: Animations
- **Lucide React 0.552.0**: Icon library
- **React Hot Toast 2.4.1**: Notifications
- **React Joyride 2.9.3**: User onboarding
- **React Intersection Observer 9.16.0**: Scroll-based interactions

### Data Visualization
- **Recharts 3.1.0**: Charts and analytics graphs

### Data Processing
- **PapaParse 5.5.3**: CSV parsing and generation
- **JSZip 3.10.1**: Archive creation
- **Sharp 0.34.3**: Server-side image processing
- **Smartcrop 2.0.5**: Intelligent image cropping
- **Browser Image Compression 2.0.2**: Client-side optimization

### Validation & Security
- **Zod 4.0.5**: Runtime type validation
- **Sanitize HTML 2.17.0**: XSS prevention
- **Bad Words 3.0.4**: Content filtering
- **Crypto-js 4.1.1**: Encryption utilities

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Firebase project with Firestore, Storage, and Authentication enabled
- Google Cloud Platform account with the following APIs enabled:
  - Generative Language API (Gemini)
  - Cloud Vision API
  - Maps JavaScript API
  - Geocoding API
  - Places API
- Pinecone account for vector search
- Redis instance (optional but recommended for production)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_apiKey=your_firebase_api_key
NEXT_PUBLIC_authDomain=your_project.firebaseapp.com
NEXT_PUBLIC_projectId=your_project_id
NEXT_PUBLIC_storageBucket=your_project.appspot.com
NEXT_PUBLIC_messagingSenderId=your_sender_id
NEXT_PUBLIC_appId=your_app_id
NEXT_PUBLIC_measurementId=your_measurement_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Cloud APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=your_index_name

# Cohere AI
COHERE_API_KEY=your_cohere_api_key

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_LOCATION_SERVICES=true

# Cost Tracking (Optional)
ENABLE_COST_TRACKING=true
MONTHLY_BUDGET_USD=100

# Email Configuration (if using email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@weavink.com
```

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone [your-repository-url]
   cd Code-Weavink
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy the environment template above to `.env.local`
   - Fill in all required API keys and credentials
   - Ensure Firebase Admin private key is properly escaped

4. **Set up Firebase**:
   - Create Firestore database
   - Configure Storage bucket
   - Enable Authentication providers (Email/Password, Google, etc.)
   - Set up security rules (see `/documentation/technical/`)

5. **Initialize Pinecone**:
   - Create a new index with dimension 1536 (for Cohere embeddings)
   - Note the environment and index name

6. **Configure Google Cloud**:
   - Enable required APIs in Google Cloud Console
   - Set up billing and quotas
   - Configure API key restrictions for security

7. **Run the development server**:
   ```bash
   npm run dev
   ```

8. **Open in browser**:
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (40+ endpoints)
│   │   ├── admin/                # Admin operations
│   │   ├── analytics/            # Analytics endpoints
│   │   ├── contacts/             # Contact management
│   │   ├── privacy/              # GDPR operations
│   │   └── user/                 # User management
│   ├── dashboard/                # User dashboard
│   │   ├── contacts/             # Contact management UI
│   │   ├── analytics/            # Analytics dashboard
│   │   └── settings/             # User settings
│   ├── admin/                    # Admin panel
│   ├── [userId]/                 # Public profile pages
│   └── roadmap/                  # Public roadmap/changelog
│
├── lib/                          # Core business logic
│   ├── services/                 # Service layer (17 services)
│   │   ├── serviceAdmin/         # Admin functionality
│   │   ├── serviceAnalytics/     # Analytics tracking
│   │   ├── serviceContact/       # Contact management
│   │   ├── servicePrivacy/       # GDPR compliance
│   │   ├── serviceEnterprise/    # Enterprise features
│   │   ├── serviceRoadmap/       # Roadmap system
│   │   └── serviceUser/          # User management
│   ├── translation/              # i18n system
│   ├── constants/                # Application constants
│   └── utils/                    # Utility functions
│
├── documentation/                # 83 comprehensive guides
│   ├── admin/                    # Admin system (9 guides)
│   ├── analytics/                # Analytics (3 guides)
│   ├── rgpd/                     # GDPR compliance (13 guides)
│   ├── features/                 # Feature specs (23 guides)
│   ├── technical/                # Infrastructure (18 guides)
│   └── testing/                  # Testing guides (10 guides)
│
├── .claude/                      # Claude Code integration
│   └── skills/                   # 5 production-ready skills
│
├── public/                       # Static assets
│   └── locales/                  # Translation files (5 languages)
│
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   ├── admin/                    # Admin components
│   └── shared/                   # Reusable components
│
└── tests/                        # Test suites
    └── rgpd/                     # 116 GDPR tests
```

## Documentation

Weavink includes comprehensive technical documentation organized into 9 categories with 83 detailed guides:

### Documentation Categories

1. **Admin System** (9 guides)
   - Analytics integration
   - Security layers
   - View-only permissions
   - Service separation

2. **Analytics & Tracking** (3 guides)
   - Implementation guide
   - Testing strategies
   - Service architecture

3. **RGPD/GDPR Compliance** (13 guides)
   - [GDPR Implementation Summary](documentation/rgpd/RGPD_IMPLEMENTATION_SUMMARY.md)
   - Consent management
   - Data export system
   - Account deletion
   - Contact anonymization
   - Breach notifications
   - Anonymous analytics

4. **Feature Implementations** (23 guides)
   - [Geocoding System Guide](documentation/features/GEOCODING_SYSTEM_GUIDE.md)
   - Roadmap/changelog with GitHub integration
   - Contact management
   - Internationalization
   - Media handling
   - Email notifications

5. **Technical Infrastructure** (18 guides)
   - [Cost Tracking Migration](documentation/infrastructure/COST_TRACKING_MIGRATION_GUIDE.md)
   - Firebase scheduled functions
   - Semantic search architecture
   - Subscription revalidation
   - Dual Git setup

6. **Testing & QA** (10 guides)
   - RGPD test suites
   - Contact anonymization tests
   - Email notification tests
   - Rate limit testing

7. **General Documentation** (4 guides)
   - Project overview
   - Setup guides
   - Restart instructions

8. **Tutorials** (3 guides)
   - Email integration
   - Rate limit UI patterns

9. **Meta Documentation** (2 guides)
   - Documentation reorganization
   - Commit summaries

### Quick Links
- **Getting Started**: This README
- **GDPR Compliance**: [documentation/rgpd/](documentation/rgpd/)
- **API Documentation**: [documentation/technical/](documentation/technical/)
- **Feature Guides**: [documentation/features/](documentation/features/)
- **Testing**: [documentation/testing/](documentation/testing/)

## Roadmap

View our interactive roadmap at `/roadmap` featuring:
- 200+ commits visualized with SVG graph
- GitHub Issues integration
- Category-based filtering
- Timeline view with commit details

Recent major updates:
- **Location Services & Geocoding** (Phase 1 complete)
- **Contact Anonymization** (GDPR Article 17)
- **Anonymous Analytics** (Legitimate interest basis)
- **Multilingual Email Notifications** (5 languages)
- **AI-Powered Custom Cards** (planned)

## Testing

### Automated Tests
- **116 RGPD/GDPR Tests**: Comprehensive compliance validation
  - Consent management
  - Data export
  - Account deletion
  - Contact anonymization
  - Anonymous analytics
  - Breach notifications

### Manual Testing
- Integration test guides in `/documentation/testing/`
- QA checklists for critical user flows
- Security testing procedures

### Running Tests
```bash
# Run RGPD test suite
node -r dotenv/config runAllRGPDTests.mjs

# Run build tests
npm run build

# Run linter
npm run lint
```

## License

**PROPRIETARY LICENSE**

Copyright (c) 2025 Weavink. All rights reserved.

This software is proprietary and confidential. Commercial use requires a valid subscription. See [LICENSE](LICENSE) file for full terms.

For licensing inquiries: licensing@weavink.com

## Credits & Acknowledgments

Weavink was originally derived from the open-source [LinkTree Clone](https://github.com/fabiconcept/linktree) project by fabiconcept. The platform has since been substantially transformed with:

- 80+ major feature additions
- Enterprise-grade architecture
- AI/ML capabilities
- Full GDPR compliance
- Multi-language support
- Advanced analytics
- Professional networking focus

Special thanks to the original creator for the foundational inspiration.

## Support & Contact

- **Documentation**: `/documentation/` directory
- **Issues**: GitHub Issues (for licensed users)
- **Email**: support@weavink.com
- **Licensing**: licensing@weavink.com
- **Website**: https://weavink.com (if available)

---

**Built with**:  Next.js, React, Firebase, Gemini AI, Pinecone, Google Cloud Platform

**Powered by**: Claude Code with 5 production-ready development skills
