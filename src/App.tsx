/**
 * App Component - Giao diện chính của ToolsSpeakerPolarity
 * Version 2.0 - 3-Band Test (LOW/MID/HI) + Report
 */

import { useState, useEffect, useRef } from 'react';
import { AudioEngine, BandReport, BandTest, SignalStrength, PulseResult } from './audio/engine';
import { SignalBar } from './ui/SignalBar';
import './styles.css';

function App() {
  const [signalStrength, setSignalStrength] = useState<SignalStrength>('Low');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isTestOutputEnabled, setIsTestOutputEnabled] = useState(false);
  // Reports - lưu report theo từng band để hiển thị khuyến nghị
  const [reports, setReports] = useState<Partial<Record<BandTest, BandReport>>>({});
  const [pulseProgress, setPulseProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentPulseResult, setCurrentPulseResult] = useState<PulseResult | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [uiMode, setUiMode] = useState<'BASIC' | 'EXPERT'>('BASIC');
  // Logs - ẩn theo yêu cầu, giữ lại để có thể bật lại sau
  // const [_logs, setLogs] = useState<string[]>([]);

  const engineRef = useRef<AudioEngine | null>(null);
  const isTestingRef = useRef<boolean>(false);

  // Khởi tạo AudioEngine
  useEffect(() => {
    engineRef.current = new AudioEngine({
      onSignalStrengthChange: (strength) => {
        setSignalStrength(strength);
      },
      onBandReport: (report) => {
        // Lưu report để hiển thị khuyến nghị
        console.log('[REPORT]', report.band, report);
        setReports((prev) => {
          const updated = {
            ...prev,
            [report.band]: report,
          };
          console.log('[REPORT] Updated reports:', updated);
          return updated;
        });
        setPulseProgress(null);
        isTestingRef.current = false;
      },
      onPulseProgress: (pulse, total, result) => {
        setPulseProgress({ current: pulse, total });
        setCurrentPulseResult(result);
      },
      onLog: (_message) => {
        // Logs ẩn theo yêu cầu, vẫn nhận log nhưng không hiển thị
        // setLogs((prev) => {
        //   const newLogs = [...prev, message];
        //   return newLogs.slice(-5);
        // });
      },
      onError: (error) => {
        console.error('AudioEngine error:', error);
        alert(`Lỗi: ${error.message}`);
        isTestingRef.current = false;
        setPulseProgress(null);
      },
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  /**
   * Bắt đầu thu âm từ mic
   */
  const handleStartMic = async () => {
    try {
      if (engineRef.current) {
        await engineRef.current.ensureAudioContextResumed();
        await engineRef.current.startMic();
        setIsMicActive(true);
      }
    } catch (error: any) {
      console.error('Error starting mic:', error);
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowedError')) {
        alert('Vui lòng cho phép quyền truy cập microphone trong trình duyệt!');
      } else {
        alert(`Không thể truy cập microphone: ${errorMessage}`);
      }
      setIsMicActive(false);
    }
  };

  /**
   * Dừng thu âm từ mic
   */
  const handleStopMic = () => {
    if (engineRef.current) {
      engineRef.current.stopMic();
      setIsMicActive(false);
      setSignalStrength('Low');
    }
  };

  /**
   * Toggle test signal output
   */
  const handleToggleTestOutput = () => {
    const newValue = !isTestOutputEnabled;
    setIsTestOutputEnabled(newValue);
    if (engineRef.current) {
      engineRef.current.setTestOutputEnabled(newValue);
    }
  };


  /**
   * Reset ứng dụng về trạng thái ban đầu
   */
  const handleReset = async () => {
    // Stop mic nếu đang chạy
    if (isMicActive && engineRef.current) {
      try {
        engineRef.current.stopMic();
      } catch (error) {
        console.error('Error stopping mic:', error);
      }
    }

    // Reset tất cả state
    setIsMicActive(false);
    setIsTestOutputEnabled(false);
    setSignalStrength('Low');
    setReports({});
    setPulseProgress(null);
    setCurrentPulseResult(null);
    isTestingRef.current = false;

    // Dispose và recreate AudioEngine để reset hoàn toàn
    if (engineRef.current) {
      engineRef.current.dispose();
    }

    // Tạo lại AudioEngine với callbacks mới
    engineRef.current = new AudioEngine({
      onSignalStrengthChange: (strength) => {
        setSignalStrength(strength);
      },
      onBandReport: (report) => {
        console.log('[REPORT]', report.band, report);
        setReports((prev) => {
          const updated = {
            ...prev,
            [report.band]: report,
          };
          console.log('[REPORT] Updated reports:', updated);
          return updated;
        });
        setPulseProgress(null);
        isTestingRef.current = false;
      },
      onPulseProgress: (pulse, total, result) => {
        setPulseProgress({ current: pulse, total });
        setCurrentPulseResult(result);
      },
      onLog: (_message) => {
        // Logs ẩn theo yêu cầu
      },
      onError: (error) => {
        console.error('AudioEngine error:', error);
        alert(`Lỗi: ${error.message}`);
        isTestingRef.current = false;
        setPulseProgress(null);
      },
    });
  };

  /**
   * Test một band
   */
  const handleTestBand = async (band: BandTest) => {
    if (!engineRef.current || !isMicActive) {
      alert('Vui lòng bật microphone trước!');
      return;
    }

    if (!isTestOutputEnabled) {
      alert('Vui lòng bật "Tự phát tiếng kiểm tra (POP)" trước!');
      return;
    }

    if (isTestingRef.current) {
      return;
    }

    isTestingRef.current = true;
    setPulseProgress({ current: 0, total: 5 });
    setCurrentPulseResult(null);

    try {
      // QUAN TRỌNG: await để đảm bảo report được set trước khi UI render
      const report = await engineRef.current.testBand(band);
      console.log('[REPORT] testBand returned:', band, report);
      
      // Đảm bảo report được lưu (callback đã set, nhưng double-check)
      if (report) {
        setReports((prev) => {
          const updated = {
            ...prev,
            [band]: report,
          };
          console.log('[REPORT] Direct setReports:', updated);
          return updated;
        });
      }
    } catch (error: any) {
      console.error('Error testing band:', error);
      alert(`Lỗi khi test: ${error.message}`);
      isTestingRef.current = false;
      setPulseProgress(null);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ToolsSpeakerPolarity</h1>
        <button
          onClick={() => setShowAbout(true)}
          className="about-button"
          aria-label="About"
          title="Thông tin liên hệ"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
      </header>

      <main className="main">
        {/* BASIC/EXPERT Mode Toggle */}
        <div className="modeBar">
          <button
            className={`modeBtn ${uiMode === 'BASIC' ? 'active' : ''}`}
            onClick={() => setUiMode('BASIC')}
            type="button"
          >
            BASIC
          </button>
          <button
            className={`modeBtn ${uiMode === 'EXPERT' ? 'active' : ''}`}
            onClick={() => setUiMode('EXPERT')}
            type="button"
          >
            EXPERT
          </button>
        </div>

        <SignalBar strength={signalStrength} />

        {/* Status info */}
        <div className="status-info">
          <div>Mic: {isMicActive ? 'ON' : 'OFF'}</div>
          <div>Output: {isTestOutputEnabled ? 'ON' : 'OFF'}</div>
        </div>

        <div className="info-text">Micro: Default</div>

        <div className="toggle-container">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isTestOutputEnabled}
              onChange={handleToggleTestOutput}
            />
            <span>Tự phát tiếng kiểm tra (POP)</span>
          </label>
        </div>

        <div className="button-group">
          <button
            onClick={isMicActive ? handleStopMic : handleStartMic}
            className={isMicActive ? 'button button-active' : 'button'}
          >
            {isMicActive ? 'Stop Mic' : 'Start Mic'}
          </button>
          <button
            onClick={handleReset}
            className="button button-reset"
            title="Reset ứng dụng về trạng thái ban đầu để tăng độ chính xác"
          >
            Reset
          </button>
        </div>

        {/* Test buttons */}
        <div className="test-bands">
          <button
            onClick={() => handleTestBand('LOW')}
            className="button button-band"
            disabled={!isMicActive || isTestingRef.current}
          >
            Kiểm tra LOW (30–120Hz)
          </button>
          <button
            onClick={() => handleTestBand('MID')}
            className="button button-band"
            disabled={!isMicActive || isTestingRef.current}
          >
            Kiểm tra MID (90Hz–2kHz)
          </button>
          <button
            onClick={() => handleTestBand('HI')}
            className="button button-band"
            disabled={!isMicActive || isTestingRef.current}
          >
            Kiểm tra HI (2kHz–16kHz)
          </button>
        </div>

        {/* Progress */}
        {pulseProgress && (
          <div className="progress-info">
            <div className="progress-text">
              Pulse {pulseProgress.current}/{pulseProgress.total}...
            </div>
            {currentPulseResult && (
              <div className="pulse-result-mini">
                {currentPulseResult.valid ? (
                  <>
                    <span className={`polarity-mini ${currentPulseResult.sign === '+' ? 'positive' : 'negative'}`}>
                      {currentPulseResult.sign}
                    </span>
                    <span>SNR: {currentPulseResult.snrDb.toFixed(1)}dB</span>
                  </>
                ) : (
                  <span className="invalid">—</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Báo cáo chi tiết - PRO Style */}
        {(reports.LOW || reports.MID || reports.HI) && (
          <div className={`reportCard ${isTestingRef.current ? 'pulseActive' : ''}`}>
            <h3 className="reportTitle">Báo cáo kết quả</h3>
            <table className="tablePro">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Polarity</th>
                  <th>Vote</th>
                  {uiMode === 'EXPERT' && (
                    <>
                      <th>Confidence</th>
                      <th>SNR</th>
                      <th>Level</th>
                    </>
                  )}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(['LOW', 'MID', 'HI'] as BandTest[]).map((band) => {
                  const report = reports[band];
                  if (!report) {
                    return (
                      <tr key={band} className="rowBAD">
                        <td>{band}</td>
                        <td colSpan={uiMode === 'EXPERT' ? 6 : 3} style={{ color: 'rgba(229,231,235,0.5)', fontStyle: 'italic' }}>
                          Chưa đo
                        </td>
                      </tr>
                    );
                  }
                  const rowCls =
                    report.status === 'TỐT' ? 'rowOK' : report.status === 'ĐẠT' ? 'rowWARN' : 'rowBAD';
                  const pillCls =
                    report.status === 'TỐT' ? 'pillOK' : report.status === 'ĐẠT' ? 'pillWARN' : 'pillBAD';
                  const badgeCls =
                    report.polarity === '+'
                      ? 'polarPlus'
                      : report.polarity === '-'
                        ? 'polarMinus'
                        : 'polarNA';
                  return (
                    <tr key={band} className={rowCls}>
                      <td>{band}</td>
                      <td>
                        <span className={`polarBadge ${badgeCls}`}>{report.polarity}</span>
                      </td>
                      <td>
                        +{report.votePlus}/-{report.voteMinus} ({report.validCount}/5)
                      </td>
                      {uiMode === 'EXPERT' && (
                        <>
                          <td>{report.confidenceAvg.toFixed(0)}%</td>
                          <td>{report.snrAvg.toFixed(1)} dB</td>
                          <td>
                            {report.rmsAvgDbfs > -Infinity
                              ? report.rmsAvgDbfs.toFixed(1)
                              : '—'}{' '}
                            dBFS
                          </td>
                        </>
                      )}
                      <td>
                        <span className={`statusPill ${pillCls}`}>{report.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recommendations - LUÔN hiển thị 3 dòng LOW/MID/HI */}
        <div className={`recommendBox ${isTestingRef.current ? 'pulseActive' : ''}`}>
          <div className="recommendRow">
            <b>LOW:</b>{' '}
            <span>{reports.LOW?.recommendation ?? 'Chưa đo.'}</span>
          </div>
          <div className="recommendRow">
            <b>MID:</b>{' '}
            <span>{reports.MID?.recommendation ?? 'Chưa đo.'}</span>
          </div>
          <div className="recommendRow">
            <b>HI:</b>{' '}
            <span>{reports.HI?.recommendation ?? 'Chưa đo.'}</span>
          </div>
        </div>

        {/* Log box - ẩn theo yêu cầu */}
        {/* {logs.length > 0 && (
          <div className="log-box">
            <div className="log-title">Log:</div>
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                {log}
              </div>
            ))}
          </div>
        )} */}
      </main>

      <footer className="footer">
        <div className="footer-text">
          Đứng 1–2m vẫn đo chính xác
        </div>
      </footer>

      {/* About Modal */}
      {showAbout && (
        <div
          className="about-modal-overlay"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="about-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="about-title">Jackie Han</h2>

            <p className="about-text">
              🎧 Professional Sound Systems & Event Installations
            </p>

            <p className="about-text" style={{ marginBottom: 12 }}>
              📱 Zalo / WhatsApp:
              <br />
              <a
                href="https://zalo.me/84888888267"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#38bdf8', fontWeight: 600 }}
              >
                Zalo: (+84) 888 888 267
              </a>
              <br />
              <a
                href="https://wa.me/84888888267"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#22c55e', fontWeight: 600 }}
              >
                WhatsApp: (+84) 888 888 267
              </a>
            </p>

            <p className="about-text" style={{ marginBottom: 16 }}>
              📘 Facebook:
              <br />
              <a
                href="https://www.facebook.com/JackieHan"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', fontWeight: 600 }}
              >
                Jackie Han
              </a>
            </p>

            <button
              onClick={() => setShowAbout(false)}
              className="about-close-button"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
