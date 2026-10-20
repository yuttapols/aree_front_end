const API_ORIGIN = 'https://aree-back-end.onrender.com';
const PROXIED_PREFIXES = ['/api/', '/files/'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return fetch(new Request(API_ORIGIN + url.pathname + url.search, request));
    }
    return env.ASSETS.fetch(request);
  },
};
