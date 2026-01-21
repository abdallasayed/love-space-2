import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, getDocs, collection, limit, query } from "firebase/firestore";
import { Heart } from 'lucide-react';
import { auth, db, UserProfile } from '../firebase';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', 
    firstName: '', lastName: '', phone: '', dob: ''
  });
  const [error, setError] = useState('');
  const [regOpen, setRegOpen] = useState(true);

  useEffect(() => {
    // Check registration status, silently fail if permission denied
    getDoc(doc(db, 'settings', 'config')).then(snap => {
      if (snap.exists()) {
        setRegOpen(snap.data().registrationOpen !== false);
      }
    }).catch((err) => {
       console.log("Settings read error (likely permissions), defaulting to open.");
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        if (!regOpen) throw new Error("التسجيل مغلق حالياً من قبل الإدارة");
        if (formData.password !== formData.confirmPassword) throw new Error("كلمتا المرور غير متطابقتين");
        
        // Check if this is the first user ever
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        const role: 'admin' | 'user' = usersSnap.empty ? 'admin' : 'user';

        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        const profileData: UserProfile = {
          uid: cred.user.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dob: formData.dob,
          role, // Set dynamically based on existing users
          status: 'single',
          createdAt: serverTimestamp(),
          isBanned: false,
          isOnline: true,
          bio: '',
          photoURL: "https://ucarecdn.com/8a65e90d-c010-4443-851f-56540b017770/" 
        };

        await setDoc(doc(db, 'users', cred.user.uid), profileData);
        await updateAuthProfile(cred.user, { displayName: `${formData.firstName} ${formData.lastName}` });
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "حدث خطأ غير متوقع";
      if (err.code === 'auth/email-already-in-use') msg = "البريد الإلكتروني مستخدم بالفعل";
      if (err.code === 'auth/weak-password') msg = "كلمة المرور ضعيفة";
      if (err.code === 'auth/invalid-email') msg = "البريد الإلكتروني غير صالح";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = "البريد أو كلمة المرور خطأ";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-100 to-rose-200 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-rose-100">
        <h1 className="text-3xl font-bold text-center text-rose-600 mb-6 flex items-center justify-center gap-2">
          <Heart className="fill-current" /> LoverChat
        </h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input required name="firstName" placeholder="الاسم الأول" onChange={handleChange} className="p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none w-full" />
                <input required name="lastName" placeholder="اسم العائلة" onChange={handleChange} className="p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none w-full" />
              </div>
              <input required name="phone" placeholder="رقم الهاتف" type="tel" onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none" />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 mr-1">تاريخ الميلاد</label>
                <input required name="dob" type="date" onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none" />
              </div>
            </>
          )}
          <input required name="email" placeholder="البريد الإلكتروني" type="email" onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none" />
          <input required name="password" placeholder="كلمة المرور" type="password" onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none" />
          {!isLogin && (
            <input required name="confirmPassword" placeholder="تأكيد كلمة المرور" type="password" onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-rose-300 outline-none" />
          )}
          <button type="submit" className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition shadow-lg shadow-rose-200">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </button>
        </form>
        <p className="text-center mt-6 text-gray-600 text-sm">
          {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"} 
          <button onClick={() => setIsLogin(!isLogin)} className="text-rose-600 font-bold mr-2 hover:underline">
            {isLogin ? "سجل الآن" : "سجل الدخول"}
          </button>
        </p>
      </div>
    </div>
  );
};