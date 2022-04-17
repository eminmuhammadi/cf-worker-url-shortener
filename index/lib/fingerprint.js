import { parse } from "cookie";

// Cookie name
const COOKIE_NAME = "__fresh_id";

// Today + 2 years
const COOKIE_EXP = (60 * 60 * 24 * 7 * 4) * 12 * 2; // month * 12 * 2

// Identify user
const id = (request) => {
  return {
    user_agent: request.headers.get("user-agent"),
    ip_country: request.headers.get("cf-ipcountry"),
    connecting_ip: request.headers.get("cf-connecting-ip"),
    accept_language: request.headers.get("accept-language"),
    PRIVATE_KEY,
  };
};

// Generate fingerprint
const fingerprint = async (request) => {
  const cookie = parse(request.headers.get("Cookie") || "");
  const fresh_id = cookie[COOKIE_NAME];
  const _id = id(request);

  if (fresh_id != null && fresh_id != undefined && fresh_id != "") {
    if (await verify(request, fresh_id)) {
      return fresh_id;
    }
  }

  const string = new TextEncoder().encode(JSON.stringify(_id));
  const hashBuffer = await crypto.subtle.digest("SHA-256", string);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hash;
};

// Verify fingerprint
const verify = async (request, fresh_id) => {
  const _id = id(request);

  const string = new TextEncoder().encode(JSON.stringify(_id));
  const hashBuffer = await crypto.subtle.digest("SHA-256", string);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (fresh_id === hash) {
    return true;
  }

  return false;
};

export { fingerprint, COOKIE_NAME, COOKIE_EXP };
