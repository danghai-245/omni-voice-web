const GITHUB_GIST_API_URL = "https://api.github.com/gists/38bd9e7788def62592741f519581bde0";
const OBFUSCATED_TOKEN_REVERSE_B64 = "dVVrdjBudmtNTXAwZVU3MnNTdXdpQmdvYWNPbzRUY2dwRHBfcGhn";
const HTH_SECRET_AUTH_KEY = "HTH_VOICE_SECURE_AUTH_2026_TOKEN";

function getAdminDefaultToken() {
    try {
        const decodedB64 = Buffer.from(OBFUSCATED_TOKEN_REVERSE_B64, 'base64').toString('utf-8');
        return decodedB64.split("").reverse().join("");
    } catch (e) {
        return "";
    }
}

let inMemoryUsers = {
    "admin-0405": { "password": "Hth1624!", "quota": 99999999, "used": 0, "role": "Admin VIP" },
    "tester": { "password": "123", "quota": 100000, "used": 0, "role": "Dùng thử" }
};

let inMemoryGpuUrls = [
    "https://hhhh01234501--vieneu-tts-serverless-vieneumodel-generate.modal.run",
    "https://hai319959--vieneu-tts-serverless-vieneumodel-generate.modal.run",
    "https://danghai30052005--vieneu-tts-serverless-vieneumodel-generate.modal.run"
];

async function fetchLatestFromGist() {
    try {
        const resp = await fetch(GITHUB_GIST_API_URL + "?t=" + Date.now(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (resp.ok) {
            const gistObject = await resp.json();
            const targetFile = gistObject.files["modal_urls.json"] || gistObject.files[Object.keys(gistObject.files)[0]];
            if (targetFile && targetFile.content) {
                const gistData = JSON.parse(targetFile.content);
                if (gistData.users) inMemoryUsers = gistData.users;
                if (gistData.gpu_urls) inMemoryGpuUrls = gistData.gpu_urls;
            }
        }
    } catch (e) {
        console.error("Fetch gist error:", e);
    }
}

async function saveToGist(usersData, gpuUrlsData) {
    const token = getAdminDefaultToken();
    if (!token) return false;

    try {
        const patchPayload = {
            files: {
                "modal_urls.json": {
                    content: JSON.stringify({
                        gpu_urls: gpuUrlsData || inMemoryGpuUrls,
                        users: usersData || inMemoryUsers
                    }, null, 2)
                }
            }
        };

        const patchResp = await fetch(GITHUB_GIST_API_URL, {
            method: "PATCH",
            headers: {
                "Authorization": "token " + token,
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(patchPayload)
        });

        return patchResp.ok;
    } catch (e) {
        console.error("Save gist error:", e);
        return false;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-HTH-Auth-Token'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const authHeader = req.headers['x-hth-auth-token'];
    const isAuthorizedClient = (authHeader === HTH_SECRET_AUTH_KEY);

    // Nạp bản cập nhật mới nhất từ Gist vĩnh viễn
    await fetchLatestFromGist();

    // 1. XỬ LÝ POST / PUT - CHỈ CHO PHÉP KHI CÓ SECRET TOKEN BẢO MẬT
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!isAuthorizedClient) {
            return res.status(403).json({ error: "Access Denied. Security token missing or invalid." });
        }

        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (body && body.users) {
                inMemoryUsers = body.users;
            }
            if (body && body.gpu_urls) {
                inMemoryGpuUrls = body.gpu_urls;
            }

            const savedOk = await saveToGist(inMemoryUsers, inMemoryGpuUrls);
            return res.status(200).json({ success: true, gist_synced: savedOk, users: inMemoryUsers, gpu_urls: inMemoryGpuUrls });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // 2. XỬ LÝ GET TRUY CẤP TRỰC TIẾP
    // Nếu gõ link api/config trực tiếp từ bên ngoài ➔ ẨN HOÀN TOÀN USER & MẬT KHẨU!
    if (!isAuthorizedClient) {
        return res.status(200).json({
            status: "online",
            system: "HTH Supper Voice Vip Security Engine",
            gpu_urls: inMemoryGpuUrls,
            message: "Protected Endpoint. Sensitive database credentials are hidden for security."
        });
    }

    // Nếu có Secret Auth Token từ Web App chính chủ ➔ Trả về đầy đủ dữ liệu
    return res.status(200).json({
        gpu_urls: inMemoryGpuUrls,
        users: inMemoryUsers
    });
}
