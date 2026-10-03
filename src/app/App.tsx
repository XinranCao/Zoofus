import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NavBar } from "@/components/layout/NavBar";
import { VerifyEmailBanner } from "@/features/account/VerifyEmailBanner";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignUpPage = lazy(() => import("@/features/auth/pages/SignUpPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const AccountPage = lazy(() => import("@/features/account/AccountPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const StickerBookPage = lazy(() => import("@/features/stickers/library/StickerBookPage"));

export default function App() {
  const { pathname } = useLocation();
  return (
    <div id="app">
      <NavBar />
      <VerifyEmailBanner />
      <main>
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
      </main>
    </div>
  );
}
