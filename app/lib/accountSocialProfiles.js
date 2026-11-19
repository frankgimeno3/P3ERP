export const socialNetworks = {
  linkedin: { label: "LinkedIn", hosts: ["linkedin.com"], path: /^\/(?:in|company|school|showcase)\/[\w%.-]+\/?$/i },
  x: { label: "X", hosts: ["x.com", "twitter.com"], path: /^\/[\w]{1,15}\/?$/i, reserved: ["home", "explore", "search", "settings", "messages", "intent", "i", "login", "signup"] },
  meta: { label: "Meta", hosts: ["facebook.com", "fb.com"], path: /^\/(?:[\w.-]+|(?:people|pages)\/[\w%.-]+\/\d+)\/?$/i, reserved: ["watch", "share", "login", "reel", "groups", "events", "marketplace", "help", "home.php", "l.php"] },
  instagram: { label: "Instagram", hosts: ["instagram.com"], path: /^\/[\w.]{1,30}\/?$/i, reserved: ["accounts", "explore", "about", "p", "reel", "reels", "stories", "direct"] },
  tiktok: { label: "TikTok", hosts: ["tiktok.com"], path: /^\/@[\w.]+\/?$/i },
};

/** @typedef {keyof typeof socialNetworks} SocialNetwork */
/** @typedef {{nombre: SocialNetwork, tiene_cuenta: boolean, url: string, favorita: boolean}} SocialProfile */

/** @param {unknown} network @param {unknown} value */
export function socialProfileUrl(network, value) {
  if (typeof network !== "string" || !Object.hasOwn(socialNetworks, network) || typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw || raw.length > 2048) return "";
  const config = socialNetworks[/** @type {SocialNetwork} */ (network)];
  try {
    const url = new URL(/^[\w-]+:\/\//.test(raw) ? raw : `https://${raw}`);
    const hostname = url.hostname.toLowerCase();
    const validHost = config.hosts.some(host => hostname === host || hostname === `www.${host}` ||
      (network === "linkedin" && /^[a-z]{2}\.linkedin\.com$/.test(hostname)) ||
      (network === "meta" && hostname === "m.facebook.com"));
    if (!validHost || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return "";
    if (!config.path.test(url.pathname)) return "";
    const firstSegment = url.pathname.split("/")[1].toLowerCase();
    if ("reserved" in config && config.reserved.includes(firstSegment)) return "";
    const metaProfileId = network === "meta" && firstSegment === "profile.php" ? url.searchParams.get("id") : null;
    if (network === "meta" && firstSegment === "profile.php" && !/^\d+$/.test(metaProfileId ?? "")) return "";
    url.protocol = "https:";
    url.hash = "";
    url.search = metaProfileId ? `?id=${metaProfileId}` : "";
    return url.toString();
  } catch {
    return "";
  }
}

/** @param {unknown} profiles @param {unknown} [legacy] @returns {SocialProfile[]} */
export function normalizeSocialProfiles(profiles, legacy) {
  const stored = Array.isArray(profiles) ? profiles : [];
  const names = /** @type {SocialNetwork[]} */ (Object.keys(socialNetworks));
  let hasFavorite = false;
  return names.map(nombre => {
    const profile = stored.find(item => item?.nombre === nombre);
    const url = stored.length ? socialProfileUrl(nombre, profile?.url) : socialProfileUrl(nombre, legacy);
    const tiene_cuenta = Boolean(url && (!stored.length || profile?.tiene_cuenta === true));
    const favorita = tiene_cuenta && !hasFavorite && (!stored.length || profile?.favorita === true);
    if (favorita) hasFavorite = true;
    return { nombre, tiene_cuenta, url: tiene_cuenta ? url : "", favorita };
  });
}

export function applySocialProfileChange(profiles, legacy, change) {
  const { nombre, accion, url } = change ?? {};
  if (typeof nombre !== "string" || !Object.hasOwn(socialNetworks, nombre)) return null;
  const entries = normalizeSocialProfiles(profiles, legacy);
  if (accion === "guardar") {
    const validUrl = socialProfileUrl(nombre, url);
    if (!validUrl) return null;
    return entries.map(entry => entry.nombre === nombre ? { ...entry, tiene_cuenta: true, url: validUrl } : entry);
  }
  if (accion === "eliminar") {
    return entries.map(entry => entry.nombre === nombre ? { ...entry, tiene_cuenta: false, url: "", favorita: false } : entry);
  }
  if (accion === "priorizar" && entries.some(entry => entry.nombre === nombre && entry.tiene_cuenta)) {
    return entries.map(entry => ({ ...entry, favorita: entry.nombre === nombre }));
  }
  return null;
}
