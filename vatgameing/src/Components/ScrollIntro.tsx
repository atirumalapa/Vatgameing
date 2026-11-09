import "./styles/ScrollIntro.css";
import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import DeviceFrame from "./DeviceFrame.tsx";
import { detectDevice } from "../utils/detectDevice.ts";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollIntroProps {
  children: ReactNode;
  complete: boolean;
  onComplete: (done: boolean) => void;
  onSkip: () => void;
}

// Where the device starts: scaled down and centered so the whole thing
// (bezel + laptop base) fits in the viewport. Uses offset* so the current
// transform doesn't affect the measurement.
function measureStart(device: HTMLElement) {
  const w = device.offsetWidth;
  const h = device.offsetHeight;
  let left = 0;
  let top = 0;
  let right = w;
  let bottom = h;

  device
    .querySelectorAll<HTMLElement>(".device-bezel, .device-base")
    .forEach((el) => {
      left = Math.min(left, el.offsetLeft);
      top = Math.min(top, el.offsetTop);
      right = Math.max(right, el.offsetLeft + el.offsetWidth);
      bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
    });

  const scale = Math.min((w * 0.86) / (right - left), (h * 0.76) / (bottom - top));
  return {
    scale,
    x: -scale * ((left + right) / 2 - w / 2),
    y: -scale * ((top + bottom) / 2 - h / 2),
  };
}

function ScrollIntro({ children, complete, onComplete, onSkip }: ScrollIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [deviceKind] = useState(detectDevice);

  useGSAP(
    () => {
      const stage = rootRef.current!.querySelector<HTMLElement>(".intro-stage")!;
      const device = stage.querySelector<HTMLElement>(".device")!;
      let start = measureStart(device);
      const remeasure = () => {
        start = measureStart(device);
      };
      ScrollTrigger.addEventListener("refreshInit", remeasure);

      gsap.from(".device-rig", { autoAlpha: 0, y: 40, duration: 1.2, ease: "power3.out" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onLeave: () => onComplete(true),
          onEnterBack: () => onComplete(false),
        },
      });

      tl.to(".intro-hint", { autoAlpha: 0, duration: 0.5 }, 0)
        // Screen powers on
        .to(".device-screen-off", { autoAlpha: 0, duration: 1 }, 0.6)
        .fromTo(".intro-glow", { opacity: 0 }, { opacity: 1, duration: 1 }, 0.6)
        // Zoom until the screen fills the window
        .fromTo(
          device,
          { scale: () => start.scale, x: () => start.x, y: () => start.y },
          { scale: 1, x: 0, y: 0, duration: 3, ease: "power2.in", force3D: false },
          2,
        )
        .to(".device-camera", { autoAlpha: 0, duration: 0.5 }, 4.3)
        .to(".device-screen", { borderRadius: 0, duration: 0.6 }, 4.4);

      return () => ScrollTrigger.removeEventListener("refreshInit", remeasure);
    },
    { scope: rootRef },
  );

  return (
    <div className="scroll-intro" ref={rootRef}>
      <section className="intro-stage" aria-label="Intro">
        <div className="intro-glow" aria-hidden="true" />
        <div className="device-rig">
          {/* Always inert: the links in here are only a picture of the site.
              Otherwise keyboard users tab to links hidden behind the off screen. */}
          <DeviceFrame kind={deviceKind} inert>
            {children}
          </DeviceFrame>
        </div>
        <p className="intro-hint">
          Scroll to power on <span aria-hidden="true">↓</span>
        </p>
      </section>
      {!complete && (
        <button type="button" className="intro-skip" onClick={onSkip}>
          Skip Intro
        </button>
      )}
    </div>
  );
}

export default ScrollIntro;
