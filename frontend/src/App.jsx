import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AudioVisualizerPlayer from './components/AudioVisualizerPlayer';
import VoiceStudio from './components/VoiceStudio';
import AudiobookProducer from './components/AudiobookProducer';
import AudioLibrary from './components/AudioLibrary';
import DiagnosticsModal from './components/DiagnosticsModal';
import { fetchHealth, fetchPresets, fetchHistory } from './services/api';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'audiobook' | 'library'
  const [healthData, setHealthData] = useState(null);
  const [presets, setPresets] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);

  const [notification, setNotification] = useState(null); // { type: 'error' | 'success', message: '' }
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const health = await fetchHealth().catch(() => null);
      if (health) setHealthData(health);

      const presetsData = await fetchPresets().catch(() => ({ presets: [] }));
      setPresets(presetsData.presets || []);

      const histData = await fetchHistory().catch(() => ({ history: [] }));
      setHistory(histData.history || []);
      
      // If there are existing tracks in history, load the most recent one into the player
      if (histData.history && histData.history.length > 0) {
        setCurrentTrack(histData.history[0]);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  const handleAudioGenerated = async (newTrack) => {
    setCurrentTrack(newTrack);
    setNotification({
      type: 'success',
      message: `Audio synthesized successfully! (${newTrack.duration_seconds}s)`
    });

    // Refresh history
    try {
      const histData = await fetchHistory();
      setHistory(histData.history || []);
    } catch (e) {
      console.warn("Failed to refresh history:", e);
    }
  };

  const handleError = (message) => {
    setNotification({ type: 'error', message });
  };

  return (
    <div className="app-layout">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={healthData}
        onOpenDiagnostics={() => setShowDiagnostics(true)}
        historyCount={history.length}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div className={`notification-toast ${notification.type} animate-fade`}>
          <div className="toast-content">
            {notification.type === 'error' ? (
              <AlertCircle size={18} className="text-rose" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button" 
            className="toast-close"
            onClick={() => setNotification(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Studio Viewport */}
      <main className="studio-main-viewport">
        {/* Master Visualizer & Player Section (Persistent Top Monitor) */}
        <section className="master-player-section">
          <AudioVisualizerPlayer currentTrack={currentTrack} />
        </section>

        {/* Tab Views */}
        <section className="tab-content-section">
          {activeTab === 'studio' && (
            <VoiceStudio
              presets={presets}
              languages={healthData?.supported_languages || ["English"]}
              onAudioGenerated={handleAudioGenerated}
              onError={handleError}
            />
          )}

          {activeTab === 'audiobook' && (
            <AudiobookProducer
              languages={healthData?.supported_languages || ["English"]}
              onAudioGenerated={handleAudioGenerated}
              onError={handleError}
            />
          )}

          {activeTab === 'library' && (
            <AudioLibrary
              history={history}
              onSelectTrack={(track) => setCurrentTrack(track)}
              onRefreshHistory={async () => {
                const hist = await fetchHistory();
                setHistory(hist.history || []);
              }}
              onError={handleError}
            />
          )}
        </section>
      </main>

      {/* Engine Diagnostics Modal */}
      {showDiagnostics && (
        <DiagnosticsModal
          healthData={healthData}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </div>
  );
}
