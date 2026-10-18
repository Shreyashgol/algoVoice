import React, { useState } from 'react';
import { 
  FolderClock, 
  Play, 
  Download, 
  Share2, 
  Check, 
  RefreshCw, 
  BookOpen, 
  Mic, 
  Clock, 
  Radio
} from 'lucide-react';
import { fetchHistory } from '../services/api';

export default function AudioLibrary({ history, onSelectTrack, onRefreshHistory, onError }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'audiobook' | 'quick'
  const [copiedId, setCopiedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshHistory) {
        await onRefreshHistory();
      }
    } catch (err) {
      onError("Failed to refresh history.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyPrompt = (item) => {
    if (!item.voice_instruction) return;
    navigator.clipboard.writeText(item.voice_instruction);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item) => {
    const filename = `${item.title || 'algovoice_master'}.wav`.replace(/\s+/g, '_');
    if (item.audio_url) {
      const link = document.createElement('a');
      link.href = item.audio_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredItems = (history || []).filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="audio-library-container animate-fade">
      <div className="glass-panel studio-card">
        {/* Header Bar */}
        <div className="card-header">
          <div className="card-title-group">
            <div className="icon-badge accent-purple">
              <FolderClock size={18} />
            </div>
            <div>
              <h3>Master Audio Library</h3>
              <p className="card-subtitle">
                {history?.length || 0} saved audio tracks ready for playback and export
              </p>
            </div>
          </div>

          <div className="library-top-controls">
            {/* Filter Pills */}
            <div className="toggle-pill-group">
              <button
                type="button"
                className={`toggle-pill ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All Tracks
              </button>
              <button
                type="button"
                className={`toggle-pill ${filterType === 'audiobook' ? 'active' : ''}`}
                onClick={() => setFilterType('audiobook')}
              >
                <BookOpen size={13} /> Audiobooks
              </button>
              <button
                type="button"
                className={`toggle-pill ${filterType === 'quick' ? 'active' : ''}`}
                onClick={() => setFilterType('quick')}
              >
                <Mic size={13} /> Quick TTS
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* List of Tracks */}
        {filteredItems.length === 0 ? (
          <div className="empty-library-view">
            <Radio size={40} className="text-dim mb-2" />
            <h4>No tracks in audio library yet</h4>
            <p className="text-dim">
              Generate speech in the Voice Studio or Audiobook Producer to populate your library.
            </p>
          </div>
        ) : (
          <div className="history-track-list">
            {filteredItems.map((track) => (
              <div key={track.id} className="history-track-card">
                <div className="track-left-info">
                  <button
                    type="button"
                    className="track-play-btn"
                    onClick={() => onSelectTrack(track)}
                    title="Load track in Master Player"
                  >
                    <Play size={16} />
                  </button>

                  <div className="track-details">
                    <div className="track-title-row">
                      <h4>{track.title}</h4>
                      <span className={`badge ${track.type === 'audiobook' ? 'badge-primary' : 'badge-info'}`}>
                        {track.type === 'audiobook' ? 'Audiobook' : 'Quick Voice'}
                      </span>
                      {track.language && (
                        <span className="badge badge-warning">{track.language}</span>
                      )}
                    </div>

                    <p className="track-instruction-snippet">
                      "{track.voice_instruction}"
                    </p>

                    <div className="track-specs">
                      <span><Clock size={12} /> {track.duration_seconds}s</span>
                      <span>•</span>
                      <span>{track.sample_rate?.toLocaleString()} Hz</span>
                      {track.file_size_bytes && (
                        <>
                          <span>•</span>
                          <span>{(track.file_size_bytes / 1024).toFixed(1)} KB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Track Right Actions */}
                <div className="track-right-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleCopyPrompt(track)}
                    title="Copy voice prompt"
                  >
                    {copiedId === track.id ? <Check size={16} className="text-emerald" /> : <Share2 size={16} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownload(track)}
                    title="Download master WAV"
                  >
                    <Download size={14} />
                    <span>WAV</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onSelectTrack(track)}
                  >
                    <Play size={14} />
                    <span>Monitor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
