import { apiUrl } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Mic,
  MicOff,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ChevronRight,
  Shield,
  LocateFixed,
  X,
  Volume2,
  FileText,
  Camera,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface WorkerPortalProps {
  user?: User;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh?: boolean;
  onEventCreated?: () => void;
  onNavigateTo?: (page: string) => void;
}

export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  user,
  triggerNotification,
  onEventCreated,
  onNavigateTo
}) => {
  const userEmail = user?.email || (() => {
    try {
      const stored = localStorage.getItem('raksha_auth_user');
      if (stored) return JSON.parse(stored).email;
    } catch {}
    return 'worker@refinery.safe';
  })();

  const userName = user?.name || 'Frontline Employee';

  // 1. Input Mode: 'voice' vs 'text' (Strictly Mutually Exclusive)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [observationText, setObservationText] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any | null>(null);
  const recognitionRef = useRef<any | null>(null);

  // 2. Location State & Permission Handling
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'detecting' | 'granted' | 'denied'>('prompt');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [site, setSite] = useState('Site Alpha - Jamnagar Complex');
  const [unit, setUnit] = useState('Unit 04 - FCCU');
  const [locationDetail, setLocationDetail] = useState('');

  // 3. Photo (Optional)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // 4. Submission & Success State
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Geolocation Permission Handler
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5))
        });
        setGpsStatus('granted');
        if (!locationDetail) {
          setLocationDetail(`GPS Area [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
        }
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Web Speech API / Voice Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        if (cleaned) {
          setVoiceTranscript(cleaned);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.info('Speech recognition status:', e.error);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Start Voice Recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlobObj = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlobObj);
        stream.getTracks().forEach((track) => track.stop());

        // Always upload to Whisper AI backend for high-fidelity transcription
        if (audioBlobObj.size > 0) {
          uploadAudioToWhisper(audioBlobObj);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required for voice reports. Please allow microphone permissions in your browser.');
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  };

  // Upload Audio to Whisper backend
  const uploadAudioToWhisper = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append('audio', blob, 'voice_report.webm');
      formData.append('file', blob, 'voice_report.webm');

      const res = await fetch(apiUrl('/api/voice/transcribe'), {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const recognized = (data.text || data.transcript || data.audio_transcript || '').trim();
        if (recognized && recognized !== '.') {
          setVoiceTranscript(recognized);
        }
      }
    } catch (err) {
      console.error('Whisper transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Mode Toggle Handler
  const handleModeSwitch = (mode: 'text' | 'voice') => {
    if (isRecording) {
      stopRecording();
    }
    setInputMode(mode);
  };

  // Photo Upload Handler (Cloudinary)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setPhotoUrl(data.url);
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoUrl(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeContent = inputMode === 'voice' ? voiceTranscript.trim() : observationText.trim();

    if (!activeContent) {
      alert(inputMode === 'voice' ? 'Please record your voice observation before submitting.' : 'Please enter your safety observation text.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        raw_text: activeContent,
        audio_transcript: inputMode === 'voice' ? voiceTranscript : undefined,
        photo_url: photoUrl || photoPreview || undefined,
        site: site.trim() || 'Site Alpha - Jamnagar Complex',
        unit: unit.trim() || 'Unit 04 - FCCU',
        location_detail: locationDetail.trim() || undefined,
        reporter_name: userName,
        reporter_email: userEmail,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const reportData = await res.json();
        setSubmittedReport(reportData);
        setShowSuccessModal(true);
        triggerNotification(`Report #${reportData.report_code || reportData.id} submitted successfully.`);
        if (onEventCreated) onEventCreated();

        // Reset form
        setObservationText('');
        setVoiceTranscript('');
        setPhotoPreview(null);
        setPhotoUrl(null);
        setLocationDetail('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to submit report. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Network error while submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[900px] mx-auto pb-20">

      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#005B54] via-[#008779] to-[#00A389] px-7 py-6 text-white shadow-lg shadow-[#008779]/15">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-emerald-100 uppercase tracking-wider">
                Frontline HSE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Submit Safety Report
            </h1>
            <p className="text-xs text-emerald-50 font-medium mt-1">
              Record or type your field observation. Automated SIF AI will classify hazards and alert safety officers.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-xs items-center justify-center text-white">
            <Shield className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Report Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 2. Observation Input Section: Voice vs Text (Mutually Exclusive) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008779]" />
                <span>Safety Observation</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose either Voice or Text mode to describe what you observed.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleModeSwitch('text')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-white text-[#008779] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Text Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('voice')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  inputMode === 'voice'
                    ? 'bg-[#008779] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Voice Mode</span>
              </button>
            </div>
          </div>

          {/* TEXT MODE CONTAINER */}
          {inputMode === 'text' && (
            <div className="space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-700">
                Type your observation details:
              </label>
              <textarea
                rows={5}
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                placeholder="Example: Noticed scaffolding plank on 4th level unlatched near catalytic cracker column C-102. High fall risk..."
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779] placeholder-slate-400 transition"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Microphone disabled in Text mode</span>
                <span>{observationText.length} characters</span>
              </div>
            </div>
          )}

          {/* VOICE MODE CONTAINER */}
          {inputMode === 'voice' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#E8F6F4]/40 to-white border-2 border-dashed border-[#008779]/40 flex flex-col items-center justify-center text-center space-y-4">
                
                {/* Pulsing Mic Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-100'
                      : 'bg-[#008779] text-white hover:bg-[#007064] hover:scale-105'
                  }`}
                >
                  {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </button>

                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {isRecording ? 'Listening... Speak clearly into your mic' : 'Click to Record Voice Report'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isRecording ? (
                      <span className="text-red-600 font-bold">Recording: {recordingSeconds}s (Click mic when done)</span>
                    ) : (
                      'Supports English, Hindi, and regional speech'
                    )}
                  </div>
                </div>
              </div>

              {/* Transcribed text box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-[#008779]" />
                  <span>Voice Transcript (Generated):</span>
                  {isTranscribing && <span className="text-[10px] text-[#008779] font-bold animate-pulse">Refining with Whisper AI...</span>}
                </label>
                <textarea
                  rows={4}
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Your speech-to-text transcript will appear here automatically..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/70 font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  You can edit the voice transcript above before submitting.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* 3. Location Section (Permission Handled + Editable) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#008779]" />
                <span>Facility & Location</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-mapped via browser GPS permissions. You can also edit manually below.
              </p>
            </div>

            {/* GPS Status Indicator */}
            <div className="flex items-center gap-2">
              {gpsStatus === 'granted' && coordinates && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <LocateFixed className="h-3.5 w-3.5 text-emerald-600" />
                  <span>GPS: {coordinates.lat}, {coordinates.lng}</span>
                </span>
              )}
              {gpsStatus === 'detecting' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  <span>Detecting GPS...</span>
                </span>
              )}
              {(gpsStatus === 'denied' || gpsStatus === 'prompt') && (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  <LocateFixed className="h-3.5 w-3.5 text-slate-500" />
                  <span>Enable GPS</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Refinery / Drilling Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Site Alpha - Jamnagar Complex"
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Operating Unit / Area
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Unit 04 - FCCU"
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Specific Location / Landmark Detail (Editable)
            </label>
            <input
              type="text"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="e.g. Level 4 Platform near High Pressure Manifold #102"
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008779]/20 focus:border-[#008779]"
            />
          </div>
        </div>

        {/* 4. Photo Evidence Section (Optional - Pure & Clutter-Free) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#008779]" />
              <span>Photo Evidence</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Optional
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a site photo if available. No photo is strictly required to submit.
            </p>
          </div>

          {!photoPreview ? (
            <label className="border-2 border-dashed border-slate-200 hover:border-[#008779]/60 hover:bg-[#E8F6F4]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 group-hover:bg-[#E8F6F4] text-slate-500 group-hover:text-[#008779] flex items-center justify-center mb-2 transition">
                <Upload className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                Click to upload or drag and drop photo
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                PNG, JPG, JPEG up to 10MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-w-sm">
              <img
                src={photoPreview}
                alt="Selected evidence"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading to Cloudinary...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-[#008779] hover:bg-[#007064] text-white font-black text-sm shadow-md shadow-[#008779]/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing AI SIF Analysis & Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Submit Safety Report</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* SUCCESS MODAL */}
      {showSuccessModal && submittedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-center">
            <div className="h-16 w-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-[#005B54] bg-[#ECFDF5] px-3 py-1 rounded-full">
                Report Submitted
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Report #{submittedReport.report_code || submittedReport.id}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your safety observation has been logged into the HSE intelligence engine.
              </p>
            </div>

            {/* SIF Potential Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">SIF Potential:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  submittedReport.sif_potential === 'High' || submittedReport.sif_potential === 'Critical'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {submittedReport.sif_potential || 'Low'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending Review
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Location:</span>
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                  {submittedReport.site} - {submittedReport.unit}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onNavigateTo) onNavigateTo('my-report');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                View in My Reports
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#008779] hover:bg-[#007064] text-white font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};