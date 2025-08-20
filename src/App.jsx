import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navigation/NavBar.jsx";
import HomePage from "./pages/Home/Home.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignUpPage from "./pages/Auth/SignUpPage.jsx";
import ProtectedRoute from "./routing/ProtectedRoute.jsx";

function App() {
  return (
    <div id="app">
      <Navbar />
      <main>
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
      </main>
    </div>
  );
}

export default App;
