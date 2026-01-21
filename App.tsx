import React, { useState, useEffect } from 'react';
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Heart, Home, Bell, User, Shield, LogOut, Ban, Menu, Settings as SettingsIcon } from 'lucide-react';
import { auth, db } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Feed } from './pages/Feed';
import { LoversWorld } from './pages/LoversWorld';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { Settings } from './pages/Settings';

const Navigation = ({ view, setView }: any) => {
  const { user, profile } = useAuth();
  const [badges, setBadges] = useState({ requests: 0, admin: 0, notifs: 0, chat: 0 });
  
  useEffect(() => {
    if (!profile) return;
    
    // 1. Friend/Relationship Requests (For Singles)
    const u1 = onSnapshot(query(collection(db, 'requests'), where('to', '==', user.uid), where('status', '==', 'pending')), s => setBadges(b => ({...b, requests: s.size})), e=>{});
    
    // 2. Notifications (For Everyone)
    const u2 = onSnapshot(query(collection(db, 'notifications'), where('to', '==', user.uid), where('read', '==', false)), s => setBadges(b => ({...b, notifs: s.size})), e=>{});

    // 3. Chat Unread Messages (For Taken)
    let u3 = () => {};
    if (profile.status === 'taken' && profile.partnerId) {
        const chatId = [user.uid, profile.partnerId].sort().join('_');
        // Fixed: Use '==' for senderId instead of '!=' to avoid "multiple inequality filters" error
        const qChat = query(
            collection(db, 'chats', chatId, 'messages'), 
            where('senderId', '==', profile.partnerId), 
            where('status', '!=', 'read')
        );
        u3 = onSnapshot(qChat, s => setBadges(b => ({...b, chat: s.size})), e=>{});
    }

    return () => { u1(); u2(); u3(); };
  }, [profile]);

  // Determine which badge to show on the "Lovers" tab
  const loversBadge = profile?.status === 'taken' ? badges.chat : badges.requests;

  const navs = [
    {id: 'feed', icon: Home, label: 'الرئيسية'},
    {id: 'lovers', icon: Heart, label: 'المحبين', b: loversBadge},
    {id: 'notifications', icon: Bell, label: 'تنبيهات', b: badges.notifs},
    {id: 'profile', icon: User, label: 'ملفي'},
    {id: 'settings', icon: SettingsIcon, label: 'إعدادات'},
  ];
  if (profile?.role === 'admin') navs.push({id: 'admin', icon: Shield, label: 'إدارة', b: 0});

  return (
    <>
      {/* Top Bar for Mobile */}
      <div className="md:hidden fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-rose-600 flex items-center gap-2">
            <Heart className="fill-rose-600 text-rose-600" size={24} />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-500">LoverChat</span>
        </h1>
        <button onClick={() => signOut(auth)} className="bg-gray-50 p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={20}/>
        </button>
      </div>

      {/* Bottom Floating Nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="bg-gray-900/90 backdrop-blur-lg text-white rounded-3xl shadow-2xl shadow-rose-900/20 px-6 py-4 flex justify-between items-center border border-white/10 overflow-x-auto no-scrollbar">
            {navs.map(n => (
                <button 
                    key={n.id} 
                    onClick={()=>setView(n.id)} 
                    className={`relative flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px] ${view===n.id ? 'text-rose-400 -translate-y-1' : 'text-gray-400 hover:text-white'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${view===n.id ? 'bg-white/10' : ''}`}>
                        <n.icon size={24} className={view===n.id ? 'fill-current' : ''} />
                    </div>
                    {n.b > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-gray-900 rounded-full animate-pulse"></span>
                    )}
                </button>
            ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col fixed right-0 top-0 h-screen w-72 bg-white border-l border-gray-100 p-6 z-50 shadow-lg">
        <h1 className="text-3xl font-black text-rose-600 mb-10 flex items-center gap-3">
            <Heart className="fill-rose-600" size={32}/>
            <span>LoverChat</span>
        </h1>
        
        <div className="flex flex-col gap-2 flex-1">
            {navs.map(n => (
                <button 
                    key={n.id} 
                    onClick={()=>setView(n.id)} 
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${view===n.id ? 'bg-rose-50 text-rose-600 shadow-sm translate-x-2' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <div className="relative">
                        <n.icon size={24} className={view===n.id ? 'fill-current' : ''} />
                        {n.b > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{n.b}</span>}
                    </div>
                    {n.label}
                </button>
            ))}
        </div>

        <button onClick={()=>signOut(auth)} className="flex items-center gap-3 px-6 py-4 rounded-2xl text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 transition-all">
            <LogOut size={24}/> تسجيل الخروج
        </button>
      </div>
    </>
  );
};

export const App = () => {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState('feed');

  if (loading) return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
          <Heart size={64} className="text-rose-500 animate-bounce mb-4 fill-rose-500" />
          <p className="text-gray-400 font-bold animate-pulse">جاري التحميل...</p>
      </div>
  );
  
  if (!user || !profile) return <AuthPage />;
  if (profile.isBanned) return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="bg-red-100 p-6 rounded-full mb-6">
              <Ban size={64} className="text-red-600"/>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">تم حظر حسابك</h1>
          <p className="text-gray-500 mb-8 max-w-md">نأسف، ولكن تم إيقاف حسابك لانتهاك سياسات مجتمع المحبين.</p>
          <button onClick={()=>signOut(auth)} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all">تسجيل الخروج</button>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 md:pr-72 pb-32 md:pb-0">
      <Navigation view={view} setView={setView} />
      <main className="animate-fade-in-up">
          {view === 'feed' && <Feed />}
          {view === 'lovers' && <LoversWorld />}
          {view === 'notifications' && <Notifications />}
          {view === 'profile' && <Profile />}
          {view === 'settings' && <Settings />}
          {view === 'admin' && profile.role === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
};