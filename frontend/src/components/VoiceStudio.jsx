import React, { useState } from 'react';
import { 
  Mic, 
  Sparkles, 
  Wand2, 
  Layers, 
  Globe, 
  Clock, 
  Type, 
  Check, 
  Volume2, 
  Sliders, 
  RefreshCw,
  Info
} from 'lucide-react';
import { generateQuickVoice, analyzeVoiceText } from '../services/api';

const SAMPLES = [
  {
    label: "🌌 Sci-Fi Narration",
    text: "Deep in the Orion Nebula, stellar winds sculpt glowing towers of dust and gas, cradle of worlds yet unborn.",
    suggestedInstruct: "A dramatic, solemn narrator with deep authoritative resonance and cosmic awe."
  },
  {
    label: "📱 Tech Keynote",
    text: "Today, we're unveiling an entirely new medium of expression. One that merges biological intuition with synthetic intelligence.",
    suggestedInstruct: "A lively, energetic female tech visionary with an American accent and confident delivery."
  },
  {
    label: "🌿 Nature Sanctuary",
    text: "At first dawn in the ancient rainforest, moisture condenses upon emerald leaves as life stir in the canopy above.",
    suggestedInstruct: "A mature British male documentary narrator with quiet gravitas and clear articulation."
  },
  {
    label: "🧘 Calming Breathing",
    text: "Inhale gently through the nose, feeling the cool breath expand within you. Now release, letting every tension melt away.",
    suggestedInstruct: "A very soft, serene, breathy female voice speaking at a gentle, slow rhythm with hypnotic warmth."
  }
];

const QUICK_TAGS = [
  "Deep Baritone",
  "Warm & Empathic",
  "British RP Accent",
  "Crisp American News",
  "Whisper & Breath",
  "Solemn & Dramatic",
  "Energetic & Fast",
  "Gentle Storyteller"
];

