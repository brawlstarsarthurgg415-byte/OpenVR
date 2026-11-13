const DEFAULT_API="https://openvr-party-server-c7-v-production.up.railway.app";
const $=id=>document.getElementById(id);
let apiBase=localStorage.getItem("openvr_api")||DEFAULT_API,player=localStorage.getItem("openvr_name")||"Jogador",activeCode="",socket=null,poll=null;
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2300)}
function openPage(id){if(id!=="viewer"&&window.OpenVR?.tracking)stopHands();document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("selected",b.dataset.page===id));scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>openPage(b.dataset.page));document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openPage(b.dataset.open));
function api(path,opts={}){return fetch(apiBase.replace(/\/+$/,"")+path,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}}).then(async r=>{let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||d.message||("HTTP "+r.status));return d})}
function name(){player=($("playerName").value||player||"Jogador").trim().slice(0,20);localStorage.setItem("openvr_name",player);$("playerName").value=player;$("settingsName").value=player;$("profile").textContent=player[0].toUpperCase();return player}
function message(t){$("partyMessage").textContent=t}
function room(code){activeCode=code;$("roomCode").textContent=code||"------";$("roomTitle").textContent=code?"Party "+code:"Nenhuma Party ativa";$("roomLive").textContent=code?"CONECTANDO":"OFFLINE";$("roomLive").classList.toggle("online",!!code);$("copy").disabled=!code;$("leave").disabled=!code;$("homeParty").textContent=code?"Na Party":"Desconectado"}
function members(d){const arr=Array.isArray(d.members)?d.members:Array.isArray(d.participants)?d.participants:[];$("memberCount").textContent=arr.length+" / 8";$("members").replaceChildren();if(!arr.length){$("members").innerHTML='<p class="helper">Aguardando participantes...</p>';return}arr.forEach(m=>{const row=document.createElement("div");row.className="member";const dot=document.createElement("i"),label=document.createElement("span");label.textContent=typeof m==="string"?m:(m.name||m.username||"Jogador");row.append(dot,label);$("members").append(row)})}
async function refresh(){if(!activeCode)return;try{members(await api("/api/party/"+encodeURIComponent(activeCode)))}catch{}}
function startRoom(code){room(code);refresh();clearInterval(poll);poll=setInterval(refresh,4000);if(socket)socket.close();try{const base=apiBase.replace(/^http/,"ws").replace(/\/+$/,"");socket=new WebSocket(base+"/ws?code="+encodeURIComponent(code)+"&name="+encodeURIComponent(player));socket.onopen=()=>{$("roomLive").textContent="AO VIVO";$("roomLive").classList.add("online")};socket.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.members||d.participants)members(d)}catch{}};socket.onclose=()=>{if(activeCode)$("roomLive").textContent="SALA CRIADA"}}catch{}}
$("create").onclick=async()=>{name();message("Criando sala...");try{const d=await api("/api/party",{method:"POST",body:JSON.stringify({name:player,username:player})});const code=d.code||d.partyCode||d.party?.code;if(!code)throw Error("Servidor não retornou o código.");$("partyCode").value=code;startRoom(code);message("Party criada! Compartilhe o código.");toast("Party criada")}catch(e){message("Falha ao criar Party: "+e.message)}};
$("join").onclick=async()=>{name();const code=$("partyCode").value.trim().toUpperCase();if(!code){message("Digite o código da sala.");return}message("Entrando na sala...");try{const d=await api("/api/party/"+encodeURIComponent(code)+"/join",{method:"POST",body:JSON.stringify({name:player,username:player})});startRoom(code);if(d.members||d.participants)members(d);message("Você entrou na Party!");toast("Entrou na Party")}catch(e){message("Não foi possível entrar: "+e.message)}};
$("copy").onclick=async()=>{if(!activeCode)return;try{await navigator.clipboard.writeText(activeCode);toast("Código copiado")}catch{toast("Código: "+activeCode)}};
$("leave").onclick=()=>{if(socket)socket.close();socket=null;clearInterval(poll);room("");$("members").innerHTML='<p class="helper">Crie ou entre em uma sala para ver os participantes.</p>';$("memberCount").textContent="0 / 8";message("Você saiu da sala.")};
async function test(){try{await api("/health");$("statusText").textContent="Servidor conectado";$("statusDot").parentElement.classList.add("online");$("settingsMessage").textContent="Servidor respondeu normalmente."}catch(e){$("statusText").textContent="Servidor indisponível";$("statusDot").parentElement.classList.remove("online");$("settingsMessage").textContent="Não conectou: "+e.message}}
$("test").onclick=test;$("serverUrl").value=apiBase;$("serverUrl").onchange=()=>{apiBase=$("serverUrl").value.trim();localStorage.setItem("openvr_api",apiBase);test()};
$("settingsName").value=player;$("playerName").value=player;$("profile").textContent=player[0].toUpperCase();$("settingsName").onchange=()=>{player=$("settingsName").value.trim()||"Jogador";localStorage.setItem("openvr_name",player);$("playerName").value=player;$("profile").textContent=player[0].toUpperCase()};$("profile").onclick=()=>{openPage("settings");$("settingsName").focus()};

