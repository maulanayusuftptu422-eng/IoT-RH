// GANTI DENGAN CONFIG FIREBASE ANDA
const firebaseConfig = {
    apiKey: "AIzaSyCAH6eVzeSLPHGROwceBspG_HqVyPF7uvI",
    authDomain: "sistem-kontrol-rh.firebaseapp.com",
    databaseURL: "https://sistem-kontrol-rh-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sistem-kontrol-rh",
    storageBucket: "sistem-kontrol-rh.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => console.error("Persistence Error:", error));

// ==========================================
// 1. WAKTU SISTEM REAL-TIME
// ==========================================
setInterval(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    document.getElementById('txt-timestamp').innerText = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}, 500);

// ==========================================
// 2. SISTEM AUTENTIKASI
// ==========================================
function switchAuthView(view) {
    document.getElementById('form-login').style.display = view === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = view === 'register' ? 'block' : 'none';
    document.getElementById('form-reset').style.display = view === 'reset' ? 'block' : 'none';
}

function handleLogin(e) {
    e.preventDefault();
    const inputUsername = document.getElementById('login-username').value.trim();
    const pw = document.getElementById('login-pw').value;
    const btn = document.getElementById('btn-login'); btn.innerText = "Mencari..."; btn.disabled = true;

    database.ref('usernames/' + inputUsername).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) throw new Error("Username tidak ditemukan.");
            return auth.signInWithEmailAndPassword(snapshot.val(), pw);
        })
        .then((userCredential) => { if (!userCredential.user.emailVerified) { auth.signOut(); throw new Error("Verifikasi email Anda!"); } })
        .catch((err) => { alert("Login Gagal: " + err.message); btn.innerText = "MASUK DASHBOARD"; btn.disabled = false; });
}

function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pw = document.getElementById('reg-pw').value;
    const fullName = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value.trim();
    const btn = document.getElementById('btn-reg'); btn.innerText = "Memeriksa..."; btn.disabled = true;

    database.ref('usernames/' + username).once('value')
        .then(snapshot => {
            if (snapshot.exists()) throw new Error("Username sudah dipakai.");
            return auth.createUserWithEmailAndPassword(email, pw);
        })
        .then((userCredential) => {
            const user = userCredential.user;
            database.ref('users/' + user.uid).set({ nama: fullName, username: username, email: email });
            database.ref('usernames/' + username).set(email);
            return user.sendEmailVerification();
        })
        .then(() => { alert("Pendaftaran berhasil! Cek email untuk verifikasi."); auth.signOut(); switchAuthView('login'); })
        .catch((err) => alert("Gagal: " + err.message))
        .finally(() => { btn.innerText = "BUAT AKUN"; btn.disabled = false; });
}

function handleReset(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    auth.sendPasswordResetEmail(email).then(() => { alert("Link reset dikirim."); switchAuthView('login'); }).catch((err) => alert("Error: " + err.message));
}

function handleLogout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged((user) => {
    const authScreen = document.getElementById('auth-screen');
    const displayName = document.getElementById('user-display-name');

    if (user && user.emailVerified) {
        authScreen.classList.add('opacity-0', 'pointer-events-none');
        database.ref('users/' + user.uid).once('value').then(snap => { displayName.innerText = snap.exists() ? snap.val().nama : "Admin"; });
        startRealtimeListener(); 
    } else {
        authScreen.classList.remove('opacity-0', 'pointer-events-none');
    }
});

// ==========================================
// 3. NAVIGASI DASHBOARD
// ==========================================
const views = ['home', 'history', 'chart', 'about'];
const titles = { home: "Dashboard Real-Time", history: "Riwayat Log Data", chart: "Analisis Grafik Akademis", about: "Informasi Sistem" };

function toggleMobileMenu() { document.getElementById('sidebar').classList.toggle('-translate-x-full'); }

function switchView(targetView) {
    views.forEach(view => {
        document.getElementById(`view-${view}`).style.display = (view === targetView) ? 'block' : 'none';
        const btn = document.getElementById(`nav-${view}`);
        if(view === targetView) { btn.classList.add('active'); btn.classList.remove('text-slate-400', 'hover:bg-slate-700/50'); } 
        else { btn.classList.remove('active'); btn.classList.add('text-slate-400', 'hover:bg-slate-700/50'); }
    });
    document.getElementById('page-title').innerText = titles[targetView];
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.add('-translate-x-full');
}

