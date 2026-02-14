import React, { useState, useEffect } from 'react';
import './PublicNavbar.css';

const PublicNavbar = ({ onJoinClick, onSignInClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const smoothScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className={`public-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <img src="/images/arise-logo.png" alt="Arise Esports" />
          <span>ARISE ESPORTS</span>
        </div>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => smoothScroll('home')}>Home</a>
          <a href="#about" onClick={() => smoothScroll('about')}>About</a>
          <a href="#games" onClick={() => smoothScroll('games')}>Games</a>
          <a href="#events" onClick={() => smoothScroll('events')}>Events</a>
          <a href="#achievements" onClick={() => smoothScroll('achievements')}>Achievements</a>
        </div>

        <div className="navbar-actions">
          <button className="btn-sign-in" onClick={onSignInClick}>
            Sign In
          </button>
          <button className="btn-join" onClick={onJoinClick}>
            JOIN NOW
          </button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;