let viewerMode=localStorage.getItem("openvr_viewer_mode")||"normal";
function setViewerMode(mode){
 viewerMode=mode;localStorage.setItem("openvr_viewer_mode",mode);
 $("vrStage").classList.toggle("headset-mode",mode==="headset");
 $("vrStage").classList.toggle("normal-mode",mode==="normal");
 $("modeNormal").classList.toggle("selected",mode==="normal");
 $("modeHeadset").classList.toggle("selected",mode==="headset");
 $("modeNormal").setAttribute("aria-pressed",String(mode==="normal"));
 $("modeHeadset").setAttribute("aria-pressed",String(mode==="headset"));
 $("viewerNote").textContent=mode==="headset"?"Óculos personalizado: duas imagens lado a lado dentro de lentes circulares. Coloque o celular em um visor compatível.":"Modo normal: imagem em tela inteira, sem círculos ou divisão em lentes.";
}
$("modeNormal").onclick=()=>setViewerMode("normal");
$("modeHeadset").onclick=()=>setViewerMode("headset");
$("viewerBack").onclick=()=>openPage("home");
$("exitViewer").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();document.body.classList.remove("viewer-page-fullscreen");openPage("home")};
$("enterFullscreen").onclick=async()=>{try{await $("viewer").requestFullscreen?.();}catch{}document.body.classList.add("viewer-page-fullscreen")};
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement)document.body.classList.remove("viewer-page-fullscreen")});
setViewerMode(viewerMode);

if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));


// Native MediaPipe hand tracking bridge
let handsActive=false, pinchWasDown=false, lastHandSeen=0;
const handStatus=$("handStatus"), handToggle=$("handToggle"), handCursor=$("handCursor"), vrTarget=$("vrTarget");
function setHandStatus(message,state="idle"){handStatus.textContent=message;handStatus.dataset.state=state}
function startHands(){
 if(!window.OpenVRNative){setHandStatus("O reconhecimento por câmera funciona no APK Android. Esta versão web não tem acesso ao módulo nativo.","unavailable");return}
 handsActive=true;window.OpenVR.tracking=true;handToggle.textContent="Parar reconhecimento";setHandStatus("Solicitando acesso à câmera frontal...","loading");window.OpenVRNative.startHandTracking();
}
function stopHands(){
 handsActive=false;if(window.OpenVR)window.OpenVR.tracking=false;pinchWasDown=false;handCursor.style.display="none";handToggle.textContent="✋ Ativar mãos";
 if(window.OpenVRNative)window.OpenVRNative.stopHandTracking();setHandStatus("Reconhecimento de mãos desligado.","idle");
}
handToggle.onclick=()=>handsActive?stopHands():startHands();
window.OpenVR={
 tracking:false,
 onHandStatus(data){
  setHandStatus(data.message||"Estado da câmera: "+data.state,data.state);
  if(data.state==="active"){handsActive=true;handToggle.textContent="Parar reconhecimento"}
  if(["stopped","permission_denied","error"].includes(data.state)){handsActive=false;handToggle.textContent="✋ Ativar mãos"}
 },
 onHandFrame(data){
  if(!handsActive)return;
  const hand=data.hands&&data.hands[0];
  if(!hand||hand.length<9){handCursor.style.display="none";pinchWasDown=false;return}
  lastHandSeen=Date.now();
  const stage=$("vrStage"),rect=stage.getBoundingClientRect(),tip=hand[8],thumb=hand[4];
  const x=Math.max(0,Math.min(1,tip.x)),y=Math.max(0,Math.min(1,tip.y));
  const px=x*rect.width,py=y*rect.height;
  handCursor.style.display="block";handCursor.style.left=px+"px";handCursor.style.top=py+"px";
  const distance=Math.hypot(tip.x-thumb.x,tip.y-thumb.y);
  const pinching=distance<0.055;
  handCursor.classList.toggle("pinching",pinching);
  if(pinching&&!pinchWasDown){
   const targetRect=vrTarget.getBoundingClientRect();
   const sx=rect.left+px,sy=rect.top+py;
   if(sx>=targetRect.left&&sx<=targetRect.right&&sy>=targetRect.top&&sy<=targetRect.bottom){vrTarget.click();toast("Pinça reconhecida!")}
  }
  pinchWasDown=pinching;
 }
};
vrTarget.onclick=()=>{vrTarget.classList.add("activated");vrTarget.textContent="SELECIONADO ✓";setTimeout(()=>{vrTarget.classList.remove("activated");vrTarget.textContent="TOQUE COM PINÇA"},1200)};


