/**
 * SignalBar Component - Hiển thị thanh Signal Strength
 */

import { SignalStrength } from '../audio/engine';

interface SignalBarProps {
  strength: SignalStrength;
}

export function SignalBar({ strength }: SignalBarProps) {
  const level = strength; // "Low" | "Good" | "High"

  return (
    <div className="meterWrap">
      <div className={`meterLED ${level.toLowerCase()}`}>
        <div className="ledLow" />
        <div className="ledGood" />
        <div className="ledHigh" />
      </div>
      <div className="meterLabel">Signal: <b>{level}</b></div>
    </div>
  );
}
