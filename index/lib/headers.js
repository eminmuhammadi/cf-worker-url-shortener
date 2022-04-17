import { fingerprint, COOKIE_NAME, COOKIE_EXP } from "./fingerprint";

const COMMON_HEADERS = async (request, optional_headers) => {
    const fresh_id = await fingerprint(request);

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
        "Set-Cookie": `${COOKIE_NAME}=${fresh_id}; expires=${COOKIE_EXP};`,
        ...optional_headers
    };
};

export default COMMON_HEADERS;