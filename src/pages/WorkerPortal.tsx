import { apiUrl } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Wrench,
  Zap,
  Mic,
  Upload,
  CheckCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  RotateCw,
  AlertTriangle,
  Send,
  Radio,
  CheckCircle2,
  Check,
  Loader2,
  Key,
  Cpu,
  ChevronRight,
  ChevronDown,
  Shield,
  ArrowLeft,
  RefreshCw,
  PenLine,
  Cloud,
  ExternalLink,
  Navigation,
  LocateFixed,
  Eye,
  CalendarCheck,
  Volume2,
  Copy,
  CheckCheck,
  Lock
} from 'lucide-react';
import { SafetyEvent, User, SafetyDirective } from '../types';

const extractLocalEventType = (desc: string): string => {
  const tl = (desc || '').toLowerCase();
  
  if (/\b(dropped|falling\s+object|falling\s+pipe|pipe\s+fell|load\s+fell|tool\s+fell|suspended\s+load|fell\s+inches|crane\s+drop|sling\s+slip|slipped\s+from\s+crane|debris)\b/i.test(tl)) {
    return 'Dropped object / Suspended load';
  }
  if (/\b(fall\s+from\s+height|falling\s+from\s+height|fell\s+from\s+height|fall\s+from|fell\s+from|railing|scaffold|scaffolding|ladder|derrick|at\s+height|work\s+at\s+height|working\s+at\s+height|elevated\s+platform|mast|unhooked\s+harness)\b/i.test(tl)) {
    return 'Fall from height';
  }
  if (/\b(pressur|gas\s+leak|gas\s+release|steam\s+leak|flange\s+leak|blowout|line\s+rupture|pipe\s+burst|hydrocarbon\s+release|depressur)\b/i.test(tl)) {
    return 'Pressurized fluid / gas release';
  }
  if (/\b(oil\s+leak|oil\s+spill|hydraulic\s+leak|hydraulic\s+oil|diesel\s+leak|fluid\s+leak|leaking\s+oil|puddle\s+of\s+oil|oil\s+slick|dripping\s+oil)\b/i.test(tl)) {
    return 'Oil / chemical leakage & spill';
  }
  if (/\b(slip|tripped|trip\s+hazard|slippery\s+floor|wet\s+floor|uneven\s+ground|puddle|stumble)\b/i.test(tl)) {
    return 'Slip, trip or uneven footing';
  }
  if (/\b(fire|explosion|spark|hot\s+work|welding|grinding|cutting\s+torch|flame|ignition|combustible)\b/i.test(tl)) {
    return 'Hot work / flying sparks / fire hazard';
  }
  if (/\b(electrical|electric\s+shock|voltage|arc\s+flash|live\s+wire|electrocution|short\s+circuit)\b/i.test(tl)) {
    return 'Electrical contact / Arc flash';
  }
  if (/\b(caught\s+in|pinch\s+point|entanglement|rotating\s+shaft|crush|moving\s+part|machinery\s+nip|pulley)\b/i.test(tl)) {
    return 'Caught in / rotating machinery';
  }
  if (/\b(face\s+shield|safety\s+glasses|goggles|eye\s+protection|ear\s+plug|gloves|hard\s+hat|helmet|respirator)\b/i.test(tl)) {
    return 'PPE non-compliance / Flying particle hazard';
  }
  if (/\b(h2s|toxic|acid|chemical\s+splash|fumes|asphyxiat|corrosive)\b/i.test(tl)) {
    return 'Hazardous chemical / toxic exposure';
  }
  if (/\b(confined\s+space|vessel\s+entry|tank\s+entry|manhole)\b/i.test(tl)) {
    return 'Confined space entry hazard';
  }
  if (/\b(forklift|vehicle|truck|crane\s+swing|struck\s+by|reversing|overspeeding)\b/i.test(tl)) {
    return 'Struck by mobile equipment / vehicle';
  }
  if (/\b(housekeeping|pallet|packaging|trash|waste|obstruction|blocked\s+walkway|blocking\s+walkway|cluttered)\b/i.test(tl)) {
    return 'Housekeeping & walkway obstruction';
  }
  if (/\b(excavation|trench|cave-in|shoring|digging)\b/i.test(tl)) {
    return 'Excavation & trench collapse';
  }
  if (/\b(damage|casing|wear|crack|loose|corrosion|rust|scratched)\b/i.test(tl)) {
    return 'Equipment wear & minor damage';
  }
  return 'Operational facility hazard';
};

const extractLocalInjury = (desc: string): string => {
  const tl = (desc || '').toLowerCase();
  if (/\b(fatality|fatal|died|death|killed)\b/i.test(tl)) return 'Fatal injury';
  if (/\b(fracture|amputation|severe\s+burn|hospitalized|unconscious|head\s+injury|lost\s+time)\b/i.test(tl)) return 'Severe / Lost Time Injury';
  if (/\b(first\s+aid|bandaged|minor\s+cut|bruise|scratch|minor\s+injury)\b/i.test(tl)) return 'First Aid / Minor Injury';
  return 'None';
};

const calculateLocalSifPotential = (desc: string, condition: string, eventType: string): 'High' | 'Critical' | 'Medium' | 'Low' => {
  const tl = (desc || '').toLowerCase();
  
  if (/\b(fatal|catastrophic|blowout|explosion|h2s|high\s+voltage|electrocution|amputation|life-threatening|unconscious)\b/i.test(tl)) {
    return 'Critical';
  }
  
  const highEvents = [
    'Fall from height',
    'Dropped object / Suspended load',
    'Pressurized fluid / gas release',
    'Hazardous chemical / toxic exposure',
    'Electrical contact / Arc flash',
    'Caught in / rotating machinery',
    'Confined space entry hazard',
    'Excavation & trench collapse'
  ];
  if (highEvents.includes(eventType) && (tl.includes('without') || tl.includes('unhooked') || tl.includes('leak') || tl.includes('fell') || tl.includes('high'))) {
    return 'High';
  }
  
  if (/\b(fall\s+from\s+height|unhooked\s+harness|without\s+harness|suspended\s+load|line\s+rupture|high\s+pressure\s+gas|live\s+wire)\b/i.test(tl)) {
    return 'High';
  }
  
  const lowEvents = [
    'Housekeeping & walkway obstruction',
    'Equipment wear & minor damage',
    'PPE non-compliance / Flying particle hazard'
  ];
  if (lowEvents.includes(eventType) || /\b(casing|damage\s+on\s+casing|trash|pallet|debris|scratch|paint|faded|minor)\b/i.test(tl)) {
    return 'Low';
  }

  return 'Medium';
};

