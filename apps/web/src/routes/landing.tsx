import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/landing";
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
  const statsRef = useRef < HTMLElement > (null);

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
            <div className="text-[clamp(2rem,5.5vw,2.5rem)] font-bold tracking-tight leading-tight">Making AI Chat</div>
            <RedactedWord />
            <p className="max-w-[540px] md:mx-auto mt-5 md:mt-6 text-[clamp(1.05rem,2.5vw,1.25rem)] font-medium leading-relaxed tracking-tight text-landing-muted-foreground">
              Onera is a Open source AI chat that can't expose your conversations to anyone, not even us.
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
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-24 px-8 md:px-16 w-full max-w-6xl mx-auto flex flex-col items-center">
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black uppercase leading-[1] tracking-[-0.04em] text-center mb-6">
            ONERA IS A <span className="bg-landing-foreground text-landing px-2 py-1 inline-block -skew-x-6 mr-1"><span className="skew-x-6 inline-block">PRIVACY FIRST</span></span> OPEN SOURCE AI CHAT
          </h2>
          <p className="text-xl md:text-2xl font-bold tracking-tight text-center mb-12 text-landing-muted-foreground">
            Unlocking truly private intelligence.
          </p>

          <a href="https://docs.onera.ai" className="inline-block border-[3px] border-landing-foreground rounded-full px-8 py-3 font-bold text-lg uppercase tracking-wide hover:bg-landing-foreground hover:text-landing transition-colors mb-24">
            READ DOCS
          </a>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 w-full text-center">
            {/* Feature 1 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 flex items-center justify-center mb-8 relative">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="24" y="0" width="24" height="24" fill="currentColor" className="text-landing-foreground" />
                  <rect x="0" y="24" width="24" height="24" fill="currentColor" className="text-landing-foreground" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Zero data retention<br />on our servers.</h3>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-full flex flex-col items-center justify-center gap-3 mb-8">
                <div className="relative w-52 h-10 bg-landing-muted flex items-center justify-center overflow-hidden rounded-md border border-landing-border/50">
                  <div className="absolute inset-y-0 w-2/3 bg-landing"></div>
                  <span className="relative z-10 text-[1.1rem] font-mono tracking-[0.2em] text-landing-foreground">msg_***8A</span>
                </div>
                <div className="relative w-48 h-10 bg-landing-muted flex items-center justify-center overflow-hidden rounded-md border border-landing-border/50">
                  <div className="absolute inset-y-0 w-[80%] right-0 bg-landing"></div>
                  <span className="relative z-10 text-[1.1rem] font-mono tracking-[0.2em] text-landing-foreground">***chat*</span>
                </div>
                <div className="relative w-52 h-10 bg-landing-muted flex items-center justify-center overflow-hidden rounded-md border border-landing-border/50">
                  <div className="absolute inset-y-0 w-1/2 left-2 bg-landing"></div>
                  <span className="relative z-10 text-[1.1rem] font-mono tracking-[0.2em] text-landing-foreground">usr_***9b</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Privacy for all your<br />conversations.</h3>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 flex items-center justify-center mb-8 relative">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Central Diamond/Spark */}
                  <path d="M50 20C50 36.5685 36.5685 50 20 50C36.5685 50 50 63.4315 50 80C50 63.4315 63.4315 50 80 50C63.4315 50 50 36.5685 50 20Z" fill="currentColor" className="text-landing-foreground" />

                  {/* Top Left Lock */}
                  <g transform="translate(15, 20)">
                    <rect x="3" y="6" width="10" height="8" rx="1.5" fill="currentColor" className="text-landing-foreground" />
                    <path d="M5 6V4C5 2.89543 5.89543 2 7 2V2C8.10457 2 9 2.89543 9 4V6" stroke="currentColor" className="text-landing-foreground" strokeWidth="1.5" />
                  </g>

                  {/* Right floating card */}
                  <g transform="translate(75, 45)">
                    <rect x="0" y="0" width="16" height="12" rx="3" fill="currentColor" className="text-landing-muted" />
                    <circle cx="12" cy="6" r="1.5" fill="currentColor" className="text-landing-foreground" />
                  </g>
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
              ONERA ECOSYSTEM
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-landing p-10 flex flex-col h-full rounded-2xl border border-landing-border shadow-sm">
                <h3 className="text-landing-foreground text-2xl font-bold mb-4">Onera Network</h3>
                <p className="text-landing-muted-foreground text-lg leading-relaxed mb-16">
                  High performance TEE enclaves + E2E encryption enable seamless privacy without compromising speed.
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
                  Chat with leading open-weights models running securely inside hardware-isolated enclaves.
                </p>
                <div className="mt-auto flex justify-center">
                  <svg width="140" height="180" viewBox="0 0 140 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="20" width="120" height="160" rx="16" stroke="currentColor" className="text-landing-foreground" strokeWidth="4" fill="none" />
                    {/* Server rack/chip nodes */}
                    <rect x="30" y="50" width="80" height="24" rx="4" fill="currentColor" className="text-landing-muted-foreground" opacity="0.3" />
                    <rect x="30" y="90" width="80" height="24" rx="4" fill="currentColor" className="text-landing-foreground" />
                    <rect x="30" y="130" width="80" height="24" rx="4" fill="currentColor" className="text-landing-muted-foreground" opacity="0.3" />
                    {/* Blinking lights equivalent */}
                    <circle cx="95" cy="102" r="3" fill="currentColor" className="text-landing" />
                    <circle cx="95" cy="62" r="3" fill="currentColor" className="text-landing-foreground" />
                    <circle cx="95" cy="142" r="3" fill="currentColor" className="text-landing-foreground" />
                  </svg>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-landing p-10 flex flex-col h-full rounded-2xl border border-landing-border shadow-sm">
                <h3 className="text-landing-foreground text-2xl font-bold mb-4">Open-Source Client</h3>
                <p className="text-landing-muted-foreground text-lg leading-relaxed mb-16">
                  Beautiful, minimal web client that handles all encryption locally on your device. Fully open-source and auditable.
                </p>
                <div className="mt-auto flex justify-center">
                  <div className="w-[160px] h-[200px] border-[4px] border-landing-foreground rounded-t-[32px] rounded-b-none relative flex flex-col p-5 border-b-0 bg-landing overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-landing-foreground rounded-b-xl"></div>
                    <div className="flex justify-between items-center mt-4 mb-8">
                      <OneraLogo size={16} className="h-4 w-4" />
                      <div className="w-8 h-4 rounded-full bg-landing-muted flex items-center justify-end px-1 border border-landing-border">
                        <div className="w-2 h-2 rounded-full bg-landing-foreground"></div>
                      </div>
                    </div>
                    <div className="w-[85%] h-10 bg-landing-foreground rounded-xl self-end mb-4 flex items-center px-3">
                      <div className="w-8 h-2 bg-landing opacity-50 rounded-full"></div>
                    </div>
                    <div className="w-[75%] h-12 bg-landing-muted rounded-xl self-start border border-landing-border/50 flex items-center px-3">
                      <div className="w-12 h-2 bg-landing-muted-foreground opacity-50 rounded-full"></div>
                    </div>
                  </div>
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
                  <p className="text-sm opacity-70">Keys never leave your device. All data is encrypted locally.</p>
                </div>

                <div className="md:absolute md:left-1/2 md:bottom-[-30px] lg:bottom-[-40px] md:transform md:-translate-x-1/2 max-w-[280px] md:max-w-[200px] mx-auto text-center flex flex-col items-center">
                  <div className="hidden md:block h-12 w-px bg-landing mb-2 opacity-50"></div>
                  <div className="md:hidden h-px w-24 bg-landing mb-4 opacity-50"></div>
                  <h4 className="font-bold text-lg mb-1">TEE Enclaves</h4>
                  <p className="text-sm opacity-70">Models run in hardware-isolated environments.</p>
                </div>

                <div className="md:absolute md:right-0 md:top-0 lg:-right-12 lg:top-12 max-w-[280px] md:max-w-[200px] mx-auto md:mx-0 flex flex-col items-center md:items-start md:text-left">
                  <div className="h-px w-24 bg-landing mb-4 md:mb-2 opacity-50"></div>
                  <h4 className="font-bold text-lg mb-1">Secure Storage</h4>
                  <p className="text-sm opacity-70">Store your encrypted history safely, anywhere you choose.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 px-8 bg-landing-muted w-full flex flex-col md:flex-row items-center justify-center gap-16 overflow-hidden">
          <div className="max-w-xl text-left z-10">
            <h2 className="text-[clamp(3rem,6vw,5rem)] font-black uppercase leading-[0.95] tracking-tight text-landing-foreground mb-8">
              START YOUR<br />AI JOURNEY—<br />PRIVATELY.
            </h2>
            <Link to="/auth" className="inline-block bg-landing-foreground text-landing rounded-full px-10 py-5 font-bold text-xl uppercase tracking-wide hover:scale-105 transition-transform shadow-lg shadow-landing-foreground/20">
              GET ONERA APP
            </Link>
          </div>

          <div className="relative w-[300px] h-[600px] shrink-0 translate-y-12 md:translate-y-24">
            {/* Phone Shadow / Back Phone */}
            <div className="absolute inset-0 bg-landing-border rounded-[40px] translate-x-8 -translate-y-8 opacity-50 flex items-center justify-center p-8">
              <div className="opacity-30">
                <OneraLogo size={64} className="h-16 w-16" />
              </div>
            </div>

            {/* Main Phone Frame */}
            <div className="absolute inset-0 bg-landing-card border-8 border-landing-foreground rounded-[44px] shadow-2xl flex flex-col overflow-hidden">
              {/* Dynamic Island */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-7 bg-landing-foreground rounded-b-3xl z-20"></div>

              {/* Phone Content */}
              <div className="flex-1 bg-landing p-6 flex flex-col">
                <div className="flex justify-between items-center mt-8 mb-12">
                  <div className="flex items-center gap-1 font-bold text-lg text-landing-foreground">
                    <OneraLogo size={16} className="h-4 w-4" />
                    onera
                  </div>
                  <div className="bg-landing-foreground text-landing text-xs px-3 py-1 rounded-full font-bold">SECURE</div>
                </div>

                <div className="text-landing-foreground font-black text-6xl tracking-tighter mb-4">Hello.</div>
                <div className="text-landing-muted-foreground font-medium text-lg mb-auto">Ready for a private chat?</div>

                <div className="flex gap-4 w-full h-32">
                  <div className="flex-1 bg-landing-foreground rounded-2xl p-4 text-landing flex flex-col justify-between shadow-xl">
                    <span className="font-bold">NEW CHAT</span>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                  <div className="flex-1 border-2 border-landing-foreground rounded-2xl p-4 text-landing-foreground flex flex-col justify-between hover:bg-landing-foreground hover:text-landing transition-colors">
                    <span className="font-bold">HISTORY</span>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section
          ref={statsRef}
          className="px-8 py-24 bg-landing-card flex flex-col items-center text-center justify-center border-t border-landing-border"
        >
          <div className="font-bold text-sm tracking-[0.15em] mb-4 flex items-center gap-2 uppercase text-landing-muted-foreground">
            <span className="text-landing-foreground">▊</span> SECURE MESSAGES THIS WEEK ↗
          </div>
          <div className="text-[clamp(40px,8vw,80px)] font-black leading-none tracking-[-0.04em] mb-6 tabular-nums text-landing-foreground">
            {count.toLocaleString()}
          </div>
          <div className="font-mono text-sm tracking-widest flex items-center justify-center whitespace-pre-wrap text-landing-muted-foreground">
            <span className="text-landing-foreground">▊</span> MSG #A7F3B…   FROM: **** — TO: ****
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
