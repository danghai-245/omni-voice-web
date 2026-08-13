const GITHUB_VOICE_REPO = "danghai-245/voice_11labs";
const GITHUB_CONFIG_URL = "https://raw.githubusercontent.com/danghai-245/omni-voice-web/main/server_config.json";

let allVoiceMetadata = [];
let currentUser = null;
let modalGpuUrl = "https://modal.com";
let usersDatabase = {
    "USERS": {
        "admin": { "password": "123", "quota": 99999999, "used": 0, "role": "Admin VIP" },
        "tester": { "password": "123", "quota": 100000, "used": 0, "role": "Dùng thử" }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo ban đầu: Hiện trang giới thiệu, ẩn hoàn toàn Studio
    document.getElementById("hero-section").classList.remove("hidden");
    document.getElementById("nav-links").classList.remove("hidden");
    document.getElementById("btn-login-trigger").classList.remove("hidden");
    document.getElementById("btn-studio-trigger").classList.remove("hidden");

    document.getElementById("studio-section").classList.add("hidden");
    document.getElementById("user-badge").classList.add("hidden");

    loadSavedGeminiKey();
    loadServerConfig();
    loadGitHubVoices();
});

function updateCharCount() {
    const text = document.getElementById("text-input").value;
    const charCountEl = document.getElementById("text-char-count");
    if (charCountEl) {
        charCountEl.innerHTML = `<i class="fa-solid fa-font"></i> Tổng số ký tự: <strong>${text.length.toLocaleString('vi-VN')}</strong> ký tự`;
    }
}

// QUẢN LÝ CẤU HÌNH GOOGLE GEMINI API KEY
function loadSavedGeminiKey() {
    const savedKey = localStorage.getItem("gemini_api_key") || "";
    const input = document.getElementById("input-gemini-key");
    if (input) input.value = savedKey;
}

function saveGeminiKey() {
    const key = document.getElementById("input-gemini-key").value.trim();
    localStorage.setItem("gemini_api_key", key);
    console.log("Đã lưu Google Gemini API Key vào LocalStorage!");
}

function toggleKeyVisibility() {
    const input = document.getElementById("input-gemini-key");
    const icon = document.getElementById("key-eye-icon");
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-solid fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fa-solid fa-eye";
    }
}

// TÍNH NĂNG AUTO BIỂU CẢM QUA GOOGLE GEMINI API (KHÔNG POPUP ALERT)
async function autoExpress() {
    const txtArea = document.getElementById("text-input");
    const text = txtArea.value.trim();
    const apiKey = localStorage.getItem("gemini_api_key") || document.getElementById("input-gemini-key").value.trim();

    if (!text) {
        showInlineToast("Vui lòng nhập văn bản kịch bản trước khi gọi AI Auto Biểu Cảm!", "error");
        return;
    }

    if (!apiKey) {
        showInlineToast("Vui lòng nhập Google Gemini API Key trong phần Cấu Hình!", "error");
        document.getElementById("input-gemini-key").focus();
        return;
    }

    try {
        showInlineToast("Đang gửi kịch bản tới Google Gemini AI...", "info");
        const prompt = `Hãy tự động chèn các thẻ biểu cảm cảm xúc như [laughter], [sigh], [surprise-ah], [nhấn giọng] vào kịch bản sau một cách tự nhiên truyền cảm nhất. Chỉ trả về văn bản kịch bản hoàn chỉnh:\n\n${text}`;
        
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                txtArea.value = resultText.trim();
                updateCharCount();
                showInlineToast("Đã chèn biểu cảm AI thành công!", "success");
            }
        } else {
            showInlineToast("Lỗi gọi Google Gemini API! Kiểm tra lại API Key.", "error");
        }
    } catch (e) {
        showInlineToast("Không thể kết nối Google Gemini API. Kiểm tra mạng hoặc Key!", "error");
    }
}

function showInlineToast(msg, type = "info") {
    console.log(`[TOAST - ${type.toUpperCase()}]: ${msg}`);
}

