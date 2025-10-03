"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [locationStatus, setLocationStatus] = useState(
    "در حال تشخیص موقعیت...",
  );
  const [error, setError] = useState("");
  const dataCollectionRef = useRef([]);

  // تشخیص وضعیت تونل مترو
  const detectMetroTunnelStatus = (data) => {
    if (data.length < 5) return "داده ناکافی برای تشخیص";

    const recentData = data.slice(-20);

    // محاسبه میانگین شتاب
    const avgAcceleration =
      recentData.reduce((sum, item) => {
        if (item.type === "motion" && item.acceleration) {
          return (
            sum +
            (Math.abs(item.acceleration.x) +
              Math.abs(item.acceleration.y) +
              Math.abs(item.acceleration.z)) /
              3
          );
        }
        return sum;
      }, 0) / recentData.length;

    // محاسبه تغییرات زاویه
    const orientationChanges = recentData.filter(
      (item) => item.type === "orientation",
    ).length;

    // منطق ساده برای تشخیص تونل مترو
    if (avgAcceleration > 0.3 && orientationChanges > 5) {
      return "در تونل مترو";
    } else if (avgAcceleration < 0.1 && orientationChanges < 3) {
      return "ایستاده یا ثابت";
    } else {
      return "در حال حرکت (خارج از تونل)";
    }
  };

  useEffect(() => {
    if (sensorData.length > 4) {
      setLocationStatus(detectMetroTunnelStatus(sensorData));
    }
  }, [sensorData]);

  const requestSensorPermission = async () => {
    try {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") {
          setError("دسترسی به سنسورها رد شد");
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("خطا در درخواست مجوز:", error);
      setError("خطا در دسترسی به سنسورها");
      return false;
    }
  };

  const handleMotion = (event) => {
    const newData = {
      timestamp: new Date().toISOString(),
      type: "motion",
      acceleration: {
        x: event.acceleration?.x || 0,
        y: event.acceleration?.y || 0,
        z: event.acceleration?.z || 0,
      },
      accelerationIncludingGravity: {
        x: event.accelerationIncludingGravity?.x || 0,
        y: event.accelerationIncludingGravity?.y || 0,
        z: event.accelerationIncludingGravity?.z || 0,
      },
      rotationRate: {
        alpha: event.rotationRate?.alpha || 0,
        beta: event.rotationRate?.beta || 0,
        gamma: event.rotationRate?.gamma || 0,
      },
      interval: event.interval || 0,
    };

    dataCollectionRef.current.push(newData);
    setSensorData((prev) => [...prev.slice(-1000), newData]); // نگه داشتن فقط 1000 داده آخر
  };

  const handleOrientation = (event) => {
    const newData = {
      timestamp: new Date().toISOString(),
      type: "orientation",
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0,
      absolute: event.absolute || false,
    };

    dataCollectionRef.current.push(newData);
    setSensorData((prev) => [...prev.slice(-1000), newData]);
  };

  const startRecording = async () => {
    try {
      setError("");

      const hasPermission = await requestSensorPermission();
      if (!hasPermission) return;

      // شروع جمع‌آوری داده‌ها
      if (window.DeviceMotionEvent) {
        window.addEventListener("devicemotion", handleMotion);
      }

      if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", handleOrientation);
      }

      // درخواست به API
      const response = await fetch("/api/start-recording", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startTime: new Date().toISOString() }),
      });

      if (response.ok) {
        setIsRecording(true);
        dataCollectionRef.current = [];
        setSensorData([]);
      } else {
        setError("خطا در شروع ضبط");
      }
    } catch (error) {
      console.error("خطا در شروع ضبط:", error);
      setError("خطا در شروع ضبط داده‌ها");
    }
  };

  const stopRecording = async () => {
    try {
      // توقف جمع‌آوری داده‌ها
      window.removeEventListener("devicemotion", handleMotion);
      window.removeEventListener("deviceorientation", handleOrientation);

      // درخواست به API
      const response = await fetch("/api/stop-recording", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          dataCount: dataCollectionRef.current.length,
        }),
      });

      if (response.ok) {
        setIsRecording(false);
      } else {
        setError("خطا در توقف ضبط");
      }
    } catch (error) {
      console.error("خطا در توقف ضبط:", error);
      setError("خطا در توقف ضبط داده‌ها");
    }
  };

  const downloadData = () => {
    if (dataCollectionRef.current.length === 0) {
      setError("داده‌ای برای دانلود وجود ندارد");
      return;
    }

    const dataToExport = {
      metadata: {
        exportTime: new Date().toISOString(),
        totalRecords: dataCollectionRef.current.length,
        recordingDuration:
          dataCollectionRef.current.length > 0
            ? new Date(
                dataCollectionRef.current[
                  dataCollectionRef.current.length - 1
                ].timestamp,
              ) - new Date(dataCollectionRef.current[0].timestamp)
            : 0,
      },
      sensorData: dataCollectionRef.current,
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sensor-data-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">سیستم جمع‌آوری داده‌های سنسور مترو</h1>
        <p className="subtitle">تحلیل وضعیت کاربران در تونل مترو</p>
      </header>

      <main className="main">
        <section className="status-section">
          <div className="status-card">
            <h2 className="status-title">وضعیت فعلی</h2>
            <div
              className={`status-indicator ${locationStatus.includes("تونل") ? "in-tunnel" : "outside-tunnel"}`}
            >
              {locationStatus}
            </div>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">تعداد داده‌ها:</span>
                <span className="stat-value">{sensorData.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">وضعیت ضبط:</span>
                <span
                  className={`stat-value ${isRecording ? "recording" : "stopped"}`}
                >
                  {isRecording ? "در حال ضبط" : "متوقف شده"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}

        <section className="controls-section">
          <div className="controls">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="btn btn-start"
            >
              🎯 شروع ضبط سنسورها
            </button>

            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="btn btn-stop"
            >
              ⏹️ توقف ضبط
            </button>

            <button
              onClick={downloadData}
              disabled={sensorData.length === 0}
              className="btn btn-download"
            >
              📥 دانلود داده‌ها (JSON)
            </button>
          </div>
        </section>

        {sensorData.length > 0 && (
          <section className="data-section">
            <h3 className="section-title">پیش‌نمایش داده‌ها</h3>
            <div className="data-preview">
              <div className="data-info">
                <span>
                  نمایش آخرین ۵ داده از {sensorData.length} داده جمع‌آوری شده
                </span>
              </div>
              <pre className="data-json">
                {JSON.stringify(sensorData.slice(-5), null, 2)}
              </pre>
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          color: white;
        }

        .title {
          font-size: 2.5rem;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .main {
          max-width: 800px;
          margin: 0 auto;
        }

        .status-section {
          margin-bottom: 30px;
        }

        .status-card {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .status-title {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 20px;
        }

        .status-indicator {
          font-size: 1.8rem;
          font-weight: bold;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          transition: all 0.3s ease;
        }

        .status-indicator.in-tunnel {
          background: #ff6b6b;
          color: white;
        }

        .status-indicator.outside-tunnel {
          background: #51cf66;
          color: white;
        }

        .stats {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 15px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 5px;
        }

        .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
        }

        .stat-value.recording {
          color: #e74c3c;
        }

        .stat-value.stopped {
          color: #27ae60;
        }

        .error-message {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: bold;
        }

        .controls-section {
          margin-bottom: 30px;
        }

        .controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .btn {
          padding: 15px 25px;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 250px;
          text-align: center;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .btn-start {
          background: #27ae60;
          color: white;
        }

        .btn-stop {
          background: #e74c3c;
          color: white;
        }

        .btn-download {
          background: #3498db;
          color: white;
        }

        .data-section {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 15px;
          text-align: center;
        }

        .data-preview {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #e9ecef;
        }

        .data-info {
          text-align: center;
          color: #666;
          margin-bottom: 15px;
          font-size: 0.9rem;
        }

        .data-json {
          background: #2d3748;
          color: #e2e8f0;
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.85rem;
          max-height: 300px;
          overflow-y: auto;
        }

        @media (min-width: 768px) {
          .controls {
            flex-direction: row;
            justify-content: center;
          }

          .btn {
            width: 200px;
          }

          .stats {
            justify-content: center;
            gap: 40px;
          }
        }
      `}</style>
    </div>
  );
}
