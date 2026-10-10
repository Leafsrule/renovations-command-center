const button = document.getElementById("refresh");
const message = document.getElementById("message");
button.addEventListener("click", async () => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    message.textContent = "This refresh page is for the local test app only.";
    return;
  }
  button.disabled = true;
  message.textContent = "Loading the latest version…";
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        if (!worker) continue;
        const url = new URL(worker.scriptURL, location.origin);
        if (url.origin === location.origin && url.pathname === "/sw.js") {
          if (!await registration.unregister()) throw new Error("The old app could not be refreshed. Please try again.");
        }
      }
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith("rcc-public-shell-")).map(key => caches.delete(key)));
    }
    location.replace("/projects");
  } catch {
    button.disabled = false;
    message.textContent = "Refresh could not finish. Keep the Terminal running and try again.";
  }
});
