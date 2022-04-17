import { Router } from "itty-router";
import { customAlphabet } from "nanoid";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import COMMON_HEADERS from "./lib/headers";

const router = Router();
// Generate a nanoid
const shortId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6
);

// Check url whether valid or not
const isValidURL = (string) => {
  var res = string.match(
    /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
  );
  return res !== null;
};

/* =============== Router =============== */

// Pixel image tracking
router.get("/pixel.gif", async (request) => {
  const base64 = "R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
  const headers = await COMMON_HEADERS(request, {
    "content-type": "image/gif",
  });

  return new Response(Uint8Array.from(atob(base64), c => c.charCodeAt(0)), {
    status: 200,
    headers,
  });
});

// Generate short url
router.post("/generate", async (request) => {
  const slug = shortId();
  const body = await request.json();

  if ("url" in body) {
    if (
      body.url === null ||
      body.url === undefined ||
      body.url === "" ||
      !isValidURL(body.url)
    ) {
      const headers = await COMMON_HEADERS(request, {});

      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid url",
        }),
        {
          status: 500,
          headers,
        }
      );
    }

    await SHORTEN.put(slug, body.url, { expirationTtl: 86400 });

    const headers = await COMMON_HEADERS(request, {
      "X-FRESH-GENERATED-URL": encodeURIComponent(`${ORIGIN_URL}/${slug}`),
      "X-FRESH-SHORTEN-URL": encodeURIComponent(body.url),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "URL has been shortened",
        url: `${ORIGIN_URL}/${slug}`,
      }),
      {
        status: 201,
        headers,
      }
    );
  }

  const headers = await COMMON_HEADERS(request, {});

  return new Response(
    JSON.stringify({
      success: false,
      message: "Bad request",
    }),
    {
      status: 400,
      headers,
    }
  );
});

// Redirect to url
router.get("/:slug", async (request) => {
  let url = await SHORTEN.get(request.params.slug);

  if (url === null || url === undefined || url === "" || !isValidURL(url)) {
    const headers = await COMMON_HEADERS(request, {});

    return new Response(
      JSON.stringify({
        success: false,
        message: "URL not found",
      }),
      {
        status: 404,
        headers,
      }
    );
  }

  const headers = await COMMON_HEADERS(request, {
    Location: url,
    Referrer: `${ORIGIN_URL}`,
  });

  return new Response(null, {
    status: 301,
    headers,
  });
});

/* =============== Handle Event =============== */
addEventListener("fetch", (event) => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.pathname === "/" || requestUrl.pathname.includes("static")) {
    return await getAssetFromKV(event);
  } else {
    return await router.handle(event.request);
  }
}
