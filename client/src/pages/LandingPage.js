import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicRegistration from "../components/PublicRegistration";
import "./LandingPage.css";

const LandingPage = () => {
  const [showRegistration, setShowRegistration] = useState(false);
  const navigate = useNavigate();
    const { user } = useContext(AuthContext);  // ← ADD THIS

  // Redirect logged-in users to dashboard  // ← ADD THIS
  useEffect(() => {                          // ← ADD THIS
    if (user) {                              // ← ADD THIS
      navigate('/dashboard');                // ← ADD THIS
    }                                        // ← ADD THIS
  }, [user, navigate]);                      // ← ADD THIS

  const handleJoinNow = () => {
    setShowRegistration(true);
  };

  const handleSignIn = () => {
    navigate("/login");
  };
  if (user) {
    return null;
  }
  return (
    <div className="landing-page">
      <PublicNavbar onJoinClick={handleJoinNow} onSignInClick={handleSignIn} />

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-overlay"></div>
        <div className="hero-background">
          {/* CUSTOMIZE: Replace with your gaming background image */}
          <div className="hero-bg-placeholder"></div>
        </div>
        <div className="hero-content">
          <div className="hero-logo">
            <img src="/images/arise-logo.png" alt="Arise Esports" />
          </div>
          <h1 className="hero-title">
            <span className="gradient-text">ASCEND TO GREATNESS</span>
          </h1>
          <p className="hero-subtitle">
            Official Esports Org of City College of Calamba
          </p>
          <button className="cta-button" onClick={handleJoinNow}>
            <span>JOIN THE ROSTER</span>
            <div className="cta-glow"></div>
          </button>
        </div>
        <div className="scroll-indicator">
          <div className="mouse">
            <div className="wheel"></div>
          </div>
          <p>Scroll Down</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item" data-aos="fade-up" data-aos-delay="0">
              <h2 className="stat-number">150+</h2>
              {/* CUSTOMIZE: Update member count */}
              <p className="stat-label">Active Members</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="100">
              <h2 className="stat-number">10+</h2>
              {/* CUSTOMIZE: Update tournament count */}
              <p className="stat-label">Tournaments</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="200">
              <h2 className="stat-number">10+</h2>
              {/* CUSTOMIZE: Update victories count */}
              <p className="stat-label">Victories</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="300">
              <h2 className="stat-number">3+</h2>
              {/* CUSTOMIZE: Update years count */}
              <p className="stat-label">Years Strong</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">WHO WE ARE</h2>
            <div className="title-underline"></div>
          </div>
          <div
            className="about-content"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="about-text">
              {/* CUSTOMIZE: Replace with your organization's description */}
              <p>
                CCC Arise Esports is a student-led esports organization
                dedicated to building competitive players while fostering a
                safe, inclusive space where gamers can express their passion,
                creativity, and identity. We focus on skill development,
                teamwork, and community—empowering students to grow both in-game
                and beyond.
              </p>
              <div className="section-header" data-aos="fade-up">
                <h2 className="section-title">MISSION</h2>
                <div className="title-underline"></div>
              </div>
              <p>
                To foster a dynamic and inclusive gaming community within the
                educational environment, empowering students to excel in
                esports, develop valuable skills, and cultivate sportsmanship,
                leadership, and teamwork.
              </p>
              <div className="section-header" data-aos="fade-up">
                <h2 className="section-title">VISION</h2>
                <div className="title-underline"></div>
              </div>
              <p>
                The Arise Esports envisions itself as a leading school esports
                organization that aims to create an environment where students
                can explore their passion for gaming while promoting a healthy
                balance between academics, sports, personal growth, fair play,
                and embracing diversity.
              </p>
            </div>
            <div className="about-features">
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Competitive Excellence</h3>
                <p>Train with the best and compete at the highest level</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤝</div>
                <h3>Strong Community</h3>
                <p>Join a family of passionate gamers and lifelong friends</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏆</div>
                <h3>Proven Winners</h3>
                <p>Track record of championships and tournament victories</p>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* DISABLED - Games Section
      <section className="games-section" id="games">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">OUR COMPETITIVE TEAMS</h2>
            <div className="title-underline"></div>
          </div>
          <div className="games-grid" data-aos="fade-up" data-aos-delay="200">
            <div className="game-card">
              <div className="game-icon">🎮</div>
              <h3>Mobile Legends</h3>
              <p>Main competitive roster</p>
            </div>
            <div className="game-card">
              <div className="game-icon">🔫</div>
              <h3>Valorant</h3>
              <p>FPS division</p>
            </div>
            <div className="game-card">
              <div className="game-icon">⚔️</div>
              <h3>League of Legends</h3>
              <p>MOBA team</p>
            </div>
            <div className="game-card">
              <div className="game-icon">🎯</div>
              <h3>Call of Duty</h3>
              <p>Mobile squad</p>
            </div>
            <div className="game-card">
              <div className="game-icon">🛡️</div>
              <h3>Dota 2</h3>
              <p>Strategy team</p>
            </div>
            <div className="game-card">
              <div className="game-icon">➕</div>
              <h3>More Coming</h3>
              <p>Expanding roster</p>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* Achievements Gallery Section - NOW WITH PHOTOS */}
      <section className="achievements-section" id="achievements">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">ACHIEVEMENTS & VICTORIES</h2>
            <div className="title-underline"></div>
          </div>
          <div
            className="achievements-gallery"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            {/* CUSTOMIZE: Replace with actual achievement/trophy photos */}
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>🏆</span>
                  <p>Achievement Photo 1</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>Champion</h3>
                <p>ML CCC Tournament 2024</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>🥇</span>
                  <p>Achievement Photo 2</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>1st Place</h3>
                <p>Valorant Regional Finals</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>🎯</span>
                  <p>Achievement Photo 3</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>Qualified</h3>
                <p>National Championships</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>⭐</span>
                  <p>Achievement Photo 4</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>MVP Awards</h3>
                <p>Multiple tournament MVPs</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>🎖️</span>
                  <p>Achievement Photo 5</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>Best Team</h3>
                <p>Inter-collegiate Excellence</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <span>🔥</span>
                  <p>Achievement Photo 6</p>
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>Winning Streak</h3>
                <p>10+ consecutive victories</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section - NEW! */}
      <section className="partners-section" id="partners">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">OUR PARTNERS</h2>
            <div className="title-underline"></div>
          </div>
          <p
            className="partners-subtitle"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            Proud to collaborate with leading organizations
          </p>
          <div
            className="partners-grid"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            {/* CUSTOMIZE: Add your partner logos */}
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 1</p>
                </div>
                <img src="/images/partner-1.png" alt="AcadArena" />
              </div>
            </div>
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 2</p>
                </div>
                {/* REPLACE WITH: <img src="/images/partner-2.png" alt="Partner 2" /> */}
              </div>
            </div>
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 3</p>
                </div>
                {/* REPLACE WITH: <img src="/images/partner-3.png" alt="Partner 3" /> */}
              </div>
            </div>
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 4</p>
                </div>
                {/* REPLACE WITH: <img src="/images/partner-4.png" alt="Partner 4" /> */}
              </div>
            </div>
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 5</p>
                </div>
                {/* REPLACE WITH: <img src="/images/partner-5.png" alt="Partner 5" /> */}
              </div>
            </div>
            <div className="partner-card">
              <div className="partner-logo">
                <div className="partner-placeholder">
                  <span>🤝</span>
                  <p>Partner Logo 6</p>
                </div>
                {/* REPLACE WITH: <img src="/images/partner-6.png" alt="Partner 6" /> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="events-section" id="events">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">RECENT EVENTS</h2>
            <div className="title-underline"></div>
          </div>
          <div className="events-grid" data-aos="fade-up" data-aos-delay="200">
            {/* CUSTOMIZE: Replace with actual event photos and details */}
            <div className="event-card">
              <div className="event-image">
                <div className="event-placeholder">
                  <span>📸</span>
                  <p>Event Photo 1</p>
                </div>
              </div>
              <div className="event-info">
                <h3>CCC Esports Tournament 2024</h3>
                <p className="event-date">January 2024</p>
                <p className="event-description">
                  Annual inter-college tournament featuring top teams from the
                  region.
                </p>
              </div>
            </div>
            <div className="event-card">
              <div className="event-image">
                <div className="event-placeholder">
                  <span>📸</span>
                  <p>Event Photo 2</p>
                </div>
              </div>
              <div className="event-info">
                <h3>ML Championship Series</h3>
                <p className="event-date">December 2023</p>
                <p className="event-description">
                  Intense Mobile Legends competition with teams across the
                  province.
                </p>
              </div>
            </div>
            <div className="event-card">
              <div className="event-image">
                <div className="event-placeholder">
                  <span>📸</span>
                  <p>Event Photo 3</p>
                </div>
              </div>
              <div className="event-info">
                <h3>Weekly Practice Sessions</h3>
                <p className="event-date">Ongoing</p>
                <p className="event-description">
                  Regular team practice and strategy sessions to improve our
                  gameplay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta-section">
        <div className="container">
          <div className="cta-content" data-aos="zoom-in">
            <h2>READY TO JOIN THE BEST?</h2>
            <p>Become part of CCC's premier esports organization</p>
            <button className="cta-button-large" onClick={handleJoinNow}>
              <span>JOIN ARISE ESPORTS NOW</span>
              <div className="cta-glow"></div>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/images/arise-logo.png" alt="Arise Esports" />
              <p>CCC's Premier Esports Organization</p>
            </div>
            <div className="footer-links">
              <h4>Quick Links</h4>
              <ul>
                <li>
                  <a href="#about">About</a>
                </li>
                <li>
                  {/*<a href="#games">Games</a>*/}
                </li>
                <li>
                  <a href="#achievements">Achievements</a>
                </li>
                <li>
                  <a href="#partners">Partners</a>
                </li>
                <li>
                  <a href="#events">Events</a>
                </li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>Connect With Us</h4>
              {/* CUSTOMIZE: Add your social media links */}
              <div className="social-links">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                >
                  <i className="fab fa-facebook"></i>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Discord"
                >
                  <i className="fab fa-discord"></i>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Twitter"
                >
                  <i className="fab fa-twitter"></i>
                </a>
              </div>
              {/* CUSTOMIZE: Update contact email */}
              <p className="contact-email">arise.esports@ccc.edu.ph</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; Gawa ni Kent Steven D. Perez</p> 
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      {showRegistration && (
        <PublicRegistration onClose={() => setShowRegistration(false)} />
      )}
    </div>
  );
};

export default LandingPage;
