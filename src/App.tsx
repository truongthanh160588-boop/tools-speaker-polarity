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
      </header>

      <main className="main">
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

        {/* Báo cáo chi tiết - hiển thị khi có ít nhất 1 band đã đo */}
        {(reports.LOW || reports.MID || reports.HI) && (
          <div className="reports-section">
            <h3 className="reports-title">Báo cáo kết quả</h3>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>Polarity</th>
                  <th>Vote</th>
                  <th>Confidence</th>
                  <th>SNR</th>
                  <th>Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(['LOW', 'MID', 'HI'] as BandTest[]).map((band) => {
                  const report = reports[band];
                  if (!report) {
                    return (
                      <tr key={band}>
                        <td>{band}</td>
                        <td colSpan={6} style={{ color: '#888', fontStyle: 'italic' }}>
                          Chưa đo
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={band}>
                      <td>{band}</td>
                      <td>
                        <span
                          className={`polarity-display-inline ${
                            report.polarity === '+'
                              ? 'positive'
                              : report.polarity === '-'
                                ? 'negative'
                                : 'unknown'
                          }`}
                        >
                          {report.polarity}
                        </span>
                      </td>
                      <td>
                        +{report.votePlus}/-{report.voteMinus} ({report.validCount}/5)
                      </td>
                      <td>{report.confidenceAvg.toFixed(0)}%</td>
                      <td>{report.snrAvg.toFixed(1)} dB</td>
                      <td>
                        {report.rmsAvgDbfs > -Infinity
                          ? report.rmsAvgDbfs.toFixed(1)
                          : '—'}{' '}
                        dBFS
                      </td>
                      <td
                        className={
                          report.status === 'TỐT'
                            ? 'status-good'
                            : report.status === 'ĐẠT'
                              ? 'status-ok'
                              : 'status-fail'
                        }
                      >
                        {report.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recommendations - LUÔN hiển thị 3 dòng LOW/MID/HI */}
        <div className="recommendBox">
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
    </div>
  );
}

export default App;
