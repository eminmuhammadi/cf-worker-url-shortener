import { fingerprint, COOKIE_NAME, COOKIE_EXP } from "./fingerprint";
import { serialize } from "cookie";

const COMMON_HEADERS = async (request, optional_headers) => {
  const fresh_id = await fingerprint(request);
  const cookie = serialize(COOKIE_NAME, String(fresh_id), {
    domain: `.${new URL(ORIGIN_URL).hostname}`,
    maxAge: COOKIE_EXP,
    httpOnly: false,
    sameSite: "None",
    secure: true,
    priority: 'high',
  });

  if (optional_headers.Location != null) {
    let link = new URL(optional_headers.Location);
    link.searchParams.set(COOKIE_NAME, fresh_id);

    optional_headers.Location = link;
  }

  return {
    "Content-Type": "application/json;charset=UTF-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-FRESH-FINGERPRINT": fresh_id,
    "Set-Cookie": cookie,
    ...optional_headers,
  };
};

export default COMMON_HEADERS;