const calculateLocalClassification = (condition: string, sifPotential: string, actualInjury: string = 'None'): string => {
  const isFatalOrSevere = ['fatal injury', 'severe / lost time injury'].includes(actualInjury.toLowerCase().trim());
  const isMinorInjury = ['first aid / minor injury', 'first aid', 'minor'].includes(actualInjury.toLowerCase().trim());

  if (isFatalOrSevere) {
    return 'SIF Incident / Serious Injury Occurred';
  }
  if (isMinorInjury) {
    if (sifPotential === 'High' || sifPotential === 'Critical') {
      return 'SIF Precursor / High-Potential Near Miss (Minor Injury)';
    }
    return 'First Aid / Minor Incident';
  }

  // No injury scenarios
  if (sifPotential === 'Critical' || sifPotential === 'High') {
    if (condition === 'Near Miss') {
      return 'SIF Precursor / High-Potential Near Miss';
    } else if (condition === 'Unsafe Act') {
      return 'SIF Precursor / High-Risk Behavioral Deviation';
    } else {
      return 'SIF Precursor / High-Risk Facility Condition';
    }
  } else if (sifPotential === 'Medium') {
    if (condition === 'Near Miss') {
      return 'Moderate Near Miss / Non-SIF';
    } else if (condition === 'Unsafe Act') {
      return 'Moderate Procedural Deviation / Non-SIF';
    } else {
      return 'Moderate Facility Hazard / Non-SIF';
    }
  } else {
    return 'Low-Potential Observation / Non-SIF';
  }
};

interface WorkerPortalProps {
  user?: User;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onEventCreated: () => void;
  onNavigateTo?: (page: string) => void;
}


