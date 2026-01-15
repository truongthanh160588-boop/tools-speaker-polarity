/**
 * SignalBar Component - Hiển thị thanh Signal Strength
 */

import { SignalStrength } from '../audio/engine';

interface SignalBarProps {
  strength: SignalStrength;
}

export function SignalBar({ strength }: SignalBarProps) {
  const getBarColor = () => {
    switch (strength) {
      case 'Low':
        return '#ff4444'; // Đỏ
      case 'Good':
        return '#ffaa00'; // Cam
      case 'High':
        return '#44ff44'; // Xanh lá
      default:
        return '#888888'; // Xám
    }
  };

  const getBarWidth = () => {
    switch (strength) {
      case 'Low':
        return '33%';
      case 'Good':
        return '66%';
      case 'High':
        return '100%';
      default:
        return '0%';
    }
  };

  return (
    <div style={{ margin: '10px 0' }}>
      <div
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: '#333',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: getBarWidth(),
            height: '100%',
            backgroundColor: getBarColor(),
            transition: 'width 0.2s ease, background-color 0.2s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#aaa',
          marginTop: '4px',
        }}
      >
        <span>Low</span>
        <span>Good</span>
        <span>High</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '14px', color: '#fff' }}>
        Signal: <strong>{strength}</strong>
      </div>
    </div>
  );
}
