import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwSslQTAW-asN0F48MHGiy3i0Hjtz4uhA",
    authDomain: "neonvoid-744c1.firebaseapp.com",
    projectId: "neonvoid-744c1",
    storageBucket: "neonvoid-744c1.firebasestorage.app",
    messagingSenderId: "917731436169",
    appId: "1:917731436169:web:c92cc82dfbefe4de478858"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Safe Messaging Init for GitHub/Localhost
let messaging;
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn("Messaging not supported here.");
}

let myData = { username: '', avatar: 'N', hasUnread: false };
window.currentTargetId = null;

// --- NOTIFICATIONS ---
async function setupNotifications() {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                vapidKey: 'BFdmUNNz5fJxKOBlTXVyvBQNpUZ-XXweoVVxtxYyfd5IdZEevdJzT333tzeIc35-U19noF2wOlqLn-dmxQMWWMU' 
            });
            if (token) await updateDoc(doc(db, "users", auth.currentUser.uid), { pushToken: token });
        }
    } catch (e) { console.log("Push Setup Failed:", e); }
}

// --- PROFILE UI (MINIMALIST) ---
function updateAvatarUI(url) {
    const div = document.getElementById('dash-avatar');
    // Solid thin white border, no glow
    div.style.border = "1.5px solid rgba(255, 255, 255, 0.9)";
    div.style.boxShadow = "none"; 

    if (url && url.startsWith('http')) {
        div.innerHTML = `<img src="${url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        div.style.background = "transparent";
    } else {
        div.innerText = "N";
        div.style.background = "linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))";
    }
}

// --- DASHBOARD & MESSAGES ---
function initDash() {
    document.getElementById('dash-username').innerText = "@" + myData.username;
    updateAvatarUI(myData.avatar);
    
    onSnapshot(doc(db, "users", auth.currentUser.uid), (d) => {
        if (d.data()?.hasUnread) document.getElementById('notif-badge').classList.add('active-badge');
    });

    const q = query(collection(db, "messages"), where("receiverId", "==", auth.currentUser.uid), orderBy("timestamp", "desc"));
    
    onSnapshot(q, s => {
        const list = document.getElementById('message-list');
        list.innerHTML = s.empty ? "<p style='opacity:0.4; margin-top:40px;'>No secrets yet.</p>" : "";
        
        s.forEach(d => {
            const data = d.data();
            const msgId = d.id;
            
            let dateStr = "Just now";
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
                          " · " + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }

            const hintInfo = data.hint || "system log";

            const card = document.createElement('div'); 
            card.className = "glass-card";
            card.onclick = () => window.openPeek(data.text);
            card.innerHTML = `
                <p style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:45px; margin:0;">${data.text}</p>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                    <span style="font-size:0.65rem; color:var(--neon-cyan); opacity:0.6; line-height: 1;">${dateStr}</span>
                    <span style="color: var(--neon-cyan); opacity: 0.2; line-height: 1;">|</span>
                    <span onclick="event.stopPropagation(); window.toggleHint('${msgId}')" 
                          style="font-size:0.65rem; color:white; cursor:pointer; display:inline-flex; align-items: baseline; line-height: 1;">
                        <span id="label-${msgId}" style="text-decoration: underline; opacity: 0.8;">hints</span>
                        <span id="info-${msgId}" style="display:none; margin-left:4px; color:var(--neon-magenta); font-weight: bold;">: ${hintInfo.toLowerCase()}</span>
                    </span>
                </div>
                <span onclick="event.stopPropagation(); window.deleteMessage('${msgId}')" 
                      style="position:absolute; top:18px; right:18px; color:var(--neon-magenta); cursor:pointer; font-weight:bold; font-size:1.3rem; opacity:0.6;">×</span>
            `;
            list.appendChild(card);
        });
    });
}

window.toggleHint = (id) => {
    const info = document.getElementById(`info-${id}`);
    info.style.display = (info.style.display === "none") ? "inline" : "none";
};

// --- SENDING LOGIC ---
window.sendMessage = async () => {
    const txt = document.getElementById('msg-input').value.trim();
    if (!txt) return window.showToast("Empty! ⚠️");

    const ua = navigator.userAgent;
    let device = "device";
    if (/android/i.test(ua)) device = "android";
    else if (/iPad|iPhone|iPod/.test(ua)) device = "ios";
    else if (/Windows/.test(ua)) device = "windows";
    
    let browser = "browser";
    if (/chrome|crios/i.test(ua)) browser = "chrome";
    else if (/safari/i.test(ua)) browser = "safari";

    try {
        await addDoc(collection(db, "messages"), { 
            receiverId: window.currentTargetId, 
            text: txt, 
            timestamp: serverTimestamp(),
            hint: `${device} • ${browser}` 
        });
        await updateDoc(doc(db, "users", window.currentTargetId), { hasUnread: true });
        window.showToast("Sent to the void! 🌌");
        document.getElementById('msg-input').value = "";
    } catch(e) { window.showToast("Failed to send."); }
};

// --- UTILS ---
window.shareLink = () => {
    const url = window.location.href.split('?')[0]; 
    navigator.clipboard.writeText(url + "?" + myData.username);
    window.showToast("Link copied! 📋");
};

window.uploadProfilePic = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "jn79n5zz");

    try {
        window.showToast("Uploading... ⏳");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dj13nbedhh/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) {
            const url = data.secure_url.replace("/upload/", "/upload/w_200,h_200,c_fill,g_face,q_auto,f_auto/");
            await setDoc(doc(db, "users", auth.currentUser.uid), { avatar: url }, { merge: true });
            updateAvatarUI(url);
            window.showToast("Updated! 📸");
        }
    } catch (e) { window.showToast("Upload error."); }
};

// Keep your existing Auth listeners and showScreen logic below...
onAuthStateChanged(auth, async (user) => {
    const urlParams = location.search.substring(1).toLowerCase();
    if (urlParams && urlParams !== "" && !urlParams.startsWith("id=")) {
        const nameSnap = await getDoc(doc(db, "usernames", urlParams));
        if (nameSnap.exists()) {
            window.currentTargetId = nameSnap.data().uid;
            const userSnap = await getDoc(doc(db, "users", window.currentTargetId));
            document.getElementById('pub-user-display').innerText = "@" + userSnap.data().username;
            window.showScreen('screen-send');
        }
    } else if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) { 
            myData = snap.data(); 
            initDash(); 
            setupNotifications(); 
            window.showScreen('screen-dashboard'); 
        }
        else window.showScreen('screen-username');
    } else { window.showScreen('screen-landing'); }
});
    
