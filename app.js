const GITHUB_REPO = "danghai-245/voice_11labs";
const MODAL_ENDPOINT = "https://modal.com"; // Endpoint Modal.com của bạn
let allVoiceMetadata = [];
let isAuth = false;

document.addEventListener("DOMContentLoaded", () => {
    loadGitHubVoices();
});

// Nạp danh sách giọng đọc từ GitHub Repo
async function loadGitHubVoices() {
    try {
        const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/`);
        if (!resp.ok) return;
        const files = await resp.json();
        
        allVoiceMetadata = [];
        const combo = document.getElementById("select-voice");
        combo.innerHTML = "";

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

// BẢO MẬT VÀ ĐĂNG NHẬP
function openStudio() {
    if (!isAuth) {
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
    const pass = document.getElementById("auth-password").value.trim();
    if (pass) {
        isAuth = true;
        closeAuthModal();
        openStudio();
    } else {
        alert("Vui lòng nhập mật khẩu!");
    }
}

function logout() {
    isAuth = false;
    document.getElementById("studio-section").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function generateAudio() {
    alert("Đang kết nối tới Modal.com Serverless GPU để tạo âm thanh...");
}
