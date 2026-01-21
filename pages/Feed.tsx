import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, deleteDoc, arrayRemove, arrayUnion, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { Send, Edit2, Trash2, Heart, MessageCircle, XCircle, Plus, CornerDownLeft, MoreHorizontal, Image as ImageIcon, Share2, Smile, Bookmark, Flag, MoreVertical, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileUploader, MediaViewer } from '../components/Shared';

const Stories = () => {
    const { user, profile } = useAuth();
    const [stories, setStories] = useState<any[]>([]);
    const [viewStory, setViewStory] = useState<any>(null);

    useEffect(() => {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(50));
        return onSnapshot(q, snap => {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            const validStories = snap.docs.map(d => ({id: d.id, ...d.data()})).filter((s: any) => {
                if (!s.createdAt) return true;
                const storyTime = s.createdAt.toDate ? s.createdAt.toDate().getTime() : Date.now();
                return (now - storyTime) < oneDay;
            });
            
            const filteredStories = profile?.blocked 
                ? validStories.filter((s: any) => !profile.blocked.includes(s.uid))
                : validStories;

            setStories(filteredStories);
        }, e => {});
    }, [profile]);

    const addStory = async (url: string) => {
        if (!profile) return;
        await addDoc(collection(db, 'stories'), {
            uid: user.uid,
            username: profile.firstName,
            userPhoto: profile.photoURL,
            media: url,
            createdAt: serverTimestamp(),
            viewers: []
        });
    };

    return (
        <div className="mb-6 pt-20 md:pt-8 animate-fade-in-down">
            <div className="flex gap-4 overflow-x-auto pb-4 px-4 no-scrollbar items-center">
                <div className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group relative">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full border-2 border-dashed border-rose-300 flex items-center justify-center bg-white relative overflow-hidden shadow-sm group-hover:border-rose-500 transition-all duration-300 group-hover:scale-105">
                         <div className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full">
                            <div className="transform scale-[3] opacity-0">
                                <FileUploader onUpload={addStory} compact />
                            </div>
                         </div>
                         <Plus className="text-rose-500" size={28} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">قصتك</span>
                    <div className="absolute -bottom-1 -right-1 bg-rose-500 rounded-full p-1 border-2 border-white pointer-events-none">
                        <Plus size={10} className="text-white"/>
                    </div>
                </div>
                
                {stories.map(story => (
                    <button key={story.id} onClick={() => setViewStory(story)} className="flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-300 hover:scale-105">
                        <div className="w-[4.5rem] h-[4.5rem] rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 shadow-md">
                            <div className="w-full h-full rounded-full p-[2px] bg-white">
                                <img src={story.userPhoto} className="w-full h-full rounded-full object-cover" />
                            </div>
                        </div>
                        <span className="text-xs truncate w-20 text-center font-bold text-gray-700 group-hover:text-rose-600 transition-colors">{story.username}</span>
                    </button>
                ))}
            </div>

            {viewStory && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center animate-fade-in backdrop-blur-xl">
                    <button onClick={() => setViewStory(null)} className="absolute top-6 right-6 text-white p-2 z-20 hover:bg-white/10 rounded-full transition-colors"><XCircle size={40}/></button>
                    <div className="relative w-full max-w-md h-full md:h-auto md:max-h-[80vh] md:aspect-[9/16] flex items-center justify-center">
                        <MediaViewer src={viewStory.media} className="w-full h-full object-contain md:rounded-3xl shadow-2xl" />
                        <div className="absolute top-4 left-4 flex items-center gap-3 text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                             <img src={viewStory.userPhoto} className="w-10 h-10 rounded-full border-2 border-white/50" />
                             <span className="font-bold">{viewStory.username}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Feed = () => {
  const { user, profile, sendNotification } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      let fetchedPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (profile?.blocked && profile.blocked.length > 0) {
          fetchedPosts = fetchedPosts.filter((p: any) => !profile.blocked.includes(p.uid));
      }
      setPosts(fetchedPosts);
    }, (e) => console.warn("Feed permissions warning", e));
  }, [profile]);

  useEffect(() => {
      if(!user) return;
      getDoc(doc(db, 'users', user.uid)).then(d => {
          if(d.exists()) setSavedPosts(d.data().savedPosts || []);
      });
  }, [user]);

  const handlePost = async () => {
    if ((!newPostText.trim() && !newPostImage) || !profile) return;
    try {
      await addDoc(collection(db, 'posts'), {
        uid: profile.uid,
        authorName: `${profile.firstName} ${profile.lastName}`,
        authorPhoto: profile.photoURL,
        text: newPostText,
        image: newPostImage,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      setNewPostText('');
      setNewPostImage('');
    } catch (e) {
      alert("خطأ في النشر.");
    }
  };

  const handleUpdatePost = async (postId: string) => {
    await updateDoc(doc(db, 'posts', postId), { text: editText });
    setEditingPost(null);
  };

  const handleLike = async (post: any) => {
    if (!profile) return;
    const isLiked = post.likes?.includes(profile.uid);
    setPosts(currentPosts => currentPosts.map(p => {
        if (p.id === post.id) {
            const currentLikes = p.likes || [];
            return {
                ...p,
                likes: isLiked ? currentLikes.filter((uid:string) => uid !== profile.uid) : [...currentLikes, profile.uid]
            };
        }
        return p;
    }));
    const postRef = doc(db, 'posts', post.id);
    try {
        if (isLiked) {
            await updateDoc(postRef, { likes: arrayRemove(profile.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(profile.uid) });
            if (post.uid !== profile.uid) sendNotification(post.uid, 'like', 'أعجب بمنشورك ❤️');
        }
    } catch (e) { console.error("Like failed", e); }
  };

  const handleSavePost = async (postId: string) => {
      if(!user) return;
      const isSaved = savedPosts.includes(postId);
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
          setSavedPosts(prev => prev.filter(id => id !== postId));
          await updateDoc(userRef, { savedPosts: arrayRemove(postId) });
      } else {
          setSavedPosts(prev => [...prev, postId]);
          await updateDoc(userRef, { savedPosts: arrayUnion(postId) });
      }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("حذف المنشور؟")) await deleteDoc(doc(db, 'posts', postId));
  };

  const handleReportPost = async (postId: string) => {
      if (!window.confirm("هل تريد الإبلاغ عن هذا المنشور للإدارة؟")) return;
      try {
          await addDoc(collection(db, 'reports'), { postId, reportedBy: user.uid, createdAt: serverTimestamp(), status: 'pending' });
          alert("تم استلام بلاغك وسيقوم المدير بمراجعته.");
      } catch(e) { alert("حدث خطأ"); }
  };

  const toggleCommentBox = (postId: string) => {
      if (activeCommentPostId === postId) {
          setActiveCommentPostId(null);
      } else {
          setActiveCommentPostId(postId);
          setCommentText('');
      }
  };

  const submitComment = async (post: any) => {
    if (!commentText.trim() || !profile) return;
    const newComment = {
        id: Date.now().toString(),
        uid: profile.uid,
        authorName: `${profile.firstName} ${profile.lastName}`,
        authorPhoto: profile.photoURL,
        text: commentText,
        createdAt: Date.now(),
        replies: []
    };
    try {
        await updateDoc(doc(db, 'posts', post.id), { comments: arrayUnion(newComment) });
        if (post.uid !== profile.uid) sendNotification(post.uid, 'comment', 'علق على منشورك 💬');
        setCommentText('');
    } catch (e) { console.error("Comment failed", e); }
  };

  const handleReply = async (postId: string, commentId: string) => {
    const text = prompt("أكتب ردك:");
    if (text && profile) {
      const currentPost = posts.find(p => p.id === postId);
      const newReply = {
        id: Date.now().toString(),
        uid: profile.uid,
        authorName: `${profile.firstName} ${profile.lastName}`,
        authorPhoto: profile.photoURL,
        text,
        createdAt: Date.now()
      };
      if (currentPost) {
          const updatedComments = currentPost.comments.map((c: any) => {
              if (c.id === commentId) return { ...c, replies: [...(c.replies || []), newReply] };
              return c;
          });
          await updateDoc(doc(db, 'posts', postId), { comments: updatedComments });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <Stories />
      
      {/* Create Post Card */}
      <div className="bg-white mx-4 p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-8 transition-transform hover:shadow-md">
        <div className="flex gap-4 items-start">
          <img src={profile?.photoURL} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
          <div className="flex-1 space-y-3">
             <input
                value={newPostText}
                onChange={e => setNewPostText(e.target.value)}
                placeholder={`بم تفكر يا ${profile?.firstName}؟ شاركنا لحظاتك...`}
                className="w-full bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 outline-none text-right text-gray-800 placeholder-gray-400 border-transparent focus:border-rose-200 border resize-none h-14"
              />
              
              {newPostImage && (
                  <div className="relative group rounded-2xl overflow-hidden shadow-sm">
                    <MediaViewer src={newPostImage} className="w-full max-h-60 object-cover" />
                    <button onClick={() => setNewPostImage('')} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"><XCircle size={20}/></button>
                  </div>
              )}

              <div className="flex justify-between items-center pt-2">
                  <div className="relative overflow-hidden group">
                       <button className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-5 py-2.5 rounded-2xl group-hover:bg-rose-100 transition-all active:scale-95">
                          <ImageIcon size={20}/> <span className="text-sm">صورة / فيديو</span>
                       </button>
                       <div className="absolute inset-0 opacity-0 cursor-pointer">
                          <FileUploader onUpload={setNewPostImage} label=" " compact={false} />
                       </div>
                  </div>
                  <button 
                      onClick={handlePost} 
                      disabled={!newPostText && !newPostImage} 
                      className="bg-gray-900 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
                  >
                      <span>نشر</span> <Send size={18} className="rtl:rotate-180" />
                  </button>
              </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-8 mx-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-[2.5rem] shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] transition-all duration-300 group">
            {/* Post Header */}
            <div className="p-6 flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="relative">
                     <img src={post.authorPhoto || "https://placehold.co/50"} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                     {/* Online indicator could go here */}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg leading-tight">{post.authorName}</h3>
                  <span className="text-xs text-gray-400 font-medium tracking-wide">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('ar-EG', {month:'short', day:'numeric', hour:'numeric', minute:'numeric'}) : 'الآن'}</span>
                </div>
              </div>
              <div className="relative">
                 {(profile?.role === 'admin' || profile?.uid === post.uid) ? (
                    <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                        <button onClick={() => { setEditingPost(post.id); setEditText(post.text); }} className="p-2 text-gray-400 hover:bg-white hover:text-blue-500 hover:shadow-sm rounded-lg transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                 ) : (
                    <button onClick={() => handleReportPost(post.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Flag size={20} /></button>
                 )}
              </div>
            </div>
            
            {/* Post Content */}
            <div className="px-6 pb-4">
                <div className="text-gray-800 whitespace-pre-wrap text-right leading-loose text-[17px] font-medium" dir="rtl">
                {editingPost === post.id ? (
                    <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-blue-100 animate-fade-in">
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-white border border-gray-200 p-3 rounded-xl outline-none focus:border-rose-300 transition-colors" rows={4}/>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => handleUpdatePost(post.id)} className="bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors">حفظ</button>
                            <button onClick={() => setEditingPost(null)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors">إلغاء</button>
                        </div>
                    </div>
                ) : post.text}
                </div>
            </div>
            
            {post.image && (
                <div className="w-full bg-gray-50 overflow-hidden">
                    <MediaViewer src={post.image} className="w-full max-h-[650px] object-cover transition-transform duration-700 group-hover:scale-[1.01]" />
                </div>
            )}

            {/* Actions */}
            <div className="px-6 py-5 flex justify-between items-center mt-2 bg-gradient-to-b from-transparent to-gray-50/30">
              <div className="flex gap-6">
                  <button onClick={() => handleLike(post)} className={`flex items-center gap-2.5 transition-all active:scale-90 group/like ${post.likes?.includes(profile?.uid) ? 'text-rose-500' : 'text-gray-500 hover:text-rose-500'}`}>
                    <div className={`p-2 rounded-full transition-colors ${post.likes?.includes(profile?.uid) ? 'bg-rose-50' : 'group-hover/like:bg-rose-50'}`}>
                        <Heart size={26} className={post.likes?.includes(profile?.uid) ? 'fill-current' : ''} />
                    </div>
                    <span className="font-black text-lg">{post.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => toggleCommentBox(post.id)} className={`flex items-center gap-2.5 transition-colors group/comment ${activeCommentPostId === post.id ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}>
                    <div className={`p-2 rounded-full transition-colors ${activeCommentPostId === post.id ? 'bg-blue-50' : 'group-hover/comment:bg-blue-50'}`}>
                        <MessageCircle size={26} className={activeCommentPostId === post.id ? 'fill-current' : ''} />
                    </div>
                    <span className="font-black text-lg">{post.comments?.length || 0}</span>
                  </button>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => handleSavePost(post.id)} className={`p-2 rounded-full transition-all hover:bg-yellow-50 ${savedPosts.includes(post.id) ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'}`}>
                      <Bookmark size={24} className={savedPosts.includes(post.id) ? 'fill-current' : ''}/>
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-all"><Share2 size={24}/></button>
              </div>
            </div>
            
            {/* Inline Comment Input */}
            {activeCommentPostId === post.id && (
                <div className="px-6 pb-6 animate-fade-in-down">
                    <div className="flex items-center gap-3 bg-gray-50 p-2 pl-3 rounded-[1.5rem] border border-gray-100 focus-within:border-rose-200 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-inner">
                        <img src={profile?.photoURL} className="w-10 h-10 rounded-full object-cover border border-white shadow-sm" />
                        <input 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && submitComment(post)}
                            placeholder="أكتب تعليقك..."
                            className="flex-1 bg-transparent outline-none text-sm text-gray-800 font-medium"
                            autoFocus
                        />
                        <button onClick={() => submitComment(post)} disabled={!commentText.trim()} className="text-rose-500 disabled:text-gray-300 p-2 hover:bg-rose-50 rounded-full transition-colors">
                            <Send size={20} className="rtl:rotate-180"/>
                        </button>
                    </div>
                </div>
            )}

            {/* Comments Preview */}
            {post.comments?.length > 0 && (
              <div className="bg-gray-50/50 px-6 py-5 space-y-5 border-t border-gray-100">
                {post.comments.slice(0, 3).map((comment: any, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start group/c">
                    <img src={comment.authorPhoto || "https://placehold.co/30"} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                    <div className="flex-1">
                        <div className="bg-white p-4 rounded-2xl rounded-tr-none shadow-sm border border-gray-100/50 inline-block min-w-[220px] hover:shadow-md transition-shadow">
                            <span className="font-bold text-gray-900 text-sm block mb-1">{comment.authorName}</span>
                            <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                        </div>
                        <div className="flex gap-4 mt-1.5 mr-2">
                            <button onClick={() => handleReply(post.id, comment.id)} className="text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors">رد</button>
                            <span className="text-xs text-gray-300">{/* Time ago logic here */}</span>
                        </div>
                        {/* Nested Replies */}
                        {comment.replies && comment.replies.map((reply: any, rIdx: number) => (
                            <div key={rIdx} className="flex gap-3 items-start mt-4 mr-2 animate-fade-in">
                                <img src={reply.authorPhoto} className="w-7 h-7 rounded-full object-cover border border-white shadow-sm" />
                                <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-none">
                                    <span className="font-bold text-xs block text-gray-900 mb-0.5">{reply.authorName}</span>
                                    <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                ))}
                {post.comments.length > 3 && (
                    <button onClick={() => toggleCommentBox(post.id)} className="w-full py-2 flex items-center justify-center gap-2 text-rose-500 text-sm font-bold bg-rose-50/50 rounded-xl hover:bg-rose-100 transition-colors">
                        <MessageSquare size={16}/>
                        عرض كل التعليقات ({post.comments.length})
                    </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};