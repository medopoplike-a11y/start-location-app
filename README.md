# Start Location

A modern, cross-platform location services application built with Next.js, Capacitor, and Supabase.

## 🚀 Overview

Start Location is designed as a multi-role platform supporting:
- **Admin**: System management and oversight.
- **Driver**: Location tracking and delivery management.
- **Vendor**: Service provision and management.

The application is built to run seamlessly on the **Web** and as a **Native Android** app using Capacitor.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **Mobile Wrapper**: [Capacitor 8](https://capacitorjs.com/)
- **Typography**: Cairo (supporting Arabic and Latin scripts)

## 📁 Project Structure

```text
src/
├── app/          # Next.js App Router (Pages & Layouts)
├── components/   # Shared React components
├── lib/          # Utilities, API clients (Supabase), and hooks
├── types/        # TypeScript type definitions
└── pages/        # (Legacy or specific API routes if any)
```

## ⚙️ Key Features

- **Role-based Redirection**: Automatic routing based on user profile (Admin/Driver/Vendor) during splash initialization.
- **Live Updates**: Integrated Capacitor live updates for native app versioning.
- **RTL Support**: Built-in support for Arabic (RTL) layouts.
- **PWA Ready**: Service worker integration for offline capabilities and web installation.
- **Native Integration**: Deep integration with Android via Capacitor.

## 🚦 Getting Started

### Development

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` file with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

3.  **Run Dev Server**:
    ```bash
    npm run dev
    ```

### Android Development

1.  **Build the web project**:
    ```bash
    npm run build
    ```

2.  **Sync with Capacitor**:
    ```bash
    npx cap sync
    ```

3.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```

## 📜 Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Creates an optimized production build (output to `/out` for Capacitor).
- `npm run lint`: Runs ESLint for code quality checks.
- `npx cap sync`: Synchronizes web assets and plugins to native platforms.
