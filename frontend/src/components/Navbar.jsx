import React from 'react';
import { 
  Radio, 
  Mic, 
  BookOpen, 
  FolderClock, 
  Activity, 
  Sparkles,
  Server
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, healthData, onOpenDiagnostics, historyCount }) {
  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div className="brand-group">
          <div className="brand-logo-icon">
            <Radio size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">Algo<span className="gradient-accent">Voice</span></span>
            <span className="brand-badge">STUDIO</span>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Mic size={16} />
            <span>Voice Studio</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'audiobook' ? 'active' : ''}`}
            onClick={() => setActiveTab('audiobook')}
          >
            <BookOpen size={16} />
            <span>Audiobook Producer</span>
            <span className="tab-pill">NEW</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <FolderClock size={16} />
            <span>Audio Library</span>
            {historyCount > 0 && (
              <span className="count-badge">{historyCount}</span>
            )}
          </button>
        </nav>

        {/* Right Status Pill */}
        <div className="navbar-right">
          <button
            type="button"
            className="system-health-pill"
            onClick={onOpenDiagnostics}
            title="Click to view full Engine diagnostics"
          >
            <span className="pulse-dot online" />
            <span className="health-label">
              {healthData ? (
                <>Engine: <strong>{healthData.tts_engine?.includes('GPU') ? 'GPU Active' : 'PCM Synthesizer'}</strong></>
              ) : (
                'Connecting...'
              )}
            </span>
            <Activity size={14} className="health-icon" />
          </button>
        </div>
      </div>
    </header>
  );
}
