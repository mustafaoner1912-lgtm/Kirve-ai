const $ = (id) => document.getElementById(id);
const chat = $("chat"), promptBox = $("prompt"), sendBtn = $("send"), statusEl = $("status");
if (location.protocol !== "https:" && location.hostname !== "localhost") statusEl.textContent = "Güvenli bağlantı gerekli · HTTPS açılmalı";
let history = [], activeChatId = null, speechOn = false, isBusy = false, pendingAttachments = [];
let chatCreatePromise = null, chatSaveQueue = Promise.resolve(), uploadInProgress = false;
let voicePeer = null, voiceStream = null, voiceChannel = null, voiceAudio = null;
let voiceTranscript = "";
const savedVoiceEvents = new Set();

function addSources(parent, sources = []) {
  if (!Array.isArray(sources) || !sources.length) return;
  const links = document.createElement("div"); links.className = "sources";
  sources.slice(0, 8).forEach((source) => {
    try {
      const url = new URL(source.url);
      if (!["https:", "http:"].includes(url.protocol)) return;
      const link = document.createElement("a");
      link.href = url.href; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = (source.title || url.hostname).slice(0, 64);
      links.append(link);
    } catch { /* Ignore malformed source URLs. */ }
  });
  if (links.childElementCount) parent.append(links);
}