function switchChartTab(tab) {
    document.getElementById('area-realtime-chart').style.display = tab === 'realtime' ? 'block' : 'none';
    document.getElementById('area-historical-chart').style.display = tab === 'historical' ? 'block' : 'none';
    document.getElementById('tab-chart-realtime').className = tab === 'realtime' ? "px-4 py-2 text-sm font-bold border-b-2 border-emerald-500 text-emerald-400 whitespace-nowrap" : "px-4 py-2 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-white whitespace-nowrap";
    document.getElementById('tab-chart-historical').className = tab === 'historical' ? "px-4 py-2 text-sm font-bold border-b-2 border-emerald-500 text-emerald-400 whitespace-nowrap" : "px-4 py-2 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-white whitespace-nowrap";
}

// ==========================================
// 4. KONTROL TARGET RH
// ==========================================
function setRHTarget() {
    const inputVal = parseFloat(document.getElementById('input-rh-target').value);
    
    // Angka 50 diubah menjadi 40, begitu juga dengan teks alert-nya
    if (isNaN(inputVal) || inputVal < 40 || inputVal > 60) return alert("Masukkan rentang target wajar antara 40.0 hingga 60.0 %.");

    database.ref('/settings/rh_target').set(inputVal)
        .then(() => { 
            alert("Target RH sukses diperbarui ke: " + inputVal + "%"); 
            document.getElementById('input-rh-target').value = ''; 
        })
        .catch(err => alert("Gagal update target: " + err.message));
}

// ==========================================
// 5.INISIALISASI GRAFIK (CHART.JS)
// ==========================================
Chart.defaults.color = '#94a3b8';
Chart.defaults.scale.grid.color = '#334155';

function createChart1(id) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'RH In Aktual (%)', borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', data: [], tension: 0.3, fill: true, borderWidth: 2, pointRadius: 0 },
            { label: 'Target RH Dinamis', borderColor: '#10b981', data: [], borderDash: [5,5], borderWidth: 2, pointRadius: 0 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false }, y: { title: {display: true, text: 'Kelembapan (RH %)'} } } }
    });
}

function createActuatorChart(id, label, color) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: label, borderColor: color, backgroundColor: color+'22', data: [], stepped: true, fill: true, borderWidth: 2, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false }, y: { min: 0, max: 1.2, title: {display: true, text: 'Status Relay'}, ticks: { stepSize: 1, callback: (v) => v === 1 ? 'ON' : (v === 0 ? 'OFF' : '') } } } }
    });
}

function createChart6(id) {
    return new Chart(document.getElementById(id).getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'RH In (%)', borderColor: '#3b82f6', data: [], tension: 0.3, borderWidth: 2, pointRadius: 0 },
            { label: 'RH Out (%)', borderColor: '#94a3b8', data: [], tension: 0.3, borderDash: [5,5], borderWidth: 2, pointRadius: 0 },
            { label: 'Temp In (°C)', borderColor: '#f59e0b', data: [], tension: 0.3, borderWidth: 2, pointRadius: 0 },
            { label: 'Temp Out (°C)', borderColor: '#fb923c', data: [], tension: 0.3, borderDash: [5,5], borderWidth: 2, pointRadius: 0 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false }, y: { min: 0, max: 100, title: {display: true, text: 'Nilai Sensor (0-100)'} } } }
    });
}

const rtC = [ createChart1('rtChart1'), createActuatorChart('rtChart2', 'Heater', '#ef4444'), createActuatorChart('rtChart3', 'Sirkulasi Internal', '#10b981'), createActuatorChart('rtChart4', 'Ventilasi Masuk', '#3b82f6'), createActuatorChart('rtChart5', 'Ventilasi Keluar', '#8b5cf6'), createChart6('rtChart6') ];
const histC = [ createChart1('histChart1'), createActuatorChart('histChart2', 'Heater', '#ef4444'), createActuatorChart('histChart3', 'Sirkulasi Internal', '#10b981'), createActuatorChart('histChart4', 'Ventilasi Masuk', '#3b82f6'), createActuatorChart('histChart5', 'Ventilasi Keluar', '#8b5cf6'), createChart6('histChart6') ];

