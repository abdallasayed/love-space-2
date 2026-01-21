import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc, query, where, getDocs, limit, writeBatch } from "firebase/firestore";
import { Phone, Calendar, Camera, Edit3, Heart, Bookmark, Grid } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileUploader, MediaViewer } from '../components/Shared';

export const Profile = () => {
  const { profile, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<any>({});
  const [tab, setTab] = useState<'info' | 'saved'>('info');
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  
  useEffect(() => { 
      if (profile) {
          setData(profile); 
          if(tab === 'saved') fetchSavedPosts();
      }
  }, [profile, tab]);

  const fetchSavedPosts = async () => {
      if(!profile) return;
      const userDoc = await getDoc(doc(db, 'users', profile.uid));
      const savedIds = userDoc.data()?.savedPosts || [];
      if(savedIds.length === 0) { setSavedPosts([]); return; }
      
      const posts: any[] = [];
      for(const id of savedIds) {
          const p = await getDoc(doc(db, 'posts', id));
          if(p.exists()) posts.push({id: p.id, ...p.data()});
      }
      setSavedPosts(posts);
  };

  const handleSave = async () => {
    if (editing) {
      if (!profile || !user) return;
      try {
          // 1. Update User Profile
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, {
            firstName: data.firstName, 
            lastName: data.lastName, 
            phone: data.phone, 
            photoURL: data.photoURL, 
            bio: data.bio || '',
            coverURL: data.coverURL || '',
            relationshipStart: data.relationshipStart || null
          });

          // 2. Sync changes to recent posts (Batch update to keep data consistent)
          const newFullName = `${data.firstName} ${data.lastName}`;
          if (newFullName !== `${profile.firstName} ${profile.lastName}` || data.photoURL !== profile.photoURL) {
              const batch = writeBatch(db);
              const q = query(collection(db, 'posts'), where('uid', '==', user.uid), limit(20)); // Limit to 20 to avoid exceeding batch limits
              const snaps = await getDocs(q);
              
              snaps.forEach(d => {
                  batch.update(d.ref, {
                      authorName: newFullName,
                      authorPhoto: data.photoURL
                  });
              });
              await batch.commit();
          }

          if (data.dob !== profile?.dob) {
              await addDoc(collection(db, 'requests'), { 
                  uid: profile?.uid, 
                  userName: `${profile?.firstName}`, 
                  type: 'dob_change', 
                  newDob: data.dob, 
                  status: 'pending', 
                  createdAt: serverTimestamp() 
              });
              alert("تم إرسال طلب تغيير تاريخ الميلاد للإدارة");
          }
          setEditing(false);
      } catch(e) {
          console.error(e);
          alert("حدث خطأ أثناء الحفظ");
      }
    } else {
      setEditing(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 pt-20 md:pt-4">
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="h-56 bg-gradient-to-r from-rose-400 to-orange-400 relative">
          {data.coverURL && <img src={data.coverURL} className="w-full h-full object-cover" />}
          {editing && (
             <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full cursor-pointer hover:bg-black/70 flex items-center gap-2">
                <FileUploader onUpload={(url) => setData({...data, coverURL: url})} label=" " compact/>
                <Camera size={16}/> <span>تغيير الغلاف</span>
             </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-8 pb-10">
          {/* Avatar */}
          <div className="absolute -top-20 right-1/2 translate-x-1/2">
             <div className="relative w-40 h-40">
                <img src={data.photoURL || "https://placehold.co/150"} className="w-full h-full rounded-full border-[6px] border-white object-cover shadow-lg" />
                {editing && (
                    <div className="absolute bottom-2 right-2 bg-gray-900 text-white rounded-full p-2.5 shadow-lg cursor-pointer border-2 border-white hover:scale-110 transition-transform">
                        <FileUploader onUpload={(url) => setData({...data, photoURL: url})} circular compact/>
                        <Camera size={18} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
                    </div>
                )}
             </div>
          </div>

          <div className="pt-24 text-center">
            {editing ? (
               <div className="space-y-4 mt-6 text-right max-w-md mx-auto">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">الاسم الأول</label>
                        <input value={data.firstName} onChange={e => setData({...data, firstName: e.target.value})} className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full outline-none focus:border-rose-300" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">اسم العائلة</label>
                        <input value={data.lastName} onChange={e => setData({...data, lastName: e.target.value})} className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full outline-none focus:border-rose-300" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">الهاتف</label>
                    <input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full outline-none focus:border-rose-300" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">نبذة عنك</label>
                    <textarea value={data.bio} onChange={e => setData({...data, bio: e.target.value})} className="border border-gray-200 bg-gray-50 p-3 rounded-xl w-full h-24 resize-none outline-none focus:border-rose-300" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">تاريخ الميلاد (للمراجعة)</label>
                    <input type="date" value={data.dob} onChange={e => setData({...data, dob: e.target.value})} className="border border-gray-200 bg-yellow-50 p-3 rounded-xl w-full outline-none" />
                 </div>
                 {profile?.status === 'taken' && (
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-rose-500">تاريخ بدء الارتباط (لعداد الحب)</label>
                        <input type="datetime-local" value={data.relationshipStart || ''} onChange={e => setData({...data, relationshipStart: e.target.value})} className="border border-rose-200 bg-rose-50 p-3 rounded-xl w-full outline-none" />
                     </div>
                 )}
               </div>
            ) : (
              <>
                <h2 className="text-3xl font-black text-gray-900 mb-1">{profile?.firstName} {profile?.lastName}</h2>
                <div className="flex items-center justify-center gap-2 mb-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        {profile?.role === 'admin' ? 'مدير التطبيق' : 'مستخدم'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">نشط</span>
                    {profile?.status === 'taken' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 flex items-center gap-1"><Heart size={12} className="fill-current"/> مرتبط</span>}
                </div>
                
                <p className="text-gray-600 max-w-sm mx-auto leading-relaxed text-lg mb-8">{profile?.bio || "لا توجد نبذة تعريفية... قم بتحديث ملفك!"}</p>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl">
                        <Phone size={24} className="text-rose-500 mb-2"/> 
                        <span className="font-bold text-gray-800">{profile?.phone}</span>
                        <span className="text-xs text-gray-400">الهاتف</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl">
                        <Calendar size={24} className="text-rose-500 mb-2"/> 
                        <span className="font-bold text-gray-800">{profile?.dob}</span>
                        <span className="text-xs text-gray-400">الميلاد</span>
                    </div>
                </div>
              </>
            )}
            <button 
                onClick={handleSave} 
                className={`mt-10 px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 mx-auto min-w-[200px] ${editing ? 'bg-gray-900 text-white hover:bg-black' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
            >
                {editing ? 'حفظ التغييرات' : <><Edit3 size={18}/> تعديل الملف</>}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button onClick={() => setTab('info')} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${tab === 'info' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Grid size={18}/> بيانات
            </button>
            <button onClick={() => setTab('saved')} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${tab === 'saved' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Bookmark size={18}/> المحفوظات
            </button>
          </div>
      </div>

      {tab === 'saved' && (
          <div className="space-y-4">
              {savedPosts.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                      <Bookmark size={48} className="mx-auto mb-2 text-gray-300"/>
                      <p>لا توجد منشورات محفوظة</p>
                  </div>
              ) : (
                  savedPosts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex gap-4">
                        {post.image && <img src={post.image} className="w-24 h-24 rounded-xl object-cover" />}
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{post.authorName}</h4>
                            <p className="text-gray-600 text-sm line-clamp-2">{post.text}</p>
                        </div>
                    </div>
                  ))
              )}
          </div>
      )}
    </div>
  );
};