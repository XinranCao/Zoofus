import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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
