import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useChildren } from '@context/ChildrenContext';
import { ChildData } from '@components/ChildCard';
import { Download, Smartphone, MessageCircle, Copy, X } from 'lucide-react';
import PairingCard from '@components/PairingCard';
import { toast } from 'sonner';
import Spinner from '@/components/ui/loading-spinner';

const SCRAPER_BASE_URL = "https://xoul-dev.duckdns.org";
const API_BASE_URL = "https://xoul-data-backend-267146952341.us-east1.run.app";

const AddChild: React.FC = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [childId, setChildId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [childData, setChildData] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [stage, setStage] = useState<'waiting_qr' | 'waiting_for_scan' | 'qr_ready' | 'scan_success' | 'session_saved' | 'error' | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const { addChild, pairWhatsapp, getChild, getTraceId, setWhatsappConnected, unpairWhatsapp } = useChildren();
  const navigate = useNavigate();

  /*  QR for downloading the APK  */
  const [apkQr, setApkQr] = useState<string | null>(null);
  const [loadingApkQr, setLoadingApkQr] = useState(false);

  useEffect(() => {
    if (!traceId) return;

    const es = new EventSource(
      `${SCRAPER_BASE_URL}/scraper/wa/session/stream/${traceId}`,
    );

    es.onmessage = async (e) => {
      console.log('Received SSE event:', e.data); 
      const ev = JSON.parse(e.data);
      if (ev.stage) {
        setStage(ev.stage);
      }

      switch (ev.stage) {
        case 'qr_ready':
          // backend already screenshotted the QR; fetch only if we hadn't got one
          if (!qrCode && ev.qr_path) {
            try {
              const b = await fetch(ev.qr_path).then((r) => r.blob());
              setQrCode(URL.createObjectURL(b));
            } catch { /* ignore */ }
          }
          break;

        case 'session_saved':
          clearTimeout(timerRef.current); // stop qr‑expiry timer
          setLoading(false);
          toast.success('WhatsApp paired successfully!');
          if (childId) {
            setWhatsappConnected(childId, true);
            setChildData(prev => prev ? { ...prev, whatsappConnected: true } : prev);
          }
          // remove qr after a short delay
          setTimeout(() => setQrCode(null), 1500);
          break;

        case 'error':
          setLoading(false);
          toast.error('Something went wrong during WhatsApp pairing');
          break;
        default:
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [traceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const child = await addChild(name, age, gender);
      setChildId(child.id.toString());
      setChildData(child);
      toast.success(`${name} added successfully`);
    } catch (error) {
      toast.error('Failed to add child');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQRCode = async (childId: string) => {
    if (loading) return;           // debounce
    setLoading(true);
    setQrCode(null);
    setStage('waiting_qr');

    try {
      const traceId = await getTraceId(childId);
      setTraceId(traceId);

      const { qr, reused } = await pairWhatsapp(childId);
      
      if (qr) {
        setQrCode(URL.createObjectURL(qr));
      } else if (reused) {
        toast.info('Pairing already in progress — attaching to current session.');
      }

      // expire the qr after 2 min unless the login finishes first or we're in scan_success stage
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // If we're in scan_success stage, don't set error state, just hide QR
        if (stage === 'scan_success') {
          setQrCode(null);
        } else {
          setQrCode(null);
          setStage('error');
        }
      }, 2 * 60 * 1000);
    } catch {
      setStage('error');
      setLoading(false);
    }
  };

  const handleUnpair = async (type: 'whatsapp') => {
    try {
      if (childId) {
        if (type === 'whatsapp') {
          await unpairWhatsapp(childId);
        }
        toast.success(`${type === 'whatsapp' ? 'WhatsApp' : 'Phone'} unpaired successfully`);
        if (childData) {
          setChildData({ ...childData, whatsappConnected: false });
        }
      }
    } catch (error) {
      toast.error(`Failed to unpair ${type}`);
    }
  };

  const renderStatus = () => {
    switch (stage) {
      case 'waiting_qr':
        return 'Preparing QR…';
      case 'qr_ready':
        return 'Scan the code showing above ✅';
      case 'waiting_for_scan':
        return 'Waiting for scan...';
      case 'scan_success':
        // Clear timeout to prevent error state when in scan_success stage
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          // Hide QR but keep loading state
          setQrCode(null);
        }
        return 'Syncing your chats…';
      case 'session_saved':
        return 'All set! 🎉';
      case 'error':
        return 'Something went wrong - try again';
      default:
        return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Pairing code copied to clipboard'))
      .catch(() => toast.error('Failed to copy code'));
  };

  const handleGetApkQr = async () => {
    if (loadingApkQr) return;
    setLoadingApkQr(true);
    try {
      const res = await fetch(`${API_BASE_URL}/xoul-apk/generate-download-qr`);
      const data = await res.json();          // { qr: base‑64‑string }
      setApkQr(`data:image/png;base64,${data.qr}`);
    } catch {
      toast.error("Could not generate QR – try again");
    } finally {
      setLoadingApkQr(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 page-transition">
      <nav className="flex mb-6 text-sm text-xoul-textSecondary">
        <Link to="/dashboard" className="hover:text-white transition-colors flex items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">Add new child</span>
      </nav>
      
      <h1 className="heading-lg mb-6">Add New Child</h1>
      
      <div className="xoul-card mb-6">
        <h2 className="heading-md mb-4">Child's Information</h2>
        
        <form onSubmit={handleSaveName}>
          <div className="mb-4">
            <label htmlFor="childName" className="text-body block mb-2">Name</label>
            <input
              id="childName"
              type="text"
              className="xoul-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter child's name"
              disabled={!!childId || isSaving}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="childAge" className="text-body block mb-2">Age</label>
            <input
              id="childAge"
              type="number"
              min="0"
              className="xoul-input"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 0)}
              placeholder="Enter child's age"
              disabled={!!childId || isSaving}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="childGender" className="text-body block mb-2">Gender</label>
            <select
              id="childGender"
              className="xoul-input"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
              disabled={!!childId || isSaving}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {!childId && (
            <button 
              type="submit" 
              className="btn-primary mt-2"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </form>
      </div>
      
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 ${!childId ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="text-blue-400" size={20} />
            <h3 className="heading-md">Phone Pairing</h3>
          </div>
          <p className="text-body mb-4">Connect your child's phone to XOUL by copying this code in device app.</p>
          
          {childData?.alias ? (
            <div className="mt-auto">
              <div className="bg-gray-800 p-4 rounded-md border border-gray-700 text-center mb-4 relative">
                <p className="text-xl font-mono font-semibold text-white">{childData.alias}</p>
                <button 
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => childData.alias && copyToClipboard(childData.alias)}
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-xs text-center text-gray-400 mb-3">Use this code in the XOUL app on your child's phone</p>
            </div>
          ) : (
            <div className="mt-auto text-center text-gray-400">
              <p>Pairing code not available</p>
            </div>
          )}
        </div>
        
        <div className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="text-blue-400" size={20} />
            <h3 className="heading-md">WhatsApp Pairing</h3>
          </div>
          <p className="text-body mb-8">Connect your child's WhatsApp to XOUL</p>
          
          {childData?.whatsappConnected ? (
            <>
              <div className="mt-auto bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-md mb-4 text-center">
                <span className="flex items-center justify-center gap-2">
                  <span className="text-green-400">✓</span> Pairing complete
                </span>
              </div>
              <button 
                className="py-3 w-full bg-[#1e2330] hover:bg-opacity-80 rounded-md transition-colors"
                onClick={() => handleUnpair('whatsapp')}
              >
                Unpair
              </button>
            </>
          ) : (
            <>
              {stage === 'scan_success' ? (
                <div className="mt-auto flex flex-col items-center">
                  <div className="mb-4">
                    <Spinner />
                  </div>
                  <p className="text-sm text-gray-400 text-center">{renderStatus()}</p>
                </div>
              ) : qrCode ? (
                <div className="mt-auto flex flex-col items-center">
                  <img src={qrCode} alt="WhatsApp QR Code" className="mb-4" style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'white' }} />
                  <p className="text-sm text-gray-400 text-center">{renderStatus()}</p>
                </div>
              ) : (
                <button 
                  className="mt-auto py-3 w-full bg-[#1e2330] hover:bg-opacity-80 rounded-md transition-colors flex justify-center items-center"
                  onClick={() => childId && handleGenerateQRCode(childId)}
                  disabled={loading}
                >
                  {loading ? <Spinner /> : 'Generate WhatsApp QR code'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="bg-[#1a1f2c] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Download size={20} className="text-gray-400" />
            <span className="text-white font-medium">Download monitor app</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button 
              className="bg-[#1e2330] border-none flex items-center gap-2 w-full sm:w-auto hover:bg-opacity-80 transition-colors px-3 py-2 rounded-md"
              onClick={handleGetApkQr}
              disabled={loadingApkQr}
            >
              {loadingApkQr ? <Spinner /> : <Download size={16} />} Download
            </button>
            
            <a 
              href="#" 
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              See <span className="text-blue-400">instructions</span> on how to install it on your child's phone
            </a>
          </div>
        </div>

        {/*   ---- QR appears here once loaded ----   */}
        {apkQr && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <img
              src={apkQr}
              alt="XOUL APK download QR"
              className="w-48 h-48 rounded-lg bg-white p-2"
            />
            <button
              className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setApkQr(null)}
            >
              <X size={14} className="mr-1" /> close
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center">
        <button 
          className="btn-secondary sm:w-auto"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AddChild;