function appendMessage(role, text, sources = [], attachments = []) {
  $("welcome")?.remove();
  const row = document.createElement("div"); row.className = `msg ${role}`;
  const wrap = document.createElement("div");
  if (role === "assistant") {
    const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = "KİRVE AI"; wrap.append(tag);
  }
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = text; wrap.append(bubble);
  if (attachments?.length) {
    const files = document.createElement("div"); files.className = "message-files";
    attachments.forEach(file => { const item = document.createElement("span"); item.textContent = `📎 ${file.filename}`; files.append(item); });
    wrap.append(files);
  }
  if (role === "assistant") addSources(wrap, sources);
  row.append(wrap); chat.append(row); chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function showWelcome(isNew = false) {
  chat.innerHTML = `<section class="welcome" id="welcome"><div class="hero-orb"><span></span></div><p class="eyebrow">${isNew ? "YENİ OTURUM" : "KİRVE AI · KİŞİSEL AJAN"}</p><h1>Buradayım,<br><em>kirve.</em></h1><p class="intro">Araştırma yaparım, görevlerini takip ederim ve izinli araçları kullanırım. Bugün neyi hallediyoruz?</p><div class="suggestions"><button class="suggest" data-prompt="Bugün için kısa ve gerçekçi bir plan hazırla.">✦ Bugünümü planla</button><button class="suggest" data-prompt="Güncel bir konuda araştırma yap ve kaynakları göster.">⌕ Güncel araştırma yap</button><button class="suggest" data-prompt="KİRVE AI projesi için sıradaki geliştirme görevlerini listele.">⚡ Projeyi geliştir</button></div><p class="note">Önemli işlemler koruma altında · Hafıza sana ait</p></section>`;
  chat.querySelectorAll(".suggest").forEach((button) => button.addEventListener("click", () => { promptBox.value = button.dataset.prompt; send(); }));
}

function setBusy(value) {
  isBusy = value; sendBtn.disabled = value || uploadInProgress;
  if (value) statusEl.textContent = "Kirve düşünüyor…";
  else if (!voicePeer) statusEl.textContent = "Çevrimiçi · Ajan hazır";
}

function speak(text) {
  if (!speechOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "tr-TR"; utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { location.href = "/login"; throw new Error("Oturum açman gerekiyor."); }
  if (!response.ok) throw new Error(data.error || `İstek başarısız (${response.status}).`);
  return data;
}

async function ensureChat() {
  if (activeChatId) return activeChatId;
  if (!chatCreatePromise) {
    chatCreatePromise = apiJson("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(data => { activeChatId = data.chat.id; return activeChatId; })
      .finally(() => { chatCreatePromise = null; });
  }
  return chatCreatePromise;
}

function saveCurrentChat() {
  if (!history.length) return Promise.resolve();
  const snapshot = history.slice(-80).map(message => ({ role: message.role, content: message.content, sources: message.sources || [], attachments: message.attachments || [] }));
  chatSaveQueue = chatSaveQueue.catch(() => {}).then(async () => {
    const id = await ensureChat();
    await apiJson(`/api/chats/${encodeURIComponent(id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: snapshot })
    });
  });
  return chatSaveQueue;
}

async function refreshHistory() {
  const list = $("chatList"); list.replaceChildren();
  try {
    const data = await apiJson("/api/chats");
    if (!data.chats?.length) {
      const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "Henüz sohbet geçmişi yok."; list.append(empty); return;
    }
    data.chats.forEach((item) => {
      const row = document.createElement("div"); row.className = "history-row";
      const button = document.createElement("button"); button.className = "history-item";
      const title = document.createElement("b"); title.textContent = item.title || "Sohbet";
      const meta = document.createElement("small");
      meta.textContent = `${item.message_count || 0} mesaj · ${new Date(item.updated_at || item.created_at).toLocaleString("tr-TR")}`;
      button.append(title, meta);
      button.addEventListener("click", async () => {
        try { await loadChat(item.id); $("tasksPanel").hidden = true; }
        catch (error) { statusEl.textContent = error.message; }
      });
      const remove = document.createElement("button"); remove.className = "history-delete"; remove.textContent = "Sil";
      remove.setAttribute("aria-label", "Sohbeti sil");
      remove.addEventListener("click", async () => {
        if (!window.confirm("Bu sohbeti kalıcı olarak silmek istiyor musun?")) return;
        remove.disabled = true;
        try {
          await apiJson(`/api/chats/${encodeURIComponent(item.id)}`, { method: "DELETE" });
          if (activeChatId === item.id) { activeChatId = null; history = []; pendingAttachments = []; renderAttachmentTray(); showWelcome(true); }
          await refreshHistory(); await refreshOverview();
        } catch (error) { statusEl.textContent = error.message; remove.disabled = false; }
      });
      row.append(button, remove); list.append(row);
    });
  } catch (error) {
    const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = error.message; list.append(empty);
  }
}

async function discardPendingAttachments(chatId = activeChatId) {
  if (!pendingAttachments.length) return;
  if (!chatId) throw new Error("Bekleyen dosyaların bağlı olduğu sohbet bulunamadı.");
  const staged = [...pendingAttachments];
  for (const file of staged) {
    await apiJson(`/api/chats/${encodeURIComponent(chatId)}/files/${encodeURIComponent(file.id)}`, { method: "DELETE" });
  }
  pendingAttachments = [];
  renderAttachmentTray();
}

async function loadChat(id) {
  if (isBusy) throw new Error("Önce devam eden yanıtın bitmesini bekle.");
  if (activeChatId && activeChatId !== id && pendingAttachments.length) await discardPendingAttachments(activeChatId);
  const data = await apiJson(`/api/chats/${encodeURIComponent(id)}`);
  activeChatId = data.chat.id;
  history = Array.isArray(data.chat.messages) ? data.chat.messages.map(m => ({ role: m.role, content: m.content, sources: m.sources || [], attachments: m.attachments || [] })) : [];
  pendingAttachments = []; renderAttachmentTray();
  chat.replaceChildren();
  if (!history.length) { showWelcome(true); return; }
  history.forEach(message => appendMessage(message.role, message.content, message.sources, message.attachments));
  statusEl.textContent = "Kayıtlı sohbet açıldı · KİRVE AI";
}

async function loadLatestChat() {
  try {
    const data = await apiJson("/api/chats");
    const latest = data.chats?.[0];
    if (latest) await loadChat(latest.id); else showWelcome();
  } catch (error) {
    showWelcome(); statusEl.textContent = error.message;
  }
}

async function refreshOverview() {
  try {
    const [overview, memoryData] = await Promise.all([apiJson("/api/overview"), apiJson("/api/memories")]);
    $("taskCount").textContent = overview.open_tasks ?? 0;
    $("memoryCount").textContent = `${overview.saved_memories ?? 0} kayıtlı bilgi · ${overview.saved_chats ?? 0} sohbet`;
    const taskList = $("taskList"); taskList.replaceChildren();
    if (!overview.tasks?.length) {
      const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "Henüz kayıtlı görev yok. Kirve'den bir işi takip etmesini iste."; taskList.append(empty);
    }
    (overview.tasks || []).forEach((task) => {
      const card = document.createElement("div"); card.className = "task" + (task.status === "completed" ? " done" : "");
      const title = document.createElement("b"); title.textContent = task.title;
      const meta = document.createElement("small"); meta.textContent = `${task.status === "completed" ? "Tamamlandı" : "Açık"} · ${task.priority === "high" ? "Yüksek" : task.priority === "low" ? "Düşük" : "Normal"}${task.due_date ? " · " + task.due_date : ""}`;
      card.append(title, meta);
      if (task.status === "open") {
        const complete = document.createElement("button"); complete.className = "task-action"; complete.textContent = "Tamamlandı";
        complete.addEventListener("click", async () => {
          complete.disabled = true;
          try { await apiJson("/api/agent/tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "complete_task", arguments: { task_id: task.id } }) }); await refreshOverview(); }
          catch (error) { statusEl.textContent = error.message; complete.disabled = false; }
        });
        card.append(complete);
      }
      taskList.append(card);
    });
    const memoryList = $("memoryList"); memoryList.replaceChildren();
    if (!memoryData.memories?.length) {
      const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "Henüz kaydedilmiş hafıza yok. Bir bilgiyi açıkça hatırlamamı isteyebilirsin."; memoryList.append(empty);
    }
    memoryData.memories.forEach((memory) => {
      const card = document.createElement("div"); card.className = "task memory";
      const copy = document.createElement("div"); copy.className = "memory-copy";
      const fact = document.createElement("b"); fact.textContent = memory.fact;
      const meta = document.createElement("small"); meta.textContent = `${memory.category || "diğer"} · ${new Date(memory.created_at).toLocaleDateString("tr-TR")}`;
      copy.append(fact, meta);
      const del = document.createElement("button"); del.className = "delete-memory"; del.textContent = "Sil"; del.setAttribute("aria-label", "Hafıza kaydını sil");
      del.addEventListener("click", async () => {
        del.disabled = true;
        try { await apiJson(`/api/memories/${encodeURIComponent(memory.id)}`, { method: "DELETE" }); await refreshOverview(); }
        catch (error) { statusEl.textContent = error.message; del.disabled = false; }
      });
      card.append(copy, del); memoryList.append(card);
    });
  } catch (error) { statusEl.textContent = error.message || "Bağlantı kontrol edilemedi."; }
}

async function send() {
  const text = promptBox.value.trim(); if ((!text && !pendingAttachments.length) || isBusy || uploadInProgress) return;
  const attachments = pendingAttachments.slice(); pendingAttachments = []; renderAttachmentTray();
  promptBox.value = ""; promptBox.style.height = "auto";
  appendMessage("user", text || "Ekli dosyaları incele.", [], attachments);
  history.push({ role: "user", content: text || "Ekli dosyaları incele.", attachments }); setBusy(true);
  const placeholder = appendMessage("assistant", "Görevini işliyorum…");
  try {
    await saveCurrentChat();
    const data = await apiJson("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: await ensureChat(), messages: history.slice(-40).map(({ role, content, attachments }) => ({ role, content, attachments: attachments || [] })) })
    });
    placeholder.textContent = data.reply || "Yanıt alınamadı.";
    addSources(placeholder.parentElement, data.sources || []);
    history.push({ role: "assistant", content: data.reply || "", sources: data.sources || [] });
    await saveCurrentChat(); speak(data.reply || "");
    statusEl.textContent = `Yanıt hazır · ${data.sources?.length ? data.sources.length + " kaynak" : "KİRVE AI"}`;
    await Promise.all([refreshOverview(), refreshHistory()]);
  } catch (error) {
    placeholder.textContent = "Bir sorun çıktı: " + error.message;
    try { await saveCurrentChat(); } catch { /* Keep the visible error even if saving also fails. */ }
    statusEl.textContent = "Bağlantı sorunu";
  } finally { setBusy(false); chat.scrollTop = chat.scrollHeight; }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAttachmentTray() {
  const tray = $("attachmentTray"); tray.replaceChildren(); tray.hidden = pendingAttachments.length === 0;
  pendingAttachments.forEach((file) => {
    const chip = document.createElement("div"); chip.className = "attachment-chip";
    const label = document.createElement("span"); label.textContent = `📎 ${file.filename} · ${formatBytes(file.bytes)}`;
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", `${file.filename} ekini kaldır`);
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      try {
        await apiJson(`/api/chats/${encodeURIComponent(activeChatId)}/files/${encodeURIComponent(file.id)}`, { method: "DELETE" });
        pendingAttachments = pendingAttachments.filter(item => item.id !== file.id); renderAttachmentTray();
      } catch (error) { statusEl.textContent = error.message; remove.disabled = false; }
    });
    chip.append(label, remove); tray.append(chip);
  });
}

$("attach").addEventListener("click", () => $("filePicker").click());
$("filePicker").addEventListener("change", async (event) => {
  const selected = [...(event.target.files || [])]; event.target.value = "";
  if (!selected.length || uploadInProgress) return;
  if (selected.length + pendingAttachments.length > 5) { statusEl.textContent = "Bir mesajda en fazla 5 dosya ekleyebilirsin."; return; }
  const tooLarge = selected.find(file => file.size > 10 * 1024 * 1024);
  if (tooLarge) { statusEl.textContent = `${tooLarge.name}: en fazla 10 MB olabilir.`; return; }
  uploadInProgress = true; $("attach").disabled = true; sendBtn.disabled = true; statusEl.textContent = "Dosyalar hazırlanıyor…";
  try {
    const chatId = await ensureChat();
    for (const file of selected) {
      statusEl.textContent = `Dosya yükleniyor: ${file.name}`;
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/files`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
        body: file
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { location.href = "/login"; throw new Error("Oturum açman gerekiyor."); }
      if (!response.ok) throw new Error(data.error || `Dosya yüklenemedi (${response.status}).`);
      pendingAttachments.push(data.file); renderAttachmentTray();
    }
    statusEl.textContent = `${pendingAttachments.length} dosya mesaja hazır`;
  } catch (error) { statusEl.textContent = error.message; }
  finally { uploadInProgress = false; $("attach").disabled = false; sendBtn.disabled = isBusy; }
});

sendBtn.addEventListener("click", send);
promptBox.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } });
promptBox.addEventListener("input", () => { promptBox.style.height = "auto"; promptBox.style.height = Math.min(promptBox.scrollHeight, 120) + "px"; });

