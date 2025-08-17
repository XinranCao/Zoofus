import { Routes, Route } from "react-router-dom";

import Navbar from "./components/NavBar.js";
import HomePage from "./pages/Home/Home.js";
import LoginPage from "./pages/Auth/LoginPage.js";
import SignUpPage from "./pages/Auth/SignUpPage.js";

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
