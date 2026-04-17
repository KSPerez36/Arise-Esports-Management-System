import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicRegistration from "../components/PublicRegistration";
import "./LandingPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullseye,
  faUsers,
  faTrophy,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import AOS from 'aos';
import 'aos/dist/aos.css';

/* ── Particle network animation ── */
function startParticles(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    r: Math.random() * 1.6 + 0.5,
    hue: Math.random() > 0.5 ? 225 : 270,
  }));

  let animId;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, 0.7)`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(80, 130, 255, ${0.18 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(animId);
}

const LandingPage = () => {
  const [showRegistration, setShowRegistration] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const canvasRef = useRef(null);
  const statsRef = useRef(null);
  const countersStarted = useRef(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
      easing: 'ease-out',
    });

    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  /* Particle animation */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cleanup = startParticles(canvas);
    return cleanup;
  }, []);

  /* Animated stat counters — fire once on scroll into view */
  useEffect(() => {
    const section = statsRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !countersStarted.current) {
          countersStarted.current = true;
          const statEls = section.querySelectorAll('.stat-number');
          const targets  = [150, 10, 10, 3];
          const suffixes = ['+', '+', '+', '+'];

          statEls.forEach((el, i) => {
            const target   = targets[i];
            const suffix   = suffixes[i];
            const start    = performance.now();
            const duration = 1500;

            function tick(now) {
              const t    = Math.min((now - start) / duration, 1);
              const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
              el.textContent = Math.floor(ease * target) + suffix;
              if (t < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const handleJoinNow = () => setShowRegistration(true);
  const handleSignIn  = () => navigate("/login");

  if (user) return null;

  return (
    <div className="landing-page">
      <PublicNavbar onJoinClick={handleJoinNow} onSignInClick={handleSignIn} />

      {/* ── Hero ── */}
      <section className="hero-section" id="home">
        <canvas ref={canvasRef} className="hero-particles" />
        <div className="hero-overlay"></div>
        <div className="hero-background">
          <div className="hero-bg-placeholder"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            ◈ CITY COLLEGE OF CALAMBA &middot; OFFICIAL ESPORTS ORG
          </div>
          <div className="hero-logo">
            <img src="/images/arise-logo.png" alt="Arise Esports" />
          </div>
          <h1 className="hero-title">
            <span className="gradient-text">ASCEND TO GREATNESS</span>
          </h1>
          <p className="hero-subtitle">
            Official Esports Org of City College of Calamba
          </p>
          <div className="hero-cta-group">
            <button className="cta-button" onClick={handleJoinNow}>
              <span>JOIN THE ROSTER</span>
              <FontAwesomeIcon icon={faArrowRight} />
              <div className="cta-glow"></div>
            </button>
            <button className="cta-button-ghost" onClick={handleSignIn}>
              Sign In
            </button>
          </div>
        </div>
        <div className="scroll-indicator" data-aos="fade-up" data-aos-delay="1000">
          <div className="mouse">
            <div className="wheel"></div>
          </div>
          <p>Scroll Down</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <p className="stats-eyebrow">◈ &nbsp; Arise Esports &nbsp; ◈</p>
          <div className="stats-grid">
            <div className="stat-item" data-aos="fade-up" data-aos-delay="0">
              <h2 className="stat-number">150+</h2>
              <p className="stat-label">Active Members</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="100">
              <h2 className="stat-number">10+</h2>
              <p className="stat-label">Tournaments</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="200">
              <h2 className="stat-number">10+</h2>
              <p className="stat-label">Victories</p>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="300">
              <h2 className="stat-number">3+</h2>
              <p className="stat-label">Years Strong</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">WHO WE ARE</h2>
            <div className="title-underline"></div>
          </div>
          <div className="about-content" data-aos="fade-up" data-aos-delay="200">
            <div className="about-text" data-aos="fade-right">
              <p>
                CCC Arise Esports is a student-led esports organization
                dedicated to building competitive players while fostering a
                safe, inclusive space where gamers can express their passion,
                creativity, and identity. We focus on skill development,
                teamwork, and community—empowering students to grow both in-game
                and beyond.
              </p>
              <div className="section-header" data-aos="fade-up" data-aos-delay="100">
                <h2 className="section-title">MISSION</h2>
                <div className="title-underline"></div>
              </div>
              <p data-aos="fade-right" data-aos-delay="200">
                To foster a dynamic and inclusive gaming community within the
                educational environment, empowering students to excel in
                esports, develop valuable skills, and cultivate sportsmanship,
                leadership, and teamwork.
              </p>
              <div className="section-header" data-aos="fade-up" data-aos-delay="300">
                <h2 className="section-title">VISION</h2>
                <div className="title-underline"></div>
              </div>
              <p data-aos="fade-right" data-aos-delay="400">
                The Arise Esports envisions itself as a leading school esports
                organization that aims to create an environment where students
                can explore their passion for gaming while promoting a healthy
                balance between academics, sports, personal growth, fair play,
                and embracing diversity.
              </p>
            </div>
            <div className="about-features">
              <div className="feature-card" data-aos="flip-left" data-aos-delay="300">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faBullseye} />
                </div>
                <h3>Competitive Excellence</h3>
                <p>Train with the best and compete at the highest level</p>
              </div>
              <div className="feature-card" data-aos="flip-left" data-aos-delay="200">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <h3>Strong Community</h3>
                <p>Join a family of passionate gamers and lifelong friends</p>
              </div>
              <div className="feature-card" data-aos="flip-left" data-aos-delay="300">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faTrophy} />
                </div>
                <h3>Proven Winners</h3>
                <p>Track record of championships and tournament victories</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Achievements ── */}
      <section className="achievements-section" id="achievements">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">ACHIEVEMENTS &amp; VICTORIES</h2>
            <div className="title-underline"></div>
          </div>
          <div className="achievements-gallery" data-aos="fade-up" data-aos-delay="200">
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <img src="/images/achievement-1.png" alt="Achievement 1" />
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>KENT STEVEN PEREZ</h3>
                <p>Student Leader of the Year by AcadArena</p>
              </div>
            </div>
            <div className="achievement-photo-card">
              <div className="achievement-image">
                <div className="achievement-placeholder">
                  <img src="/images/achievement-2.png" alt="Achievement 2" />
                </div>
              </div>
              <div className="achievement-overlay">
                <h3>GAMING EXPO 2025</h3>
                <p>Project of the Year by AcadArena</p>
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

      {/* ── Partners ── */}
      <section className="partners-section" id="partners">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">OUR PARTNERS</h2>
            <div className="title-underline"></div>
          </div>
          <p className="partners-subtitle" data-aos="fade-up" data-aos-delay="100">
            Proud to collaborate with leading organizations
          </p>
          <div className="partners-grid" data-aos="fade-up" data-aos-delay="200">
            <div className="partner-card" style={{ animationDelay: '0s' }}>
              <div className="partner-logo">
                <div className="partner-placeholder"></div>
                <img src="/images/partner-1.png" alt="AcadArena" />
              </div>
            </div>
            <div className="partner-card" style={{ animationDelay: '0.8s' }}>
              <div className="partner-logo">
                <div className="partner-placeholder"></div>
                <img src="/images/partner-2.png" alt="Partner 2" />
              </div>
            </div>
            <div className="partner-card" style={{ animationDelay: '1.6s' }}>
              <div className="partner-logo">
                <div className="partner-placeholder"></div>
                <img src="/images/partner-3.png" alt="Partner 3" />
              </div>
            </div>
            <div className="partner-card" style={{ animationDelay: '2.4s' }}>
              <div className="partner-logo">
                <div className="partner-placeholder"></div>
                <img src="/images/partner-4.png" alt="Partner 4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      <section className="events-section" id="events">
        <div className="container">
          <div className="section-header" data-aos="fade-up">
            <h2 className="section-title">RECENT EVENTS</h2>
            <div className="title-underline"></div>
          </div>
          <div className="events-grid" data-aos="fade-up" data-aos-delay="200">
            <div className="event-card">
              <div className="event-image">
                <div className="event-placeholder">
                  <span>📸</span>
                  <p>Event Photo 1</p>
                </div>
              </div>
              <div className="event-info">
                <span className="event-date">January 2024</span>
                <h3>CCC Esports Tournament 2024</h3>
                <p className="event-description">
                  Annual inter-college tournament featuring top teams from the region.
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
                <span className="event-date">December 2023</span>
                <h3>ML Championship Series</h3>
                <p className="event-description">
                  Intense Mobile Legends competition with teams across the province.
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
                <span className="event-date">Ongoing</span>
                <h3>Weekly Practice Sessions</h3>
                <p className="event-description">
                  Regular team practice and strategy sessions to improve our gameplay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
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

      {/* ── Footer ── */}
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
                <li><a href="#about">About</a></li>
                <li><a href="#achievements">Achievements</a></li>
                <li><a href="#partners">Partners</a></li>
                <li><a href="#events">Events</a></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>Connect With Us</h4>
              <div className="social-links">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Facebook">
                  <span>FB</span>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <span>IG</span>
                </a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" title="Discord">
                  <span>DC</span>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" title="Twitter / X">
                  <span>𝕏</span>
                </a>
              </div>
              <p className="contact-email">arise.esports@ccc.edu.ph</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; Gawa ni Kent Steven D. Perez</p>
          </div>
        </div>
      </footer>

      {showRegistration && (
        <PublicRegistration onClose={() => setShowRegistration(false)} />
      )}
    </div>
  );
};

export default LandingPage;
