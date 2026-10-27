# VITALECHO // ARCHITECTURAL BLUEPRINT & IMPLEMENTATION PLAN

**Target Project:** VitalEcho Health Terminal  
**Primary Account Target:** `isowri4ku@gmail.com`  
**Database Instance:** `ai-studio-0b836e2c-612e-4da2-8d8a-1b372a453659` (Cloud Firestore)  
**Aesthetic Protocol:** Retro-Futurist Glitch Art (Cyan `#00f3ff` vs Magenta `#ff0055`, Scanline CRT overlays, Monospace HUD telemetry)

---

## 1. System Architecture Overview

```
                      +------------------------------------------+
                      |           BROWSER CLIENT (REACT)        |
                      |  - Glitch Art UI & Scanlines (Tailwind)  |
                      |  - Firebase Client SDK (Auth & Firestore)|
                      |  - Medical Records Vault & Audio Synth   |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
           [Direct Client SDK]                          [REST Proxy API]
                    |                                             |
                    v                                             v
       +-------------------------+                   +-------------------------+
       |     CLOUD FIRESTORE     |                   |      EXPRESS SERVER     |
       |  ai-studio-0b836e...    |                   |  (Node.js / Port 3000)  |
       |  - users/{userId}       |                   |  - /api/gemini/analyze  |
       |  - users/{userId}/      |                   |  - Multimodal Vision    |
       |    medical_reports      |                   |  - Rate-limit breaker   |
       |  - Hardened Rules ABAC  |                   +------------+------------+
       +-------------------------+                                |
                    ^                                             v
                    |                                +-------------------------+
           [Google Sign-In]                          |       GEMINI API        |
                    |                                |  (gemini-2.5-flash)     |
       +-------------------------+                   +-------------------------+
       |   FIREBASE AUTHENTICATION|
       |   (Google OAuth Provider)|
       +-------------------------+
```

---

## 2. Technical Stack Breakdown

### A. Frontend Layer (Client-Side)
- **Framework:** React 19 + TypeScript + Vite.
- **Visual Aesthetic:** Retro-Futurist Glitch Art.
  - High-voltage Cyan (`#00f3ff`) and Hot Magenta (`#ff0055`) wireframes on obsidian black (`#050811`).
  - CRT scanlines, flicker animations, pixelated badges, and glitch text effects.
- **Authentication & State:**
  - Firebase Authentication (`signInWithPopup`, `GoogleAuthProvider`, `onAuthStateChanged`).
  - `AuthContext`: Tracks user session, account credentials (`isowri4ku@gmail.com`), display avatar, and sign-out capabilities.
  - Reactive `onSnapshot` listeners for real-time document synchronization without manual page refreshes.
- **Features in Medical Records Vault:**
  - Multi-format file uploader (Image scan / Lab report PDF / Prescription photo).
  - High-speed multimodal analysis trigger.
  - Instant persistence to Firestore under the authenticated user's profile.
  - Real-time list of historical medical scans with date, diagnostic category, extracted medications, critical care alerts, and preview modals.
  - Filter by record type (Labs, Prescriptions, Imaging, General).
  - Glitch synth voice readout using Web Speech API for medical instructions.

### B. Backend Layer (Server-Side)
- **Runtime:** Node.js Express server (`server.ts`) hosting client build and API routes.
- **Endpoints:**
  - `POST /api/gemini/analyze-report`: Receives image base64, runs Gemini Multimodal Vision analysis, extracts clinical summary, key findings, precautionary care instructions, and prescribed medications in structured JSON.
  - Rate-limiting protection: Dynamic circuit breaker with instant fallback if quota constraints are hit.
  - Health & Proxy routes: Sanitizes inputs and truncates payloads to prevent buffer overflows.