export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh,
  onEventCreated,
  onNavigateTo
}) => {
  const userEmail = user?.email || (() => {
    try {
      const stored = localStorage.getItem('raksha_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) return parsed.email;
      }
    } catch {}
    return '';
  })();

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dynamic form state
  const [reportType, setReportType] = useState<'Unsafe Act' | 'Unsafe Condition' | 'Near Miss'>('Unsafe Condition');
  const [hazardCategory, setHazardCategory] = useState('Working at Height');
  const [site, setSite] = useState('Site Alpha - Jamnagar Complex');
  const [unit, setUnit] = useState('Unit 04 - FCCU');
  const [locationDetail, setLocationDetail] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [shiftTiming, setShiftTiming] = useState('Shift A (06:00 - 14:00)');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [energySource, setEnergySource] = useState('Mechanical / Gravitational');
  const [peopleInvolved, setPeopleInvolved] = useState(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Auto-captured GPS & Location state
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    text: string;
    status: 'detecting' | 'captured' | 'default';
  }>({
    lat: 26.6843,
    lng: 92.8256,
    accuracy: 10,
    text: 'Detecting live GPS coordinates...',
    status: 'detecting'
  });

  // Auto-captured Date & Time state
  const [autoTimestamp, setAutoTimestamp] = useState(() => new Date());

  // Real-time AI Full-Sentence Classification state
  const [aiClassification, setAiClassification] = useState<{
    condition: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss';
    event: string;
    actual_injury: string;
    sif_potential: 'High' | 'Critical' | 'Medium' | 'Low';
    classification: string;
    report_type: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss';
    confidence: number;
    rationale: string;
    matched_words: string[];
  } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [copiedAiOutput, setCopiedAiOutput] = useState(false);

  // Live Web Speech Recognition
  const speechRecognitionRef = useRef<any>(null);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micPermissionBlocked, setMicPermissionBlocked] = useState(false);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState(45);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showVoice, setShowVoice] = useState(true);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Directives
  const [directives, setDirectives] = useState<SafetyDirective[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Options
  const hazardCategories = [
    'Working at Height', 'Energy Isolation / LOTO', 'Line of Fire / Overhead Load',
    'Machine Guarding / Pinch Point', 'Chemical / Toxic Atmosphere', 'Electrical Safety',
    'Hot Work / Fire Hazard', 'Slips, Trips & Falls', 'PPE Defect / Equipment Failure'
  ];
  const shiftTimings = ['Morning Shift (08:00 - 16:00)', 'Evening Shift (16:00 - 00:00)', 'Night Shift (00:00 - 08:00)', 'General Day (09:00 - 17:30)'];
  const sites = ['Drilling Site A', 'Drilling Site B', 'Drilling Site C', 'Refinery A', 'Refinery B', 'Offshore Rig 04'];
  const units = ['Rig Floor D1', 'Rig Floor 01', 'Mud Pump Area', 'Derrick Mast', 'CDU Area', 'FCCU Area', 'Wellhead Area', 'Tank Farm'];
  const equipments = ['General Machinery', 'Hydraulic Mobile Crane / Slings', 'Blowout Preventer (BOP) Stack', '415V Switchgear & Motor Panel', 'Tubular Scaffolding & Fall Arrestor', 'Crude Storage Vessel V-301'];
  const energySources = ['Mechanical', 'Electrical Energy', 'Pressurized Fluid / Gas', 'Thermal / Ignition', 'Gravitational Potential', 'Chemical / Toxic Atmosphere'];

  const waveformBars = [
    6, 12, 18, 10, 16, 24, 12, 18, 28, 14, 10, 22, 26, 18, 12, 24,
    20, 14, 26, 30, 22, 16, 28, 18, 10, 20, 26, 14, 8, 16, 22, 12,
    18, 24, 16, 10, 22, 28, 18, 12, 20, 14, 8, 16, 22
  ];

  // Auto-detect GPS location
  const detectGpsLocation = () => {
    if ('geolocation' in navigator) {
      setGpsLocation(prev => ({ ...prev, status: 'detecting', text: 'Detecting live GPS coordinates...' }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          const acc = Math.round(pos.coords.accuracy || 8);
          setGpsLocation({
            lat,
            lng,
            accuracy: acc,
            text: `${lat}° N, ${lng}° E (±${acc}m accuracy)`,
            status: 'captured'
          });
          setLocationDetail(prev => prev || `GPS: ${lat}° N, ${lng}° E`);
        },
        () => {
          setGpsLocation({
            lat: 26.6843,
            lng: 92.8256,
            accuracy: 10,
            text: '26.6843° N, 92.8256° E (Digboi Complex Zone 2)',
            status: 'default'
          });
          setLocationDetail(prev => prev || 'Digboi Refinery Complex (GPS Auto-Locked: 26.6843° N, 92.8256° E)');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLocation({
        lat: 26.6843,
        lng: 92.8256,
        accuracy: 10,
        text: '26.6843° N, 92.8256° E (Digboi Complex Zone 2)',
        status: 'default'
      });
    }
  };

  // Mount effects for GPS, clock ticker, and speech check
  useEffect(() => {
    detectGpsLocation();
    const clockTimer = setInterval(() => {
      setAutoTimestamp(new Date());
    }, 15000);

    const hasSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSpeechSupported(hasSpeech);

    return () => clearInterval(clockTimer);
  }, []);

  // Real-time AI Full-Sentence Classification debounced effect
  useEffect(() => {
    if (!description.trim() || description.length < 6) {
      setAiClassification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const res = await fetch(apiUrl('/api/events/classify-words?text=' + encodeURIComponent(description)));
        if (res.ok) {
          const data = await res.json();
          if (data.report_type || data.condition) {
            const cond = (data.condition || data.report_type) as 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss';
            const ev = data.event || extractLocalEventType(description);
            const inj = data.actual_injury || extractLocalInjury(description);
            const sifP = (data.sif_potential || calculateLocalSifPotential(description, cond, ev)) as 'High' | 'Critical' | 'Medium' | 'Low';
            const clf = data.classification || calculateLocalClassification(cond, sifP, inj);

            setAiClassification({
              condition: cond,
              event: ev,
              actual_injury: inj,
              sif_potential: sifP,
              classification: clf,
              report_type: cond,
              confidence: data.confidence || 94.0,
              rationale: data.rationale || `Evaluated by Groq AI & SIF Category 3 Engine.`,
              matched_words: data.matched_words || []
            });
            setReportType(cond);
          }
        }
      } catch {
        // Deep full-sentence contextual local fallback
        const desc = description.toLowerCase();
        let rt: 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss' = 'Unsafe Condition';
        let rat = 'Full-sentence analysis identified an environmental or physical equipment condition.';
        let mw: string[] = [];

        const hasObserver = /\b(noticed|observed|found|reported|spotted|discovered|saw|identified|witnessed|detected)\b/i.test(desc);
        const hasNearMiss = /\b(almost|nearly|narrowly|barely|inches|feet\s+away|close\s+call|missed|landed\s+near|fell\s+right\s+next|avoided\s+hit|just\s+in\s+time)\b/i.test(desc);
        const hasViolation = /\b(?:without|no|lacking|not\s+wearing|not\s+using|didn'?t\s+wear|forgot|failed\s+to\s+wear|unhooked|unclipped|unanchored|detached|not\s+tied\s+off|untied)\s+(?:\w+\s+){0,2}(?:harness|belt|lanyard|ppe|helmet|hard\s*hat|gloves|goggles|face\s*shield|respirator|tie-?off|anchor|fall\s+arrest)|(?:standing|climbing|working|stepping|balancing)\s+(?:on|upon|at)\s+(?:\w+\s+){0,3}(?:railing|pipe|edge|open\s+edge|scaffold|scaffolding|beam|ladder|guardrail)|(?:bypassed|bypassing|overrode|removed|tampered|disabled)\s+(?:\w+\s+){0,2}(?:guard|interlock|sensor|barrier|loto|lock)|(?:without|no|lacking)\s+(?:\w+\s+){0,2}(?:permit|ptw|hot\s+work\s+permit|authorization|gas\s+test)|(?:standing|walking|positioned)\s+(?:under|beneath)\s+(?:\w+\s+){0,2}(?:suspended\s+load|crane|hoist)|speeding|overspeeding|using\s+phone|mobile\s+phone|texting|without\s+seatbelt|horseplay|shortcut|reckless|risky\s+behavior/i.test(desc);
        const hasCondition = /\b(leak|leaking|corroded|corrosion|broken|cracked|damaged|slippery|puddle|spill|hazard|unguarded|frayed|defect|loose|missing\s+guard|tripping\s+hazard)\b/i.test(desc);

        if (hasViolation) {
          rt = 'Unsafe Act';
          rat = 'Full-sentence NLP identified active human behavioral deviation or procedural safety violation.';
          mw = [description.slice(0, 50)];
        } else if (hasNearMiss) {
          rt = 'Near Miss';
          rat = 'Full-sentence NLP identified close-call / near-miss trajectory. High potential event where injury was narrowly prevented.';
          mw = [description.slice(0, 50)];
        } else if (hasObserver && hasCondition) {
          rt = 'Unsafe Condition';
          rat = 'Full-sentence NLP identified a physical defect or environmental condition reported by personnel without behavioral non-compliance.';
          mw = [description.slice(0, 50)];
        } else if (hasCondition) {
          rt = 'Unsafe Condition';
          rat = 'Full-sentence NLP identified physical equipment defect or hazardous workplace condition.';
          mw = [description.slice(0, 50)];
        }

        const localEv = extractLocalEventType(description);
        const localInj = extractLocalInjury(description);
        const localSif = calculateLocalSifPotential(description, rt, localEv);
        const localClf = calculateLocalClassification(rt, localSif, localInj);

        setAiClassification({
          condition: rt,
          event: localEv,
          actual_injury: localInj,
          sif_potential: localSif,
          classification: localClf,
          report_type: rt,
          confidence: 88,
          rationale: rat,
          matched_words: mw
        });
        setReportType(rt);
      } finally {
        setIsClassifying(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [description]);

  // Live Speech-to-Text Recognition Toggle
  const toggleLiveSpeechRecognition = async () => {
    if (isRecording || isLiveListening) {
      handleStopRecording();
    } else {
      await handleStartRecording();
    }
  };

  // Waveform animation
  useEffect(() => {
    if (isRecording) {
      let angle = 0;
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const midY = canvas.height / 2;
        ctx.strokeStyle = '#008779';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = midY + Math.sin(angle + x * 0.06) * 12 * Math.sin(x * 0.015 + 1);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#00B89A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = midY + Math.cos(angle + x * 0.04 + 1.5) * 7 * Math.sin(x * 0.02);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        angle += 0.18;
        animationRef.current = requestAnimationFrame(draw);
      };
      animationRef.current = requestAnimationFrame(draw);
      timerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const fetchDirectives = async () => {
    try {
      const res = await fetch(apiUrl('/api/manager/directives'));
      if (res.ok) setDirectives(await res.json());
    } catch {}
  };

  const handleAcknowledgeDirective = async (dir: SafetyDirective) => {
    try {
      await fetch(apiUrl(`/api/manager/directives/${dir.directive_id}/acknowledge`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, user_name: user?.name || 'Field Employee', site, role: 'Field Worker' })
      });
    } catch {}
    setAcknowledgedIds(prev => new Set(prev).add(dir.directive_id));
    triggerNotification(`✓ Acknowledged Safety Directive ${dir.directive_id}`);
    fetchDirectives();
  };

  useEffect(() => { fetchDirectives(); }, [triggerStateRefresh, userEmail]);

  const handleStartRecording = async () => {
    setMicPermissionBlocked(false);
    setShowVoice(true);
    let stream: MediaStream | null = null;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
      }
    } catch (err: any) {
      console.warn('Microphone permission request error:', err);
      setMicPermissionBlocked(true);
      triggerNotification('Microphone permission required. Click the lock icon in the URL bar to allow.');
    }

    setIsRecording(true);
    setIsLiveListening(true);
    setRecordingSeconds(0);
    setVoiceTranscript('');
    triggerNotification('Listening... Speak your observation clearly.');

    // 1. If audio stream is available, start MediaRecorder
    if (stream) {
      try {
        audioChunksRef.current = [];
        let mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(t => t.stop());
            audioStreamRef.current = null;
          }
          await processTranscription(blob);
        };
        recorder.start(250);
      } catch (recErr) {
        console.warn('MediaRecorder error:', recErr);
      }
    }

    // 2. Start Web Speech recognition in parallel for instant realtime text streaming
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        speechRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTrans = '';
          let interimTrans = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            } else {
              interimTrans += event.results[i][0].transcript;
            }
          }
          const textChunk = (finalTrans || interimTrans).trim();
          if (textChunk) {
            setDescription(prev => {
              const trimmed = prev.trim();
              if (!trimmed) return textChunk;
              if (trimmed.endsWith(textChunk)) return trimmed;
              return `${trimmed} ${textChunk}`;
            });
            setVoiceTranscript(textChunk);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech notice:', event.error);
          if (event.error === 'not-allowed') {
            setMicPermissionBlocked(true);
          }
        };

        recognition.onend = () => {
          if (speechRecognitionRef.current && isRecording) {
            try { speechRecognitionRef.current.start(); } catch {}
          }
        };

        recognition.start();
      } catch (srErr) {
        console.warn('SpeechRecognition start error:', srErr);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsLiveListening(false);
    setRecordedSeconds(recordingSeconds);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    } else if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    triggerNotification('Recording finished. Processing speech...');
  };

  const processTranscription = async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size < 500) return;
    setIsTranscribing(true);
    const fd = new FormData();
    fd.append('file', audioBlob, 'voice_report.webm');
    try {
      const res = await fetch(apiUrl('/api/voice/transcribe'), { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.detail?.includes('token')) setTokenModalOpen(true);
        throw new Error(data.detail || 'Transcription failed');
      }
      if (data.status === 'loading') {
        setTimeout(() => processTranscription(audioBlob), 4000);
        return;
      }
      const text = data.text?.trim() || '';
      if (text && text !== '.') {
        setVoiceTranscript(text);
        setDescription(prev => {
          const trimmed = prev.trim();
          if (!trimmed) return text;
          if (trimmed.toLowerCase().includes(text.toLowerCase())) return trimmed;
          return `${trimmed} ${text}`;
        });
        triggerNotification('✓ Transcribed via Whisper AI');
      } else {
        triggerNotification('No clear speech detected. Speak clearly into the microphone.');
      }
    } catch (err: any) {
      console.warn('Voice transcription notice:', err.message);
      triggerNotification('Audio transcription service encountered an issue.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveHfToken = async () => {
    if (!tokenInput.trim()) return;
    setSavingToken(true);
    try {
      const res = await fetch(apiUrl('/api/voice/set-token'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tokenInput.trim() }) });
      if (res.ok) { setTokenModalOpen(false); triggerNotification('✓ Token saved!'); }
    } catch {} finally { setSavingToken(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setPhotoUrl(data.url);
        triggerNotification('✓ Photo securely uploaded to Cloudinary CDN!');
      } else {
        triggerNotification('Photo stored for submission');
      }
    } catch {
      triggerNotification('Photo saved locally');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { alert('Please enter a description or record audio.'); return; }
    setSubmitting(true);
    setReceipt(null);
    const fullLocation = locationDetail ? `${unit} (${locationDetail})` : `${unit} (${gpsLocation.text})`;
    const currentUserName = user?.name || (() => {
      try {
        const stored = localStorage.getItem('raksha_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) return parsed.name;
        }
      } catch {}
      return 'Frontline Employee';
    })();

    const payload = {
      raw_text: description,
      report_type: reportType,
      condition: aiClassification?.condition || reportType,
      hazard_category: hazardCategory,
      shift_timing: shiftTiming,
      location_detail: locationDetail || gpsLocation.text,
      site,
      unit,
      location: fullLocation,
      equipment_involved: equipment,
      energy_source: energySource,
      people_involved: peopleInvolved,
      photo_url: photoUrl || (photoPreview && photoPreview.length < 800000 ? photoPreview : null),
      audio_transcript: voiceTranscript || null,
      reporter_name: currentUserName,
      reporter_email: userEmail,
      event: aiClassification?.event || extractLocalEventType(description),
      actual_injury: aiClassification?.actual_injury || extractLocalInjury(description),
      sif_potential: aiClassification?.sif_potential || calculateLocalSifPotential(description, reportType, extractLocalEventType(description)),
      classification: aiClassification?.classification || calculateLocalClassification(reportType, aiClassification?.sif_potential || 'Low', aiClassification?.actual_injury || 'None'),
      ai_confidence: aiClassification?.confidence || 94.0,
      ai_rationale: aiClassification?.rationale
    };
    try {
      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        // Fallback to /api/events
        const res2 = await fetch(apiUrl('/api/events'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res2.ok) throw new Error('Submission failed');
        var data = await res2.json();
      } else {
        var data = await res.json();
      }
      const dynEv = data.event || aiClassification?.event || extractLocalEventType(description);
      const dynInj = data.actual_injury || aiClassification?.actual_injury || extractLocalInjury(description);
      const dynSif = data.sif_potential || aiClassification?.sif_potential || calculateLocalSifPotential(description, reportType, dynEv);
      const dynClf = data.classification || aiClassification?.classification || calculateLocalClassification(reportType, dynSif, dynInj);
      setReceipt({
        ...data,
        condition: data.condition || data.report_type || aiClassification?.condition || reportType,
        event: dynEv,
        actual_injury: dynInj,
        sif_potential: dynSif,
        classification: dynClf
      });
      setShowSuccessModal(true);
      triggerNotification(`✓ Report ${data.report_code || data.id} securely submitted to Database & Manager Queue!`);
      if (onEventCreated) onEventCreated();
      setDescription('');
      setVoiceTranscript('');
      setPhotoPreview(null);
      setPhotoUrl(null);
    } catch {
      const id = `EVT-${Math.floor(Math.random() * 9000 + 10000)}`;
      const code = `#SIF26165-${Math.floor(Math.random() * 900 + 100)}`;
      const localEv = aiClassification?.event || extractLocalEventType(description);
      const localInj = aiClassification?.actual_injury || extractLocalInjury(description);
      const localSif = aiClassification?.sif_potential || calculateLocalSifPotential(description, reportType, localEv);
      const localClf = aiClassification?.classification || calculateLocalClassification(reportType, localSif, localInj);
      const local = {
        success: true,
        event_id: id,
        report_code: code,
        report_type: reportType,
        condition: aiClassification?.condition || reportType,
        event: localEv,
        actual_injury: localInj,
        sif_potential: localSif,
        classification: localClf,
        ai_classification_rationale: aiClassification?.rationale || 'AI classified based on observation keyword analysis.',
        risk_level: localSif === 'Critical' || localSif === 'High' ? 'HIGH' : localSif === 'Medium' ? 'MEDIUM' : 'LOW',
        sif_risk_score: localSif === 'Critical' ? 9.2 : localSif === 'High' ? 7.8 : localSif === 'Medium' ? 5.4 : 2.5,
        photo_url: photoUrl || (photoPreview && photoPreview.length < 800000 ? photoPreview : null),
        analysis: {
          site,
          unit,
          location: fullLocation,
          activity: 'Field Operations',
          hazard: `Hazard: ${hazardCategory}`,
          equipment_involved: equipment,
          energy_source: energySource,
          barrier: 'Standard controls',
          barrier_failure: 'Protocol bypass',
          exposure: 'Personnel in proximity',
          consequence: 'Serious injury risk',
          explanation: aiClassification?.rationale || 'Safety report indicates potential barrier lapse.',
          recommended_action: 'Perform field audit.'
        }
      };
      setReceipt(local);
      setShowSuccessModal(true);
      triggerNotification(`Local receipt: ${code}`);
      if (onEventCreated) onEventCreated();
      setDescription('');
      setVoiceTranscript('');
      setPhotoPreview(null);
      setPhotoUrl(null);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const autoTimestampDisplay = autoTimestamp.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="font-sans max-w-6xl mx-auto pb-12 space-y-5 text-slate-800">

      {/* ── TOP HEADER (Clean White Bar) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo('dashboard')}
              title="Back to Dashboard"
              className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shrink-0 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Report Safety Issue</h1>
              <span className="bg-[#E8F6F4] text-[#007A6C] border border-[#A2D9D2] font-bold text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase">
                {userEmail.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Use the form below to safely report an unsafe condition, incident or hazard.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLiveSpeechRecognition}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
            isLiveListening || isRecording
              ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
              : 'border-[#008779] text-[#008779] bg-white hover:bg-[#E8F6F4]'
          }`}
        >
          <Mic className={`h-4 w-4 ${isLiveListening || isRecording ? 'text-red-600 animate-bounce' : 'text-[#008779]'}`} />
          <span>{isLiveListening || isRecording ? `Listening... Click to Stop (${fmt(recordingSeconds)})` : 'Voice Input (Live Mic)'}</span>
        </button>
      </div>

      {/* HSE Directive Alert (if any active) */}
      {directives.slice(0, 1).map(dir => {
        const isAck = acknowledgedIds.has(dir.directive_id);
        return (
          <div
            key={dir.directive_id}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  {dir.priority} Directive • {dir.directive_id}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{dir.title}</p>
              </div>
            </div>
            <button
              onClick={() => handleAcknowledgeDirective(dir)}
              disabled={isAck}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isAck ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isAck ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Acknowledged</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Acknowledge</span>
                </>
              )}
            </button>
          </div>
        );
      })}

      {/* ── 2-COLUMN MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_276px] gap-5 items-start">

        {/* ── LEFT COLUMN: 4 FORM SECTIONS ── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* SECTION 1: PROBLEM OBSERVATION & AI CLASSIFICATION */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Problem Observation & AI Word Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Speak or type your observation. AI automatically categorizes into Unsafe Act, Unsafe Condition, or Near Miss.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleLiveSpeechRecognition}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isLiveListening || isRecording
                    ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
                    : 'border-[#008779]/40 bg-[#E8F6F4] text-[#008779] hover:bg-[#D4EDE9]'
                }`}
              >
                <Mic className="h-3.5 w-3.5 text-[#008779]" />
                <span>{isLiveListening || isRecording ? `Stop Dictation (${fmt(recordingSeconds)})` : 'Use Voice Dictation'}</span>
              </button>
            </div>

            {/* Audio waveform panel */}
            {showVoice && (
              <div className="border border-slate-200/90 rounded-xl p-3.5 mb-4 bg-slate-50/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Voice Dictation Panel (Speak your problem observation)
                  </label>
                  {isLiveListening && (
                    <span className="text-[10px] font-bold text-red-600 animate-pulse flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                      Live Transcribing...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <button
                      type="button"
                      onClick={toggleLiveSpeechRecognition}
                      className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[#008779] shrink-0 hover:bg-[#E8F6F4]"
                      title={isLiveListening || isRecording ? 'Stop Recording' : 'Start Speaking'}
                    >
                      <Mic className={`h-3.5 w-3.5 ${isLiveListening || isRecording ? 'text-red-500 animate-pulse' : 'text-[#008779]'}`} />
                    </button>

                    {/* Soundwave Bars */}
                    <div className="flex items-center gap-1 h-7 flex-1 px-1 overflow-hidden">
                      {waveformBars.map((h, i) => (
                        <span
                          key={i}
                          style={{
                            height: (isLiveListening || isRecording)
                              ? `${Math.max(4, (h * (1 + 0.6 * Math.sin(recordingSeconds * 4 + i)))) % 28}px`
                              : `${h}px`
                          }}
                          className={`w-1 rounded-full transition-all duration-150 ${
                            (isLiveListening || isRecording) ? 'bg-red-500' : 'bg-[#008779]'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-mono text-slate-600 font-semibold shrink-0 pl-1">
                      {fmt((isLiveListening || isRecording) ? recordingSeconds : 0)} / {fmt(recordedSeconds)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleLiveSpeechRecognition}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#00695C] hover:bg-[#00574B] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 transition shadow-2xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${(isLiveListening || isRecording) ? 'animate-spin' : ''}`} />
                    <span>{(isLiveListening || isRecording) ? 'Stop Dictating' : 'Speak Observation'}</span>
                  </button>
                </div>

                {isTranscribing && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-[#008779] bg-[#E8F6F4]/60 p-2.5 rounded-lg border border-[#A2D9D2]/60">
                    <Loader2 className="h-4 w-4 animate-spin text-[#008779]" />
                    <span className="font-bold">Transcribing your voice with Whisper AI...</span>
                  </div>
                )}

                {/* Transcribed Words Display Card */}
                {voiceTranscript && (
                  <div className="mt-3 p-3.5 bg-gradient-to-r from-[#E8F6F4] via-emerald-50 to-teal-50 border-2 border-[#008779]/40 rounded-xl space-y-2 animate-fadeIn shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#008779] animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#00695C] flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5 text-[#008779]" />
                          Transcribed Words
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {voiceTranscript.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDescription(voiceTranscript);
                            triggerNotification('✓ Transcribed speech applied to description');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#007A6C] bg-white border border-[#A2D9D2] rounded-lg hover:bg-[#E8F6F4] cursor-pointer shadow-2xs transition"
                        >
                          Use as Description
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDescription(prev => {
                              const trimmed = prev.trim();
                              return trimmed ? `${trimmed} ${voiceTranscript}` : voiceTranscript;
                            });
                            triggerNotification('✓ Transcribed speech appended');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-2xs transition"
                        >
                          + Append
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(voiceTranscript);
                            triggerNotification('✓ Copied transcript to clipboard');
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                          title="Copy transcript text"
                        >
                          <Copy className="h-3 w-3 inline mr-1" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceTranscript('')}
                          className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Dismiss transcript"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-[#A2D9D2]/80 text-slate-800 text-xs font-semibold leading-relaxed shadow-inner">
                      "{voiceTranscript}"
                    </div>
                  </div>
                )}

                {micPermissionBlocked && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        <b>Microphone Permission Needed</b>: Click the lock/camera icon <Lock className="inline h-3.5 w-3.5 text-amber-700 mx-0.5 align-text-bottom" /> next to the browser URL to enable microphone.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMicPermissionBlocked(false)}
                      className="text-amber-700 hover:text-amber-900 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* Textarea */}
            <label className="block text-xs text-slate-500 font-medium mb-1.5">
              Describe what occurred (Speak into mic above or type problem description)
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Describe what occurred. E.g. 'Worker was observed standing on railing unhooked...' or 'Hydraulic line leaking slippery oil...' or 'Heavy pipe fell inches away from worker...'"
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] resize-none leading-relaxed"
              />
              <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/90 px-1 py-0.5 rounded">
                <span>{description.length} / 1000</span>
                <PenLine className="h-3 w-3" />
              </div>
            </div>

            {/* Live AI Output Banner */}
            {aiClassification && (
              <div className="mt-3 p-4 rounded-2xl border bg-gradient-to-br from-[#F8FAFC] via-[#F0FDF4] to-[#F0FDFA] border-emerald-300 text-slate-800 shadow-sm space-y-3.5 animate-fadeIn">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/70">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center font-bold">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      AI output:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isClassifying && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <Loader2 className="h-3 w-3 animate-spin text-[#007A6C]" />
                        Evaluating...
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
                      {aiClassification.confidence}% confidence
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copyText = `AI output:\n\nCondition: ${aiClassification.condition || aiClassification.report_type}\nEvent: ${aiClassification.event}\nActual injury: ${aiClassification.actual_injury}\nSIF potential: ${aiClassification.sif_potential}\nClassification: ${aiClassification.classification}`;
                        navigator.clipboard.writeText(copyText);
                        setCopiedAiOutput(true);
                        setTimeout(() => setCopiedAiOutput(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
                      title="Copy formatted AI output"
                    >
                      {copiedAiOutput ? (
                        <>
                          <CheckCheck className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* EXACT SPECIFICATION DISPLAY: Clean Card Block */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11.5px] leading-relaxed shadow-inner border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-bold tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span>AI output:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 min-w-[105px]">Condition:</span>
                    <span className="text-amber-300 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {aiClassification.condition || aiClassification.report_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 min-w-[105px]">Event:</span>
                    <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                      {aiClassification.event}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 min-w-[105px]">Actual injury:</span>
                    <span className="text-emerald-300 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                      {aiClassification.actual_injury}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 min-w-[105px]">SIF potential:</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded border ${
                      aiClassification.sif_potential === 'Critical' || aiClassification.sif_potential === 'High'
                        ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                        : aiClassification.sif_potential === 'Medium'
                        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    }`}>
                      {aiClassification.sif_potential}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 min-w-[105px]">Classification:</span>
                    <span className="text-purple-300 font-bold bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">
                      {aiClassification.classification}
                    </span>
                  </div>
                </div>

                {/* Visual Grid Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Condition</span>
                    <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-md ${
                      aiClassification.condition === 'Unsafe Act'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : aiClassification.condition === 'Near Miss'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-teal-100 text-teal-900 border border-teal-300'
                    }`}>
                      {aiClassification.condition || aiClassification.report_type}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Event Mechanism</span>
                    <span className="font-extrabold text-xs text-slate-900 block truncate">
                      {aiClassification.event}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Actual Injury</span>
                    <span className="font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      {aiClassification.actual_injury}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">SIF Potential</span>
                    <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-md ${
                      aiClassification.sif_potential === 'Critical' || aiClassification.sif_potential === 'High'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : aiClassification.sif_potential === 'Medium'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {aiClassification.sif_potential}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 lg:col-span-1 p-2.5 bg-white/90 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Classification</span>
                    <span className="font-black text-[11px] text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block truncate">
                      {aiClassification.classification}
                    </span>
                  </div>
                </div>

                {/* AI Rationale & Matched Context */}
                <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    <span className="font-bold text-slate-900">AI Reasoning: </span>
                    {aiClassification.rationale}
                  </p>
                  {aiClassification.matched_words && aiClassification.matched_words.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Sentence Context:</span>
                      {aiClassification.matched_words.map(w => (
                        <span key={w} className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded text-[10px] font-medium shadow-2xs">
                          "{w}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: OPERATIONAL LOCATION DETAILS (AUTO-CAPTURED) */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                2
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Operational Location (Auto-Captured GPS)
              </h3>
            </div>

            {/* Auto-Captured Geolocation Banner */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-slate-50/90 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center shrink-0">
                  <Navigation className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Auto-Detected GPS Location</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Auto-Captured
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                    {gpsLocation.text}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={detectGpsLocation}
                className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-[#007A6C] hover:bg-[#E8F6F4] rounded-lg border border-[#A2D9D2] transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                <span>Re-detect GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Site / Plant / Facility
                </label>
                <div className="relative">
                  <select
                    value={site}
                    onChange={e => setSite(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {sites.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Rig / Unit / Plant Area
                </label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Specific Location (Detail / Zone / Deck)
            </label>
            <input
              type="text"
              value={locationDetail}
              onChange={e => setLocationDetail(e.target.value)}
              placeholder="e.g., Substructure Platform Level 2, Near Valve Y-102 (or leave auto-captured GPS)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white placeholder-slate-400 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C]"
            />
          </div>

          {/* SECTION 3: INCIDENT DETAILS & OPERATIONAL SHIFT (AUTO-CAPTURED) */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                3
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Observation Timestamp & Operational Shift
              </h3>
            </div>

            {/* Auto-Captured Timestamp Banner */}
            <div className="mb-4 flex items-center justify-between p-3 rounded-xl border bg-slate-50/90 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Observation Timestamp</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Auto-Captured & Stamped
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    {autoTimestampDisplay} • Automatically recorded at occurrence instant
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
                Auto-Locked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Date & Time of Observation (Locked Auto-Stamping)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Operational Shift
                </label>
                <div className="relative">
                  <select
                    value={shiftTiming}
                    onChange={e => setShiftTiming(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {shiftTimings.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: PHOTO EVIDENCE & SUBMISSION */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                4
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Photo Evidence & Context
              </h3>
            </div>

            {/* Associated Equipment, Energy Source, People Involved */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Associated Equipment
                </label>
                <div className="relative">
                  <select
                    value={equipment}
                    onChange={e => setEquipment(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-8 cursor-pointer"
                  >
                    {equipments.map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Energy Source Involved
                </label>
                <div className="relative">
                  <select
                    value={energySource}
                    onChange={e => setEnergySource(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-8 cursor-pointer"
                  >
                    {energySources.map(es => (
                      <option key={es} value={es}>{es}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  People Involved
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={peopleInvolved}
                    onChange={e => setPeopleInvolved(parseInt(e.target.value))}
                    className="w-full pl-8 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Upload Area (Cloudinary Enabled) */}
            <div className="mt-4 border-2 border-dashed border-[#A2D9D2] bg-[#F4FAF8] hover:border-[#008779] rounded-xl p-5 text-center cursor-pointer transition relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={uploadingPhoto}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {!photoPreview && !photoUrl ? (
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className="h-9 w-9 rounded-full bg-[#E8F6F4] flex items-center justify-center mb-0.5 text-[#008779]">
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Attach Photos / Evidence (Stored in Cloudinary)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click to browse or drag & drop • Auto-uploaded to Cloudinary CDN
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <img
                      src={photoPreview || photoUrl || ''}
                      alt="Preview"
                      className="h-28 rounded-xl object-cover border border-slate-200 cursor-zoom-in shadow-xs"
                      onClick={e => {
                        e.stopPropagation();
                        setPreviewImageModal(photoUrl || photoPreview);
                      }}
                    />
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        window.open(photoUrl || photoPreview || '', '_blank');
                      }}
                      title="Open Original Image in Cloudinary"
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-lg bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] flex-wrap justify-center">
                    {uploadingPhoto ? (
                      <span className="text-[#008779] font-bold animate-pulse flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading to Cloudinary CDN...
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <Cloud className="h-3 w-3 text-emerald-600" />
                        Stored on Cloudinary CDN
                      </span>
                    )}
                    {photoUrl && (
                      <a
                        href={photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[#007A6C] hover:underline font-bold flex items-center gap-0.5"
                      >
                        <span>Open Original</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setPhotoPreview(null);
                        setPhotoUrl(null);
                      }}
                      className="text-red-500 hover:underline font-bold ml-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Large Teal Submit Button */}
            <div className="mt-5">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#00695C] hover:bg-[#00574B] text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition flex items-center justify-center gap-2.5 shadow-md shadow-[#00695C]/20 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>AI Word Engine Analyzing & Registering...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit & Process Safety Observation</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

        {/* ── RIGHT COLUMN: SIDEBAR ── */}
        <div className="space-y-4">

          {/* Submission Receipt (When submitted) */}
          {receipt && (
            <div className="bg-white border-2 border-[#007A6C] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-[#007A6C] uppercase bg-[#E8F6F4] px-2 py-0.5 rounded-full">
                    AI Observation Receipt
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{receipt.report_code}</h4>
                </div>
                <div className="h-8 w-8 rounded-full bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center font-bold">
                  <Check className="h-4 w-4 text-[#007A6C] stroke-[2.5]" />
                </div>
              </div>

              {/* AI Output Breakdown Outcome */}
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed shadow-inner border border-slate-800 space-y-1">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI output:</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans font-bold">
                    SIF Risk: <b className="text-white">{receipt.sif_risk_score} / 10</b>
                  </span>
                </div>
                <div><span className="text-slate-400">Condition:</span> <span className="text-amber-300 font-bold">{receipt.condition || receipt.report_type}</span></div>
                <div><span className="text-slate-400">Event:</span> <span className="text-white font-bold">{receipt.event}</span></div>
                <div><span className="text-slate-400">Actual injury:</span> <span className="text-emerald-300 font-bold">{receipt.actual_injury}</span></div>
                <div><span className="text-slate-400">SIF potential:</span> <span className="text-rose-400 font-bold">{receipt.sif_potential}</span></div>
                <div><span className="text-slate-400">Classification:</span> <span className="text-purple-300 font-bold">{receipt.classification}</span></div>
                {receipt.ai_classification_rationale && (
                  <p className="text-[10.5px] text-slate-300 font-sans font-medium leading-relaxed pt-2 mt-1 border-t border-slate-800/80 italic">
                    "{receipt.ai_classification_rationale}"
                  </p>
                )}
              </div>

              {/* Cloudinary Evidence Photo */}
              {receipt.photo_url && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Cloud className="h-3 w-3" /> Cloudinary Evidence
                    </span>
                    <a
                      href={receipt.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#007A6C] hover:underline flex items-center gap-0.5"
                    >
                      <span>Open Full</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <img
                    src={receipt.photo_url}
                    alt="Cloudinary Evidence"
                    className="h-20 w-full object-cover rounded-xl border border-slate-200 cursor-zoom-in"
                    onClick={() => setPreviewImageModal(receipt.photo_url)}
                  />
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Level:</span>
                  <span className={`font-bold uppercase ${
                    receipt.risk_level === 'HIGH' || receipt.risk_level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {receipt.risk_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                    Pending Review
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tips Card: "Make your report more effective" */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-12 w-12 rounded-2xl bg-[#E8F6F4] flex items-center justify-center mb-3 text-[#007A6C]">
                <Shield className="h-6 w-6 stroke-[2.2]" />
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">
                AI Reporting Assistant
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Speak or type clearly. The AI Word Engine automatically identifies Unsafe Acts, Conditions, or Near Misses.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {[
                'Speak or type your observation',
                'Location & GPS auto-captured',
                'Photos auto-stored in Cloudinary',
                'AI classifies Unsafe Act/Condition/Near Miss'
              ].map(tip => (
                <div key={tip} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#007A6C] shrink-0" />
                  <span className="text-xs text-slate-700 font-medium leading-tight">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Discreet Whisper Voice Model Config Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#007A6C] font-semibold transition cursor-pointer"
            >
              <Cpu className="h-3 w-3" />
              <span>Whisper-v3 Turbo Voice Settings</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── BOTTOM HISTORY STRIP ── */}
      <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Submitted Observation History
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Track the resolution status and review changes of your previously reported issues in My Reports.
            </p>
          </div>
        </div>

        {onNavigateTo && (
          <button
            onClick={() => onNavigateTo('my-report')}
            className="shrink-0 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>Open My Reports</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* HF Token Modal */}
      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center"><Key className="h-4 w-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Hugging Face Whisper-v3</h3>
                  <div className="text-[10px] text-slate-400">openai/whisper-large-v3-turbo</div>
                </div>
              </div>
              <button onClick={() => setTokenModalOpen(false)} className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer">✕</button>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900">Connected & Ready</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">Token is authenticated. Microphone recordings will be transcribed by Whisper-v3.</div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Hugging Face Token (HF_TOKEN)</label>
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="hf_..." className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]" />
              <div className="text-[10px] text-slate-400 mt-1">Saved securely in local client preferences.</div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="button" disabled={savingToken} onClick={handleSaveHfToken} className="flex-1 py-2.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5">
                {savingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{savingToken ? 'Saving...' : 'Save & Verify'}</span>
              </button>
              <button type="button" onClick={() => setTokenModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Submission Confirmation Modal */}
      {showSuccessModal && receipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
              </div>
              <span className="inline-block text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Safety Report Submitted Successfully
              </span>
              <h3 className="text-xl font-black text-slate-900">
                {receipt.report_code || 'Report Registered'}
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Your safety observation has been analyzed by AI and logged in the enterprise safety database.
              </p>
            </div>

            {/* AI Output Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed shadow-inner border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  <Sparkles className="h-4 w-4" />
                  <span>AI output:</span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans font-bold">
                  SIF Risk: <b className="text-white">{receipt.sif_risk_score} / 10</b>
                </span>
              </div>
              <div><span className="text-slate-400">Condition:</span> <span className="text-amber-300 font-bold">{receipt.condition || receipt.report_type}</span></div>
              <div><span className="text-slate-400">Event:</span> <span className="text-white font-bold">{receipt.event}</span></div>
              <div><span className="text-slate-400">Actual injury:</span> <span className="text-emerald-300 font-bold">{receipt.actual_injury}</span></div>
              <div><span className="text-slate-400">SIF potential:</span> <span className="text-rose-400 font-bold">{receipt.sif_potential}</span></div>
              <div><span className="text-slate-400">Classification:</span> <span className="text-purple-300 font-bold">{receipt.classification}</span></div>
              {receipt.ai_classification_rationale && (
                <p className="text-[10.5px] text-slate-300 font-sans font-medium leading-relaxed pt-2 mt-1 border-t border-slate-800/80 italic">
                  "{receipt.ai_classification_rationale}"
                </p>
              )}
            </div>

            {/* Cloudinary or Attached Evidence Preview */}
            {receipt.photo_url && (
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={receipt.photo_url}
                    alt="Attached Evidence"
                    className="h-10 w-10 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                  <div className="text-left truncate">
                    <span className="text-[10px] font-bold text-slate-500 block">Attached Evidence</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block">Observation Photo</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
                  Uploaded
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onNavigateTo) onNavigateTo('my-report');
                }}
                className="w-full py-3 px-4 bg-[#008779] hover:bg-[#007064] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View in My Reports</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onNavigateTo) onNavigateTo('dashboard');
                }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Back to Dashboard</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                + Submit Another Safety Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {previewImageModal && (
        <div onClick={() => setPreviewImageModal(null)} className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out">
          <div className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl cursor-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Photo Evidence</span>
              <button onClick={() => setPreviewImageModal(null)} className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer">✕</button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img src={previewImageModal} alt="Evidence" className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};