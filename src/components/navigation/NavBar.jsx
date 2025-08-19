import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { IoClose, IoMenu } from "react-icons/io5";
import { useState, useEffect, useRef } from "react";
import styles from "./NavBar.module.less";

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuToggleRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        menuToggleRef.current &&
        !menuToggleRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
      navigate("/login");
    } catch {
      console.error("Failed to log out");
    }
  };

  const getNavLinkComponents = () => (
    <ul
      ref={menuRef}
      className={`${styles.navLinks} ${menuOpen ? styles.open : ""}`}
    >
      {currentUser ? (
        <li>
          <button className={styles.signOut} onClick={handleLogout}>
            Sign Out
          </button>
        </li>
      ) : (
        <>
          <li>
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          </li>
          <li>
            <Link to="/signup" onClick={() => setMenuOpen(false)}>
              Sign Up
            </Link>
          </li>
        </>
      )}
    </ul>
  );

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Link to="/">Zoofus</Link>
        </div>
        <button
          ref={menuToggleRef}
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
        <div className={styles.navLinksContainer}>{getNavLinkComponents()}</div>
      </nav>
      <div className={styles.navLinksContainerMobile}>
        {getNavLinkComponents()}
      </div>
    </div>
  );
};

export default Navbar;
