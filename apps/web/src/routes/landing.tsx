import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Footer, Header } from "@/components/landing";
import { OneraLogo } from "@/components/ui/onera-logo";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const letters = ['P', 'R', 'I', 'V', 'A', 'T', 'E'];
const patterns = [
  [0, 4],       // *RIV*TE
  [1, 5],       // P*IVA*E
  [0, 6],       // *RIVAT*
  [0, 3],       // *RI*ATE
  [3, 6],       // PRI*AT*
  [1, 4],       // P*IV*TE
  [4, 5],       // PRIV**E
  [0, 5],       // *RIVA*E
  [1, 6],       // P*IVAT*
  [0, 3, 4],    // *RI**TE
  [1, 3, 5],    // P*I*A*E
];

const RedactedWord = () => {
  const [hovered, setHovered] = useState(false);
  const [patternIndex, setPatternIndex] = useState(-1);

  useEffect(() => {
    if (hovered) {
      setPatternIndex(-1);
      return;
    }

    let isMounted = true;

    const t1 = setTimeout(() => {
      if (isMounted) setPatternIndex(0);
    }, 800);

    const interval = setInterval(() => {
      if (!isMounted) return;

      setPatternIndex(-1);

      setTimeout(() => {
        if (!isMounted) return;
        setPatternIndex(prev => {
          let next;
          do {
            next = Math.floor(Math.random() * patterns.length);
          } while (next === prev);
          return next;
        });
      }, 1000);
    }, 4500);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearInterval(interval);
    };
  }, [hovered]);

  return (
    <h1
      className="text-[clamp(72px,20vw,220px)] font-black leading-[0.95] tracking-[-0.05em] m-0 uppercase cursor-pointer flex justify-center w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {letters.map((char, i) => {
        const isRedacted = patternIndex !== -1 && patterns[patternIndex].includes(i);
        return (
          <span key={i} className="relative inline-flex justify-center items-center">
            <span className={`transition-all duration-[800ms] ease-in-out ${isRedacted ? 'opacity-0 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}>{char}</span>
            <span className={`absolute transition-all duration-[800ms] ease-in-out text-landing-muted-foreground ${isRedacted ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-110'}`}>*</span>
          </span>
        );
      })}
    </h1>
  );
};

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [hasAnimated, setHasAnimated] = useState(false);
  const [count, setCount] = useState(0);
  const target = 142887;
  const statsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const landingBg = "#ffffff";
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector('meta[name="theme-color"]');

    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevThemeColor = meta?.getAttribute("content") ?? "";

    html.style.backgroundColor = landingBg;
    body.style.backgroundColor = landingBg;
    html.classList.add("landing-page-active");
    meta?.setAttribute("content", landingBg);

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      html.classList.remove("landing-page-active");
      meta?.setAttribute("content", prevThemeColor);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasAnimated]);

  const animateCounter = () => {
    const duration = 2000;
    let startTime: number | null = null;

    const easeOutExpo = (t: number) => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentCount = Math.floor(easeOutExpo(progress) * target);

      setCount(currentCount);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    window.requestAnimationFrame(step);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-landing text-landing-foreground font-landing antialiased flex flex-col selection:bg-landing-foreground/10 overflow-x-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      <Header />

      <main className="flex flex-col w-full">
        {/* HERO SECTION */}
        <section className="flex flex-col justify-center items-center text-center px-5 sm:px-8 min-h-[100dvh] py-20 relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
            <FlickeringGrid
              className="absolute inset-0 z-0 h-full w-full"
              squareSize={4}
              gridGap={6}
              color="#6B7280"
              maxOpacity={0.08}
              flickerChance={0.1}
            />
          </div>
          <div className="opacity-0 translate-y-10 animate-fade-slide-up w-full max-w-[980px] mx-auto z-10 relative">
            <div className="flex items-center justify-center mb-8 md:mb-12">
              <OneraLogo size={48} className="h-[40px] w-[40px] md:h-[48px] md:w-[48px] rounded-xl" />
            </div>
            <div className="text-[clamp(2rem,5.5vw,2.5rem)] font-bold tracking-tight leading-tight">Making AI</div>
            <RedactedWord />
            <p className="max-w-[540px] md:mx-auto mt-5 md:mt-6 text-[clamp(1.05rem,2.5vw,1.25rem)] font-medium leading-relaxed tracking-tight text-landing-muted-foreground">
              Onera encrypts messages on your device before they are sent. Onera cannot read your conversations.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
              <Link
                to={isAuthenticated ? "/app" : "/auth"}
                className="inline-flex h-12 items-center rounded-full bg-landing-foreground px-8 font-landing text-base font-medium text-landing transition-opacity hover:opacity-85"
              >
                {isAuthenticated ? "Open App" : "Get Started"}
              </Link>
              <a
                href="https://github.com/onera-app/onera"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-landing-foreground/20 px-8 font-landing text-base font-medium text-landing-foreground transition-colors hover:bg-landing-foreground/5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
                GitHub
              </a>
              <a
                href="https://apps.apple.com/us/app/onera-private-ai-chat/id6758128954"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-landing-foreground/20 text-landing-foreground transition-colors hover:bg-landing-foreground/5"
                aria-label="Download on the App Store"
              >
                <svg viewBox="0 0 17 20" className="h-5 w-[17px]" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M14.94 10.56a4.77 4.77 0 0 1 2.27-4 4.89 4.89 0 0 0-3.85-2.08c-1.62-.17-3.19.97-4.02.97-.84 0-2.1-.95-3.47-.93a5.12 5.12 0 0 0-4.31 2.63c-1.86 3.22-.47 7.97 1.31 10.58.9 1.28 1.94 2.71 3.31 2.66 1.34-.06 1.84-.85 3.45-.85 1.6 0 2.06.85 3.46.82 1.44-.02 2.34-1.28 3.2-2.57a10.6 10.6 0 0 0 1.47-2.98 4.61 4.61 0 0 1-2.82-4.25zM12.31 2.72A4.7 4.7 0 0 0 13.39.36 4.78 4.78 0 0 0 10.3 1.96a4.47 4.47 0 0 0-1.1 3.25 3.96 3.96 0 0 0 3.11-1.49z" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 px-8 md:px-16 w-full max-w-6xl mx-auto flex flex-col items-center">
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black uppercase leading-[1] tracking-[-0.04em] text-center mb-6">
            ONERA IS A <span className="bg-landing-foreground text-landing px-2 py-1 inline-block -skew-x-6 mr-1"><span className="skew-x-6 inline-block">PRIVACY FIRST</span></span> AI CHAT APPLICATION
          </h2>
          <p className="text-xl md:text-2xl font-bold tracking-tight text-center mb-12 text-landing-muted-foreground">
            Private AI without compromise.
          </p>

          <a href="https://docs.onera.chat" className="inline-block border-[3px] border-landing-foreground rounded-full px-8 py-3 font-bold text-lg uppercase tracking-wide hover:bg-landing-foreground hover:text-landing transition-colors mb-24">
            READ DOCS
          </a>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 w-full text-center">
            {/* Feature 1 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 flex items-center justify-center mb-8 relative">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Server shape */}
                  <rect x="16" y="20" width="48" height="16" rx="4" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" fill="none" />
                  <rect x="16" y="44" width="48" height="16" rx="4" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" fill="none" />
                  {/* Drive indicator dots */}
                  <circle cx="52" cy="28" r="2.5" fill="currentColor" className="text-landing-foreground" />
                  <circle cx="52" cy="52" r="2.5" fill="currentColor" className="text-landing-foreground" />
                  {/* Slash-through line = nothing retained */}
                  <line x1="12" y1="68" x2="68" y2="12" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">No data retention<br />on our servers.</h3>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 flex items-center justify-center mb-8 relative">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Primary chat bubble */}
                  <rect x="12" y="16" width="38" height="26" rx="7" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" fill="none" />
                  <path d="M22 42V49L29 42" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Secondary chat bubble */}
                  <rect x="34" y="34" width="34" height="22" rx="6" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" fill="none" />
                  {/* Redacted message lines */}
                  <line x1="18" y1="26" x2="41" y2="26" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" strokeLinecap="round" />
                  <line x1="18" y1="33" x2="35" y2="33" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" strokeLinecap="round" />
                  <line x1="40" y1="45" x2="60" y2="45" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" strokeLinecap="round" />
                  {/* Privacy marker */}
                  <rect x="53" y="53" width="12" height="10" rx="2" stroke="currentColor" className="text-landing-foreground" strokeWidth="2.5" fill="none" />
                  <path d="M56 53V50C56 47.7909 57.7909 46 60 46C62.2091 46 64 47.7909 64 50V53" stroke="currentColor" className="text-landing-foreground" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Private by default for<br />every conversation.</h3>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 flex items-center justify-center mb-8 relative">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Circle */}
                  <circle cx="40" cy="40" r="28" stroke="currentColor" className="text-landing-foreground" strokeWidth="3" fill="none" />
                  {/* Checkmark */}
                  <path d="M26 40L35 49L54 30" stroke="currentColor" className="text-landing-foreground" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">No complex setup<br />required.</h3>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM SECTION */}
        <section className="py-32 bg-landing-card text-landing-foreground w-full border-y border-landing-border">
          <div className="max-w-7xl mx-auto px-8 md:px-16">
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase tracking-tight text-center mb-20">
              THE ONERA ECOSYSTEM
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-landing p-10 flex flex-col h-full rounded-2xl border border-landing-border shadow-sm">
                <h3 className="text-landing-foreground text-2xl font-bold mb-4">Onera Network</h3>
                <p className="text-landing-muted-foreground text-lg leading-relaxed mb-16">
                  Trusted hardware enclaves and full encryption keep every conversation private without slowing you down.
                </p>
                <div className="mt-auto flex justify-center">
                  <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="currentColor" className="text-landing-foreground" strokeWidth="2" opacity="0.8">
                      {[...Array(12)].map((_, i) => (
                        <rect key={i} x="50" y="50" width="100" height="100" rx="16" transform={`rotate(${i * 15} 100 100)`} fill="none" />
                      ))}
                    </g>
                    <circle cx="100" cy="100" r="20" fill="currentColor" className="text-landing-foreground" />
                  </svg>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-landing p-10 flex flex-col h-full rounded-2xl border border-landing-border shadow-sm">
                <h3 className="text-landing-foreground text-2xl font-bold mb-4">Onera Models</h3>
                <p className="text-landing-muted-foreground text-lg leading-relaxed mb-16">
                  Access OpenAI, Anthropic, Google, and open source models through one encrypted interface.
                </p>
                <div className="mt-auto flex justify-center">
                  <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Interconnected nodes representing multiple models */}
                    <g stroke="currentColor" className="text-landing-foreground" strokeWidth="2" opacity="0.8">
                      {/* Outer hexagonal arrangement of nodes */}
                      <circle cx="100" cy="50" r="14" fill="none" />
                      <circle cx="148" cy="80" r="14" fill="none" />
                      <circle cx="148" cy="130" r="14" fill="none" />
                      <circle cx="100" cy="160" r="14" fill="none" />
                      <circle cx="52" cy="130" r="14" fill="none" />
                      <circle cx="52" cy="80" r="14" fill="none" />
                      {/* Connecting lines */}
                      <line x1="100" y1="64" x2="100" y2="146" />
                      <line x1="64" y1="86" x2="136" y2="124" />
                      <line x1="64" y1="124" x2="136" y2="86" />
                    </g>
                    {/* Center node - the unified interface */}
                    <circle cx="100" cy="105" r="20" fill="currentColor" className="text-landing-foreground" />
                  </svg>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-landing p-10 flex flex-col h-full rounded-2xl border border-landing-border shadow-sm">
                <h3 className="text-landing-foreground text-2xl font-bold mb-4">Open Source Client</h3>
                <p className="text-landing-muted-foreground text-lg leading-relaxed mb-16">
                  A clean, open source web client you can audit and verify. Encryption happens entirely on your device.
                </p>
                <div className="mt-auto flex justify-center">
                  <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Code brackets representing open source */}
                    <g stroke="currentColor" className="text-landing-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
                      {/* Left bracket < */}
                      <polyline points="75,70 45,100 75,130" fill="none" />
                      {/* Right bracket > */}
                      <polyline points="125,70 155,100 125,130" fill="none" />
                      {/* Forward slash / */}
                      <line x1="112" y1="60" x2="88" y2="140" />
                    </g>
                    {/* Lock overlay at bottom-right = secure + open */}
                    <g transform="translate(140, 140)">
                      <rect x="4" y="14" width="24" height="18" rx="4" stroke="currentColor" className="text-landing-foreground" strokeWidth="2.5" fill="none" />
                      <path d="M10 14V10C10 6.68629 12.6863 4 16 4V4C19.3137 4 22 6.68629 22 10V14" stroke="currentColor" className="text-landing-foreground" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRIVACY LAYERS SECTION */}
        <section className="py-24 md:py-32 bg-landing-foreground text-landing w-full overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 md:px-16 flex flex-col items-center">
            <h2 className="text-[clamp(2.5rem,6vw,6rem)] font-black uppercase leading-[0.9] tracking-tight text-center mb-16 md:mb-32">
              PRIVACY AT<br />EVERY LAYER
            </h2>

            <div className="relative w-full max-w-4xl flex flex-col md:block items-center justify-center mt-4 md:mt-12 mb-8 md:mb-16 gap-12 md:gap-0 h-auto md:h-[400px]">

              {/* Graphic container for mobile/tablet scaling */}
              <div className="relative w-full h-[250px] sm:h-[300px] md:h-full flex justify-center items-center mb-12 md:mb-0">
                {/* Graphic Layers */}
                <div className="absolute w-[220px] h-[160px] sm:w-[280px] sm:h-[200px] md:w-[400px] md:h-[300px] bg-white/10 backdrop-blur-sm rounded-tl-[50px] rounded-br-[50px] md:rounded-tl-[100px] md:rounded-br-[100px] opacity-40 translate-x-[40px] sm:translate-x-[60px] md:translate-x-[150px] shadow-2xl border border-white/20"></div>
                <div className="absolute w-[220px] h-[160px] sm:w-[280px] sm:h-[200px] md:w-[400px] md:h-[300px] bg-white/20 backdrop-blur-md rounded-tl-[50px] rounded-br-[50px] md:rounded-tl-[100px] md:rounded-br-[100px] opacity-60 translate-x-[10px] sm:translate-x-[15px] md:translate-x-[50px] shadow-2xl border border-white/30"></div>
                <div className="absolute w-[220px] h-[160px] sm:w-[280px] sm:h-[200px] md:w-[400px] md:h-[300px] bg-white rounded-tl-[50px] rounded-br-[50px] md:rounded-tl-[100px] md:rounded-br-[100px] opacity-90 translate-x-[-20px] sm:translate-x-[-30px] md:translate-x-[-50px] shadow-2xl overflow-hidden text-landing-foreground">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                </div>
              </div>

              {/* Labels */}
              <div className="flex flex-col md:block w-full gap-10 relative text-center md:text-left z-10 px-4">
                <div className="md:absolute md:left-0 md:bottom-12 lg:-left-12 lg:bottom-12 max-w-[280px] md:max-w-[200px] mx-auto md:mx-0 flex flex-col items-center md:items-start">
                  <div className="h-px w-24 bg-landing mb-4 md:mb-2 opacity-50"></div>
                  <h4 className="font-bold text-lg mb-1">Local Encryption</h4>
                  <p className="text-sm opacity-70">Encryption keys stay on your device. Data is encrypted before it leaves.</p>
                </div>

                <div className="md:absolute md:left-1/2 md:bottom-[-30px] lg:bottom-[-40px] md:transform md:-translate-x-1/2 max-w-[280px] md:max-w-[200px] mx-auto text-center flex flex-col items-center">
                  <div className="hidden md:block h-12 w-px bg-landing mb-2 opacity-50"></div>
                  <div className="md:hidden h-px w-24 bg-landing mb-4 opacity-50"></div>
                  <h4 className="font-bold text-lg mb-1">TEE Enclaves</h4>
                  <p className="text-sm opacity-70">AI models run inside secure hardware that no one, including Onera, can access.</p>
                </div>

                <div className="md:absolute md:right-0 md:top-0 lg:-right-12 lg:top-12 max-w-[280px] md:max-w-[200px] mx-auto md:mx-0 flex flex-col items-center md:items-start md:text-left">
                  <div className="h-px w-24 bg-landing mb-4 md:mb-2 opacity-50"></div>
                  <h4 className="font-bold text-lg mb-1">Secure Storage</h4>
                  <p className="text-sm opacity-70">Your conversation history is stored fully encrypted and unreadable without your keys.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 px-8 bg-landing-muted w-full flex flex-col md:flex-row items-center justify-center gap-16 overflow-hidden">
          <div className="max-w-xl text-left z-10">
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase leading-[0.95] tracking-tight text-landing-foreground mb-8">
              START YOUR<br />PRIVATE AI<br />JOURNEY.
            </h2>
            <Link to="/auth" className="inline-block bg-landing-foreground text-landing rounded-full px-10 py-5 font-bold text-xl uppercase tracking-wide hover:scale-105 transition-transform shadow-lg shadow-landing-foreground/20">
              GET ONERA APP
            </Link>
          </div>

          <div className="relative w-full max-w-[760px] shrink-0 md:translate-y-12">
            <div className="flex items-end justify-center gap-4 sm:gap-6">
              <figure className="relative w-[44%] max-w-[270px] aspect-[1206/2622] overflow-hidden rounded-[28px] border-4 border-landing-foreground/15 bg-landing-card shadow-2xl rotate-[-5deg]">
                <img
                  src="/screenshots/ios-onboarding.jpg"
                  alt="Onera iOS onboarding screen"
                  className="h-full w-full object-cover object-top"
                />
                <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-landing-foreground/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing">
                  Onboarding
                </figcaption>
              </figure>

              <figure className="relative w-[48%] max-w-[295px] aspect-[1206/2622] overflow-hidden rounded-[30px] border-4 border-landing-foreground/25 bg-landing-card shadow-2xl rotate-[4deg]">
                <img
                  src="/screenshots/ios-chat.jpg"
                  alt="Onera iOS chat screen"
                  className="h-full w-full object-cover object-top"
                />
                <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-landing-foreground/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing">
                  Chat
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section
          ref={statsRef}
          className="px-8 py-24 bg-landing-card flex flex-col items-center text-center justify-center border-t border-landing-border"
        >
          <div className="font-bold text-sm tracking-[0.15em] mb-4 flex items-center gap-2 uppercase text-landing-muted-foreground">
            SECURE MESSAGES PROCESSED
          </div>
          <div className="text-[clamp(40px,8vw,80px)] font-black leading-none tracking-[-0.04em] mb-6 tabular-nums text-landing-foreground">
            {count.toLocaleString()}+
          </div>
          <div className="font-mono text-sm tracking-widest flex items-center justify-center whitespace-pre-wrap text-landing-muted-foreground">
            Fully encrypted. Zero knowledge. Your data stays yours.
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
