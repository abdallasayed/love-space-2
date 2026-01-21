import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, StopCircle, Play, Pause, X, ZoomIn, ZoomOut, Loader2, Image as ImageIcon, Heart, Clock } from 'lucide-react';

// --- Love Counter ---
export const LoveCounter = ({ startDate }: { startDate: string }) => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!startDate) return;
    const start = new Date(startDate).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = now - start;

      if (distance < 0) return;

      setTime({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [startDate]);

  if (!startDate) return (
      <div className="bg-white/50 p-4 rounded-xl text-center text-gray-500 text-sm">
          لم يتم تحديد تاريخ بدء العلاقة بعد في الملف الشخصي.
      </div>
  );

  return (
    <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-200 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 opacity-90">
                <Heart className="fill-white animate-pulse" size={20} />
                <span className="font-bold tracking-wide">نحن معاً منذ</span>
            </div>
            
            <div className="flex items-end gap-2 md:gap-4 dir-ltr" dir="ltr">
                <div className="flex flex-col items-center">
                    <span className="text-3xl md:text-4xl font-black">{time.days}</span>
                    <span className="text-[10px] md:text-xs opacity-80 uppercase">يوم</span>
                </div>
                <span className="text-2xl opacity-50 mb-2">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-3xl md:text-4xl font-black">{time.hours.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] md:text-xs opacity-80 uppercase">ساعة</span>
                </div>
                <span className="text-2xl opacity-50 mb-2">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-3xl md:text-4xl font-black">{time.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] md:text-xs opacity-80 uppercase">دقيقة</span>
                </div>
                <span className="text-2xl opacity-50 mb-2">:</span>
                <div className="flex flex-col items-center w-12">
                    <span className="text-3xl md:text-4xl font-black text-rose-100">{time.seconds.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] md:text-xs opacity-80 uppercase">ثانية</span>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- Upload Progress Toast ---
const UploadProgress = ({ progress }: { progress: number }) => {
    return createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900/95 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[280px] border border-white/10 animate-pulse">
            <div className="flex justify-between items-center text-xs font-bold text-gray-300">
                <span>جاري رفع الوسائط...</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>,
        document.body
    );
};

// --- Uploadcare Wrapper ---
export const FileUploader = ({ onUpload, circular = false, label = "صورة", compact = false }: { onUpload: (url: string) => void, circular?: boolean, label?: string, compact?: boolean }) => {
  const widgetRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // @ts-ignore
    if (window.uploadcare) {
      // @ts-ignore
      const widget = window.uploadcare.Widget(widgetRef.current);
      
      // Hook into the widget's file selection event
      widget.onChange((file: any) => {
        if (file) {
           setUploading(true);
           setProgress(0);
           
           file.progress((info: any) => {
               setProgress(Math.round(info.progress * 100));
           });

           file.done((info: any) => {
              setUploading(false);
              onUpload(info.cdnUrl);
              widget.value(null); 
              setProgress(0);
           });

           file.fail(() => {
               setUploading(false);
               alert("فشل رفع الملف");
           });
        }
      });
    }
  }, [onUpload]);

  return (
    <div className={`${compact ? 'w-8 h-8 overflow-hidden' : 'my-2 inline-block'}`}>
       <input 
        type="hidden" 
        ref={widgetRef} 
        data-crop={circular ? "1:1" : ""}
        data-tabs="file camera facebook instagram"
      />
      {uploading && <UploadProgress progress={progress} />}
    </div>
  );
};

