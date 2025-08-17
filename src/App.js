import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/Home/Home.js";
// import Navbar from './components/Navbar';

function App() {
  return (
    <div>
      {/* <Navbar />  */}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
