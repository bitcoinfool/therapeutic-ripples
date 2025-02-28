import React, { useRef, useEffect, useState } from 'react';

const RippleCanvas = () => {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);
  const particlesRef = useRef([]);
  const audioContextRef = useRef(null);
  const lastChimeFrequencyRef = useRef(null);
  const ambientStarted = useRef(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeOpacity, setWelcomeOpacity] = useState(0);
  const handleClickRef = useRef(null);

  // Define ambient music function outside useEffect so it can be called on tap.
  const playAmbientMusic = () => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;
    if (ambientStarted.current) return; // start only once
    ambientStarted.current = true;
    const ambientOsc = audioCtx.createOscillator();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
    const ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    ambientOsc.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    ambientOsc.start();
  };

  useEffect(() => {
    // Fade in the welcome overlay on mount.
    setTimeout(() => setWelcomeOpacity(1), 50);

    // Create AudioContext.
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions.
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Add a ripple with random variation.
    const addRipple = (x, y, variation) => {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const randomRadius = Math.random() * 200 + 900;
      ripplesRef.current.push({
        x: x + offsetX,
        y: y + offsetY,
        startTime: performance.now(),
        maxRadius: randomRadius + variation * 50,
      });
    };

    // Play a soft chime with echo effects.
    const playChime = () => {
      const audioCtx = audioContextRef.current;
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'sine';
      let frequency;
      if (lastChimeFrequencyRef.current && Math.random() < 0.5) {
        const harmonicMultipliers = [1, 1.25, 1.5, 0.8, 0.67];
        const multiplier = harmonicMultipliers[Math.floor(Math.random() * harmonicMultipliers.length)];
        frequency = lastChimeFrequencyRef.current * multiplier;
      } else {
        const frequencies = [396, 417, 432, 528, 639, 741, 852];
        frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
      }
      lastChimeFrequencyRef.current = frequency;
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 4.5);

      const delay = audioCtx.createDelay();
      delay.delayTime.value = 0.2;
      const echoGain = audioCtx.createGain();
      echoGain.gain.value = 0.1;

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.connect(delay);
      delay.connect(echoGain);
      echoGain.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 4.5);
    };

    const handleClick = (e) => {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < 3; i++) {
        addRipple(x, y, i);
      }
      playChime();
    };

    // Store the click handler in a ref for future use.
    handleClickRef.current = handleClick;
    canvas.addEventListener('click', handleClick);

    const animate = () => {
      const currentTime = performance.now();
      const hue = (currentTime / 50) % 360;
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, `hsl(${hue}, 50%, 5%)`);
      bgGradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 50%, 10%)`);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.02) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          creationTime: currentTime,
          lifetime: 8000,
        });
      }
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        const age = currentTime - p.creationTime;
        const alpha = Math.max(1 - age / p.lifetime, 0);
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.05})`;
        ctx.fill();
        if (age > p.lifetime) {
          particlesRef.current.splice(i, 1);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const ripple = ripplesRef.current[i];
        const elapsed = currentTime - ripple.startTime;
        const progress = elapsed / 4500;
        const radius = progress * ripple.maxRadius;
        const opacity = Math.max(1 - progress, 0);
        const lineWidth = 20;
        const innerEdge = Math.max(radius - lineWidth / 2, 0);
        const outerEdge = radius + lineWidth / 2;
        const gradient = ctx.createRadialGradient(
          ripple.x,
          ripple.y,
          innerEdge,
          ripple.x,
          ripple.y,
          outerEdge
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.1})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (progress >= 1) {
          ripplesRef.current.splice(i, 1);
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      canvas.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {showWelcome && (
        <div
          onClick={(e) => {
            if (audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
            }
            playAmbientMusic();
            // Fade out the overlay before removing it.
            setWelcomeOpacity(0);
            setTimeout(() => {
              setShowWelcome(false);
              // Do not trigger a ripple on the first tap.
            }, 1000);
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            zIndex: 10,
            padding: '20px',
            opacity: welcomeOpacity,
            transition: 'opacity 1s ease',
          }}
        >
          <h1>Welcome</h1>
          <p>Tap anywhere to begin.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>
            Turn on sound and disable silent mode for the full experience.
          </p>
          <p style={{ fontSize: '0.8rem', marginTop: '20px' }}>
            made by{' '}
            <a
              href="https://x.com/bitcoinfool"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'white', textDecoration: 'underline' }}
            >
              @bitcoinfool
            </a>{' '}
            +{' '}
            <a
              href="https://react.dev/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'white', textDecoration: 'underline' }}
            >
              React
            </a>{' '}
            + ChatGPT
          </p>
        </div>
      )}
    </div>
  );
};

export default RippleCanvas;
