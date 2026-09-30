import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function verifyWhatsAppConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.META_GRAPH_API_VERSION || "v21.0";

  let tokenStatus = "INVALID";
  let wabaStatus = "FAILED";
  let phoneStatus = "FAILED";

  if (token && wabaId) {
    try {
      // 1. Verify WABA reachability and Token validity
      const wabaRes = await fetch(
        `https://graph.facebook.com/${version}/${wabaId}?fields=id,name`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const wabaData = await wabaRes.json().catch(() => null);

      if (wabaRes.ok && wabaData?.id) {
        tokenStatus = "VALID";
        wabaStatus = "REACHABLE";
      } else {
        const errCode = wabaData?.error?.code;
        if (errCode !== 190) {
          // Token might be valid for user/app but WABA id might have issue
          // Check token via debug_token or general endpoint
          const appRes = await fetch(`https://graph.facebook.com/${version}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (appRes.ok) {
            tokenStatus = "VALID";
          }
        }
      }
    } catch {
      // Network or DNS error
    }
  }

  if (token && phoneNumberId) {
    try {
      // 2. Verify Phone Number ID
      const phoneRes = await fetch(
        `https://graph.facebook.com/${version}/${phoneNumberId}?fields=id,display_phone_number,verified_name`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const phoneData = await phoneRes.json().catch(() => null);

      if (phoneRes.ok && phoneData?.id) {
        tokenStatus = "VALID";
        phoneStatus = "VERIFIED";
      }
    } catch {
      // Network error
    }
  }

  console.log(`Access Token: ${tokenStatus}`);
  console.log(`WABA: ${wabaStatus}`);
  console.log(`Phone Number ID: ${phoneStatus}`);
}

verifyWhatsAppConfig().catch(() => {
  console.log("Access Token: INVALID");
  console.log("WABA: FAILED");
  console.log("Phone Number ID: FAILED");
});
