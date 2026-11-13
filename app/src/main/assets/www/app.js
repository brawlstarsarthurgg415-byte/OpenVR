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
