import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { Bell, Check } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const Notifications = () => {
    const { user } = useAuth();
    const [notifs, setNotifs] = useState<any[]>([]);
  
    useEffect(() => {
      if (!user) return;
      
      const q = query(collection(db, 'notifications'), where('to', '==', user.uid), orderBy('createdAt', 'desc'), limit(50));
      
      const unsubscribe = onSnapshot(q, snap => {
        const fetchedNotifs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setNotifs(fetchedNotifs);

        // Mark unread notifications as read automatically
        const unreadDocs = snap.docs.filter(d => !d.data().read);
        if (unreadDocs.length > 0) {
            const batch = writeBatch(db);
            unreadDocs.forEach(d => {
                batch.update(doc(db, 'notifications', d.id), { read: true });
            });
            // Execute batch write silently
            batch.commit().catch(e => console.error("Error marking read:", e));
        }
      }, (e) => {});

      return unsubscribe;
    }, [user]);
  
    return (
      <div className="max-w-2xl mx-auto p-4 pb-24 pt-20 md:pt-4">
         <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-gray-900"><Bell className="text-rose-600" size={28}/> الإشعارات</h2>
         <div className="space-y-3">
            {notifs.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Bell size={64} className="mx-auto mb-4 text-gray-300"/>
                    <p className="text-gray-500">لا توجد إشعارات جديدة</p>
                </div>
            ) : notifs.map(n => (
                <div key={n.id} className={`bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-center transition-colors ${!n.read ? 'border-rose-200 bg-rose-50/50' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <img src={n.fromPhoto || "https://placehold.co/40"} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    <div className="flex-1">
                        <p className="text-gray-900 text-sm leading-relaxed">
                            <span className="font-bold">{n.fromName}</span> 
                            {n.type === 'like' && ' أعجب بمنشورك ❤️'}
                            {n.type === 'comment' && ' علق على منشورك 💬'}
                            {n.type === 'request' && ' أرسل لك طلب ارتباط 💍'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{n.content}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                </div>
            ))}
         </div>
      </div>
    );
};