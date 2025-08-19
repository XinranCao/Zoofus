import { Routes, Route } from "react-router-dom";

import Navbar from "./components/NavBar.jsx";
import HomePage from "./pages/Home/Home.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import SignUpPage from "./pages/Auth/SignUpPage.jsx";

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
