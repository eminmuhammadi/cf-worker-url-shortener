import { Router } from "itty-router";
import { customAlphabet } from "nanoid";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

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

// User Footprint
const uid = async (cf) => {
  const footprint = {
    asn: cf.asn,
    country: cf.country,
    continent: cf.continent,
    latitude: cf.latitude,
    longitude: cf.longitude,
    timezone: cf.timezone,
    city: cf.city,
    region: cf.region,
    region_code: cf.regionCode,
    postal_code: cf.postalCode,
    provider: cf.asOrganization,
  };

  const string = new TextEncoder().encode(JSON.stringify(footprint));
  const hashBuffer = await crypto.subtle.digest('SHA-256', string);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash;
};

/* =============== Router =============== */

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
      const res = {
        success: false,
        message: "Invalid url",
      };

      return new Response(JSON.stringify(res), {
        status: 500,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    await SHORTEN.put(slug, body.url, { expirationTtl: 86400 });
    const res = {
      success: true,
      message: "URL has been shortened",
      url: `${ORIGIN_URL}/${slug}`,
    };

    return new Response(JSON.stringify(res), {
      status: 201,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const res = {
    success: false,
    message: "Bad request",
  };

  return new Response(JSON.stringify(res), {
    status: 400,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
});

// Redirect to url
router.get("/:slug", async (request) => {
  let url = await SHORTEN.get(request.params.slug);

  if (url === null || url === undefined || url === "" || !isValidURL(url)) {
    const res = {
      success: false,
      message: "URL not found",
    };

    return new Response(JSON.stringify(res), {
      status: 404,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  let link = new URL(url);
  const footprint = await uid(request.cf);

  link.searchParams.set("fresh_id", footprint);

  return new Response(null, {
    headers: {
      Location: link,
      Referrer: `${ORIGIN_URL}`,
    },
    status: 301,
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