$("newChat").addEventListener("click", async () => {
  if (isBusy || uploadInProgress) { statusEl.textContent = "Önce devam eden işlemin tamamlanmasını bekle."; return; }
  try { await discardPendingAttachments(activeChatId); }
  catch (error) { statusEl.textContent = `Bekleyen dosyalar temizlenemedi: ${error.message}`; return; }
  if (activeChatId && history.length === 0) {
    try { await apiJson(`/api/chats/${encodeURIComponent(activeChatId)}`, { method: "DELETE" }); }
    catch (error) { statusEl.textContent = `Boş sohbet temizlenemedi: ${error.message}`; return; }
  }
  activeChatId = null; history = []; pendingAttachments = []; renderAttachmentTray(); showWelcome(true); promptBox.focus(); statusEl.textContent = "Yeni sohbet hazır";
});
$("tasksToggle").addEventListener("click", () => { $("tasksPanel").hidden = !$("tasksPanel").hidden; refreshOverview(); });
$("closeTasks").addEventListener("click", () => { $("tasksPanel").hidden = true; });
$("backupDownload").addEventListener("click", () => { statusEl.textContent = "Şifreli yedek indiriliyor…"; });
$("tabTasks").addEventListener("click", () => selectPanelTab("tasks"));
$("tabMemories").addEventListener("click", () => selectPanelTab("memories"));
$("tabChats").addEventListener("click", () => selectPanelTab("chats"));
function selectPanelTab(which) {
  const tabs = { tasks: ["tabTasks", "taskList"], memories: ["tabMemories", "memoryList"], chats: ["tabChats", "chatList"] };
  Object.entries(tabs).forEach(([key, ids]) => { $(ids[0]).classList.toggle("selected", key === which); $(ids[1]).hidden = key !== which; });
  if (which === "tasks" || which === "memories") refreshOverview();
  if (which === "chats") refreshHistory();
}

