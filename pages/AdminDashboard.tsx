import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, where } from "firebase/firestore";
import { Shield, Trash2, Lock, UserPlus, Users, FileText, Check, X, Flag } from 'lucide-react';
import { db } from '../firebase';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [dobRequests, setDobRequests] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [regOpen, setRegOpen] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => d.data())), e => console.warn(e));
    const u2 = onSnapshot(query(collection(db, 'requests'), where('type', '==', 'dob_change')), s => setDobRequests(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    const u3 = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), s => setAllPosts(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    const u4 = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), s => setReports(s.docs.map(d => ({id:d.id, ...d.data()}))), e => console.warn(e));
    getDoc(doc(db, 'settings', 'config')).then(s => s.exists() && setRegOpen(s.data().registrationOpen));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const toggleBan = async (uid: string, v: boolean) => updateDoc(doc(db, 'users', uid), { isBanned: !v });
  const handleDob = async (req: any, ok: boolean) => { if(ok) await updateDoc(doc(db, 'users', req.uid), { dob: req.newDob }); await deleteDoc(doc(db, 'requests', req.id)); };
  const toggleReg = async () => { await setDoc(doc(db, 'settings', 'config'), { registrationOpen: !regOpen }, { merge: true }); setRegOpen(!regOpen); };
  const resolveReport = async (reportId: string, postId: string, deletePost: boolean) => {
      if (deletePost) await deleteDoc(doc(db, 'posts', postId));
      await deleteDoc(doc(db, 'reports', reportId));
  };

  return (
    <div className="p-6 pb-24 max-w-6xl mx-auto font-sans">
      <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-rose-100 rounded-full">
            <Shield className="text-rose-600 w-8 h-8" /> 
          </div>
          <h1 className="text-3xl font-black text-gray-900">لوحة التحكم</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-gray-500 font-medium mb-1">المستخدمين</h3>
                      <p className="text-4xl font-bold text-gray-900">{users.length}</p>
                  </div>
                  <Users className="text-blue-500 bg-blue-50 p-2 rounded-lg w-10 h-10" />
              </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-gray-500 font-medium mb-1">المنشورات</h3>
                      <p className="text-4xl font-bold text-gray-900">{allPosts.length}</p>
                  </div>
                  <FileText className="text-purple-500 bg-purple-50 p-2 rounded-lg w-10 h-10" />
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-gray-500 font-medium mb-1">بلاغات</h3>
                      <p className="text-4xl font-bold text-red-600">{reports.length}</p>
                  </div>
                  <Flag className="text-red-500 bg-red-50 p-2 rounded-lg w-10 h-10" />
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
              <div>
                  <h3 className="text-gray-500 font-medium mb-1">حالة التسجيل</h3>
                  <p className={`text-2xl font-bold ${regOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {regOpen ? 'مفتوح' : 'مغلق'}
                  </p>
              </div>
              <button 
                onClick={toggleReg} 
                className={`p-3 rounded-xl transition-colors ${regOpen ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
              >
                  {regOpen ? <Lock size={24}/> : <UserPlus size={24}/>}
              </button>
          </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl w-fit border border-gray-200 shadow-sm overflow-x-auto">
          <button onClick={()=>setActiveTab('users')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab==='users'?'bg-gray-900 text-white shadow-md':'text-gray-600 hover:bg-gray-50'}`}>المستخدمين</button>
          <button onClick={()=>setActiveTab('posts')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab==='posts'?'bg-gray-900 text-white shadow-md':'text-gray-600 hover:bg-gray-50'}`}>المنشورات</button>
          <button onClick={()=>setActiveTab('reports')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab==='reports'?'bg-gray-900 text-white shadow-md':'text-gray-600 hover:bg-gray-50'}`}>البلاغات ({reports.length})</button>
          <button onClick={()=>setActiveTab('reqs')} className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab==='reqs'?'bg-gray-900 text-white shadow-md':'text-gray-600 hover:bg-gray-50'}`}>الطلبات ({dobRequests.length})</button>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'users' && (
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase">
                        <tr>
                            <th className="p-4">المستخدم</th>
                            <th className="p-4">البريد الإلكتروني</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                            <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 flex items-center gap-3">
                                    <img src={u.photoURL || "https://placehold.co/40"} className="w-10 h-10 rounded-full object-cover shadow-sm"/>
                                    <div>
                                        <p className="font-bold text-gray-900">{u.firstName} {u.lastName}</p>
                                        <span className="text-xs text-gray-500">{u.role}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">{u.email}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {u.isBanned ? 'محظور' : 'نشط'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={()=>toggleBan(u.uid, u.isBanned)} 
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${u.isBanned ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                    >
                                        {u.isBanned ? 'فك الحظر' : 'حظر'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'posts' && (
            <div className="divide-y divide-gray-100">
                {allPosts.map(p => (
                    <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <img src={p.authorPhoto} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                            <div>
                                <p className="font-bold text-gray-900">{p.authorName}</p>
                                <p className="text-gray-600 text-sm line-clamp-1 max-w-md">{p.text || 'صورة/فيديو فقط'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={()=>window.confirm('هل أنت متأكد من حذف هذا المنشور؟')&&deleteDoc(doc(db,'posts',p.id))} 
                            className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <Trash2 size={20}/>
                        </button>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="divide-y divide-gray-100">
                {reports.length === 0 && <p className="p-8 text-center text-gray-400">لا توجد بلاغات</p>}
                {reports.map(r => (
                    <div key={r.id} className="p-4 flex justify-between items-center bg-red-50/30">
                        <div>
                            <p className="font-bold text-red-600 flex items-center gap-2"><Flag size={16}/> بلاغ عن منشور</p>
                            <p className="text-sm text-gray-500">معرف المنشور: {r.postId}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>resolveReport(r.id, r.postId, true)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 text-sm">حذف المنشور وإغلاق</button>
                            <button onClick={()=>resolveReport(r.id, r.postId, false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 text-sm">تجاهل البلاغ</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'reqs' && (
            <div className="divide-y divide-gray-100">
                {dobRequests.length === 0 && <p className="p-8 text-center text-gray-400">لا توجد طلبات معلقة</p>}
                {dobRequests.map(r => (
                    <div key={r.id} className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-900">{r.userName}</p>
                            <p className="text-sm text-gray-500">يريد تغيير تاريخ الميلاد إلى: <span className="text-gray-900 font-mono font-bold">{r.newDob}</span></p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>handleDob(r,true)} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 flex items-center gap-2"><Check size={16}/> موافقة</button>
                            <button onClick={()=>handleDob(r,false)} className="bg-red-100 text-red-500 px-4 py-2 rounded-lg font-bold hover:bg-red-200 flex items-center gap-2"><X size={16}/> رفض</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};