function pushRealtimeData(tLabel, d1, d2, d3, d4, d5, d6) {
    try {
        const updateC = (chart, valArr) => { chart.data.labels.push(tLabel); valArr.forEach((v, i) => chart.data.datasets[i].data.push(v)); if (chart.data.labels.length > 20) { chart.data.labels.shift(); chart.data.datasets.forEach(ds => ds.data.shift()); } chart.update(); };
        updateC(rtC[0], d1); updateC(rtC[1], d2); updateC(rtC[2], d3); updateC(rtC[3], d4); updateC(rtC[4], d5); updateC(rtC[5], d6);
    } catch(e) { console.error(e); }
}

// ==========================================
// 6. FUNGSI PEMBARUAN AKTUATOR UI
// ==========================================
function updateActuatorUI(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const statusTxt = el.querySelector('.status');
    if (state) {
        el.classList.add('actuator-on');
        statusTxt.innerText = "ON";
    } else {
        el.classList.remove('actuator-on');
        statusTxt.innerText = "OFF";
    }
}

// ==========================================
// 7. LISTENER DATA REAL-TIME
// ==========================================
function startRealtimeListener() {
    database.ref('/current').on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return;

        // Pembaruan Angka Sensor
        if(typeof data.rh_in !== 'undefined') document.getElementById('txt-rh-in').innerText = data.rh_in.toFixed(1);
        if(typeof data.rh_out !== 'undefined') document.getElementById('txt-rh-out').innerText = data.rh_out.toFixed(1);
        if(typeof data.temp_in !== 'undefined') document.getElementById('txt-temp-in').innerText = data.temp_in.toFixed(1);
        if(typeof data.temp_out !== 'undefined') document.getElementById('txt-temp-out').innerText = data.temp_out.toFixed(1);

        // Pembaruan Target RH
        const currentTarget = typeof data.rh_target !== 'undefined' ? data.rh_target : 55.0;
        document.getElementById('display-rh-target').innerText = currentTarget.toFixed(1) + " %";

        // Pembaruan UI Aktuator Box
        updateActuatorUI('act-heater', data.heater);
        updateActuatorUI('act-fan-dehum', data.fanDehum);
        updateActuatorUI('act-fan-in', data.fanIn);
        updateActuatorUI('act-fan-out', data.fanOut);

        // Grafik Real-Time
        const timestamp = data.timestamp ? data.timestamp.split(' ')[1] : new Date().toLocaleTimeString();
        pushRealtimeData(timestamp, [data.rh_in || 0, currentTarget], [data.heater ? 1 : 0], [data.fanDehum ? 1 : 0], [data.fanIn ? 1 : 0], [data.fanOut ? 1 : 0], [data.rh_in || 0, data.rh_out || 0, data.temp_in || 0, data.temp_out || 0]);

        // Pengaturan Badge & Penyorotan Timer
        const mode = data.mode || "STANDBY";
        const badge = document.getElementById('badge-mode');
        const tMode = data.timer_mode || "--:--:--";
        
        ['timer-tads', 'timer-treg', 'timer-forced', 'timer-cooldown'].forEach(id => { 
            const el = document.getElementById(id);
            if (el) { el.innerText = "--:--:--"; el.className = "timer-value text-slate-600"; }
        });

        const elLoop = document.getElementById('timer-loop');
        if (elLoop) {
            elLoop.innerText = data.timer_loop || "--:--:--";
            elLoop.className = (data.timer_loop === "PAUSED") ? "timer-value text-rose-500 animate-pulse" : "timer-value text-emerald-400";
        }

        if (mode === "STANDBY") {
            badge.innerText = "✅ MEMPERTAHANKAN RH (STANDBY)";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-emerald-600 text-white";
        } 
        else if (mode === "ADSORPSI") {
            badge.innerText = "🚨 FASE KRITIS (>60%): ADSORPSI";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-rose-800 text-white animate-pulse";
            const el = document.getElementById('timer-tads'); if (el) { el.innerText = tMode; el.className = "timer-value text-rose-400 font-bold font-mono"; }
        }
        else if (mode === "TURUNKAN_RH") {
            badge.innerText = "⬇️ MENURUNKAN RH RUANGAN";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-blue-600 text-white";
        } 
        else if (mode === "HUMIDIFIKASI") {
            badge.innerText = "⚠️ FASE KRITIS (<40%): HUMIDIFIKASI";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-orange-700 text-white animate-pulse";
        } 
        else if (mode === "NAIKKAN_RH") {
            badge.innerText = "⬆️ MENAIKKAN RH RUANGAN";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-amber-500 text-white";
        }
        else if (mode === "REG_RUTIN" || mode === "REG_PAKSA") {
            badge.innerText = "🔥 PEMULIHAN DESIKAN (REGENERASI)";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-rose-600 text-white";
            const idTimer = (mode === "REG_RUTIN") ? 'timer-treg' : 'timer-forced';
            const el = document.getElementById(idTimer); if (el) { el.innerText = tMode; el.className = "timer-value text-rose-400"; }
        } 
        else if (mode === "COOLDOWN") {
            badge.innerText = "❄️ PENDINGINAN SISTEM";
            badge.className = "w-full py-6 rounded-xl font-black text-xl md:text-2xl tracking-wide shadow-inner flex items-center justify-center text-center bg-cyan-600 text-white";
            const el = document.getElementById('timer-cooldown'); if (el) { el.innerText = tMode; el.className = "timer-value text-cyan-400"; }
        }
    });
}