$("speaker").addEventListener("click", () => {
  speechOn = !speechOn; $("speaker").classList.toggle("active", speechOn); $("speaker").textContent = speechOn ? "🔊" : "🔈";
  if (!speechOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  statusEl.textContent = speechOn ? "Sesli yanıt açık" : "Sesli yanıt kapalı";
});

async function stopRealtime() {
  try { voiceChannel?.close(); } catch { /* no-op */ }
  try { voicePeer?.close(); } catch { /* no-op */ }
  voiceStream?.getTracks().forEach(track => track.stop()); voiceAudio?.remove();
  voicePeer = null; voiceStream = null; voiceChannel = null; voiceAudio = null; voiceTranscript = "";
  $("mic").classList.remove("active"); $("mic").textContent = "🎙";
  statusEl.textContent = "Canlı konuşma kapandı";
}

async function runRealtimeTool(event) {
  if (!voiceChannel || voiceChannel.readyState !== "open") return;
  let result;
  try {
    const args = JSON.parse(event.arguments || "{}");
    const response = await fetch("/api/agent/tool", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: event.name, arguments: args }) });
    result = await response.json(); if (!response.ok) result = { ok: false, error: result.error || "Araç çağrısı reddedildi." };
  } catch (error) { result = { ok: false, error: error.message || "Araç çalıştırılamadı." }; }
  if (!voiceChannel || voiceChannel.readyState !== "open") return;
  voiceChannel.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: event.call_id, output: JSON.stringify(result) } }));
  voiceChannel.send(JSON.stringify({ type: "response.create" }));
  refreshOverview();
}