// THUẬT TOÁN CHIA ĐOẠN VĂN BẢN ĐỈNH CAO CHUẨN 100% TOOL EXE (LAUNCHER.PY)
function splitChunks() {
    const text = document.getElementById("text-input").value.trim();
    const mode = document.getElementById("select-chunk-mode").value;

    if (!text) {
        showInlineToast("Vui lòng nhập văn bản kịch bản trước khi chia đoạn!", "error");
        return;
    }

    let chunks = [];

    if (mode === "line") {
        chunks = text.split("\n").map(s => s.trim()).filter(s => s);
    } else if (mode === "sentence") {
        chunks = text.split(/(?<=[.!?。！？])\s+|\n/).map(s => s.trim()).filter(s => s);
    } else {
        const maxChars = parseInt(mode) || 300;
        let start = 0;
        const length = text.length;
        const punctuation = new Set(['.', '?', '!', '\n', ';', '。', '！', '？']);
        const subPunctuation = new Set([',', ':', '-']);

        while (start < length) {
            if (start + maxChars >= length) {
                const chunk = text.substring(start).trim();
                if (chunk) chunks.push(chunk);
                break;
            }

            const end = start + maxChars;
            let foundIdx = -1;
            const minBack = Math.floor(start + maxChars * 0.65);

            for (let i = end; i >= minBack; i--) {
                if (punctuation.has(text[i])) {
                    foundIdx = i + 1;
                    break;
                }
            }

            if (foundIdx === -1) {
                for (let i = end; i >= minBack; i--) {
                    if (subPunctuation.has(text[i])) {
                        foundIdx = i + 1;
                        break;
                    }
                }
            }

            if (foundIdx === -1) {
                for (let i = end; i >= minBack; i--) {
                    if (text[i] === ' ' || text[i] === '\t') {
                        foundIdx = i + 1;
                        break;
                    }
                }
            }

            if (foundIdx === -1) {
                foundIdx = end;
            }

            const chunk = text.substring(start, foundIdx).trim();
            if (chunk) chunks.push(chunk);
            start = foundIdx;
        }
    }

    const chunksList = document.getElementById("chunks-list");
    chunksList.innerHTML = "";

    chunks.forEach((chunk, idx) => {
        const div = document.createElement("div");
        div.className = "chunk-item";
        div.innerHTML = `<strong>Đoạn ${idx + 1} (${chunk.length} ký tự):</strong> ${chunk}`;
        chunksList.appendChild(div);
    });
}

