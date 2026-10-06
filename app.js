const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function loadHls(){
  return window.Hls?Promise.resolve():new Promise((ok,no)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
    s.onload=ok;s.onerror=no;document.head.appendChild(s);
  });
}

// يحوّل أي رابط (أو كود iframe) إلى مشغّل داخل الموقع
function mountPlayer(el,bar,url,sub){
  url=(url||'').trim();
  const f=url.match(/<iframe[^>]+src=["']([^"']+)/i);
  if(f)url=f[1];
  if(url.startsWith('//'))url='https:'+url;
  url=url.replace(/^http:\/\//i,'https://');
  el.innerHTML='';bar.innerHTML='';
  if(!url){el.innerHTML='<div class="empty">لا يوجد رابط فيديو</div>';return}
  bar.innerHTML=`<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">↗ لا يعمل؟ افتح الفيديو في نافذة جديدة</a>`;

  const frame=src=>el.innerHTML=`<iframe src="${esc(src)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  let m;

  // ملفات مباشرة
  if(/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)){
    el.innerHTML=`<video src="${esc(url)}" controls autoplay playsinline>${sub?`<track kind="subtitles" srclang="ar" label="العربية" src="${esc(sub)}" default>`:''}</video>`;return;
  }
  // بث HLS
  if(/\.m3u8(\?|#|$)/i.test(url)){
    const v=document.createElement('video');v.controls=true;v.autoplay=true;v.playsInline=true;el.appendChild(v);
    if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=url}
    else loadHls().then(()=>{if(Hls.isSupported()){const h=new Hls();h.loadSource(url);h.attachMedia(v)}}).catch(()=>{el.innerHTML='<div class="empty">تعذر تحميل مشغّل البث</div>'});
    return;
  }
  // يوتيوب
  const pl=(url.match(/[?&]list=([\w-]+)/)||[])[1],st=(url.match(/[?&](?:t|start)=(\d+)/)||[])[1];
  m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
  if(m)return frame(`https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1&cc_load_policy=1&hl=ar&cc_lang_pref=ar${pl?'&list='+pl:''}${st?'&start='+st:''}`);
  if(pl&&/youtube\.com\/playlist/i.test(url))return frame(`https://www.youtube.com/embed/videoseries?list=${pl}`);
  // فيميو
  if(m=url.match(/vimeo\.com\/(?:video\/)?(\d+)/i))return frame(`https://player.vimeo.com/video/${m[1]}?autoplay=1`);
  // ديلي موشن
  if(m=url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([\w]+)/i))return frame(`https://www.dailymotion.com/embed/video/${m[1]}?autoplay=1`);
  // جوجل درايف
  if(m=url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i))return frame(`https://drive.google.com/file/d/${m[1]}/preview`);
  // فيسبوك
  if(/facebook\.com\/.+\/videos\/|fb\.watch|facebook\.com\/watch|facebook\.com\/reel/i.test(url))return frame(`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`);
  // ستريمبل
  if(m=url.match(/streamable\.com\/(?:e\/)?(\w+)$/i))return frame(`https://streamable.com/e/${m[1]}?autoplay=1`);
  // أرشيف
  if(m=url.match(/archive\.org\/(?:details|embed)\/([^\/?#]+)/i))return frame(`https://archive.org/embed/${m[1]}`);
  // أي موقع آخر
  frame(url);
}