function handleRealtimeEvent(raw) {
  let event; try { event = JSON.parse(raw); } catch { return; }
  if (["response.output_audio_transcript.done", "response.output_text.done"].includes(event.type)) {
    const text = event.transcript || event.text;
    const eventKey = `assistant:${event.item_id || event.response_id || event.event_id}`;
    if (text && !savedVoiceEvents.has(eventKey)) {
      savedVoiceEvents.add(eventKey); appendMessage("assistant", text); history.push({ role: "assistant", content: text });
      saveCurrentChat().catch(() => {}); statusEl.textContent = "KİRVE AI konuşuyor";
    }
  } else if (["conversation.item.input_audio_transcription.completed", "input_audio_transcription.completed"].includes(event.type) && event.transcript) {
    const eventKey = `user:${event.item_id || event.event_id}`;
    if (!savedVoiceEvents.has(eventKey)) {
      savedVoiceEvents.add(eventKey); appendMessage("user", event.transcript); history.push({ role: "user", content: event.transcript }); saveCurrentChat().catch(() => {});
    }
  } else if (event.type === "response.function_call_arguments.done") {
    runRealtimeTool(event);
  } else if (event.type === "error") {
    statusEl.textContent = "Canlı konuşma hatası: " + (event.error?.message || "Bilinmeyen hata");
  } else if (event.type === "response.done" && event.response?.status === "failed") {
    statusEl.textContent = "Sesli yanıt oluşturulamadı";
  }
}