// --- Audio Recorder ---
export const AudioRecorder = ({ onUpload }: { onUpload: (url: string) => void }) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], "voice_message.wav", { type: 'audio/wav' });
        
        // @ts-ignore
        if (window.uploadcare) {
           setUploading(true);
           setProgress(0);
           // @ts-ignore
           const file = window.uploadcare.fileFrom('object', audioFile);
           
           file.progress((info: any) => {
               setProgress(Math.round(info.progress * 100));
           });

           file.done((info: any) => {
              setUploading(false);
              onUpload(info.cdnUrl);
              setProgress(0);
           });
           
           file.fail(() => {
               setUploading(false);
               alert("فشل رفع المقطع الصوتي");
           });
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert("لا يمكن الوصول للميكروفون");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <>
        <button 
        onClick={recording ? stopRecording : startRecording}
        className={`p-3 rounded-full transition-all duration-300 ${recording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200' : 'bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-500'}`}
        >
        {recording ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>
        {uploading && <UploadProgress progress={progress} />}
    </>
  );
};

// --- Custom Audio Player ---
const CustomAudioPlayer = ({ src }: { src: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-gray-100/50 rounded-2xl p-2 w-full min-w-[200px] mt-1 border border-gray-200/50">
      <button 
        onClick={togglePlay}
        className="flex-shrink-0 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
      >
        {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-1" />}
      </button>
      
      <div className="flex-1 flex flex-col justify-center gap-1">
        <input
          type="range"
          min="0"
          max="100"
          value={progress || 0}
          onChange={handleSeek}
          className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono font-medium px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <audio ref={audioRef} src={src} className="hidden" />
    </div>
  );
};

// --- Image Viewer with Zoom & Loading ---
const ImageViewer = ({ src, className }: { src: string, className?: string }) => {
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }
    return () => { document.body.style.overflow = 'auto'; }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale === 1) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || scale === 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({ x: clientX - dragStart.current.x, y: clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleZoom = () => {
    if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    } else {
        setScale(2.5);
    }
  };

  return (
    <>
      <div 
        className={`relative overflow-hidden bg-gray-100 cursor-zoom-in group ${className}`} 
        onClick={() => setIsOpen(true)}
      >
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50">
                <Loader2 className="animate-spin" size={24} />
            </div>
        )}
        <img 
            src={src} 
            className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100 group-hover:scale-105 transition-transform duration-700'}`}
            onLoad={() => setLoading(false)}
        />
        {!loading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
        )}
      </div>

      {isOpen && (
        <div 
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden animate-fade-in touch-none"
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                className="absolute top-4 right-4 z-[110] text-white p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-colors"
            >
                <X size={24} />
            </button>
            
            <div className="absolute bottom-8 z-[110] flex gap-4">
                 <button 
                    onClick={(e) => { e.stopPropagation(); toggleZoom(); }} 
                    className="text-white p-3 px-6 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors font-bold flex items-center gap-2"
                 >
                    {scale > 1 ? <><ZoomOut size={20}/> تصغير</> : <><ZoomIn size={20}/> تكبير</>}
                 </button>
            </div>

            <div 
                className="transition-transform duration-200 ease-out will-change-transform"
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onClick={(e) => { if(scale === 1) e.stopPropagation(); }}
            >
                <img 
                    src={src} 
                    className="max-w-[100vw] max-h-[100vh] object-contain select-none" 
                    draggable={false}
                    onDoubleClick={(e) => { e.stopPropagation(); toggleZoom(); }}
                />
            </div>
        </div>
      )}
    </>
  );
};

// --- Media Viewer ---
export const MediaViewer = ({ src, className, type }: { src: string, className?: string, type?: 'image' | 'video' | 'audio' }) => {
  if (!src) return null;
  
  const isVideo = type === 'video' || (!type && (src.includes("mp4") || src.includes("video") || src.match(/\.(mp4|webm|ogg)$/i)));
  const isAudio = type === 'audio' || (!type && (src.includes("audio") || src.match(/\.(wav|mp3|aac|m4a)$/i)));

  if (isVideo) {
    return (
      <video controls className={`bg-black ${className}`}>
        <source src={src} />
        متصفحك لا يدعم الفيديو.
      </video>
    );
  }
  
  if (isAudio) {
      return <CustomAudioPlayer src={src} />;
  }
  
  return <ImageViewer src={src} className={className} />;
};