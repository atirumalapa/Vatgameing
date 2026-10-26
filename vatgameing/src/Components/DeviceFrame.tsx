import "./styles/DeviceFrame.css";
import type { ReactNode } from "react";
import type { DeviceKind } from "../utils/detectDevice.ts";

interface DeviceFrameProps {
  kind: DeviceKind;
  inert?: boolean;
  children: ReactNode;
}

const LAPTOPS: DeviceKind[] = ["macbook", "windows", "laptop"];

// The screen is always exactly viewport-sized; the bezel and base hang
// outside it. Scaling .device down shows the whole device, scaling it
// back to 1 pushes the frame off-screen and leaves just the site.
function DeviceFrame({ kind, inert, children }: DeviceFrameProps) {
  return (
    <div className={`device device--${kind}`}>
      <div className="device-bezel" aria-hidden="true" />
      {LAPTOPS.includes(kind) && (
        <div className="device-base" aria-hidden="true" />
      )}
      <div className="device-screen">
        <div className="device-screen-content" inert={inert}>
          {children}
        </div>
        <div className="device-screen-off" aria-hidden="true" />
      </div>
      <div className="device-camera" aria-hidden="true" />
    </div>
  );
}

export default DeviceFrame;
