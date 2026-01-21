import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, serverTimestamp, setDoc, getDoc, arrayUnion } from "firebase/firestore";
import { Heart, Send, HeartHandshake, Phone, Video, PhoneCall, PhoneOff, XCircle, Search, Bell, Image as ImageIcon, AlertCircle, Check, CheckCheck, Sparkles, X, MoreVertical, Smile, Trash2, Grid, MessageSquare, Calendar as CalendarIcon, Clock, MapPin, Ban, Wallpaper } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileUploader, AudioRecorder, MediaViewer, LoveCounter } from '../components/Shared';

export const LoversWorld = () => {
  const { user, profile, sendNotification } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  
  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatImage, setChatImage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatConfig, setChatConfig] = useState<any>({});
  
  // Memories & Events State
  const [memories, setMemories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'memories' | 'calendar'>('chat');
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'date', location: '' });

  // Finder State
  const [searchTerm, setSearchTerm] = useState('');
  const [finderError, setFinderError] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  // Partner & Call State
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [inCall, setInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!profile || !user) return;
    const unsubs: (() => void)[] = [];

    if (profile.status === 'taken' && profile.partnerId) {
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      
      // Partner Profile
      unsubs.push(onSnapshot(doc(db, 'users', profile.partnerId), (snap) => {
          if (snap.exists()) setPartnerProfile(snap.data());
      }, e => {}));

      // Chat Config & Typing
      unsubs.push(onSnapshot(doc(db, 'chats', chatId), (snap) => {
          if (snap.exists()) {
              const data = snap.data();
              setIsPartnerTyping(data[`typing_${profile.partnerId}`] || false);
              setChatConfig(data);
          }
      }, e => {}));

      // Messages
      unsubs.push(onSnapshot(query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')), snap => {
        setMessages(snap.docs.map(d => ({id: d.id, ...d.data()})));
        snap.docs.forEach(d => {
            const data = d.data();
            if (data.senderId !== user.uid && data.status !== 'read') {
                updateDoc(d.ref, { status: 'read' }).catch(e => {});
            }
        });
        if (activeTab === 'chat') {
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }, e => {}));

      // Memories (Shared Gallery)
      unsubs.push(onSnapshot(query(collection(db, 'chats', chatId, 'memories'), orderBy('createdAt', 'desc')), snap => {
          setMemories(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }, e => {}));

      // Events (Shared Calendar)
      unsubs.push(onSnapshot(query(collection(db, 'chats', chatId, 'events'), orderBy('date', 'asc')), snap => {
          setEvents(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }, e => {}));

      // Incoming Calls
      const qCall = query(collection(db, 'calls'), where('to', '==', user.uid), where('status', '==', 'calling'));
      unsubs.push(onSnapshot(qCall, snap => {
          if (!snap.empty) setIncomingCall({id: snap.docs[0].id, ...snap.docs[0].data()});
          else setIncomingCall(null);
      }, e => {}));

    } else {
      // Finder Mode
      // Fetch blocked users
      getDoc(doc(db, 'users', user.uid)).then(snap => {
          if(snap.exists()) setBlockedUsers(snap.data().blocked || []);
      });

      unsubs.push(onSnapshot(query(collection(db, 'requests'), where('to', '==', user.uid), where('type', '==', 'relationship'), where('status', '==', 'pending')), snap => {
        setRequests(snap.docs.map(d => ({id: d.id, ...d.data()})));
      }, e => {}));

      unsubs.push(onSnapshot(query(collection(db, 'users'), where('status', '==', 'single'), limit(50)), snap => {
        setUsers(snap.docs.map(d => d.data()).filter(u => u.uid !== user.uid));
        setFinderError(false);
      }, e => { setFinderError(true); }));
    }
    return () => unsubs.forEach(u => u());
  }, [profile, user, activeTab]);

  const handleTyping = () => {
      if (!profile?.partnerId) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      setDoc(doc(db, 'chats', chatId), { [`typing_${user.uid}`]: true }, { merge: true }).catch(e => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          setDoc(doc(db, 'chats', chatId), { [`typing_${user.uid}`]: false }, { merge: true }).catch(e => {});
      }, 2000);
  };

  const handleReaction = async (msgId: string, currentReactions: any) => {
      if (!profile?.partnerId) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      const reaction = currentReactions && currentReactions[user.uid] ? null : '❤️';
      
      const newReactions = { ...currentReactions, [user.uid]: reaction };
      if (!reaction) delete newReactions[user.uid];

      await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), {
          reactions: newReactions
      });
  };

  const updateWallpaper = async (url: string) => {
      if (!profile?.partnerId) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      await setDoc(doc(db, 'chats', chatId), { wallpaper: url }, { merge: true });
      setShowMenu(false);
  };

  // --- Actions ---
  const sendRequest = async (targetUid: string) => {
    try {
        await addDoc(collection(db, 'requests'), {
        from: user.uid,
        fromName: `${profile?.firstName} ${profile?.lastName}`,
        to: targetUid,
        type: 'relationship',
        status: 'pending',
        createdAt: serverTimestamp()
        });
        sendNotification(targetUid, 'request', 'أرسل لك طلب ارتباط');
        alert("تم إرسال الطلب");
        setViewUser(null);
    } catch (e) { alert("خطأ"); }
  };

  const handleRequest = async (req: any, accept: boolean) => {
    if (accept) {
      await updateDoc(doc(db, 'users', user.uid), { status: 'taken', partnerId: req.from, relationshipStart: new Date().toISOString() });
      await updateDoc(doc(db, 'users', req.from), { status: 'taken', partnerId: user.uid, relationshipStart: new Date().toISOString() });
      await deleteDoc(doc(db, 'requests', req.id));
      sendNotification(req.from, 'system', 'وافق على طلب الارتباط!');
    } else {
      await deleteDoc(doc(db, 'requests', req.id));
    }
  };

  const blockUser = async (targetUid: string) => {
      if(!window.confirm("هل أنت متأكد من حظر هذا المستخدم؟ لن يظهر لك مرة أخرى.")) return;
      try {
          await updateDoc(doc(db, 'users', user.uid), { blocked: arrayUnion(targetUid) });
          setBlockedUsers(prev => [...prev, targetUid]);
          setViewUser(null);
          alert("تم حظر المستخدم");
      } catch(e) { alert("حدث خطأ"); }
  };

  const sendMessage = async () => {
    if ((!chatMessage.trim() && !chatImage) || !profile?.partnerId) return;
    const chatId = [user.uid, profile.partnerId].sort().join('_');
    setDoc(doc(db, 'chats', chatId), { [`typing_${user.uid}`]: false }, { merge: true }).catch(e => {});
    
    // Optimistic Clear
    const tempMsg = chatMessage;
    const tempImg = chatImage;
    setChatMessage(''); setChatImage('');

    try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), { 
            text: tempMsg, image: tempImg, senderId: user.uid, status: 'sent', createdAt: serverTimestamp() 
        });
    } catch (e) {
        setChatMessage(tempMsg); setChatImage(tempImg); // Revert on fail
    }
  };

  const deleteMessage = async (msgId: string) => {
      if (!profile?.partnerId || !window.confirm("حذف هذه الرسالة؟")) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId));
  };

  const addMemory = async (url: string) => {
      if (!profile?.partnerId) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'memories'), {
          image: url,
          addedBy: user.uid,
          createdAt: serverTimestamp()
      });
  };

  const addEvent = async () => {
      if (!profile?.partnerId || !newEvent.title || !newEvent.date) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      await addDoc(collection(db, 'chats', chatId, 'events'), {
          ...newEvent,
          createdBy: user.uid,
          createdAt: serverTimestamp()
      });
      setNewEvent({ title: '', date: '', type: 'date', location: '' });
  };

  const deleteEvent = async (id: string) => {
      if (!profile?.partnerId || !window.confirm("حذف هذا الموعد؟")) return;
      const chatId = [user.uid, profile.partnerId].sort().join('_');
      await deleteDoc(doc(db, 'chats', chatId, 'events', id));
  };

  const startCall = async (type: 'video' | 'audio') => {
      if(!profile?.partnerId) return;
      await addDoc(collection(db, 'calls'), { from: user.uid, to: profile.partnerId, type, status: 'calling', createdAt: serverTimestamp() });
      setInCall(true); startLocalStream();
  };

  const answerCall = async () => {
      if(!incomingCall) return;
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'accepted' });
      setIncomingCall(null); setInCall(true); startLocalStream();
  };

  const endCall = async () => {
      setInCall(false);
      if(localVideoRef.current && localVideoRef.current.srcObject) (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      const snaps = await Promise.all([getDocs(query(collection(db, 'calls'), where('from', '==', user.uid))), getDocs(query(collection(db, 'calls'), where('to', '==', user.uid)))]);
      snaps.forEach(snap => snap.docs.forEach(d => deleteDoc(d.ref)));
  };

  const startLocalStream = async () => {
      try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); if(localVideoRef.current) localVideoRef.current.srcObject = stream; } catch(e) { alert("لا يمكن الوصول للكاميرا"); }
  };

  const formatLastSeen = (timestamp: any) => {
      if (!timestamp) return '';
      const date = timestamp.toDate();
      const diff = (new Date().getTime() - date.getTime()) / 60000;
      if (diff < 1) return 'متصل الآن';
      if (diff < 60) return `منذ ${Math.floor(diff)} دقيقة`;
      if (diff < 1440) return `آخر ظهور ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      return `آخر ظهور ${date.toLocaleDateString()}`;
  };

  // Helper for Date Separators
  const renderDateSeparator = (currentMsg: any, prevMsg: any) => {
      if (!currentMsg.createdAt?.toDate) return null;
      const currentDate = currentMsg.createdAt.toDate();
      const prevDate = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : null;

      if (!prevDate || currentDate.getDate() !== prevDate.getDate()) {
          const isToday = currentDate.toDateString() === new Date().toDateString();
          const isYesterday = new Date(Date.now() - 86400000).toDateString() === currentDate.toDateString();
          
          let dateString = currentDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' });
          if (isToday) dateString = 'اليوم';
          if (isYesterday) dateString = 'أمس';

          return (
              <div className="flex justify-center my-4">
                  <span className="bg-gray-200/60 text-gray-600 text-xs px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm">
                      {dateString}
                  </span>
              </div>
          );
      }
      return null;
  };

  // --- Taken View (Chat & Memories & Calendar) ---
  if (profile?.status === 'taken') {
    return (
      <div className="h-[calc(100vh-0px)] md:h-screen flex flex-col bg-[#e5ddd5] relative">
        {/* Background Image Layer */}
        {activeTab === 'chat' && chatConfig.wallpaper && (
           <div 
             className="absolute inset-0 z-0 bg-cover bg-center opacity-60 pointer-events-none" 
             style={{ backgroundImage: `url(${chatConfig.wallpaper})` }}
           />
        )}
        
        {/* Calling Overlays */}
        {inCall && (
            <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center text-white">
                <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover absolute inset-0 opacity-50" />
                <div className="z-10 flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-8">جاري المكالمة...</h2>
                    <button onClick={endCall} className="bg-red-500 p-4 rounded-full shadow-lg hover:bg-red-600"><PhoneOff size={32}/></button>
                </div>
            </div>
        )}
        
        {incomingCall && !inCall && (
            <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white p-4">
                 <div className="animate-bounce mb-8 p-6 bg-white/10 rounded-full"><Phone size={64} className="text-green-400"/></div>
                 <h2 className="text-3xl font-bold mb-2">{incomingCall.type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية'}</h2>
                 <p className="text-gray-300 mb-12">من شريك حياتك ❤️</p>
                 <div className="flex gap-12">
                     <button onClick={answerCall} className="bg-green-500 p-6 rounded-full hover:scale-110 transition-transform"><PhoneCall size={40}/></button>
                     <button onClick={async () => { await deleteDoc(doc(db, 'calls', incomingCall.id)); setIncomingCall(null); }} className="bg-red-500 p-6 rounded-full hover:scale-110 transition-transform"><PhoneOff size={40}/></button>
                 </div>
            </div>
        )}

        {/* Improved Chat Header */}
        <div className="bg-[#005c4b] text-white shadow-md sticky top-0 z-10">
          <div className="flex justify-between items-center p-2 px-4 pt-safe">
            <div className="flex items-center gap-3">
              <img src={partnerProfile?.photoURL || "https://placehold.co/40"} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight">{partnerProfile?.firstName || 'شريك حياتي'}</span>
                <span className="text-xs text-green-100 opacity-80">
                  {isPartnerTyping ? 'يكتب الآن...' : partnerProfile?.isOnline ? 'متصل الآن' : formatLastSeen(partnerProfile?.lastSeen)}
                </span>
              </div>
            </div>
            <div className="flex gap-4 relative">
                <button onClick={() => startCall('video')}><Video size={22} className="text-white opacity-80 hover:opacity-100"/></button>
                <button onClick={() => startCall('audio')}><Phone size={20} className="text-white opacity-80 hover:opacity-100"/></button>
                <button onClick={() => setShowMenu(!showMenu)}><MoreVertical size={20} className="text-white opacity-80"/></button>
                
                {showMenu && (
                    <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-xl py-2 w-48 text-gray-800 z-50 overflow-hidden animate-fade-in origin-top-left">
                        <div className="relative hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                                <Wallpaper size={18} className="text-rose-500"/>
                                <span className="text-sm font-bold">تغيير الخلفية</span>
                             </div>
                             <div className="absolute inset-0 opacity-0">
                                <FileUploader onUpload={updateWallpaper} label=" " compact={false} />
                             </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex text-center font-bold text-sm bg-[#00473a]">
              <button 
                onClick={() => setActiveTab('chat')} 
                className={`flex-1 py-3 border-b-4 transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'border-white text-white' : 'border-transparent text-white/60 hover:bg-white/5'}`}
              >
                  <MessageSquare size={16}/> المحادثة
              </button>
              <button 
                onClick={() => setActiveTab('memories')} 
                className={`flex-1 py-3 border-b-4 transition-all flex items-center justify-center gap-2 ${activeTab === 'memories' ? 'border-white text-white' : 'border-transparent text-white/60 hover:bg-white/5'}`}
              >
                  <Grid size={16}/> الذكريات
              </button>
              <button 
                onClick={() => setActiveTab('calendar')} 
                className={`flex-1 py-3 border-b-4 transition-all flex items-center justify-center gap-2 ${activeTab === 'calendar' ? 'border-white text-white' : 'border-transparent text-white/60 hover:bg-white/5'}`}
              >
                  <CalendarIcon size={16}/> التقويم
              </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className={`flex-1 overflow-y-auto relative ${!chatConfig.wallpaper ? "bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" : 'bg-transparent'}`}>
          
          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="p-4 space-y-1 pb-24 relative z-10">
               {messages.map((msg, i) => (
                <div key={msg.id || i}>
                    {renderDateSeparator(msg, messages[i-1])}
                    <div className={`flex w-full group ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div 
                        onDoubleClick={() => handleReaction(msg.id, msg.reactions)}
                        className={`max-w-[85%] sm:max-w-[60%] p-2 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.15)] relative text-sm group transition-transform active:scale-95 cursor-pointer ${msg.senderId === user.uid ? 'bg-[#d9fdd3] text-gray-900 rounded-lg rounded-tr-none' : 'bg-white text-gray-900 rounded-lg rounded-tl-none'}`}
                    >
                        {msg.image && <MediaViewer src={msg.image} className="mb-2 rounded-md max-w-full max-h-64 object-cover" />}
                        {msg.audio && <MediaViewer src={msg.audio} type="audio" className="mb-2 w-full" />}
                        {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        
                        <div className="flex items-center justify-between gap-4 mt-1 -mb-1">
                            {/* Delete Button */}
                            {msg.senderId === user.uid && (
                                <button onClick={() => deleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-0.5">
                                    <Trash2 size={12}/>
                                </button>
                            )}
                            <div className="flex items-center gap-1 opacity-60 ml-auto">
                                <span className="text-[10px] min-w-fit">
                                {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                </span>
                                {msg.senderId === user.uid && (
                                    <span>
                                        {msg.status === 'read' ? <CheckCheck size={14} className="text-[#53bdeb]" /> : 
                                        msg.status === 'delivered' ? <CheckCheck size={14} className="text-gray-400" /> : 
                                        <Check size={14} className="text-gray-400" />}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Reactions Display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className={`absolute -bottom-2 ${msg.senderId === user.uid ? '-left-2' : '-right-2'} bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 transform scale-90`}>
                                {Object.values(msg.reactions).map((r: any, idx) => (
                                    <span key={idx} className="text-xs">{r}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}

          {/* MEMORIES TAB */}
          {activeTab === 'memories' && (
              <div className="p-4 pb-24 relative z-10 bg-[#f0f2f5]/90 min-h-full">
                  {/* Love Counter Widget */}
                  <LoveCounter startDate={profile.relationshipStart || ''} />

                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-700">معرض الصور</h3>
                      <div className="relative overflow-hidden group rounded-full">
                         <button className="flex items-center gap-2 text-white font-bold bg-rose-500 px-4 py-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg">
                            <ImageIcon size={18}/> <span>إضافة</span>
                         </button>
                         <div className="absolute inset-0 opacity-0 cursor-pointer">
                            <FileUploader onUpload={addMemory} label=" " compact={false} />
                         </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {memories.map(mem => (
                        <div key={mem.id} className="aspect-square relative group rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
                            <MediaViewer src={mem.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                                <span className="text-[10px] font-mono">{mem.createdAt?.toDate ? mem.createdAt.toDate().toLocaleDateString() : ''}</span>
                                {mem.addedBy === user.uid && (
                                    <button onClick={async () => { if(window.confirm('حذف هذه الذكرى؟')) await deleteDoc(doc(db, 'chats', [user.uid, profile.partnerId].sort().join('_'), 'memories', mem.id))}} className="absolute top-2 left-2 bg-red-500/80 p-1.5 rounded-full hover:bg-red-600">
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (
              <div className="p-4 pb-24 relative z-10 bg-[#f0f2f5]/90 min-h-full">
                  <h3 className="font-bold text-gray-700 mb-4">تقويمنا المشترك</h3>
                  
                  {/* Add Event Form */}
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="اسم المناسبة" className="bg-gray-50 p-2 rounded-xl outline-none" />
                        <input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="bg-gray-50 p-2 rounded-xl outline-none" />
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="المكان (اختياري)" className="flex-1 bg-gray-50 p-2 rounded-xl outline-none" />
                        <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="bg-gray-50 p-2 rounded-xl outline-none">
                            <option value="date">موعد غرامي</option>
                            <option value="anniversary">ذكرى سنوية</option>
                            <option value="trip">رحلة</option>
                            <option value="other">آخر</option>
                        </select>
                      </div>
                      <button onClick={addEvent} disabled={!newEvent.title || !newEvent.date} className="w-full bg-rose-500 text-white p-2 rounded-xl font-bold hover:bg-rose-600 disabled:opacity-50">إضافة الموعد</button>
                  </div>

                  {/* Events List */}
                  <div className="space-y-3">
                      {events.map(ev => (
                          <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-rose-500 flex justify-between items-center group">
                              <div>
                                  <h4 className="font-bold text-gray-900">{ev.title}</h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(ev.date).toLocaleDateString('ar-EG', {weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                                      {ev.location && <span className="flex items-center gap-1"><MapPin size={12}/> {ev.location}</span>}
                                  </div>
                              </div>
                              <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      {events.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد مواعيد قادمة.</p>}
                  </div>
              </div>
          )}

        </div>

        {/* Input Area (Only visible in Chat Tab) */}
        {activeTab === 'chat' && (
            <div className="p-2 px-3 bg-[#f0f2f5] flex items-end gap-2 pb-safe absolute bottom-0 w-full z-20">
            <div className="flex-1 bg-white rounded-2xl flex items-center shadow-sm border border-gray-100 px-2 py-1">
                    <button className="p-2 text-gray-400"><Smile size={24}/></button>
                    <textarea 
                        value={chatMessage} 
                        onChange={e => { setChatMessage(e.target.value); handleTyping(); }} 
                        onKeyPress={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="مراسلة" 
                        className="flex-1 max-h-32 bg-transparent outline-none text-gray-800 p-2 resize-none"
                        rows={1}
                    />
                    <div className="flex items-center gap-1">
                    <div className="text-gray-400 hover:text-gray-600"><FileUploader onUpload={setChatImage} compact /></div>
                    {chatMessage.length === 0 && <div className="text-gray-400 hover:text-gray-600"><AudioRecorder onUpload={(url) => addDoc(collection(db, 'chats', [user.uid, profile.partnerId].sort().join('_'), 'messages'), { audio: url, type: 'audio', senderId: user.uid, createdAt: serverTimestamp() })} /></div>}
                    </div>
            </div>
            <button onClick={sendMessage} className="bg-[#005c4b] text-white p-3 rounded-full shadow-md hover:bg-[#00473a] transition-all active:scale-95 flex items-center justify-center">
                    {chatMessage.length > 0 || chatImage ? <Send size={20} className="rtl:rotate-180 ml-0.5" /> : <Phone size={20} />}
            </button>
            </div>
        )}
      </div>
    );
  }

  // --- Finder View ---
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32 pt-20">
      <div className="text-center mb-12">
         <h2 className="text-3xl font-black text-gray-900 mb-2">اكتشف الحب</h2>
         <p className="text-gray-500">ابحث عن نصفك الآخر في مجتمعنا</p>
         
         <div className="mt-6 relative max-w-lg mx-auto">
            <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="بحث..." 
            className="w-full bg-white p-4 pr-12 rounded-2xl shadow-sm border-none outline-none ring-1 ring-gray-100 focus:ring-rose-200 transition-all text-lg" 
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
         </div>
      </div>

      {requests.length > 0 && (
        <div className="mb-12">
           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell className="text-rose-500"/> طلبات معلقة ({requests.length})</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {requests.map(req => (
               <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold text-xl">
                      {req.fromName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{req.fromName}</h3>
                      <p className="text-xs text-rose-500">يريد الارتباط بك</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequest(req, true)} className="bg-green-500 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:scale-105"><Check size={18}/></button>
                    <button onClick={() => handleRequest(req, false)} className="bg-red-50 text-red-500 w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-100"><X size={18}/></button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
      
      {finderError && <div className="text-center text-red-500 p-4">حدث خطأ في تحميل البيانات</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {users
          .filter(u => !blockedUsers.includes(u.uid))
          .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((u, idx) => (
          <div key={u.uid} onClick={() => setViewUser(u)} className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-gray-100 h-[420px] flex flex-col">
            
            {/* Image Section */}
            <div className="h-[65%] relative overflow-hidden">
                <img 
                    src={u.photoURL || "https://placehold.co/400"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={u.firstName}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                {/* Status Badge */}
                {u.isOnline && (
                    <div className="absolute top-5 left-5 bg-green-500/90 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/20 font-bold tracking-wide">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"/> متصل
                    </div>
                )}

                {/* User Basic Info Overlay */}
                <div className="absolute bottom-0 right-0 p-6 text-white w-full translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-2xl font-black mb-1 leading-tight drop-shadow-sm">{u.firstName} {u.lastName}</h3>
                    <p className="text-sm opacity-90 font-medium flex items-center gap-1 text-gray-200">
                        {u.dob ? `${new Date().getFullYear() - new Date(u.dob).getFullYear()} سنة` : 'العمر غير محدد'}
                    </p>
                </div>
            </div>
            
            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col justify-between bg-white relative">
                {/* Decorative floating button */}
                 <div className="absolute -top-7 left-6 w-14 h-14 bg-white rounded-full p-1 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 z-10">
                    <div className="w-full h-full bg-rose-500 rounded-full flex items-center justify-center text-white">
                        <Heart size={24} className="fill-current"/>
                    </div>
                 </div>

                <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mt-2">
                    {u.bio || "مستخدم جديد في LoverChat، لم يكتب نبذة تعريفية بعد."}
                </p>
                
                <div className="w-full py-3 rounded-2xl bg-gray-50 text-gray-400 font-bold text-sm group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors text-center flex items-center justify-center gap-2 mt-auto">
                    عرض الملف الشخصي
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {users.length === 0 && !finderError && (
         <div className="text-center py-20 text-gray-400">لا يوجد مستخدمين للمطابقة حالياً</div>
      )}

      {/* User Details Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative shadow-2xl">
             <button onClick={() => setViewUser(null)} className="absolute top-4 right-4 z-10 bg-black/20 text-white p-2 rounded-full hover:bg-black/40"><X size={24}/></button>
             
             <div className="h-64 relative">
                <img src={viewUser.coverURL || viewUser.photoURL || "https://placehold.co/300"} className="w-full h-full object-cover" />
                <div className="absolute -bottom-12 right-1/2 translate-x-1/2">
                   <img src={viewUser.photoURL || "https://placehold.co/100"} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"/>
                </div>
             </div>
             
             <div className="pt-16 pb-6 px-6 text-center">
                <h2 className="text-2xl font-black text-gray-900">{viewUser.firstName} {viewUser.lastName}</h2>
                <div className="flex justify-center gap-2 text-sm text-gray-500 mt-1 mb-4">
                    <span>{viewUser.dob ? `${new Date().getFullYear() - new Date(viewUser.dob).getFullYear()} سنة` : 'العمر غير محدد'}</span>
                    <span>•</span>
                    <span>{viewUser.phone}</span>
                </div>
                
                <p className="text-gray-600 leading-relaxed mb-8 bg-gray-50 p-4 rounded-2xl text-sm min-h-[80px]">
                    {viewUser.bio || "لم يكتب نبذة تعريفية بعد."}
                </p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => sendRequest(viewUser.uid)} 
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                    >
                        <HeartHandshake size={20} /> <span>طلب ارتباط</span>
                    </button>
                    <button 
                        onClick={() => blockUser(viewUser.uid)}
                        className="text-red-500 text-sm font-bold flex items-center justify-center gap-1 hover:bg-red-50 p-2 rounded-lg"
                    >
                        <Ban size={16}/> <span>حظر المستخدم</span>
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};