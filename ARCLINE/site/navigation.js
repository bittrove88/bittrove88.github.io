(() => {
  "use strict";
  const header = document.querySelector(".site-header"),
    button = document.getElementById("menuButton"),
    nav = document.getElementById("mainNav");
  if (!header || !button || !nav) return;
  const refresh = () => {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute(
      "aria-label",
      document.documentElement.lang === "en"
        ? open
          ? "Close navigation"
          : "Open navigation"
        : open
          ? "メニューを閉じる"
          : "メニューを開く",
    );
  };
  const close = () => {
    header.classList.remove("menu-open");
    button.setAttribute("aria-expanded", "false");
    refresh();
  };
  button.onclick = () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    header.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    refresh();
  };
  for (const anchor of nav.querySelectorAll("a"))
    anchor.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      button.getAttribute("aria-expanded") === "true"
    ) {
      close();
      button.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!header.contains(event.target)) close();
  });
  matchMedia("(max-width: 800px)").addEventListener("change", close);
  new MutationObserver(refresh).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  refresh();
})();
