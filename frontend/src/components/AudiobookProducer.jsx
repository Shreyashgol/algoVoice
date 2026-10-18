import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  BookOpen, 
  Wand2, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileCode, 
  Sliders, 
  Globe, 
  Music,
  ArrowRight,
  Eye,
  Edit3
} from 'lucide-react';
import { previewDocument, generateFromScript, generateDocumentDirect } from '../services/api';

export default function AudiobookProducer({ languages, onAudioGenerated, onError }) {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [rawTextInput, setRawTextInput] = useState('');
  const [inputMode, setInputMode] = useState('pdf'); // 'pdf' | 'text'

  const [language, setLanguage] = useState('English');
  const [customVoice, setCustomVoice] = useState('');
  const [useCustomVoice, setUseCustomVoice] = useState(false);

  // Preview data
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editedScript, setEditedScript] = useState('');
  const [activeScriptTab, setActiveScriptTab] = useState('clean'); // 'clean' | 'raw'

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0); 
  // 0: idle, 1: Text Ingestion, 2: Groq Script Doctor, 3: Synthesizing Segments, 4: Master Concatenation, 5: Finished

  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selected) => {
    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      onError("Please select a valid PDF file.");
      return;
    }
    setFile(selected);
    setFileInfo({
      name: selected.name,
      size: (selected.size / 1024).toFixed(1) + ' KB',
      lastModified: new Date(selected.lastModified).toLocaleDateString()
    });
    setPreviewData(null);
  };

  const handleLoadSamplePdf = async () => {
    try {
      const res = await fetch('/sample_document.pdf');
      if (!res.ok) throw new Error("Could not find sample_document.pdf in root");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample_document.pdf", { type: "application/pdf" });
      processSelectedFile(sampleFile);
    } catch (e) {
      // Fallback sample text if fetch fails
      setInputMode('text');
      setRawTextInput(`Chapter 1: The Echo of the Cosmos

The journey into deep space began not with a thunderous roar of chemical rockets, but with the quiet hum of ion thrusters slicing through the velvet void. Dr. Elena Vance adjusted the holographic spectrograph as anomalies registered across the quadrant.

"Telemetry confirmed," murmured the automated flight computer. "We are approaching the gravitational boundary of Sector 4."

Every star in the observation deck shimmered like captured diamonds in liquid obsidian. What awaited them beyond this veil was unknown to human science.`);
    }
  };

  // Preview & Script Analysis step
  const handleAnalyzeAndPreview = async () => {
    if (inputMode === 'pdf' && !file) {
      onError("Please upload a PDF document first.");
      return;
    }
    if (inputMode === 'text' && !rawTextInput.trim()) {
      onError("Please provide document or manuscript text.");
      return;
    }

    setIsPreviewing(true);
    setGenerationStep(1);

    try {
      const res = await previewDocument({
        file: inputMode === 'pdf' ? file : null,
        rawText: inputMode === 'text' ? rawTextInput : null
      });

      setPreviewData(res);
      setEditedScript(res.clean_script);
      if (res.suggested_profile && res.suggested_profile.instruction && !customVoice) {
        setCustomVoice(res.suggested_profile.instruction);
      }
    } catch (err) {
      onError(err.message || "Failed to analyze document.");
    } finally {
      setIsPreviewing(false);
      setGenerationStep(0);
    }
  };

  // Master Audiobook Generation
  const handleGenerateAudiobook = async () => {
    const finalScript = editedScript.trim();
    if (!finalScript) {
      onError("No script available. Please analyze your document first.");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(2); // Analyzing script

    try {
      setGenerationStep(3); // Synthesizing Chunks

      const instructToUse = useCustomVoice ? customVoice : (previewData?.suggested_profile?.instruction || customVoice);
      const title = file ? file.name.replace('.pdf', '') : "Master Audiobook";

      const res = await generateFromScript({
        script: finalScript,
        instruct: instructToUse,
        language,
        title
      });

      setGenerationStep(4); // Master Concatenation
      await new Promise(r => setTimeout(r, 600)); // Smooth UX transition
      setGenerationStep(5); // Complete

      onAudioGenerated({
        ...res,
        title: title,
        voice_instruction: instructToUse,
        language
      });
    } catch (err) {
      onError(err.message || "Failed to generate audiobook.");
      setGenerationStep(0);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="audiobook-producer-container animate-fade">
      {/* Step Progress Tracker */}
      <div className="pipeline-steps-card glass-panel">
        <div className="steps-wrapper">
          <div className={`step-item ${file || rawTextInput ? 'active' : ''}`}>
            <div className="step-num">1</div>
            <div className="step-content">
              <span className="step-title">Upload Manuscript</span>
              <span className="step-subtitle">PDF Document or Text</span>
            </div>
          </div>
          <ArrowRight size={16} className="step-arrow" />

          <div className={`step-item ${previewData ? 'active' : ''}`}>
            <div className="step-num">2</div>
            <div className="step-content">
              <span className="step-title">Groq Script Doctor</span>
              <span className="step-subtitle">Artifact cleaning & narration</span>
            </div>
          </div>
          <ArrowRight size={16} className="step-arrow" />

          <div className={`step-item ${previewData ? 'active' : ''}`}>
            <div className="step-num">3</div>
            <div className="step-content">
              <span className="step-title">AI Voice Casting</span>
              <span className="step-subtitle">Single persona resolution</span>
            </div>
          </div>
          <ArrowRight size={16} className="step-arrow" />

          <div className={`step-item ${isGenerating || generationStep === 5 ? 'active highlight' : ''}`}>
            <div className="step-num">4</div>
            <div className="step-content">
              <span className="step-title">Master Stitching</span>
              <span className="step-subtitle">Multi-chunk Qwen3-TTS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="producer-layout">
        {/* Left Side: Document Ingestion & Config */}
        <div className="producer-left-pane">
          {/* Document Ingestion Box */}
          <div className="glass-panel studio-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="icon-badge accent-purple">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3>Document Manuscript</h3>
                  <p className="card-subtitle">Upload PDF book or paste long-form content</p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="toggle-pill-group">
                <button
                  type="button"
                  className={`toggle-pill ${inputMode === 'pdf' ? 'active' : ''}`}
                  onClick={() => setInputMode('pdf')}
                >
                  <FileText size={13} /> PDF File
                </button>
                <button
                  type="button"
                  className={`toggle-pill ${inputMode === 'text' ? 'active' : ''}`}
                  onClick={() => setInputMode('text')}
                >
                  <Edit3 size={13} /> Paste Text
                </button>
              </div>
            </div>

            {inputMode === 'pdf' ? (
              <div
                className={`dropzone-box ${file ? 'has-file' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div className="file-info-preview">
                    <div className="file-icon-wrap">
                      <FileText size={36} className="text-purple" />
                    </div>
                    <div className="file-meta">
                      <h4>{fileInfo?.name}</h4>
                      <p className="text-dim">Size: {fileInfo?.size} • Ready for Groq Script Doctor</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFileInfo(null);
                        setPreviewData(null);
                      }}
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-empty">
                    <div className="upload-icon-circle">
                      <Upload size={28} />
                    </div>
                    <h4>Drag and drop your PDF manuscript here</h4>
                    <p className="text-dim">Supports standard PDFs with text layers (books, papers, stories)</p>
                    <div className="dropzone-actions">
                      <button type="button" className="btn btn-secondary btn-sm">
                        Browse Files
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSamplePdf();
                        }}
                      >
                        ⚡ Load Sample PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="textarea-wrapper">
                <textarea
                  value={rawTextInput}
                  onChange={(e) => {
                    setRawTextInput(e.target.value);
                    setPreviewData(null);
                  }}
                  rows={8}
                  placeholder="Paste multi-paragraph manuscript text, novel chapter, or document here..."
                  className="main-script-textarea"
                />
                <div className="textarea-footer">
                  <span className="stat-pill">
                    {rawTextInput.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleLoadSamplePdf}
                  >
                    ⚡ Load Sample Text
                  </button>
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={handleAnalyzeAndPreview}
                disabled={isPreviewing || (inputMode === 'pdf' ? !file : !rawTextInput.trim())}
              >
                {isPreviewing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Extracting & Cleaning Narration via Groq...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={16} className="text-cyan" />
                    <span>Step 1: Analyze & Prepare Script</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice Direction & Language Card */}
          <div className="glass-panel studio-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="icon-badge accent-cyan">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3>Audiobook Voice Casting</h3>
                  <p className="card-subtitle">Unified narrator voice for all sequential chunks</p>
                </div>
              </div>

              <div className="toggle-check">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useCustomVoice}
                    onChange={(e) => setUseCustomVoice(e.target.checked)}
                  />
                  <span>Override AI Voice</span>
                </label>
              </div>
            </div>

            {/* Inferred vs Custom Display */}
            {!useCustomVoice && previewData?.suggested_profile ? (
              <div className="suggested-voice-card animate-fade">
                <div className="suggested-header">
                  <span className="badge badge-success">
                    <Sparkles size={12} /> Auto-Discovered Voice Persona
                  </span>
                  <span className="voice-persona-title">
                    {previewData.suggested_profile.voice_type}
                  </span>
                </div>
                <p className="inferred-instruction">
                  "{previewData.suggested_profile.instruction}"
                </p>
                <div className="persona-traits">
                  <span className="trait-pill">Tone: {previewData.suggested_profile.tone}</span>
                  <span className="trait-pill">Accent: {previewData.suggested_profile.accent}</span>
                  <span className="trait-pill">Pace: {previewData.suggested_profile.pace}</span>
                  <span className="trait-pill">Style: {previewData.suggested_profile.style}</span>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  {useCustomVoice ? 'Custom Voice Prompt' : 'Default Studio Voice'}
                </label>
                <textarea
                  value={customVoice}
                  onChange={(e) => setCustomVoice(e.target.value)}
                  placeholder="e.g. Deep authoritative Scottish male narrator, measured pace, dramatic and solemn."
                  rows={2}
                  className="voice-instruction-input"
                />
              </div>
            )}

            <div className="form-group mt-3">
              <label className="form-label">
                <Globe size={14} /> Narration Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                {(languages || ["English"]).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Side: Script Doctor & Chunks & Synthesis */}
        <div className="producer-right-pane">
          {previewData ? (
            <div className="glass-panel studio-card animate-fade">
              {/* Script Doctor Header */}
              <div className="card-header">
                <div className="card-title-group">
                  <div className="icon-badge accent-pink">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3>Audiobook Narration Master Script</h3>
                    <p className="card-subtitle">
                      Cleaned of page headers & footnotes • {previewData.word_count} words • ~{Math.round(previewData.estimated_duration_seconds / 60)} min {Math.round(previewData.estimated_duration_seconds % 60)} sec
                    </p>
                  </div>
                </div>

                <div className="script-stat-badges">
                  <span className="badge badge-info">{previewData.num_chunks} Sequential Chunks</span>
                  <span className="badge badge-primary">{previewData.word_count} Words</span>
                </div>
              </div>

              {/* Editable Narration Script */}
              <div className="script-editor-wrapper">
                <div className="editor-banner">
                  <Edit3 size={14} />
                  <span>You can edit or fine-tune this narration script before rendering audio:</span>
                </div>
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  rows={10}
                  className="script-editor-textarea"
                />
              </div>

              {/* Chunk Inspector Preview */}
              <div className="chunk-inspector">
                <div className="chunk-header">
                  <h4>
                    <Layers size={14} /> Audio Synthesis Chunks ({previewData.chunks.length})
                  </h4>
                  <span className="text-dim text-xs">Sentence-bounded with 0.3s pause stitching</span>
                </div>
                <div className="chunk-pills-list">
                  {previewData.chunks.map((chk, i) => (
                    <div key={i} className="chunk-card">
                      <span className="chunk-idx">Segment {i + 1}</span>
                      <p className="chunk-text">{chk}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Synthesis Action Card */}
              <div className="synthesis-action-card">
                {isGenerating ? (
                  <div className="generating-indicator">
                    <RefreshCw size={24} className="animate-spin text-purple" />
                    <div className="generating-meta">
                      <h4>
                        {generationStep === 3 && 'Synthesizing Audio Segments with Qwen3-TTS...'}
                        {generationStep === 4 && 'Stitching & Concatenating Master WAV...'}
                        {generationStep === 5 && 'Master Ready!'}
                      </h4>
                      <p className="text-dim">
                        Processing {previewData.num_chunks} chunks with unified voice persona...
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-generate-audiobook"
                    onClick={handleGenerateAudiobook}
                    disabled={isGenerating || !editedScript.trim()}
                  >
                    <Music size={18} />
                    <span>Synthesize Complete Master Audiobook</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel empty-preview-placeholder">
              <div className="placeholder-icon">
                <FileCode size={48} />
              </div>
              <h3>Script Doctor Standby</h3>
              <p className="text-dim">
                Upload a PDF document or paste manuscript text on the left, then click 
                <strong> "Step 1: Analyze & Prepare Script"</strong> to extract, clean, and preview your audiobook before synthesizing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
