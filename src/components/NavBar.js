import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      console.error("Failed to log out");
    }
  };

  return (
    <nav>
      <Link to="/">Home</Link>
      {currentUser ? (
        <>
          |<button onClick={handleLogout}>Sign Out</button>
        </>
      ) : (
        <>
          | <Link to="/login">Login</Link>| <Link to="/signup">Sign Up</Link>
        </>
      )}
    </nav>
  );
};

export default Navbar;