### C. Database & Security Layer (Cloud Firestore)
- **Database Engine:** Google Cloud Firestore (Instance ID: `ai-studio-0b836e2c-612e-4da2-8d8a-1b372a453659`).
- **Data Collections Schema (`firebase-blueprint.json`):**
  - `users/{userId}`: User profile record (email, displayName, photoURL, createdAt, updatedAt).
  - `users/{userId}/medical_reports/{reportId}`:
    - `id`: Unique record identifier (`^[a-zA-Z0-9_\-]+$`).
    - `userId`: Owner UID (strictly matches `request.auth.uid`).
    - `userEmail`: Bound to authenticated email (`isowri4ku@gmail.com`).
    - `title`: Extracted report name or user-assigned label.
    - `reportType`: `'lab_result' | 'prescription' | 'radiology' | 'discharge' | 'general'`.
    - `date`: Timestamp of examination / upload.
    - `summary`: Clinical digest generated from scan.
    - `careInstructions`: Array of actionable instructions (max 20 items).
    - `medications`: Array of identified drugs and dosages (max 20 items).
    - `criticalFlags`: Array of abnormal indicators requiring immediate medical review.
    - `imageBase64Thumb`: Optimized compressed thumbnail for instant visual recall.
    - `createdAt`: Strict server timestamp (`request.time`).
    - `updatedAt`: Strict server timestamp (`request.time`).
- **Security Rules (`firestore.rules`):**
  - Default-deny catch-all rule: `match /{document=**} { allow read, write: if false; }`.
  - Zero-Trust ABAC: Only authenticated users can access `users/{userId}/**` where `request.auth.uid == userId`.
  - Schema validators (`isValidUser`, `isValidMedicalReport`) enforcing property key constraints (`hasOnly`, `hasAll`), type verification, string lengths, and server timestamp checks.
  - Red-Team audited and deployed via `DeployRules` RPC.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Firebase Verification & Blueprint Synchronization
- Verify Firestore connection to `ai-studio-0b836e2c-612e-4da2-8d8a-1b372a453659` via client test probe.
- Update `firebase-blueprint.json` to define the complete `MedicalReport` entity and Firestore paths (`users/{userId}/medical_reports/{reportId}`).

### Step 2: Security Rules Hardening & Deployment
- Write hardened `firestore.rules` enforcing:
  - Auth check: `request.auth.uid == userId`.
  - PII Protection: Reports are strictly isolated to the document owner.
  - Strict key validation and server timestamp immutability.
- Deploy rules using the `DeployRules` RPC action.

### Step 3: Global Authentication & State Context
- Create `src/contexts/AuthContext.tsx` with:
  - Google Sign-In with popup via `signInWithPopup(auth, googleProvider)`.
  - Persistent state hook `useAuth()`.
  - Auto-detection and greeting for target account (`isowri4ku@gmail.com`).
  - Sign-in HUD banner and header toggle in retro-futurist glitch style.

### Step 4: Medical Records Storage Service & Error Protocol
- Create `src/lib/medicalReports.ts`:
  - `saveMedicalReport(reportData)`: Writes report to Firestore subcollection `users/{userId}/medical_reports`.
  - `useMedicalReports(userId)`: Real-time Firestore snapshot listener with offline caching and typed error handling conforming to `FirestoreErrorInfo`.
  - `deleteMedicalReport(userId, reportId)`: Secure record removal.

### Step 5: Enhanced Glitch Art Records Interface (`RecordsTab.tsx`)
- Retro-futurist CRT HUD styling with Cyan & Magenta neon borders and scanline effects.
- Upload dropzone with instant image compression/thumbnailing.
- Live scan visualizer effect (simulated raster laser beam scanning the uploaded report).
- Real-time history vault rendering all past reports saved under `isowri4ku@gmail.com`.
- Modal detail view displaying:
  - Comprehensive clinical summary with markdown formatting.
  - Critical care advisories with pulsating danger indicators.
  - Prescribed medication matrix with dosage guidelines.
  - Audio playback button utilizing Web Speech synthesis for audio report debriefing.

### Step 6: Compilation, Validation & Final Verification
- Run `compile_applet` and verify zero TypeScript, Vite, or bundle errors.
- Verify live persistence by testing document creation and query listening in the dev environment.

---

## 4. Verification & Testing Checklist

- [ ] Firebase Auth Google Sign-In triggers smoothly and retrieves user UID & email.
- [ ] Uploading an image report runs Gemini multimodal extraction.
- [ ] Analysis automatically commits to `users/{userId}/medical_reports/{reportId}` in Firestore.
- [ ] Refreshing the browser or switching tabs preserves all previous records seamlessly.
- [ ] Firestore Security Rules deny unauthenticated writes or access by mismatched UIDs.
- [ ] Glitch art styling maintains crisp cybernetic contrast with no layout bugs.
