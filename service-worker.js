/*
 * Crest Wealth service worker.
 *
 * Two jobs, deliberately narrow:
 *   1. Keep the app shell (HTML / CSS / JS / icons) available so a flaky
 *      connection, or an installed app opened with no signal, still shows a
 *      real page instead of the browser's dinosaur.
 *   2. Never touch money. Anything that talks to Supabase, CoinGecko or the
 *      market-quotes edge function goes straight to the network, always. A
 *      cached balance or a replayed withdrawal would be far worse than an
 *      offline error.
 */

var CACHE_NAME = "crest-shell-v1";

/* Relative to this file, so the app also works when the site is served from a
 * sub-path (e.g. a GitHub Pages project site) rather than a domain root. */
var SHELL_ASSETS = [
  "./index/index.html",
  "./dashboard/dashboard.html",
  "./favicon.svg",
  "./og-image.svg",
  "./manifest.json",
  "./shared-utils.js",
  "./supabase.js",
  "./index/index.css",
  "./dashboard/dashboard.css",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Added one by one: addAll() rejects as a unit, so a single 404 would
      // leave the member with no cache at all.
      return Promise.all(
        SHELL_ASSETS.map(function (url) {
          return cache.add(url).catch(function () {
            /* a missing optional asset must not break the install */
          });
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) return caches.delete(key);
            return null;
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

/* Hosts that must never be served from cache: auth, ledger and market data. */
function isLiveData(url) {
  return (
    url.hostname.indexOf("supabase.co") !== -1 ||
    url.hostname.indexOf("supabase.in") !== -1 ||
    url.hostname.indexOf("coingecko.com") !== -1 ||
    url.hostname.indexOf("exchangerate-api.com") !== -1 ||
    url.hostname.indexOf("er-api.com") !== -1 ||
    url.hostname.indexOf("googletagmanager.com") !== -1
  );
}

self.addEventListener("fetch", function (event) {
  var req = event.request;

  if (req.method !== "GET") return;

  var url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // Cross-origin traffic (Supabase, fonts, market quotes) bypasses the cache.
  if (url.origin !== self.location.origin) return;
  if (isLiveData(url)) return;

  // Navigations: try the network first so a deploy is picked up immediately,
  // and fall back to the cached copy when the network is not there.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match("./index/index.html");
          });
        }),
    );
    return;
  }

  // Static assets: serve the cached copy instantly, refresh it in the
  // background so the next load is current.
  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.status === 200 && res.type === "basic") {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return hit;
        });
      return hit || network;
    }),
  );
});
