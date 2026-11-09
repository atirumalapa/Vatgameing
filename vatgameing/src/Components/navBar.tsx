import "./styles/navBar.css";
import Navbtn from "./navBtn.tsx";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config.js";
import { useAuth } from "../hooks/useAuth.ts";
import logo from "../assets/Firefly_RemoveBackground.png";

function HomeButton() {
  return (
    <Link to="/" className="home-brand-wrapper">
      <div className="home-brand-container">
        <div className="home-brand-logo">
          <img src={logo} alt="" className="home-brand-logo-image" />

          <span className="home-brand-text-line1">VATG</span>
        </div>
        <div className="home-brand-text">
          <span className="home-brand-text-line2">
            Virtual Academic Technological Gaming
          </span>
        </div>
      </div>
    </Link>
  );
}

function NavBar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };
  const closeNav = () => {
    setIsNavOpen(false);
  };
  const handleLogOut = () => {
    closeNav();
    void signOut(auth);
  };

  const authButtons = user
    ? [{ to: "/dashboard", label: "Dashboard" }]
    : [
        { to: "/login", label: "Log in" },
        { to: "/signup", label: "Sign up" },
      ];

  const navButtons = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/tools", label: "Tools" },
    { to: "/contact", label: "Contact" },
    { to: "/settings", label: "Settings" },
    ...authButtons,
  ];
  return (
    <nav
      className="main-nav-container"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo home button */}
      <div className="nav-brand-section">
        <HomeButton />
      </div>

      {/* Mobile Toggle Button */}
      <button
        className={`menu-toggle ${isNavOpen ? "active" : ""}`}
        onClick={toggleNav}
        aria-label="Toggle navigation menu"
        aria-expanded={isNavOpen}
      >
        <span className="hamburger-line line1"></span>
        <span className="hamburger-line line2"></span>
        <span className="hamburger-line line3"></span>
      </button>

      {/* Links & Contact Section */}
      <div className={`nav-links-wrapper ${isNavOpen ? "active" : ""}`}>
        <div className="primary-links">
          {navButtons.map((item) => (
            <Navbtn
              key={item.to}
              to={item.to}
              label={item.label}
              active={location.pathname === item.to}
              click={closeNav}
            />
          ))}
          {user && (
            <button
              type="button"
              className="menu-nav-button nav-logout"
              onClick={handleLogOut}
            >
              <span className="nav-text">Log out</span>
              <span className="nav-hover-line"></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