export default function VoiceStudio({ presets, languages, onAudioGenerated, onError }) {
  const [text, setText] = useState(
    "Deep in the Orion Nebula, stellar winds sculpt glowing towers of dust and gas, cradle of worlds yet unborn."
  );
  const [instruct, setInstruct] = useState(
    "A dramatic, solemn narrator with deep authoritative resonance and cosmic awe."
  );
  const [language, setLanguage] = useState("English");
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);

  // Character limit is 500 chars for /generate
  const charCount = text.length;
  const maxChars = 500;
  const isOverLimit = charCount > maxChars;
  const estDuration = (text.trim().split(/\s+/).filter(Boolean).length / 2.5).toFixed(1);

  const categories = ["All", ...new Set((presets || []).map(p => p.category))];

  const filteredPresets = activeCategory === "All"
    ? (presets || [])
    : (presets || []).filter(p => p.category === activeCategory);

  const handleApplyPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setInstruct(preset.instruction);
  };

  const handleAppendTag = (tag) => {
    setInstruct(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.toLowerCase().includes(tag.toLowerCase())) return trimmed;
      return `${trimmed}, with ${tag.toLowerCase()}`;
    });
  };

  const handleAiAnalyze = async () => {
    if (!text.trim()) {
      onError("Please enter some text to analyze.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await analyzeVoiceText(text);
      if (res.profile) {
        setAiProfile(res.profile);
        if (res.profile.instruction) {
          setInstruct(res.profile.instruction);
          setSelectedPresetId(null);
        }
      }
    } catch (err) {
      onError(err.message || "Failed to analyze voice persona.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      onError("Please enter narration text.");
      return;
    }
    if (isOverLimit) {
      onError(`Text exceeds ${maxChars} characters. For longer texts or books, use the Audiobook Producer tab!`);
      return;
    }
    if (!instruct.trim()) {
      onError("Please provide a voice instruction or pick a preset.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateQuickVoice({ text, instruct, language });
      onAudioGenerated({
        ...res,
        title: text.slice(0, 45) + (text.length > 45 ? '...' : ''),
        voice_instruction: instruct,
        language
      });
    } catch (err) {
      onError(err.message || "Speech synthesis failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="voice-studio-container animate-fade">
      <div className="studio-grid">
        {/* Left Column: Script & Voice Controls */}
        <div className="studio-main-col">
          {/* Text Narration Card */}
          <div className="glass-panel studio-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="icon-badge">
                  <Type size={18} />
                </div>
                <div>
                  <h3>Narration Script</h3>
                  <p className="card-subtitle">Enter the speech or monologue to synthesize</p>
                </div>
              </div>

              {/* Sample Injections */}
              <div className="sample-chips">
                <span className="chips-label">Samples:</span>
                {SAMPLES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      setText(s.text);
                      setInstruct(s.suggestedInstruct);
                      setSelectedPresetId(null);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="textarea-wrapper">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or paste narration script here (e.g. 'Welcome to the future of voice technology...')"
                rows={5}
                className={`main-script-textarea ${isOverLimit ? 'input-error' : ''}`}
              />
              <div className="textarea-footer">
                <div className="stats-row">
                  <span className="stat-pill">
                    <Clock size={12} /> ~{estDuration}s spoken
                  </span>
                  <span className="stat-pill">
                    {text.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <div className={`char-counter ${isOverLimit ? 'text-rose' : ''}`}>
                  {charCount} / {maxChars} chars
                </div>
              </div>
            </div>

            {isOverLimit && (
              <div className="alert-notice alert-warning">
                <Info size={16} />
                <span>
                  Text is over {maxChars} characters. For longer documents or multi-page books, switch to 
                  <strong> Audiobook Producer</strong> tab for automatic multi-chunk concatenation!
                </span>
              </div>
            )}
          </div>

          {/* Voice Director Card */}
          <div className="glass-panel studio-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="icon-badge accent-purple">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3>AI Voice Director & Style</h3>
                  <p className="card-subtitle">Define the vocal persona, accent, pacing, and tone</p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAiAnalyze}
                disabled={isAnalyzing || !text.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Analyzing Script...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} className="text-purple" />
                    <span>AI Auto-Direct Voice</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Profile Insight Card (if analyzed) */}
            {aiProfile && (
              <div className="ai-profile-insight animate-fade">
                <div className="insight-badge">
                  <Sparkles size={13} />
                  <span>Groq AI Voice Director Assessment</span>
                </div>
                <div className="insight-grid">
                  <div className="insight-item">
                    <span className="label">Tone</span>
                    <span className="val">{aiProfile.tone}</span>
                  </div>
                  <div className="insight-item">
                    <span className="label">Accent</span>
                    <span className="val">{aiProfile.accent}</span>
                  </div>
                  <div className="insight-item">
                    <span className="label">Pacing</span>
                    <span className="val">{aiProfile.pace}</span>
                  </div>
                  <div className="insight-item">
                    <span className="label">Emotion</span>
                    <span className="val">{aiProfile.emotion}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Instruction Input */}
            <div className="form-group">
              <label className="form-label">Voice Prompt Instruction</label>
              <textarea
                value={instruct}
                onChange={(e) => {
                  setInstruct(e.target.value);
                  setSelectedPresetId(null);
                }}
                rows={2}
                placeholder="e.g. A warm, deep, resonant male narrator with a neutral accent, expressive cadence, and gentle storytelling pacing."
                className="voice-instruction-input"
              />
            </div>

            {/* Quick Keyword Chips */}
            <div className="quick-tags-wrapper">
              <span className="quick-tag-label">Add modifier:</span>
              <div className="quick-tags-list">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="quick-tag-pill"
                    onClick={() => handleAppendTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Language & Primary Action Bar */}
            <div className="action-row">
              <div className="language-selector-group">
                <label className="form-label">
                  <Globe size={14} /> Language
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

              <div className="submit-action-group">
                <button
                  type="button"
                  className="btn btn-primary btn-generate"
                  onClick={handleGenerate}
                  disabled={isGenerating || isOverLimit || !text.trim()}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Synthesizing Voice...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      <span>Synthesize Audio</span>
                    </>
                  )}
                </button>
                <span className="hotkey-tip">Press ⌘+Enter to render</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Voice Preset Library */}
        <div className="studio-sidebar-col">
          <div className="glass-panel studio-card preset-library-card">
            <div className="card-header">
              <div className="card-title-group">
                <div className="icon-badge accent-cyan">
                  <Volume2 size={18} />
                </div>
                <div>
                  <h3>Voice Presets</h3>
                  <p className="card-subtitle">Studio-calibrated voice profiles</p>
                </div>
              </div>
            </div>

            {/* Category filter pills */}
            <div className="preset-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Presets List */}
            <div className="presets-scroll-list">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`preset-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="preset-card-header">
                      <div className="preset-name-wrap">
                        <h4>{preset.name}</h4>
                        <span className="preset-category">{preset.category}</span>
                      </div>
                      {isSelected && (
                        <div className="selected-check">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <p className="preset-desc">{preset.description}</p>

                    <div className="preset-tags">
                      <span className="badge badge-primary">{preset.gender}</span>
                      <span className="badge badge-info">{preset.accent}</span>
                      <span className="badge badge-warning">{preset.tone}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