// OpenVR 3D lobby and multi-view object capture prototype
const capturePanel=$("capturePanel"),videoInput=$("objectVideo"),captureVideo=$("captureVideo");
const captureProgress=$("captureProgress"),captureFrames=$("captureFrames"),addCaptured=$("addCapturedObject");
let sampledFrames=[],capturedVideoUrl=null;
$("openCapture").onclick=()=>{capturePanel.classList.add("visible");capturePanel.scrollIntoView({behavior:"smooth",block:"nearest"})};
$("closeCapture").onclick=()=>capturePanel.classList.remove("visible");
videoInput.onchange=async()=>{
 const file=videoInput.files&&videoInput.files[0];if(!file)return;
 if(!file.type.startsWith("video/")){captureProgress.textContent="Escolha um arquivo de vídeo.";return}
 if(capturedVideoUrl)URL.revokeObjectURL(capturedVideoUrl);
 capturedVideoUrl=URL.createObjectURL(file);captureVideo.src=capturedVideoUrl;captureVideo.hidden=false;
 captureProgress.textContent="Lendo vídeo e extraindo diferentes ângulos...";
 captureFrames.replaceChildren();sampledFrames=[];addCaptured.disabled=true;
 try{
  await new Promise((resolve,reject)=>{captureVideo.onloadedmetadata=resolve;captureVideo.onerror=reject});
  const duration=captureVideo.duration;if(!Number.isFinite(duration)||duration<1)throw Error("Vídeo muito curto ou inválido.");
  const count=Math.min(12,Math.max(5,Math.ceil(duration/1.4)));
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  canvas.width=240;canvas.height=160;
  for(let i=0;i<count;i++){
   const time=Math.min(Math.max(0.05,duration*(i/(count-1))),Math.max(.05,duration-.05));
   await new Promise((resolve,reject)=>{captureVideo.onseeked=resolve;captureVideo.onerror=reject;captureVideo.currentTime=time});
   ctx.fillStyle="#07111d";ctx.fillRect(0,0,canvas.width,canvas.height);
   const scale=Math.min(canvas.width/captureVideo.videoWidth,canvas.height/captureVideo.videoHeight);
   const w=captureVideo.videoWidth*scale,h=captureVideo.videoHeight*scale;
   ctx.drawImage(captureVideo,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
   const data=canvas.toDataURL("image/jpeg",.65);sampledFrames.push(data);
   const img=document.createElement("img");img.src=data;img.alt="Quadro "+(i+1);captureFrames.append(img);
  }
  captureProgress.textContent=sampledFrames.length+" quadros extraídos de "+Math.round(duration)+" segundos. Confira se o objeto aparece de vários lados.";
  addCaptured.disabled=false;
 }catch(e){captureProgress.textContent="Não foi possível processar o vídeo: "+e.message}
};
addCaptured.onclick=()=>{
 if(!sampledFrames.length)return;
 const name=$("objectName").value.trim()||"Objeto capturado";
 const card=document.createElement("button");card.className="captured-object";card.type="button";
 const img=document.createElement("img");img.src=sampledFrames[Math.floor(sampledFrames.length/2)];img.alt="";
 const label=document.createElement("span");label.textContent=name;
 card.append(img,label);$("capturedLobbyObjects").append(card);
 card.onclick=()=>{const idx=sampledFrames.indexOf(img.src);if(idx>=0)img.src=sampledFrames[(idx+1)%sampledFrames.length]};
 $("lobbyCube").classList.add("captured-cube");
 toast("Prévia adicionada ao lobby");
 capturePanel.classList.remove("visible");
};


// OpenVR gesture interaction: double fist-pump menu, pinch select/drag/resize.
(()=>{
 const stage=$("vrStage"),cursor=$("handCursor"),menu=$("vrAppMenu");
 if(!stage||!cursor||!menu)return;
 let gestureState="idle",openCloseCount=0,gestureDeadline=0,lastPalm=false,lastFist=false;
 let pinchActive=false,pinchStart=0,drag=null,activePointer=null,lastPoint={x:0,y:0};
 const now=()=>performance.now();
 const fingersExtended=h=>[8,12,16,20].map((tip,i)=>{const pip=[6,10,14,18][i];return h[tip].y<h[pip].y-0.015});
 function palm(h){const f=fingersExtended(h);const thumb=Math.hypot(h[4].x-h[5].x,h[4].y-h[5].y)>.12;return f.every(Boolean)&&thumb}
 function fist(h){const f=fingersExtended(h);return f.filter(Boolean).length<=1}
 function toggleMenu(){menu.classList.toggle("visible");menu.setAttribute("aria-hidden",String(!menu.classList.contains("visible")));toast(menu.classList.contains("visible")?"Menu de aplicativos aberto":"Menu fechado")}
 function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
 function startPinch(x,y){
  pinchActive=true;pinchStart=now();const target=document.elementFromPoint(x,y);
  const win=target?.closest(".floating-window");
  if(win){
   if(target.closest(".window-resize")){const r=win.getBoundingClientRect();drag={type:"resize",el:win,startX:x,startY:y,w:r.width,h:r.height};}
   else if(target.closest(".floating-window-header")&&!target.closest(".window-close")){const r=win.getBoundingClientRect();drag={type:"move",el:win,startX:x,startY:y,left:r.left,top:r.top};}
   else drag={type:"click",el:target?.closest("button")||win};
  }else{
   const hit=target?.closest("button,[data-vr-app]");
   drag=hit?{type:"click",el:hit}:null;
  }
  if(drag?.el?.classList?.contains("window-close")){drag.el.closest(".floating-window").classList.remove("visible");drag=null}
 }
 function movePinch(x,y){
  if(!drag)return;
  const bounds=stage.getBoundingClientRect(),el=drag.el;
  if(drag.type==="move"){
   const left=clamp(drag.left+x-drag.startX,0,bounds.width-el.offsetWidth);
   const top=clamp(drag.top+y-drag.startY,0,bounds.height-el.offsetHeight);
   el.style.left=left+"px";el.style.top=top+"px";el.style.right="auto";
  }else if(drag.type==="resize"){
   el.style.width=clamp(drag.w+x-drag.startX,190,bounds.width*.9)+"px";
   el.style.height=clamp(drag.h+y-drag.startY,130,bounds.height*.9)+"px";
  }
 }
 function endPinch(){
  if(!pinchActive)return;
  if(drag?.type==="click"&&now()-pinchStart<450){
   if(drag.el?.matches("[data-vr-app]"))openVRApp(drag.el.dataset.vrApp);
   else if(drag.el?.matches(".window-action")){const action=drag.el.dataset.windowAction;if(action==="apps")toggleMenu();if(action==="capture")$("openCapture")?.click()}
   else drag.el?.click?.();
  }
  pinchActive=false;drag=null;
 }
 function openVRApp(app){
  menu.classList.remove("visible");menu.setAttribute("aria-hidden","true");
  if(app==="home"){document.querySelectorAll(".floating-window").forEach(w=>w.classList.add("visible"))}
  else if(app==="gallery"){toast("Galeria 3D: objetos capturados aparecem no lobby");$("capturePanel")?.classList.add("visible")}
  else if(app==="party"){openPage("party")}
  else if(app==="settings"){openPage("settings")}
 }
 $("vrMenuClose").onclick=()=>{menu.classList.remove("visible");menu.setAttribute("aria-hidden","true")};
 menu.querySelectorAll("[data-vr-app]").forEach(b=>b.addEventListener("click",()=>openVRApp(b.dataset.vrApp)));
 document.querySelectorAll(".floating-window").forEach(w=>{w.classList.add("visible");w.querySelector(".window-close").addEventListener("click",()=>w.classList.remove("visible"))});
 window.OpenVR.onHandFrame=function(data){
  if(!handsActive)return;
  const h=data.hands?.[0];if(!h||h.length<21){cursor.style.display="none";endPinch();return}
  const r=stage.getBoundingClientRect(),tip=h[8],thumb=h[4];
  const nx=clamp(1-tip.x,0,1),ny=clamp(tip.y,0,1),x=nx*r.width,y=ny*r.height;
  lastPoint={x,y};cursor.style.display="block";cursor.style.left=x+"px";cursor.style.top=y+"px";
  const dist=Math.hypot(tip.x-thumb.x,tip.y-thumb.y),pinching=dist<.055;
  cursor.classList.toggle("pinching",pinching);
  const screenX=r.left+x,screenY=r.top+y;
  if(pinching&&!pinchActive)startPinch(screenX,screenY);
  if(pinching&&pinchActive)movePinch(screenX,screenY);
  if(!pinching&&pinchActive)endPinch();
  const isPalm=palm(h),isFist=fist(h),t=now();
  if(isPalm&&!lastPalm&&gestureState==="idle"){gestureState="palm";gestureDeadline=t+2600;openCloseCount=0}
  if(gestureState==="palm"&&isFist&&!lastFist){gestureState="closed"}
  if(gestureState==="closed"&&isPalm&&!lastPalm){openCloseCount++;gestureState=openCloseCount>=2?"done":"palm"}
  if(gestureState==="done"){toggleMenu();gestureState="idle";openCloseCount=0}
  if(gestureState!=="idle"&&t>gestureDeadline){gestureState="idle";openCloseCount=0}
  lastPalm=isPalm;lastFist=isFist;
 };
})();