// ==========================================
// 8. RENDER RIWAYAT INSTAN & TABEL
// ==========================================
function loadHistoryData() {
    const date = document.getElementById('history-date').value;
    if(!date) return alert("Pilih tanggal terlebih dahulu!");
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-emerald-400 animate-pulse">Menarik data dari Firebase...</td></tr>';

    database.ref('/history').orderByChild('timestamp').startAt(date).endAt(date + "\uf8ff").once('value').then(snapshot => {
        const data = snapshot.val(); tbody.innerHTML = ''; let count = 0;
        
        let labels = [], rhInArr = [], targetArr = [], heaterArr = [], fanDehumArr = [], fanInArr = [], fanOutArr = [];
        let rhOutArr = [], tempInArr = [], tempOutArr = [];

        if(data) {
            const sortedKeys = Object.keys(data).sort((a, b) => data[a].timestamp > data[b].timestamp ? 1 : -1);
            
            // Ekstraksi data untuk grafik
            sortedKeys.forEach(key => {
                const row = data[key];
                labels.push(row.timestamp ? row.timestamp.split(' ')[1] : '');
                rhInArr.push(row.rh_in || 0); targetArr.push(row.rh_target != null ? row.rh_target : 55.0);
                heaterArr.push(row.heater ? 1 : 0); fanDehumArr.push(row.fanDehum ? 1 : 0);
                fanInArr.push(row.fanIn ? 1 : 0); fanOutArr.push(row.fanOut ? 1 : 0);
                rhOutArr.push(row.rh_out || 0); tempInArr.push(row.temp_in || 0); tempOutArr.push(row.temp_out || 0);
            });

            // Suntik ke Chart.js
            histC[0].data.labels = labels; histC[0].data.datasets[0].data = rhInArr; histC[0].data.datasets[1].data = targetArr; histC[0].update();
            histC[1].data.labels = labels; histC[1].data.datasets[0].data = heaterArr; histC[1].update();
            histC[2].data.labels = labels; histC[2].data.datasets[0].data = fanDehumArr; histC[2].update();
            histC[3].data.labels = labels; histC[3].data.datasets[0].data = fanInArr; histC[3].update();
            histC[4].data.labels = labels; histC[4].data.datasets[0].data = fanOutArr; histC[4].update();
            histC[5].data.labels = labels; histC[5].data.datasets[0].data = rhInArr; histC[5].data.datasets[1].data = rhOutArr;
            histC[5].data.datasets[2].data = tempInArr; histC[5].data.datasets[3].data = tempOutArr; histC[5].update();

            // Pembangunan Row Tabel (Dibalik agar terbaru di atas)
            sortedKeys.slice().reverse().forEach(key => {
                const row = data[key]; count++;
                const tr = document.createElement('tr'); tr.className = "hover:bg-slate-800 border-b border-slate-700/50 whitespace-nowrap text-xs sm:text-sm";
                
                let modeTxt = row.mode || '-';
                if(modeTxt === "STANDBY") modeTxt = "STANDBY";
                if(modeTxt === "ADSORPSI") modeTxt = "FASE KRITIS (>60%)";
                if(modeTxt === "TURUNKAN_RH") modeTxt = "MENURUNKAN RH";
                if(modeTxt === "HUMIDIFIKASI") modeTxt = "KRITIS (<40%)";
                if(modeTxt === "NAIKKAN_RH") modeTxt = "MENAIKKAN RH";

                let tAds = (row.mode === "ADSORPSI") ? (row.timer_mode || '-') : '-';
                let tReg = (row.mode === "REG_RUTIN" || row.mode === "REG_PAKSA") ? (row.timer_mode || '-') : '-';

                tr.innerHTML = `
                    <td class="px-4 py-3">${row.timestamp ? row.timestamp.split(' ')[1] : '-'}</td>
                    <td class="px-4 py-3 font-bold ${row.mode==='ADSORPSI'?'text-rose-400':'text-emerald-400'}">${modeTxt}</td>
                    <td class="px-4 py-3 font-bold text-emerald-400">${row.rh_target != null ? row.rh_target.toFixed(1) : '-'}</td>
                    <td class="px-4 py-3 text-indigo-300 font-mono">${row.timer_loop || '-'}</td>
                    <td class="px-4 py-3 text-blue-300 font-mono">${tAds}</td>
                    <td class="px-4 py-3 text-rose-300 font-mono">${tReg}</td>
                    <td class="px-4 py-3">${row.rh_in != null ? row.rh_in.toFixed(1) : 0}</td>
                    <td class="px-4 py-3">${row.rh_out != null ? row.rh_out.toFixed(1) : 0}</td>
                    <td class="px-4 py-3">${row.temp_in != null ? row.temp_in.toFixed(1) : 0}</td>
                    <td class="px-4 py-3 text-slate-400">${row.heater?'ON':'OFF'} / ${row.fanDehum?'ON':'OFF'} / ${row.fanIn?'ON':'OFF'} / ${row.fanOut?'ON':'OFF'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        if(count === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Tidak ada data di tanggal tersebut.</td></tr>`;
            histC.forEach(chart => { chart.data.labels = []; chart.data.datasets.forEach(ds => ds.data = []); chart.update(); });
        }
    }).catch(e => { tbody.innerHTML = `<tr><td colspan="10" class="text-rose-500 text-center py-4">Error: ${e.message}</td></tr>`; });
}

// ==========================================
// 9. UNDUH CSV
// ==========================================
function downloadCSV() {
    const date = document.getElementById('history-date').value;
    if (!date) return alert("Silakan pilih tanggal terlebih dahulu.");
    
    database.ref('/history').orderByChild('timestamp').startAt(date).endAt(date + "\uf8ff").once('value').then(snapshot => {
        const data = snapshot.val(); if (!data) return alert(`Tidak ada rekaman pada ${date}.`);
        
        let csvData = ["Waktu,Mode,RH Target (%),Timer Loop,Timer Adsorpsi,Timer Regenerasi,RH In (%),RH Out (%),Temp In (C),Temp Out (C),Heater,Sirkulasi Internal,Fan In,Fan Out"];
        
        Object.keys(data).sort((a, b) => data[a].timestamp > data[b].timestamp ? 1 : -1).forEach(key => {
            const row = data[key];
            let tAds = (row.mode === "ADSORPSI") ? (row.timer_mode || '-') : '-';
            let tReg = (row.mode === "REG_RUTIN" || row.mode === "REG_PAKSA") ? (row.timer_mode || '-') : '-';
            csvData.push(`"${row.timestamp || '-'}","${row.mode || '-'}",${row.rh_target != null ? row.rh_target : '-'},"${row.timer_loop||'-'}","${tAds}","${tReg}",${row.rh_in||0},${row.rh_out||0},${row.temp_in||0},${row.temp_out||0},${row.heater?'ON':'OFF'},${row.fanDehum?'ON':'OFF'},${row.fanIn?'ON':'OFF'},${row.fanOut?'ON':'OFF'}`);
        });

        const blob = new Blob([csvData.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = `Log_TA_${date}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });
}