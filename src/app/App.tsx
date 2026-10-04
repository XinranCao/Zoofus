import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignUpPage = lazy(() => import("@/features/auth/pages/SignUpPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const AccountPage = lazy(() => import("@/features/account/AccountPage"));
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/dev/DesignSystemPage"))
  : null;
const TapePage = lazy(() => import("@/features/tape/TapePage"));
const JournalsPage = lazy(() => import("@/features/journal/JournalsPage"));
const JournalPage = lazy(() => import("@/features/journal/JournalPage"));
const CollectionsPage = lazy(() => import("@/features/collections/CollectionsPage"));
const CollectionPage = lazy(() => import("@/features/collections/CollectionPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const StickerBookPage = lazy(() => import("@/features/stickers/library/StickerBookPage"));

export default function App() {
  const { pathname } = useLocation();
  return (
    <AppShell>
      <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/stickers"
              element={
                <ProtectedRoute>
                  <StickerBookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            {DesignSystemPage && (
              <Route path="/dev/design-system" element={<DesignSystemPage />} />
            )}
            <Route
              path="/tapes"
              element={
                <ProtectedRoute>
                  <TapePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals"
              element={
                <ProtectedRoute>
                  <JournalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/:id"
              element={
                <ProtectedRoute>
                  <JournalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections"
              element={
                <ProtectedRoute>
                  <CollectionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections/:id"
              element={
                <ProtectedRoute>
                  <CollectionPage />
                </ProtectedRoute>
              }
            />
            <Route path="/tape" element={<Navigate to="/tapes" replace />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
