(() => {
  const select = id => document.getElementById(id);
  const spool = select('spool'), handle = select('crank'), panel = select('transport');
  const samples = select('samples'), hint = select('tape-hint'), ringback = select('ringback');
  const sound = select('sound'), file = select('file-samples');
  const pins = select('pins'), approach = select('approach');
  const sourceRows = id => [...select(id).content.querySelectorAll('tbody tr')]
    .map(row => [...row.cells].map(cell => cell.textContent));
  const terminal = new Map(sourceRows('screen').map(([id,time])=>[id,time]));
  const records = sourceRows('roll').map(([id,time,state])=>{
    const [,m,s]=time.split(':').map(Number);
    return {id,time,state,at:m*60+s,received:terminal.get(id)};
  });
  const lo=Number(spool.min), hi=Number(spool.max), tolerance=10;
  const collected=new Map();
  const timers=[];
  let active=false, audio=null, grip=null, suppressClick=false;
  for(const rec of records){
    const tick=document.createElement('i');tick.style.left=((rec.at-lo)/(hi-lo)*100)+'%';
    select('ticks').append(tick);
  }
  function note(hz,duration,type='sine',volume=.07,delay=0) {
    if(!audio || sound.getAttribute('aria-pressed')!=='true')return;
    const start=audio.currentTime+delay, oscillator=audio.createOscillator(), gain=audio.createGain();
    oscillator.type=type;oscillator.frequency.value=hz;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.015);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  sound.addEventListener('click',async()=>{
    const enabled=sound.getAttribute('aria-pressed')!=='true';
    if(enabled){
      try {const Audio=window.AudioContext||window.webkitAudioContext;audio=audio||new Audio();await audio.resume();}
      catch {sound.textContent='声音不可用';return;}
    }
    sound.setAttribute('aria-pressed',String(enabled));
    sound.textContent=enabled?'关闭声音':'开启声音';
    if(enabled)note(620,.16);
    else if(audio)audio.suspend().catch(()=>{});
  });
  function clearPlayback(){
    for(const timer of timers)clearTimeout(timer);
    timers.length=0;ringback.disabled=false;
    for(const item of collected.values())item.classList.remove('received');
  }
  function nearMark(){
    return records.find(r=>Math.abs(r.at-Number(spool.value))<=tolerance);
  }
  function wind(value){
    const prev=nearMark();
    spool.value=String(Math.max(lo,Math.min(hi,Math.round(value))));
    const at=Number(spool.value),mark=nearMark();
    const clock='23:'+String(Math.floor(at/60)).padStart(2,'0')+':'+String(at%60).padStart(2,'0');
    select('tape-time').textContent=clock;spool.setAttribute('aria-valuetext',clock+(mark?'，有刻痕':''));
    window.nightRoom?.wind(at);
    hint.textContent=mark?(collected.has(mark.id)?'这道刻痕已经取过样。':'手柄卡入一道刻痕。现在可以压下取样杆。'):'纸带平滑。向左倒带，寻找下一道刻痕。';
    if(mark && mark!==prev)note(145,.09,'triangle');
  }
  function showRecorder(open,moveFocus=true){
    active=open;panel.hidden=!open;pins.hidden=open||!window.nightRoom;handle.hidden=!open||!window.nightRoom;
    document.querySelector('main').classList.toggle('recording',open);
    select('view-name').textContent=open?'近景 / 走纸记录仪':'全景 / 值班室';
    approach.textContent=open?'返回值班室全景':'靠近记录仪 ↗';
    approach.setAttribute('aria-expanded',String(open));
    select('scene-tip').textContent=open?'左右拖动摇柄倒带，或使用下方纸带滑轨。':'拖动场景转动视角，点物件可调查。';
    window.nightRoom?.focus(open);
    if(!open)clearPlayback();
    if(moveFocus)(open?select('transport-title'):approach).focus({preventScroll:true});
    if(open && moveFocus){
      const top=select('room-model').getBoundingClientRect().top+window.scrollY;
      if(panel.getBoundingClientRect().bottom>window.innerHeight)window.scrollTo({top:Math.max(0,top-8),behavior:'instant'});
    }
  }
  approach.setAttribute('aria-controls','transport');approach.setAttribute('aria-expanded','false');
  approach.addEventListener('click',()=>showRecorder(!active));
  for(const pin of pins.querySelectorAll('button'))pin.addEventListener('click',()=>{
    if(pin.dataset.pin==='drum'){showRecorder(true);return;}
    const object=document.querySelector('[data-clue="'+pin.dataset.pin+'"]');
    object.click();
    select('reader').addEventListener('close',()=>pin.focus({preventScroll:true}),{once:true});
  });
  spool.addEventListener('input',()=>wind(spool.value));
  function previousNotch(){
    const at=Number(spool.value), previous=records.filter(r=>r.at<at-tolerance);
    const mark=previous[previous.length-1]||records[records.length-1];
    wind(mark.at);
  }
  select('notch').addEventListener('click',previousNotch);
  handle.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;suppressClick=false;grip={id:e.pointerId,x:e.clientX,start:Number(spool.value)};
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove',e=>{
    if(!grip||grip.id!==e.pointerId)return;
    const dx=e.clientX-grip.x;
    if(Math.abs(dx)>3)suppressClick=true;
    if(suppressClick)wind(grip.start+dx*2.15);
  });
  handle.addEventListener('lostpointercapture',()=>{grip=null;});
  handle.addEventListener('click',e=>{if(!suppressClick||e.detail===0)previousNotch();suppressClick=false;});
  select('stamp').addEventListener('click',()=>{
    const mark=nearMark();
    window.nightRoom?.stamp();note(95,.14,'triangle',.11);
    if(!mark){hint.textContent='取样杆落在空白纸带上。把刻痕摇到读头下再试。';return;}
    if(collected.has(mark.id)){hint.textContent=mark.id+' 的纸条已在桌上。换一道刻痕。';return;}
    wind(mark.at);
    const slip=document.createElement('li');slip.textContent=mark.id+'　'+mark.time+'　'+mark.state;
    collected.set(mark.id,slip);samples.append(slip);
    select('sample-count').textContent='已取样 '+collected.size+' / '+records.length;
    const complete=collected.size===records.length;
    hint.textContent=complete?'三张现场纸条齐了。重放终端，看它收到它们时经过了多久。':mark.id+' 的纸条落在桌上。继续向前倒带。';
    if(complete)ringback.hidden=false;
  });
  ringback.addEventListener('click',()=>{
    clearPlayback();ringback.disabled=true;file.hidden=true;
    window.nightRoom?.focus(false);handle.hidden=true;
    select('view-name').textContent='重放 / 终端入屏';
    function receive(rec){
      for(const item of collected.values())item.classList.remove('received');
      const slip=collected.get(rec.id);
      slip.classList.add('received');slip.textContent=rec.id+'　现场 '+rec.time+' → 入屏 '+rec.received;
      hint.textContent='叮。终端收到 '+rec.id+'，入屏时刻 '+rec.received+'。';
      window.nightRoom?.bell();note(820,.49);note(1320,.26,'sine',.032);
    }
    records.forEach((rec,i)=>timers.push(setTimeout(()=>receive(rec),i*1000)));
    timers.push(setTimeout(()=>{
      ringback.disabled=false;file.hidden=false;hint.textContent='三条入屏记录只相隔两秒。把它们和桌上的现场时刻对照，再签入值班本。';
      select('view-name').textContent='近景 / 走纸记录仪';handle.hidden=!window.nightRoom;window.nightRoom?.focus(true);
    },2750));
  });
  file.addEventListener('click',()=>{
    showRecorder(false,false);finishCase();select('ending-title').scrollIntoView({block:'nearest'});
  });
  select('replay').addEventListener('click',()=>{
    showRecorder(false,false);collected.clear();samples.replaceChildren();ringback.hidden=true;file.hidden=true;
    select('sample-count').textContent='已取样 0 / 3';wind(hi);select('paper-desk').open=false;
    window.scrollTo({top:0,behavior:'instant'});
  });
  wind(hi);
})();
