import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,getDocs,getDoc,doc,setDoc,addDoc,deleteDoc,query,orderBy,limit,increment} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app=initializeApp({
  apiKey:"AIzaSyAT3fFdOtfJ-Xx5RxbHqM71XnxOARiUPUM",
  authDomain:"biflix-f5d51.firebaseapp.com",
  projectId:"biflix-f5d51",
  storageBucket:"biflix-f5d51.firebasestorage.app",
  messagingSenderId:"611452269817",
  appId:"1:611452269817:web:f1cb0442db6921af5a5e28",
  measurementId:"G-ZJT2HE1R1V"
});
export {app};
export const db=getFirestore(app), auth=getAuth(app);
export const ADMIN='omeriane0@gmail.com';
export {doc,setDoc,deleteDoc,signInWithEmailAndPassword,signOut,onAuthStateChanged};

export async function fetchItems(){
  try{
    const s=await getDocs(query(collection(db,'items'),orderBy('ts','desc')));
    return s.docs.map(d=>({...d.data(),id:d.id}));
  }catch(e){
    console.error(e);
    try{return await (await fetch('data.json')).json()}catch(_){return[]}
  }
}
// عدّاد الإعجاب وعدم الإعجاب: stats/{id}
export async function getStats(id){
  const s=await getDoc(doc(db,'stats',id));
  return s.exists()?{likes:s.data().likes||0,dislikes:s.data().dislikes||0}:{likes:0,dislikes:0};
}
export const vote=(id,l,d)=>setDoc(doc(db,'stats',id),{likes:increment(l),dislikes:increment(d)},{merge:true});
// التعليقات: items/{id}/comments/{auto}
export async function getComments(id){
  const s=await getDocs(query(collection(db,'items',id,'comments'),orderBy('ts','desc'),limit(50)));
  return s.docs.map(d=>({...d.data(),id:d.id}));
}
export const addComment=(id,u,text)=>addDoc(collection(db,'items',id,'comments'),{name:u.name,photo:u.pic||'',text,ts:Date.now()});
export const delComment=(id,cid)=>deleteDoc(doc(db,'items',id,'comments',cid));
