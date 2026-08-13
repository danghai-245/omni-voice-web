const GITHUB_VOICE_REPO = "danghai-245/voice_11labs";
// Link trạm trung chuyển Server URL & Quản lý User trên GitHub Gist/Repo
const GITHUB_CONFIG_URL = "https://raw.githubusercontent.com/danghai-245/omni-voice-web/main/server_config.json";

let allVoiceMetadata = [];
let currentUser = null;
let modalGpuUrl = "https://modal.com";
let usersDatabase = {
    "USERS": {
        "admin": { "password": "123", "quota": 999999, "used": 0, "role": "Admin VIP" },
        "test": { "password": "123", "quota": 10, "used": 0, "role": "Dùng thử" }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadServerConfig();
    loadGitHubVoices();
});

// Nạp cấu hình Link GPU & Danh sách Tài khoản/Hạn mức từ GitHub
async function loadServerConfig() {
    try {
        const resp = await fetch(GITHUB_CONFIG_URL + "?t=" + Date.now());
        if (resp.ok) {
            const data = await resp.json();
            if (data.gpu_url) modalGpuUrl = data.gpu_url;
            if (data.users) usersDatabase.USERS = data.users;
            console.log("Đã nạp Link GPU từ GitHub:", modalGpuUrl);
        }
    } catch (e) {
        console.log("Dùng config mặc định local");
    }
}

// Nạp danh sách giọng đọc từ GitHub Repo
async function loadGitHubVoices() {
    try {
        const resp = await fetch(`https://api.github.com/repos/${GITHUB_VOICE_REPO}/contents/`);
        if (!resp.ok) return;
        const files = await resp.json();
        
        allVoiceMetadata = [];
        files.forEach(file => {
            if (file.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
                const meta = parseVoiceInfo(file.name, file.download_url);
                allVoiceMetadata.push(meta);
            }
        });

        document.getElementById("stat-voice-count").innerText = `${allVoiceMetadata.length}+`;
        populateFilters();
        applyFilters();
    } catch (e) {
        console.error("Lỗi đồng bộ GitHub:", e);
    }
}

function parseVoiceInfo(filename, downloadUrl) {
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const parts = baseName.split("-").map(s => s.trim());
    
    const category = parts.length >= 1 ? parts[parts.length - 1] : "Tất cả";
    const age = parts.length >= 2 ? parts[parts.length - 2] : "Tất cả";
    const gender = parts.length >= 3 ? parts[parts.length - 3] : "Tất cả";
    const lang = parts.length >= 4 ? parts[parts.length - 4] : "Tất cả";
    const voiceId = parts.length >= 5 ? parts[parts.length - 5] : "";
    
    let displayName = baseName;
    if (parts.length > 5) displayName = parts.slice(0, -5).join(" - ");
    else if (parts.length > 4) displayName = parts.slice(0, -4).join(" - ");
    
    return { name: displayName, raw: baseName, voiceId, lang, gender, age, category, downloadUrl };
}

function populateFilters() {
    const langs = [...new Set(allVoiceMetadata.map(v => v.lang))].sort();
    const genders = [...new Set(allVoiceMetadata.map(v => v.gender))].sort();
    const cats = [...new Set(allVoiceMetadata.map(v => v.category))].sort();

    fillCombo("filter-lang", ["Ngôn ngữ: Tất cả", ...langs]);
    fillCombo("filter-gender", ["Giới tính: Tất cả", ...genders]);
    fillCombo("filter-cat", ["Thể loại: Tất cả", ...cats]);
}

function fillCombo(id, values) {
    const el = document.getElementById(id);
    el.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join("");
}

function applyFilters() {
    const selectedLang = document.getElementById("filter-lang").value;
    const selectedGender = document.getElementById("filter-gender").value;
    const selectedCat = document.getElementById("filter-cat").value;

    const filtered = allVoiceMetadata.filter(v => {
        if (selectedLang !== "Ngôn ngữ: Tất cả" && v.lang !== selectedLang) return false;
        if (selectedGender !== "Giới tính: Tất cả" && v.gender !== selectedGender) return false;
        if (selectedCat !== "Thể loại: Tất cả" && v.category !== selectedCat) return false;
        return true;
    });

    const combo = document.getElementById("select-voice");
    combo.innerHTML = filtered.map(v => `<option value="${v.name}">${v.name}</option>`).join("");
}

function searchVoiceId() {
    const search = document.getElementById("input-voice-id").value.trim().toLowerCase();
    if (!search) return;

    const matched = allVoiceMetadata.find(v => v.voiceId.toLowerCase().includes(search) || v.raw.toLowerCase().includes(search));
    if (matched) {
        document.getElementById("select-voice").value = matched.name;
    }
}

// BẢO MẬT & QUẢN LÝ TÀI KHOẢN / HẠN MỨC (QUOTA)
function openStudio() {
    if (!currentUser) {
        document.getElementById("auth-modal").classList.remove("hidden");
    } else {
        document.getElementById("studio-section").classList.remove("hidden");
        document.getElementById("studio-section").scrollIntoView({ behavior: "smooth" });
    }
}

function closeAuthModal() {
    document.getElementById("auth-modal").classList.add("hidden");
}

function submitAuth() {
    const username = document.getElementById("auth-username").value.trim();
    const pass = document.getElementById("auth-password").value.trim();
    
    if (!username || !pass) {
        alert("Vui lòng nhập đầy đủ Tên tài khoản và Mật khẩu!");
        return;
    }

    const userAcc = usersDatabase.USERS[username];
    if (userAcc && userAcc.password === pass) {
        currentUser = { username, ...userAcc };
        alert(`Đăng nhập thành công! Xin chào ${username} (${userAcc.role}). Hạn mức: ${userAcc.used}/${userAcc.quota} lượt.`);
        closeAuthModal();
        openStudio();
    } else {
        alert("Tên tài khoản hoặc mật khẩu không chính xác!");
    }
}

function logout() {
    currentUser = null;
    document.getElementById("studio-section").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function generateAudio() {
    if (!currentUser) {
        alert("Vui lòng đăng nhập trước khi tạo âm thanh!");
        openStudio();
        return;
    }

    if (currentUser.used >= currentUser.quota) {
        alert(`Tài khoản ${currentUser.username} đã HẾT HẠN MỨC (${currentUser.used}/${currentUser.quota} lượt). Vui lòng liên hệ Admin để gia hạn!`);
        return;
    }

    alert(`Đang kết nối Cỗ Máy Siêu Tạo Voice để sinh giọng nói... Lượt tạo còn lại: ${currentUser.quota - currentUser.used - 1}`);
    currentUser.used += 1;
}
