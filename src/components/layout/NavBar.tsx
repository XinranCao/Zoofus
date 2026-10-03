import { useEffect, useRef, useState } from "react";
import { FaUserAlt } from "react-icons/fa";
import { IoClose, IoMenu } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useProfile } from "@/features/profile/useProfile";
import styles from "./NavBar.module.less";

export function NavBar() {
  const { currentUser, logout } = useAuth();
  const { data: profile } = useProfile(currentUser?.uid);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !menuToggleRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const links = (
    <ul ref={menuRef} className={`${styles.navLinks} ${menuOpen ? styles.open : ""}`}>
      {currentUser ? (
        <>
          <li>
            <Link to="/stickers" onClick={() => setMenuOpen(false)}>
              My Stickers
            </Link>
          </li>
          <li>
            <Link to="/account" onClick={() => setMenuOpen(false)}>
              Account
            </Link>
          </li>
          <li>
            <button className={styles.signOut} onClick={handleLogout}>
              Sign Out
            </button>
          </li>
        </>
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
        <div className={styles.rightSection}>
          {currentUser &&
            (profile?.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt="Your profile"
                className={styles.profile_pic}
              />
            ) : (
              <FaUserAlt aria-label="Your profile" />
            ))}
          <button
            ref={menuToggleRef}
            className={`${styles.menuToggle} ${menuOpen ? styles.open : ""}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className={styles.menuIcon}>
              <IoMenu />
            </span>
            <span className={styles.closeIcon}>
              <IoClose />
            </span>
          </button>
          <div className={styles.navLinksContainer}>{links}</div>
        </div>
      </nav>
      <div className={styles.navLinksContainerMobile}>{links}</div>
    </div>
  );
}
