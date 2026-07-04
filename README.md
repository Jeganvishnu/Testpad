# OPTIMUM - Adaptive Testing System

<div align="center">

![OPTIMUM Logo](public/optimum.png)

**A modern, AI-powered adaptive testing platform for educational institutions**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.0.0-orange.svg)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Firebase Setup](#-firebase-setup)
- [Environment Configuration](#-environment-configuration)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [Core Systems](#-core-systems)
- [Component Architecture](#-component-architecture)
- [State Management](#-state-management)
- [API Integration](#-api-integration)
- [Styling System](#-styling-system)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🎯 Overview

**OPTIMUM** is a comprehensive Adaptive Testing System built with modern web technologies. It features intelligent difficulty adjustment, AI-powered question generation, real-time analytics, proctoring capabilities, and a premium user interface with smooth animations.

### Key Highlights

- **Adaptive Algorithm**: Dynamic difficulty adjustment based on real-time performance
- **AI Integration**: OpenRouter AI for automated question generation from PDFs
- **Real-time Database**: Firebase Realtime Database for instant synchronization
- **Modern UI/UX**: Custom animations, dark mode, responsive design
- **Performance Tracking**: Comprehensive analytics and visualization
- **Proctoring**: Tab switching and fullscreen monitoring
- **Accessibility**: WCAG compliant with keyboard navigation

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Student    │  │    Admin     │  │    Auth      │      │
│  │  Dashboard   │  │  Dashboard   │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Adaptive Test Engine (Client-side)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │   Realtime   │  │   Storage    │      │
│  │              │  │   Database   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  OpenRouter  │  │   EmailJS    │                         │
│  │      AI      │  │              │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: Firebase Auth → User Context → Protected Routes
2. **Test Taking**: Student → Adaptive Engine → Firebase DB → Real-time Updates
3. **AI Generation**: PDF Upload → OpenRouter API → Question Parsing → Database
4. **Analytics**: Database → Performance Service → Chart.js Visualization

---

## 🛠️ Tech Stack

### Frontend Core
- **React 18.3.1** - Component-based UI library
- **TypeScript 5.5.3** - Type-safe development
- **Vite 5.4.2** - Lightning-fast build tool
- **React Router DOM 7.7.1** - Client-side routing

### Styling & UI
- **TailwindCSS 3.4.1** - Utility-first CSS framework
- **Custom CSS Animations** - Smooth transitions and effects
- **Lucide React** - Modern icon library
- **Dark Mode** - System-aware theme switching

### Backend & Services
- **Firebase 12.0.0**
  - Authentication (Email/Password, Google)
  - Realtime Database (NoSQL)
  - Storage (File uploads)
- **OpenRouter AI** - Question generation
- **EmailJS** - Contact form emails

### Data Visualization
- **Chart.js 4.5.0** - Interactive charts
- **React Chart.js 2** - React wrapper

### Document Processing
- **XLSX 0.18.5** - Excel file parsing
- **PDF.js 5.4.54** - PDF text extraction
- **jsPDF 3.0.3** - PDF generation
- **html2canvas 1.4.1** - Screenshot capture

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TS-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## Features

### Student Features
- Adaptive test-taking with real-time difficulty adjustment
- Performance dashboard with charts and analytics
- Test history and detailed results
- Answer review with color-coded feedback
- Leaderboard with department filtering
- Profile management with avatar selection
- Dark mode support
- Mobile-responsive design

### Admin Features
- Test creation with manual/AI/bulk import
- Question bank management
- Student performance analytics
- Admin user management
- Test configuration (adaptive/non-adaptive)
- Difficulty assignment
- Real-time test monitoring
- PDF result generation

### Technical Features
- Real-time database synchronization
- Custom sliding squares loader animation
- Smooth page transitions
- Optimistic UI updates
- Error boundary handling
- Protected routes
- Session management
- Performance optimization

---

## 📦 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **Git**
- **Firebase Account** (free tier sufficient)
- **OpenRouter API Key** (optional, for AI features)
- **EmailJS Account** (optional, for contact form)

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/nareshAiNexus/Optimum-test.git
cd Optimum-test
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Configuration](#-environment-configuration))

### 4. Start Development Server

```bash
npm run dev
```

Application will be available at `http://localhost:5173`

---

## 🔥 Firebase Setup

### Step 1: Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `optimum-test`
4. Disable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Enable Authentication

1. Navigate to **Build** → **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** provider
4. Enable **Google** provider (optional)

### Step 3: Create Realtime Database

1. Go to **Build** → **Realtime Database**
2. Click "Create Database"
3. Select location (closest to your users)
4. Start in **Test Mode**

### Step 4: Configure Database Rules

```json
{
  "rules": {
    "tests": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$testId": {
        "timesAttempted": {
          ".write": "auth != null"
        }
      }
    },
    "responses": {
      ".read": "auth != null",
      "$testId": {
        "$userId": {
          ".read": "auth != null && ($userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
          ".write": "auth != null && ($userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
        }
      }
    },
    "questions": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "userTestStates": {
      "$userId": {
        ".read": "auth != null && ($userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && ($userId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && ($uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        "role": {
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
        }
      }
    }
  }
}
```

### Step 5: Get Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click web icon (`</>`)
4. Register app name: `OPTIMUM`
5. Copy configuration values to `.env`

---

## Environment Configuration

Create `.env` file in project root:

```env
# Firebase Configuration
VITE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_PROJECT_ID=your-project-id
VITE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_MESSAGE_SENDER_ID=123456789012
VITE_APP_ID=1:123456789012:web:abcdef123456
VITE_MEASUREMENT_ID=G-XXXXXXXXXX

# AI Service (Optional)
VITE_AI_API_KEY=sk-or-v1-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Getting OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up / Log in
3. Navigate to **Keys** section
4. Create new API key
5. Add to `.env` as `VITE_AI_API_KEY`

---

## 🏃 Running the Project

### Development

```bash
npm run dev
```

Runs on `http://localhost:5173` with hot module replacement (HMR)

### Production Build

```bash
npm run build
```

Outputs to `dist/` directory

### Preview Production

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

---

## 📁 Project Structure

```
optimum/
├── public/
│   ├── optimum.png              # App logo
│   ├── sliding-squares.gif      # Loading animation
│   └── avatars/                 # Profile avatars
├── src/
│   ├── assets/                  # Static assets
│   │   └── avatars.js           # Avatar configuration
│   ├── components/
│   │   ├── admin/               # Admin-only components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminManagement.tsx
│   │   │   ├── AiGenerationModal.tsx
│   │   │   ├── CreateTestModal.tsx
│   │   │   ├── EditTestModal.tsx
│   │   │   ├── ResultsView.tsx
│   │   │   ├── StudentProgressModal.tsx
│   │   │   └── TestManagement.tsx
│   │   ├── auth/                # Authentication components
│   │   │   ├── AdminLoginForm.tsx
│   │   │   ├── AdminRegisterForm.tsx
│   │   │   ├── EmailVerification.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── common/              # Shared components
│   │   │   ├── DifficultyBadge.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── debug/               # Debug utilities
│   │   │   └── EmailVerificationDebug.tsx
│   │   └── student/             # Student-only components
│   │       ├── Dashboard.tsx
│   │       ├── Leaderboard.tsx
│   │       ├── PerformanceTracker.tsx
│   │       ├── Profile.tsx
│   │       ├── TestInterface.tsx
│   │       └── TestResult.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── hooks/
│   │   ├── useTestProctor.ts    # Proctoring logic
│   │   └── useTheme.ts          # Theme management
│   ├── lib/
│   │   └── firebase.ts          # Firebase initialization
│   ├── pages/
│   │   ├── AboutUs.tsx
│   │   ├── ContactUs.tsx
│   │   ├── Home.tsx
│   │   └── PublicDashboard.tsx
│   ├── services/
│   │   ├── adaptiveTestService.ts    # Adaptive algorithm
│   │   ├── aiService.ts              # AI question generation
│   │   ├── emailService.ts           # Email verification
│   │   ├── performanceTrackingService.ts
│   │   └── registrationValidation.ts
│   ├── styles/
│   │   └── animations.css       # Custom animations
│   ├── utils/
│   │   ├── pdfUtils.ts          # PDF processing
│   │   ├── testResultsPdfGenerator.ts
│   │   └── xlsxUtils.ts         # Excel processing
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Core Systems

### 1. Adaptive Testing Engine

**Location**: `src/services/adaptiveTestService.ts`

**Algorithm**:
```typescript
// Difficulty progression logic
if (correctStreak >= 2) {
  increaseDifficulty();
} else if (wrongStreak >= 2) {
  decreaseDifficulty();
}

// Weighted scoring
const points = {
  easy: 1,
  medium: 2,
  hard: 3
};
```

**Features**:
- Real-time difficulty adjustment
- Streak-based progression
- Weighted scoring system
- Performance analytics

### 2. AI Question Generation

**Location**: `src/services/aiService.ts`

**Process**:
1. PDF text extraction using PDF.js
2. Text chunking (max 4000 chars)
3. OpenRouter API call with prompt engineering
4. JSON response parsing
5. Question validation and formatting

**Supported Models**:
- DeepSeek R1 (default)
- GPT-4
- Claude 3

### 3. Performance Tracking

**Location**: `src/services/performanceTrackingService.ts`

**Metrics**:
- Average score calculation
- Test completion rate
- Performance trends
- Difficulty progression
- Time analytics

### 4. Proctoring System

**Location**: `src/hooks/useTestProctor.ts`

**Features**:
- Tab switch detection
- Fullscreen monitoring
- Violation tracking
- Warning system
- Auto-submission on violations

---

## 🎨 Component Architecture

### Component Hierarchy

```
App
├── AuthContext Provider
│   ├── Navbar
│   ├── Routes
│   │   ├── Public Routes
│   │   │   ├── Home
│   │   │   ├── About
│   │   │   ├── Contact
│   │   │   └── PublicDashboard
│   │   ├── Auth Routes
│   │   │   ├── Login
│   │   │   └── Register
│   │   ├── Protected Routes (Student)
│   │   │   ├── Dashboard
│   │   │   ├── TestInterface
│   │   │   ├── TestResult
│   │   │   ├── Profile
│   │   │   └── Leaderboard
│   │   └── Protected Routes (Admin)
│   │       ├── AdminDashboard
│   │       ├── TestManagement
│   │       ├── AdminManagement
│   │       └── ResultsView
│   └── Theme Provider
```

### Key Components

#### TestInterface
- Manages test state
- Implements adaptive logic
- Handles proctoring
- Timer management
- Question navigation

#### PerformanceTracker
- Fetches performance data
- Renders charts (Chart.js)
- Calculates metrics
- Displays trends

#### CreateTestModal
- Test creation form
- Question management
- AI generation integration
- Bulk import support

---

## 📊 State Management

### Context API

**AuthContext** (`src/contexts/AuthContext.tsx`):
```typescript
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}
```

### Local State Patterns

1. **Component State**: `useState` for UI state
2. **Side Effects**: `useEffect` for data fetching
3. **Custom Hooks**: Reusable logic (useTestProctor, useTheme)
4. **Refs**: DOM manipulation, timers

### Data Flow

```
Firebase DB → Service Layer → Component State → UI
     ↑                                          ↓
     └──────────── User Actions ────────────────┘
```

---

## 🌐 API Integration

### Firebase Realtime Database

**Structure**:
```json
{
  "users": {
    "userId": {
      "name": "string",
      "email": "string",
      "role": "student | admin",
      "department": "string",
      "registrationNumber": "string"
    }
  },
  "tests": {
    "testId": {
      "title": "string",
      "description": "string",
      "questions": ["questionId"],
      "duration": "number",
      "isAdaptive": "boolean"
    }
  },
  "questions": {
    "questionId": {
      "question": "string",
      "options": ["string"],
      "correctAnswer": "number",
      "difficulty": "easy | medium | hard"
    }
  },
  "responses": {
    "testId": {
      "userId": {
        "score": "number",
        "answers": ["number"],
        "completedAt": "timestamp"
      }
    }
  }
}
```

### OpenRouter AI API

**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

**Request**:
```typescript
{
  model: "deepseek/deepseek-r1",
  messages: [{
    role: "user",
    content: "Generate questions from: [PDF_TEXT]"
  }]
}
```

---

## 🎨 Styling System

### TailwindCSS Configuration

**Custom Theme** (`tailwind.config.js`):
```javascript
theme: {
  extend: {
    colors: {
      'warp-primary': '#6366f1',
      'warp-secondary': '#8b5cf6'
    },
    animation: {
      'slide-in-right': 'slideInRight 0.3s ease-out',
      'slide-out-right': 'slideOutRight 0.3s ease-in'
    }
  }
}
```

### Custom Animations

**Sliding Squares Loader** (`src/styles/animations.css`):
```css
@keyframes slide-square-loader-1 {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0, 32px); }
  50% { transform: translate(32px, 32px); }
  75% { transform: translate(32px, 0); }
}

.sliding-squares-loader {
  width: 64px;
  height: 64px;
}
```

### Dark Mode

**Implementation**:
- System preference detection
- localStorage persistence
- CSS variables for theming
- Smooth transitions

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Admin creation and permissions
- [ ] Test creation (manual, AI, bulk)
- [ ] Adaptive test taking
- [ ] Performance analytics
- [ ] PDF generation
- [ ] Dark mode switching
- [ ] Mobile responsiveness

### Test Accounts

**Admin**:
- Email: `admin@gmail.com`
- Password: `admin@123`

**Student**:
- Email: `student@gmail.com`
- Password: `student@123`

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Configuration** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify

1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables
5. Deploy

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## 🤝 Contributing

### Development Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use TailwindCSS for styling
- Write meaningful commit messages
- Add comments for complex logic

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- React Team for the framework
- Firebase for backend services
- Vite for build tooling
- TailwindCSS for styling
- Lucide for icons
- OpenRouter for AI capabilities

---

## 📞 Support

- **Email**: optimum-test@gmail.com
- **Issues**: [GitHub Issues](https://github.com/nareshAiNexus/Optimum-test/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nareshAiNexus/Optimum-test/discussions)

---

<div align="center">

**Made with by the OPTIMUM Team**

[Report Bug](https://github.com/nareshAiNexus/Optimum-test/issues) · [Request Feature](https://github.com/nareshAiNexus/Optimum-test/issues)

</div>