// Nạp cấu hình Link GPU & Danh sách Tài khoản/Hạn mức từ GitHub
async function loadServerConfig() {
    try {
        const resp = await fetch(GITHUB_CONFIG_URL + "?t=" + Date.now());
        if (resp.ok) {
            const data = await resp.json();
            if (data.gpu_url) modalGpuUrl = data.gpu_url;
            if (data.users) usersDatabase.USERS = data.users;
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

// CHÈN THẺ BIỂU CẢM VÀO CON TRỎ VĂN BẢN (TƯƠNG TỰ TOOL EXE)
function insertEmotionTag(tag) {
    const txtArea = document.getElementById("text-input");
    const startPos = txtArea.selectionStart;
    const endPos = txtArea.selectionEnd;
    const text = txtArea.value;

    txtArea.value = text.substring(0, startPos) + ` ${tag} ` + text.substring(endPos);
    txtArea.focus();
    txtArea.selectionStart = startPos + tag.length + 2;
    txtArea.selectionEnd = startPos + tag.length + 2;
    updateCharCount();
}

// BẢO MẬT & ĐĂNG NHẬP / CHUYỂN TRANG CÔNG CỤ ĐỘC LẬP
function openAuthModal() {
    document.getElementById("auth-modal").classList.remove("hidden");
    setTimeout(() => {
        document.getElementById("auth-username").focus();
    }, 100);
}

function closeAuthModal() {
    document.getElementById("auth-modal").classList.add("hidden");
}

function openStudio() {
    if (!currentUser) {
        openAuthModal();
    } else {
        showStudioView();
    }
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
        closeAuthModal();
        showStudioView();
    } else {
        alert("Tên tài khoản hoặc mật khẩu không chính xác!");
    }
}

function showStudioView() {
    document.getElementById("hero-section").classList.add("hidden");
    document.getElementById("nav-links").classList.add("hidden");
    document.getElementById("btn-login-trigger").classList.add("hidden");
    document.getElementById("btn-studio-trigger").classList.add("hidden");

    document.getElementById("user-badge").classList.remove("hidden");
    document.getElementById("user-name-display").innerHTML = `<i class="fa-solid fa-user-check"></i> ${currentUser.username} (${currentUser.role})`;
    document.getElementById("user-quota-display").innerText = `${currentUser.used.toLocaleString('vi-VN')} / ${currentUser.quota.toLocaleString('vi-VN')} ký tự`;

    if (currentUser.role.includes("Admin") || currentUser.username === "admin") {
        document.getElementById("btn-admin-manage").classList.remove("hidden");
    } else {
        document.getElementById("btn-admin-manage").classList.add("hidden");
    }

    document.getElementById("studio-section").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function logout() {
    currentUser = null;
    document.getElementById("studio-section").classList.add("hidden");
    document.getElementById("user-badge").classList.add("hidden");

    document.getElementById("hero-section").classList.remove("hidden");
    document.getElementById("nav-links").classList.remove("hidden");
    document.getElementById("btn-login-trigger").classList.remove("hidden");
    document.getElementById("btn-studio-trigger").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// TRÌNH QUẢN LÝ ADMIN USER MANAGER
function openAdminModal() {
    renderUserList();
    document.getElementById("admin-modal").classList.remove("hidden");
}

function closeAdminModal() {
    document.getElementById("admin-modal").classList.add("hidden");
}

function renderUserList() {
    const tbody = document.getElementById("user-table-body");
    tbody.innerHTML = "";

    Object.keys(usersDatabase.USERS).forEach(username => {
        const u = usersDatabase.USERS[username];
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${username}</strong></td>
            <td><code>${u.password}</code></td>
            <td>${u.used.toLocaleString('vi-VN')} / ${u.quota.toLocaleString('vi-VN')} ký tự</td>
            <td><span class="badge-role">${u.role}</span></td>
            <td>
                <button class="btn-action-edit" onclick="editUserQuota('${username}')"><i class="fa-solid fa-pen"></i> Sửa Ký Tự</button>
                ${username !== 'admin' ? `<button class="btn-action-del" onclick="deleteUser('${username}')"><i class="fa-solid fa-trash"></i> Xóa</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addNewUser() {
    const name = document.getElementById("new-user-name").value.trim();
    const pass = document.getElementById("new-user-pass").value.trim();
    const quota = parseInt(document.getElementById("new-user-quota").value.trim()) || 100000;
    const role = document.getElementById("new-user-role").value.trim() || "Khách VIP";

    if (!name || !pass) {
        alert("Vui lòng nhập Tên tài khoản và Mật khẩu!");
        return;
    }

    usersDatabase.USERS[name] = { password: pass, quota: quota, used: 0, role: role };
    
    document.getElementById("new-user-name").value = "";
    document.getElementById("new-user-pass").value = "";
    renderUserList();
}

function editUserQuota(username) {
    const currentAcc = usersDatabase.USERS[username];
    const newQuotaStr = prompt(`Nhập Hạn Mức KÝ TỰ MỚI cho tài khoản ${username}:`, currentAcc.quota);
    if (newQuotaStr !== null) {
        const newQuota = parseInt(newQuotaStr);
        if (!isNaN(newQuota)) {
            currentAcc.quota = newQuota;
            renderUserList();
            if (currentUser && currentUser.username === username) {
                currentUser.quota = newQuota;
                document.getElementById("user-quota-display").innerText = `${currentUser.used.toLocaleString('vi-VN')} / ${currentUser.quota.toLocaleString('vi-VN')} ký tự`;
            }
        }
    }
}

function deleteUser(username) {
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${username}" không?`)) {
        delete usersDatabase.USERS[username];
        renderUserList();
    }
}

// TẠO ÂM THANH: KHÔNG POPUP ALERT, CÓ THANH PROGRESS %, CHỈ TRỪ KÝ TỰ KHI TẠO THÀNH CÔNG!
async function generateAudio() {
    if (!currentUser) {
        openAuthModal();
        return;
    }

    const text = document.getElementById("text-input").value.trim();
    if (!text) {
        showInlineToast("Vui lòng nhập kịch bản trước khi tạo âm thanh!", "error");
        return;
    }

    const charCount = text.length;

    // Kiểm tra hạn mức trước khi khởi chạy
    if (currentUser.used + charCount > currentUser.quota) {
        const progressCard = document.getElementById("progress-card");
        progressCard.classList.remove("hidden");
        document.getElementById("progress-status-text").innerText = `❌ Hết hạn mức ký tự! (Cần ${charCount.toLocaleString('vi-VN')} ký tự)`;
        document.getElementById("progress-bar-fill").style.width = "0%";
        document.getElementById("progress-percent").innerText = "0";
        return;
    }

    // Hiển thị Progress Card & Ẩn Card kết quả cũ
    const progressCard = document.getElementById("progress-card");
    const resultCard = document.getElementById("audio-result-card");
    const btnGen = document.getElementById("btn-generate-all");

    progressCard.classList.remove("hidden");
    resultCard.classList.add("hidden");
    btnGen.disabled = true;

    // Tự động mô phỏng tiến độ % siêu mượt từ 0% -> 95%
    let currentPercent = 0;
    document.getElementById("progress-status-text").innerText = "Đang kết nối Cỗ Máy Siêu Tạo Voice AI...";
    document.getElementById("progress-bar-fill").style.width = "0%";
    document.getElementById("progress-percent").innerText = "0";

    const progressInterval = setInterval(() => {
        if (currentPercent < 90) {
            currentPercent += Math.floor(Math.random() * 15) + 5;
            if (currentPercent > 90) currentPercent = 90;
            
            document.getElementById("progress-bar-fill").style.width = `${currentPercent}%`;
            document.getElementById("progress-percent").innerText = currentPercent;

            if (currentPercent > 40) {
                document.getElementById("progress-status-text").innerText = "Đang tổng hợp giọng nói đa truyền cảm...";
            }
            if (currentPercent > 75) {
                document.getElementById("progress-status-text").innerText = "Đang tinh chỉnh âm thanh & khử nhiễu nền...";
            }
        }
    }, 400);

    try {
        // Giả lập thời gian sinh voice thực tế
        await new Promise(resolve => setTimeout(resolve, 2500));

        // TẠO THÀNH CÔNG 100%:
        clearInterval(progressInterval);
        document.getElementById("progress-bar-fill").style.width = "100%";
        document.getElementById("progress-percent").innerText = "100";
        document.getElementById("progress-status-text").innerText = "✨ Siêu tạo âm thanh hoàn tất!";

        // CHỈ TRỪ SỐ KÝ TỰ TÀI KHOẢN KHI ĐOẠN TẠO THÀNH CÔNG 100%!
        currentUser.used += charCount;
        document.getElementById("user-quota-display").innerText = `${currentUser.used.toLocaleString('vi-VN')} / ${currentUser.quota.toLocaleString('vi-VN')} ký tự`;

        // Hiển thị Card kết quả âm thanh
        setTimeout(() => {
            progressCard.classList.add("hidden");
            resultCard.classList.remove("hidden");
            btnGen.disabled = false;

            const player = document.getElementById("audio-player");
            const downloadLink = document.getElementById("download-link");
            
            // File mẫu âm thanh
            player.src = "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg";
            downloadLink.href = player.src;
        }, 500);

    } catch (e) {
        clearInterval(progressInterval);
        btnGen.disabled = false;
        document.getElementById("progress-status-text").innerText = "❌ Lỗi sinh âm thanh! Vui lòng thử lại.";
    }
}
