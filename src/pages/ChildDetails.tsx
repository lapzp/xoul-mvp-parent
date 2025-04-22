import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, Smartphone, MessageCircle, Trash, Copy, X } from 'lucide-react';
import { useChildren } from '../context/ChildrenContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/loading-spinner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AppUsageKPI from '@/components/AppUsageKPIs';

const SCRAPER_BASE_URL   = "https://xoul-dev.duckdns.org";
const API_BASE_URL   = "https://xoul-data-backend-267146952341.us-east1.run.app";

type Stage = 'waiting_qr' | 'waiting_for_scan' | 'qr_ready' | 'scan_success' | 'session_saved' | 'error' | null;

const ChildDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getChild,
    pairWhatsapp,
    unpairPhone,
    unpairWhatsapp,
    removeChild,
    setWhatsappConnected,
    getTraceId,
  } = useChildren();
  const [child, setChild] = useState(getChild(id || ''));
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(null);
  const [traceId, setTraceId] = useState<string | null>(null);

  /*  QR for downloading the APK  */
  const [apkQr, setApkQr]     = useState<string | null>(null);
  const [loadingApkQr, setLoadingApkQr] = useState(false);

  const handleGetApkQr = async () => {
    if (loadingApkQr) return;
    setLoadingApkQr(true);
    try {
      const res   = await fetch(`${API_BASE_URL}/xoul-apk/generate-download-qr`);
      const data  = await res.json();          // { qr: base‑64‑string }
      setApkQr(`data:image/png;base64,${data.qr}`);
    } catch {
      toast.error("Could not generate QR – try again");
    } finally {
      setLoadingApkQr(false);
    }
  };
  
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!id || !child) {
      navigate('/dashboard');
      return;
    }

    // Refresh child data when it changes
    const interval = setInterval(() => {
      const updatedChild = getChild(id);
      if (updatedChild) {
        setChild(updatedChild);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [id, child, getChild, navigate]);

  if (!child) return null;

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
          setWhatsappConnected(child.id.toString(), true);
          setChild((c) => c && { ...c, whatsappConnected: true });
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

  const handleUnpair = async (type: 'phone' | 'whatsapp') => {
    try {
      if (type === 'phone') {
        await unpairPhone(child.id.toString());
      } else {
        await unpairWhatsapp(child.id.toString());
      }
      toast.success(`${type === 'phone' ? 'Phone' : 'WhatsApp'} unpaired successfully`);
    } catch (error) {
      toast.error(`Failed to unpair ${type}`);
    }
  };

  const handleRemoveChild = async () => {
    try {
      await removeChild(child.id.toString());
      toast.success(`${child.name} has been removed`);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to remove child');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Pairing code copied to clipboard'))
      .catch(() => toast.error('Failed to copy code'));
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


  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 pt-20 page-transition">
      <nav className="flex mb-6 text-sm text-xoul-textSecondary">
        <Link to="/dashboard" className="hover:text-white transition-colors flex items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">{child.name}</span>
      </nav>

      <h1 className="heading-lg mb-8">{child.name}</h1>

      <AppUsageKPI childId={child.id.toString()} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Phone pairing card */}
        <div className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="text-blue-400" size={20} />
            <h3 className="heading-md">Phone Pairing</h3>
          </div>
          <p className="text-body mb-4">Connect your child's phone to XOUL by copying this code in device app.</p>
          
          {child.phoneConnected ? (
            <>
              <div className="mt-auto bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-md mb-4 text-center">
                <span className="flex items-center justify-center gap-2">
                  <span className="text-green-400">✓</span> Pairing complete
                </span>
              </div>
              <button 
                className="py-3 w-full bg-[#1e2330] hover:bg-opacity-80 rounded-md transition-colors"
                onClick={() => handleUnpair('phone')}
              >
                Unpair
              </button>
            </>
          ) : (
            child.alias ? (
              <div className="mt-auto">
                <div className="bg-gray-800 p-4 rounded-md border border-gray-700 text-center mb-4 relative">
                  <p className="text-xl font-mono font-semibold text-white">{child.alias}</p>
                  <button 
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
                    onClick={() => child.alias && copyToClipboard(child.alias)}
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
            )
          )}
        </div>

        {/* WhatsApp pairing card */}
        <div className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="text-blue-400" size={20} />
            <h3 className="heading-md">WhatsApp Pairing</h3>
          </div>
          <p className="text-body mb-8">Connect your child's WhatsApp to XOUL</p>

          {child.whatsappConnected ? (
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
            // If not connected, either show the QR code (once generated) or the button.
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
                  onClick={() => handleGenerateQRCode(child.id.toString())}
                  disabled={loading}
                >
                  {loading ? <Spinner /> : 'Generate WhatsApp QR code'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Download monitor app section */}
      <div className="bg-[#1a1f2c] rounded-xl p-5 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Download size={20} className="text-gray-400" />
            <span className="text-white font-medium">Download monitor app</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              className="bg-[#1e2330] border-none flex items-center gap-2 w-full sm:w-auto"
              onClick={handleGetApkQr}
              disabled={loadingApkQr}
            >
              {loadingApkQr ? <Spinner /> : <Download size={16} />} Download
            </Button>
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

      {/* Remove Child Section */}
      <div className="mt-12 border-t border-white/10 pt-6">
        <h3 className="text-lg font-medium text-white mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-400 mb-4">
          Once you delete a child, there is no going back. Please be certain.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <Trash size={16} />
              Remove {child.name}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#1a1f2c] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {child.name}'s
                information and remove all pairings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1e2330] border-none text-white hover:bg-[#272e3d]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleRemoveChild}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ChildDetails;