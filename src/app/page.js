// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function SensorDataCollector() {
  const [isRecording, setIsRecording] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('idle');
  const [currentAcceleration, setCurrentAcceleration] = useState(null);
  const [currentRotation, setCurrentRotation] = useState(null);
  
  const dataCollectionRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // برچسب‌های پیش‌فرض
  const defaultLabels = [
    "مسافر در قطار و در حال حرکت در تونل",
    "مسافر در قطار ایستاده و قطار در ایستگاه هستش",
    "مسافر ایستاده در ایستگاه و قطار در حال ورود به ایستگاه",
    "مسافر در حال راه رفتن در ایستگاه که قطار نیست در ایستگاه و در حال ورود هم نیست",
    "مسافر در ایستگاه و قطار در ریل مخالف در حال ورود به ایستگاه",
    "مسافر در قطار و قطار در حال ترمز",
    "مسافر در قطار و قطار در حال شتاب گرفتن",
    "مسافر در حال سوار شدن به قطار",
    "مسافر در حال پیاده شدن از قطار",
    "مسافر در حال انتظار در ایستگاه"
  ];

  // درخواست دسترسی به سنسورها
  const requestSensorPermission = async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        setPermissionStatus(permission);
        return permission === 'granted';
      }
      return true; // در مرورگرهایی که نیاز به مجوز ندارند
    } catch (error) {
      console.error('خطا در دریافت مجوز سنسور:', error);
      return false;
    }
  };

  // شروع جمع‌آوری داده
  const startRecording = async () => {
    const hasPermission = await requestSensorPermission();
    if (!hasPermission) {
      alert('دسترسی به سنسورها لازم است');
      return;
    }

    setIsRecording(true);
    dataCollectionRef.current = [];
    
    // جمع‌آوری داده هر 100 میلی‌ثانیه
    recordingIntervalRef.current = setInterval(() => {
      const timestamp = Date.now();
      const dataPoint = {
        timestamp,
        acceleration: { ...currentAcceleration },
        rotation: { ...currentRotation },
        label: selectedLabel || customLabel
      };
      
      dataCollectionRef.current.push(dataPoint);
    }, 100);
  };

  // توقف جمع‌آوری داده
  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    // ذخیره داده‌های جمع‌آوری شده
    setSensorData(prev => [...prev, ...dataCollectionRef.current]);
    dataCollectionRef.current = [];
  };

  // گوش دادن به داده‌های شتاب‌سنج
  useEffect(() => {
    const handleDeviceMotion = (event) => {
      const { acceleration, accelerationIncludingGravity, rotationRate } = event;
      
      setCurrentAcceleration({
        x: acceleration?.x || 0,
        y: acceleration?.y || 0,
        z: acceleration?.z || 0,
        xIncludingGravity: accelerationIncludingGravity?.x || 0,
        yIncludingGravity: accelerationIncludingGravity?.y || 0,
        zIncludingGravity: accelerationIncludingGravity?.z || 0
      });
      
      setCurrentRotation({
        alpha: rotationRate?.alpha || 0,
        beta: rotationRate?.beta || 0,
        gamma: rotationRate?.gamma || 0
      });
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, []);

  // دانلود داده‌ها به صورت JSON
  const downloadData = () => {
    if (sensorData.length === 0) {
      alert('داده‌ای برای دانلود وجود ندارد');
      return;
    }
    
    const dataStr = JSON.stringify(sensorData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `sensor-data-${Date.now()}.json`;
    link.click();
  };

  // پاک کردن تمام داده‌ها
  const clearData = () => {
    if (confirm('آیا از پاک کردن تمام داده‌ها مطمئن هستید؟')) {
      setSensorData([]);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>سیستم جمع‌آوری داده سنسور برای تشخیص حرکت قطار</title>
        <meta name="description" content="جمع‌آوری داده‌های سنسور برای آموزش مدل هوش مصنوعی" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="main">
        <h1 className="title">سیستم جمع‌آوری داده سنسور</h1>
        
        <div className="status-section">
          <div className={`status-indicator ${isRecording ? 'recording' : 'idle'}`}>
            {isRecording ? 'در حال ضبط' : 'آماده'}
          </div>
          
          <div className="sensor-readings">
            {currentAcceleration && (
              <div className="sensor-data">
                <h3>داده‌های لحظه‌ای:</h3>
                <p>شتاب X: {currentAcceleration.x?.toFixed(4)}</p>
                <p>شتاب Y: {currentAcceleration.y?.toFixed(4)}</p>
                <p>شتاب Z: {currentAcceleration.z?.toFixed(4)}</p>
                <p>چرخش Alpha: {currentRotation?.alpha?.toFixed(4)}</p>
                <p>چرخش Beta: {currentRotation?.beta?.toFixed(4)}</p>
                <p>چرخش Gamma: {currentRotation?.gamma?.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="control-section">
          <div className="label-selection">
            <h3>انتخاب وضعیت:</h3>
            
            <div className="default-labels">
              {defaultLabels.map((label, index) => (
                <button
                  key={index}
                  className={`label-btn ${selectedLabel === label ? 'selected' : ''}`}
                  onClick={() => setSelectedLabel(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <div className="custom-label">
              <h4>وضعیت سفارشی:</h4>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="وضعیت جدید را وارد کنید..."
              />
              <button 
                onClick={() => {
                  setSelectedLabel(customLabel);
                  setCustomLabel('');
                }}
              >
                استفاده از وضعیت سفارشی
              </button>
            </div>
            
            <div className="current-label">
              <strong>وضعیت انتخاب شده:</strong> {selectedLabel || 'هیچ‌کدام'}
            </div>
          </div>
          
          <div className="recording-controls">
            {!isRecording ? (
              <button 
                className="start-btn"
                onClick={startRecording}
                disabled={!selectedLabel}
              >
                شروع ضبط
              </button>
            ) : (
              <button 
                className="stop-btn"
                onClick={stopRecording}
              >
                توقف ضبط
              </button>
            )}
          </div>
        </div>
        
        <div className="data-section">
          <div className="data-header">
            <h3>داده‌های جمع‌آوری شده: {sensorData.length} نقطه داده</h3>
            <div className="data-actions">
              <button 
                className="download-btn"
                onClick={downloadData}
                disabled={sensorData.length === 0}
              >
                دانلود داده‌ها
              </button>
              <button 
                className="clear-btn"
                onClick={clearData}
                disabled={sensorData.length === 0}
              >
                پاک کردن همه
              </button>
            </div>
          </div>
          
          <div className="data-preview">
            {sensorData.slice(-5).map((data, index) => (
              <div key={index} className="data-point">
                <p>زمان: {new Date(data.timestamp).toLocaleTimeString('fa-IR')}</p>
                <p>وضعیت: {data.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 1rem;
          direction: rtl;
          font-family: 'Tahoma', 'Arial', sans-serif;
        }
        
        .main {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 0;
        }
        
        .title {
          text-align: center;
          margin-bottom: 2rem;
          color: #2c3e50;
        }
        
        .status-section {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        
        .status-indicator {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        .status-indicator.idle {
          background: #e9ecef;
          color: #6c757d;
        }
        
        .status-indicator.recording {
          background: #d4edda;
          color: #155724;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .sensor-data {
          font-family: monospace;
          background: white;
          padding: 1rem;
          border-radius: 4px;
        }
        
        .control-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .control-section {
            grid-template-columns: 1fr;
          }
        }
        
        .label-selection {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
        }
        
        .default-labels {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .label-btn {
          padding: 0.5rem;
          border: 1px solid #dee2e6;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          text-align: right;
          transition: all 0.2s;
        }
        
        .label-btn:hover {
          background: #e9ecef;
        }
        
        .label-btn.selected {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .custom-label {
          margin-bottom: 1rem;
        }
        
        .custom-label input {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }
        
        .custom-label button {
          width: 100%;
          padding: 0.5rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .current-label {
          padding: 0.5rem;
          background: #fff3cd;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
        }
        
        .recording-controls {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .start-btn, .stop-btn {
          padding: 1rem 2rem;
          font-size: 1.2rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .start-btn {
          background: #28a745;
          color: white;
        }
        
        .start-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .stop-btn {
          background: #dc3545;
          color: white;
        }
        
        .data-section {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
        }
        
        .data-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .data-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .download-btn, .clear-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .download-btn {
          background: #17a2b8;
          color: white;
        }
        
        .download-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .clear-btn {
          background: #dc3545;
          color: white;
        }
        
        .clear-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .data-preview {
          background: white;
          padding: 1rem;
          border-radius: 4px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .data-point {
          padding: 0.5rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .data-point:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
