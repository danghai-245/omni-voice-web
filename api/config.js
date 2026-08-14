const GITHUB_GIST_API_URL = "https://api.github.com/gists/38bd9e7788def62592741f519581bde0";
const OBFUSCATED_TOKEN_REVERSE_B64 = "dVVrdjBudmtNTXAwZVU3MnNTdXdpQmdvYWNPbzRUY2dwRHBfcGhn";

function getAdminDefaultToken() {
    try {
        const decodedB64 = Buffer.from(OBFUSCATED_TOKEN_REVERSE_B64, 'base64').toString('utf-8');
        return decodedB64.split("").reverse().join("");
    } catch (e) {
        return "";
    }
}

let memoryFallbackStore = {
    gpu_urls: [
        "https://hhhh01234501--vieneu-tts-serverless-vieneumodel-generate.modal.run",
        "https://hai319959--vieneu-tts-serverless-vieneumodel-generate.modal.run",
        "https://danghai30052005--vieneu-tts-serverless-vieneumodel-generate.modal.run"
    ],
    users: {
        "admin-0405": { "password": "Hth1624!", "quota": 99999999, "used": 0, "role": "Admin VIP" },
        "tester": { "password": "123", "quota": 100000, "used": 0, "role": "Dùng thử" }
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = getAdminDefaultToken();

    // 1. XỬ LÝ POST / PUT - CẬP NHẬT DỮ LIỆU USER & GPU REALTIME
    if (req.method === 'POST' || req.method === 'PUT') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            if (body && body.users) {
                memoryFallbackStore.users = body.users;
            }
            if (body && body.gpu_urls) {
                memoryFallbackStore.gpu_urls = body.gpu_urls;
            }

            // Ghi dữ liệu trực tiếp từ Backend Vercel lên Gist
            if (token) {
                const patchPayload = {
                    files: {
                        "modal_urls.json": {
                            content: JSON.stringify(memoryFallbackStore, null, 2)
                        }
                    }
                };

                await fetch(GITHUB_GIST_API_URL, {
                    method: "PATCH",
                    headers: {
                        "Authorization": "token " + token,
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "application/vnd.github.v3+json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(patchPayload)
                });
            }

            return res.status(200).json({ success: true, message: "Updated realtime", data: memoryFallbackStore });
        } catch (e) {
            return res.status(500).json({ error: e.message, data: memoryFallbackStore });
        }
    }

    // 2. XỬ LÝ GET - ĐỌC DỮ LIỆU TỪ GITHUB GIST HOẶC MEMORY FALLBACK
    try {
        const getResp = await fetch(GITHUB_GIST_API_URL + "?t=" + Date.now(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (getResp.ok) {
            const gistObject = await getResp.json();
            const targetFile = gistObject.files["modal_urls.json"] || gistObject.files[Object.keys(gistObject.files)[0]];
            if (targetFile && targetFile.content) {
                const gistData = JSON.parse(targetFile.content);
                if (gistData.users) memoryFallbackStore.users = gistData.users;
                if (gistData.gpu_urls) memoryFallbackStore.gpu_urls = gistData.gpu_urls;
            }
        }
    } catch (e) {
        console.error("Gist fetch error:", e);
    }

    return res.status(200).json(memoryFallbackStore);
}