function waitForIceGatheringComplete(peer, timeoutMs = 10000) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error("Güvenli ses bağlantısı için ağ adayları zamanında hazırlanamadı.")); }, timeoutMs);
    const onState = () => { if (peer.iceGatheringState === "complete") { cleanup(); resolve(); } };
    const cleanup = () => { clearTimeout(timer); peer.removeEventListener("icegatheringstatechange", onState); };
    peer.addEventListener("icegatheringstatechange", onState);
    onState();
  });
}

async function startRealtime() {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { statusEl.textContent = "Bu tarayıcı canlı ses bağlantısını desteklemiyor."; return; }
  if (pendingAttachments.length) { statusEl.textContent = "Canlı konuşmadan önce bekleyen dosyaları gönder veya kaldır."; return; }
  $("mic").disabled = true; statusEl.textContent = "Mikrofon izni ve güvenli ses bağlantısı bekleniyor…";
  try {
    savedVoiceEvents.clear();
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    voicePeer = new RTCPeerConnection();
    voiceAudio = document.createElement("audio"); voiceAudio.autoplay = true; voiceAudio.playsInline = true;
    voiceAudio.style.position = "fixed"; voiceAudio.style.width = "1px"; voiceAudio.style.height = "1px"; voiceAudio.style.opacity = "0"; voiceAudio.style.pointerEvents = "none"; document.body.append(voiceAudio);
    voicePeer.addEventListener("track", event => { voiceAudio.srcObject = event.streams[0]; voiceAudio.play().catch(() => { statusEl.textContent = "Ses için ekrandaki oynatma iznini kullan."; }); });
    voiceStream.getAudioTracks().forEach(track => voicePeer.addTrack(track, voiceStream));
    voiceChannel = voicePeer.createDataChannel("oai-events"); voiceChannel.addEventListener("message", event => handleRealtimeEvent(event.data));
    voicePeer.addEventListener("connectionstatechange", () => { if (voicePeer && ["failed", "disconnected"].includes(voicePeer.connectionState)) { statusEl.textContent = "Ses bağlantısı kesildi"; stopRealtime(); } });
    const offer = await voicePeer.createOffer(); await voicePeer.setLocalDescription(offer);
    await waitForIceGatheringComplete(voicePeer);
    const response = await fetch("/api/realtime/session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/sdp" }, body: voicePeer.localDescription?.sdp || offer.sdp });
    const sdp = await response.text(); if (!response.ok) throw new Error(sdp || "Canlı ses bağlantısı başlatılamadı.");
    await voicePeer.setRemoteDescription({ type: "answer", sdp });
    $("mic").classList.add("active"); $("mic").textContent = "■"; statusEl.textContent = "Canlı konuşma açık · Konuşabilirsin";
  } catch (error) { await stopRealtime(); statusEl.textContent = "Canlı ses başlatılamadı: " + error.message; }
  finally { $("mic").disabled = false; }
}

$("mic").addEventListener("click", () => { if (voicePeer) stopRealtime(); else startRealtime(); });
window.addEventListener("pagehide", () => { if (voicePeer) stopRealtime(); });
$("logout").addEventListener("click", async () => { try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } finally { location.href = "/login"; } });

async function initialize() {
  const overview = await fetch("/api/overview", { credentials: "same-origin" });
  if (overview.status === 401) { location.href = "/login"; return; }
  if (!overview.ok) { statusEl.textContent = "Sunucuya ulaşılamıyor"; showWelcome(); return; }
  statusEl.textContent = "Çevrimiçi · KİRVE AI hazır";
  await Promise.all([refreshOverview(), loadLatestChat()]);
}
initialize();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
