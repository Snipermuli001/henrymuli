(()=> {
  const dirTab=document.getElementById('ph-tab-directory'), playerTab=document.getElementById('ph-tab-player');
  const directory=document.getElementById('ph-radio-directory'), player=document.getElementById('ph-native-player');
  const audio=document.getElementById('ph-player-audio'), urlInput=document.getElementById('ph-radio-url');
  const stationInput=document.getElementById('ph-station-name'), radioPlay=document.getElementById('ph-radio-play');
  const radioStop=document.getElementById('ph-radio-stop'), status=document.getElementById('ph-player-status');
  const ytInput=document.getElementById('ph-youtube-url'), ytLoad=document.getElementById('ph-youtube-load');
  const ytFrame=document.getElementById('ph-youtube-frame'), ytStatus=document.getElementById('ph-youtube-status');
  const trackTitle=document.getElementById('ph-track-title'), trackSub=document.getElementById('ph-track-sub');
  const logo='https://henrymuli.pages.dev/slogo.png';
  let mode='radio', currentTitle='Project Henry Radio', currentSub='Live radio stream';
  function setTab(which){
    const isPlayer=which==='player';directory.hidden=isPlayer;player.hidden=!isPlayer;
    dirTab.setAttribute('aria-pressed',String(!isPlayer));playerTab.setAttribute('aria-pressed',String(isPlayer));
  }
  dirTab?.addEventListener('click',()=>setTab('directory'));
  playerTab?.addEventListener('click',()=>setTab('player'));
  function setMeta(title,sub,art=logo){
    currentTitle=title;currentSub=sub;trackTitle.textContent=title;trackSub.textContent=sub;
    if('mediaSession' in navigator){
      navigator.mediaSession.metadata=new MediaMetadata({title,artist:sub,album:'Project Henry Audio Hub',artwork:[{src:art,sizes:'192x192',type:'image/png'},{src:art,sizes:'512x512',type:'image/png'}]});
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
    }
  }
  function setStatus(message){status.textContent=message}
  function setPlaybackState(){if('mediaSession' in navigator)navigator.mediaSession.playbackState=audio.paused?'paused':'playing'}
  radioPlay?.addEventListener('click',async()=>{
    const url=urlInput.value.trim();
    if(!/^https?:\/\//i.test(url)){setStatus('Paste a direct HTTP(S) audio stream URL. The FMStream directory itself does not expose its stream URL to this player.');return}
    audio.src=url;mode='radio';
    const title=stationInput.value.trim()||'Live Radio';
    setMeta(title,'Project Henry • Live Radio');
    try{await audio.play();setStatus('Playing '+title+'. If supported, Android notification and lock-screen controls should now appear.');}
    catch(e){setStatus('Could not start this stream. It may block browser playback, require HTTPS, or use an unsupported format. Try another direct stream URL.')}
  });
  radioStop?.addEventListener('click',()=>{audio.pause();audio.removeAttribute('src');audio.load();setPlaybackState();setStatus('Radio stopped.')});
  audio.addEventListener('play',setPlaybackState);audio.addEventListener('pause',setPlaybackState);
  audio.addEventListener('error',()=>setStatus('Stream error: this station may be unavailable or may not support direct browser playback.'));
  audio.addEventListener('ended',setPlaybackState);
  if('mediaSession' in navigator){
    const action=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn)}catch(e){}};
    action('play',()=>{if(mode==='radio')audio.play().catch(()=>{});else ytCommand('playVideo')});
    action('pause',()=>{if(mode==='radio')audio.pause();else ytCommand('pauseVideo')});
    action('stop',()=>{audio.pause();audio.removeAttribute('src');audio.load();ytFrame.src='about:blank';setPlaybackState()});
    action('seekbackward',d=>{if(mode==='radio'&&Number.isFinite(audio.duration))audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10))});
    action('seekforward',d=>{if(mode==='radio'&&Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+(d.seekOffset||10))});
  }
  function ytCommand(command){try{ytFrame.contentWindow.postMessage(JSON.stringify({event:'command',func:command,args:[]}),'*')}catch(e){}}
  function getVideoId(raw){
    try{const u=new URL(raw);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.pathname==='/watch')return u.searchParams.get('v')||'';const p=u.pathname.split('/').filter(Boolean);if(['embed','shorts','live'].includes(p[0]))return p[1]||''}}catch(e){}
    return '';
  }
  ytLoad?.addEventListener('click',()=>{
    const raw=ytInput.value.trim();const id=getVideoId(raw);
    if(!id){const q=raw.replace(/^https?:\/\/(www\.)?youtube\.com\/results\?search_query=/i,'').trim();if(!q){ytStatus.textContent='Enter a song/artist to search, or paste a YouTube video link.';return}window.open('https://www.youtube.com/results?search_query='+encodeURIComponent(q),'_blank','noopener');ytStatus.textContent='YouTube search opened in a new tab. Copy a video link, return here, and paste it above to play it in the embedded player.';return}
    mode='youtube';const safeId=encodeURIComponent(id);
    ytFrame.src='https://www.youtube.com/embed/'+safeId+'?enablejsapi=1&playsinline=1&autoplay=1';
    const title='YouTube music/video';setMeta(title,'YouTube • Project Henry');
    ytStatus.textContent='Playing through the official YouTube player. Keep the video player visible; YouTube may limit background playback depending on browser/account.';
    if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';
  });
  setMeta('Project Henry Audio Hub','Ready to play');
  setTab('directory');
})();