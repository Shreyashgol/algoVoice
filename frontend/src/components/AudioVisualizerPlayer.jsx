import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Download, 
  Sparkles, 
  Repeat, 
  Music,
  Share2,
  Check
} from 'lucide-react';

export default function AudioVisualizerPlayer({ currentTrack, onDownload }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  // Initialize or update audio when track changes
  useEffect(() => {
    if (!currentTrack) return;
    
    setIsPlaying(false);
    setCurrentTime(0);

    const audio = audioRef.current;
    if (audio) {
      // Determine audio source: direct URL or base64 data
      if (currentTrack.audio_url) {
        audio.src = currentTrack.audio_url;
      } else if (currentTrack.audio_b64) {
        audio.src = `data:audio/wav;base64,${currentTrack.audio_b64}`;
      }
      audio.load();
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : volume;

      // Auto-play on fresh generation
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false)); // browser autoplay policy catch
      }
    }
  }, [currentTrack]);

  // Set up Web Audio API Analyser for real-time visualizer
  const setupAudioContext = () => {
    if (audioContextRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      if (audioRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
      }

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn("Web Audio API not directly permitted without user interaction:", e);
    }
  };

  // Canvas visualizer rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let dataArray;
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      const numBars = 48;
      const barWidth = (width / numBars) * 0.7;
      const gap = (width / numBars) * 0.3;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 8;
        if (dataArray && isPlaying) {
          const val = dataArray[i % dataArray.length];
          barHeight = Math.max(6, (val / 255) * (height * 0.85));
        } else {
          // Ambient static waveform pattern
          const progress = duration > 0 ? currentTime / duration : 0;
          const barProgress = i / numBars;
          const isPassed = barProgress <= progress;
          const waveBase = Math.sin(i * 0.3) * 0.35 + 0.5;
          barHeight = Math.max(6, waveBase * (height * 0.45));
        }

        const x = i * (barWidth + gap) + gap / 2;
        const y = (height - barHeight) / 2;

        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const isPast = (i / numBars) <= progressRatio;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPast) {
          grad.addColorStop(0, '#a855f7');
          grad.addColorStop(0.5, '#ec4899');
          grad.addColorStop(1, '#06b6d4');
        } else {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    setupAudioContext();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Playback error:", err));
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    if (audioRef.current && duration > 0) {
      const newTime = newProgress * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipTime = (seconds) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleDownload = () => {
    if (!currentTrack) return;
    if (onDownload) {
      onDownload(currentTrack);
      return;
    }
    const filename = `${currentTrack.title || 'algovoice_master'}.wav`.replace(/\s+/g, '_');
    if (currentTrack.audio_url) {
      const link = document.createElement('a');
      link.href = currentTrack.audio_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (currentTrack.audio_b64) {
      const link = document.createElement('a');
      link.href = `data:audio/wav;base64,${currentTrack.audio_b64}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyPrompt = () => {
    if (!currentTrack?.voice_instruction) return;
    navigator.clipboard.writeText(currentTrack.voice_instruction);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentTrack) {
    return (
      <div className="glass-panel player-empty-state">
        <div className="player-empty-icon">
          <Music size={32} />
        </div>
        <div>
          <h4>Studio Master Player Standby</h4>
          <p className="text-dim">Generate speech or an audiobook to load audio into the master monitor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel master-player-panel animate-fade">
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || currentTrack.duration_seconds || 0)}
        onEnded={() => {
          if (!isLooping) setIsPlaying(false);
        }}
        loop={isLooping}
      />

      {/* Top Track Info Row */}
      <div className="player-header">
        <div className="player-meta">
          <div className="track-status-pill">
            <span className="pulse-dot online" />
            <span>Master Output</span>
          </div>
          <h3 className="track-title">{currentTrack.title || 'Generated Audio Master'}</h3>
          <div className="track-badges">
            {currentTrack.language && (
              <span className="badge badge-primary">{currentTrack.language}</span>
            )}
            {currentTrack.sample_rate && (
              <span className="badge badge-info">{currentTrack.sample_rate.toLocaleString()} Hz</span>
            )}
            {currentTrack.num_chunks && (
              <span className="badge badge-success">{currentTrack.num_chunks} Chunks Stitched</span>
            )}
            <span className="badge badge-warning">{formatTime(duration || currentTrack.duration_seconds)}</span>
          </div>
        </div>

        <div className="player-top-actions">
          {currentTrack.voice_instruction && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleCopyPrompt}
              title="Copy voice prompt"
            >
              {copied ? <Check size={14} className="text-emerald" /> : <Share2 size={14} />}
              <span>{copied ? 'Copied Prompt' : 'Copy Voice Prompt'}</span>
            </button>
          )}

          <button 
            className="btn btn-primary btn-sm"
            onClick={handleDownload}
            title="Download high-fidelity WAV"
          >
            <Download size={14} />
            <span>Download Master WAV</span>
          </button>
        </div>
      </div>

      {/* Voice Prompt Quotation */}
      {currentTrack.voice_instruction && (
        <div className="voice-prompt-quote">
          <Sparkles size={14} className="sparkle-icon" />
          <span className="quote-text">"{currentTrack.voice_instruction}"</span>
        </div>
      )}

      {/* Visualizer Canvas & Scrubber */}
      <div className="visualizer-container" onClick={handleSeek}>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={64} 
          className="waveform-canvas"
        />
        <div 
          className="seek-scrubber"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        >
          <div className="seek-head" />
        </div>
      </div>

      {/* Player Time Row */}
      <div className="time-display-row">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration || currentTrack.duration_seconds)}</span>
      </div>

      {/* Control Console */}
      <div className="player-controls">
        <div className="controls-left">
          {/* Rate Selector */}
          <div className="rate-selector">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                className={`rate-btn ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => handleRateChange(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Loop button */}
          <button 
            className={`icon-btn ${isLooping ? 'active' : ''}`}
            onClick={() => setIsLooping(!isLooping)}
            title="Toggle Loop"
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* Center Main Playback Buttons */}
        <div className="controls-center">
          <button 
            className="icon-btn-round" 
            onClick={() => skipTime(-10)} 
            title="Skip Back 10s"
          >
            <RotateCcw size={18} />
          </button>

          <button 
            className="play-btn-master" 
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '2px' }} />}
          </button>

          <button 
            className="icon-btn-round" 
            onClick={() => skipTime(10)} 
            title="Skip Forward 10s"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Volume & Right Controls */}
        <div className="controls-right">
          <button className="icon-btn" onClick={toggleMute} title="Mute/Unmute">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
}
