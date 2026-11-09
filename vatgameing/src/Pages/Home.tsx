import './styles/Home.css'
import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import NavBar from '../Components/navBar.tsx'
import ScrollIntro from '../Components/ScrollIntro.tsx'

gsap.registerPlugin(ScrollTrigger, useGSAP);

const INTRO_KEY = 'introSeen';

// localStorage can throw in private mode or with storage blocked
function hasSeenIntro() {
  try {
    return localStorage.getItem(INTRO_KEY) === 'true';
  } catch {
    return false;
  }
}

function setIntroSeen(seen: boolean) {
  try {
    if (seen) localStorage.setItem(INTRO_KEY, 'true');
    else localStorage.removeItem(INTRO_KEY);
  } catch {
    // Intro just plays again next time
  }
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function HomeHero() {
  return (
    <header className="home-hero">
      <h1>Welcome to Virtual academic technological gaming</h1>
      <h2>Discover the next generation of gaming</h2>
    </header>
  );
}

function HomeSections() {
  return (
    <main className="home-sections">
      <section className="home-section">
        <h3>Experience immersive gameplay like never before</h3>
      </section>
      <section className="home-section">
        <h4>Join our community of passionate gamers and developers</h4>
      </section>
      <section className="home-section">
        <h5>Stay up to date with the latest news and updates</h5>
        <p>Welcome to the future of gaming!</p>
      </section>
    </main>
  );
}

function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro() && !prefersReducedMotion());
  const [introDone, setIntroDone] = useState(false);

  // Bring each section in as it scrolls into view. Runs after the intro's
  // pin is created (child effects run first), so start positions are right.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>('.home-section').forEach((section) => {
        gsap.from(section, {
          autoAlpha: 0,
          y: 60,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });
    },
    { scope: pageRef, dependencies: [showIntro], revertOnUpdate: true },
  );

  const handleIntroComplete = (done: boolean) => {
    setIntroDone(done);
    if (done) setIntroSeen(true);
  };

  const skipIntro = () => {
    setIntroSeen(true);
    window.scrollTo(0, 0);
    setShowIntro(false);
    setIntroDone(false);
  };

  const replayIntro = () => {
    setIntroSeen(false);
    window.scrollTo(0, 0);
    setShowIntro(true);
    setIntroDone(false);
  };

  return (
    <div className="home-page" ref={pageRef}>
      {showIntro ? (
        <>
          {/* Sits exactly where the in-screen nav ends up, so the handoff is invisible */}
          <div className={`home-fixed-nav ${introDone ? 'is-visible' : ''}`}>
            <NavBar />
          </div>
          <ScrollIntro complete={introDone} onComplete={handleIntroComplete} onSkip={skipIntro}>
            <div className="home-first-view">
              <NavBar />
              <HomeHero />
            </div>
          </ScrollIntro>
        </>
      ) : (
        <>
          <NavBar />
          <HomeHero />
        </>
      )}
      <HomeSections />
      {!prefersReducedMotion() && (
        <footer className="home-footer">
          <button type="button" className="home-replay" onClick={replayIntro}>
            Replay Intro
          </button>
        </footer>
      )}
    </div>
  );
}

export default Home
