import React from 'react';
import { 
  X, 
  Cpu, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Database, 
  Zap,
  Code
} from 'lucide-react';

export default function DiagnosticsModal({ healthData, onClose }) {
  if (!healthData) return null;

  const apiEndpoints = [
    { method: "GET", path: "/", desc: "Core health check & supported languages" },
    { method: "POST", path: "/generate", desc: "Text-to-speech generation (Base64 WAV)" },
    { method: "POST", path: "/generate-document", desc: "PDF document to multi-chunk audiobook" },
    { method: "GET", path: "/api/health", desc: "Full runtime & model diagnostics" },
    { method: "GET", path: "/api/presets", desc: "Curated voice design preset library" },
    { method: "POST", path: "/api/analyze-voice", desc: "Groq LLM voice director persona analysis" },
    { method: "POST", path: "/api/document/preview", desc: "PDF text extraction, cleaning & chunk preview" },
    { method: "POST", path: "/api/script/generate", desc: "Direct multi-chunk audiobook rendering" },
    { method: "GET", path: "/api/history", desc: "Audio generation history and metadata" },
    { method: "GET", path: "/api/audio/{id}", desc: "Direct binary WAV audio streaming & download" }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel animate-fade" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="icon-badge accent-purple">
              <Server size={18} />
            </div>
            <div>
              <h3>AlgoVoice Engine Diagnostics</h3>
              <p className="card-subtitle">Production Backend Runtime & Model Status</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          {/* Status Metric Grid */}
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Status</span>
              <span className="metric-val text-emerald">
                <CheckCircle2 size={16} /> Online
              </span>
            </div>

            <div className="metric-box">
              <span className="metric-label">TTS Model</span>
              <span className="metric-val">{healthData.model}</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Hardware Acceleration</span>
              <span className="metric-val">{healthData.gpu || "CPU Synthesizer"}</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Groq Script Doctor</span>
              <span className="metric-val text-cyan">
                {healthData.groq_connected ? 'Connected' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Groq Models */}
          {healthData.groq_models && (
            <div className="diag-section">
              <h4 className="diag-section-title">
                <Zap size={15} /> Groq LLM Waterfall Models
              </h4>
              <div className="model-pills">
                {healthData.groq_models.map((m, i) => (
                  <span key={i} className="model-pill">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Supported Languages */}
          {healthData.supported_languages && (
            <div className="diag-section">
              <h4 className="diag-section-title">
                <Globe size={15} /> Supported Synthesizer Languages ({healthData.supported_languages.length})
              </h4>
              <div className="model-pills">
                {healthData.supported_languages.map((l, i) => (
                  <span key={i} className="lang-pill">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Available API Endpoints */}
          <div className="diag-section">
            <h4 className="diag-section-title">
              <Code size={15} /> Production API Endpoints
            </h4>
            <div className="endpoints-table-wrap">
              <table className="endpoints-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {apiEndpoints.map((ep, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`method-badge ${ep.method.toLowerCase()}`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="code-font">{ep.path}</td>
                      <td className="desc-cell">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span className="text-dim text-xs">
            AlgoVoice Studio API v2.0 • Fast, Deterministic, Cross-Platform
          </span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
