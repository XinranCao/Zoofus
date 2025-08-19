import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { IoClose, IoMenu } from "react-icons/io5";
import { useState } from "react";
import styles from "./NavBar.module.less";

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      console.error("Failed to log out");
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link to="/">Zoofus</Link>
      </div>
      <button
        className={`${styles.menuToggle} ${menuOpen ? styles.open : ""}`}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        <span className={styles.menuIcon}>
          <IoMenu />
        </span>
        <span className={styles.closeIcon}>
          <IoClose />
        </span>
      </button>
      <ul className={`${styles.navLinks} ${menuOpen ? styles.open : ""}`}>
        {currentUser ? (
          <>
            <li>
              <button className={styles.signOut} onClick={handleLogout}>
                Sign Out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/signup">Sign Up</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
