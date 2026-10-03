import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { NavBar } from "@/components/layout/NavBar";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const SignUpPage = lazy(() => import("@/features/auth/pages/SignUpPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));

export default function App() {
  return (
    <div id="app">
      <NavBar />
      <main>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
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
      </main>
    </div>
  );
}
