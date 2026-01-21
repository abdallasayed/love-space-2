import React, { useState } from 'react';
import { updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { Settings as SettingsIcon, Lock, Trash2, Eye, EyeOff, Save, AlertTriangle, LogOut, HeartCrack } from 'lucide-react';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const Settings = () => {
  const { user, profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // Needed for re-auth
  const [privacy, setPrivacy] = useState({
    showOnline: profile?.isOnline !== false, // default true
  });
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    setLoading(true);
    try {
      if (user) await updatePassword(user, newPassword);
      alert("تم تحديث كلمة المرور بنجاح");
      setNewPassword('');
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        alert("يجب تسجيل الخروج والدخول مرة أخرى لتغيير كلمة المرور لأسباب أمنية.");
      } else {
        alert("حدث خطأ: " + e.message);
      }
    }
    setLoading(false);
  };

  const handleDisconnectPartner = async () => {
      if (!profile?.partnerId) return;
      const confirm = window.prompt("هل أنت متأكد من إنهاء الارتباط؟ سيتم تحويل حالة حسابك وحساب شريكك إلى 'أعزب'. أكتب 'إنهاء' للتأكيد:");
      if (confirm === 'إنهاء') {
          try {
              const batch = writeBatch(db);
              
              // Reset current user
              const myRef = doc(db, 'users', user.uid);
              batch.update(myRef, { status: 'single', partnerId: null, relationshipStart: null });

              // Reset partner
              const partnerRef = doc(db, 'users', profile.partnerId);
              batch.update(partnerRef, { status: 'single', partnerId: null, relationshipStart: null });
              
              await batch.commit();
              alert("تم إنهاء الارتباط بنجاح.");
          } catch (e: any) {
              alert("حدث خطأ: " + e.message);
          }
      }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.prompt("هل أنت متأكد تماماً؟ سيتم حذف حسابك وجميع بياناتك نهائياً. أكتب 'حذف' للتأكيد:");
    if (confirm === 'حذف' && user) {
        try {
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(user);
        } catch (e: any) {
            alert("حدث خطأ أثناء الحذف: " + e.message);
        }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32 pt-20 md:pt-4 font-sans">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-gray-900">
          <SettingsIcon className="text-gray-600" size={32}/> الإعدادات
      </h2>

      <div className="space-y-6">
        {/* Relationship Management (Only if taken) */}
        {profile?.status === 'taken' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800"><HeartCrack size={20} className="text-gray-500"/> إدارة العلاقة</h3>
                <p className="text-sm text-gray-500 mb-4">إنهاء الارتباط سيجعل حسابك وحساب شريكك "أعزب" مرة أخرى.</p>
                <button 
                    onClick={handleDisconnectPartner}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-all w-full flex items-center justify-center gap-2"
                >
                    إنهاء الارتباط الحالي
                </button>
            </div>
        )}

        {/* Account Security */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800"><Lock size={20} className="text-rose-500"/> الأمان وكلمة المرور</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-500 mb-1 block">كلمة المرور الجديدة</label>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:border-rose-300"
                        placeholder="أدخل كلمة المرور الجديدة..."
                    />
                </div>
                <button 
                    onClick={handleUpdatePassword}
                    disabled={loading || !newPassword}
                    className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-all"
                >
                    {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </button>
            </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-700"><AlertTriangle size={20}/> منطقة الخطر</h3>
            <p className="text-red-600/80 text-sm mb-4">حذف الحساب هو إجراء نهائي لا يمكن التراجع عنه. سيتم حذف جميع صورك ومنشوراتك.</p>
            <button 
                onClick={handleDeleteAccount}
                className="bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all w-full flex items-center justify-center gap-2"
            >
                <Trash2 size={20}/> حذف حسابي نهائياً
            </button>
        </div>

        {/* App Info */}
        <div className="text-center text-gray-400 text-sm mt-8">
            <p>LoverChat v1.1.0</p>
            <p>جميع الحقوق محفوظة © 2026</p>
        </div>
      </div>
    </div>
  );
};