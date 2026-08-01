// dashboard.js — Sidebar nav + auth guard, dipakai semua halaman dashboard

const NAV = [
  { type: "single", label: "Dashboard", href: "/dashboard", icon: "▦" },
  { type: "group", label: "Halaman Saya", icon: "👤", children: [
    { label: "Edit Halaman", href: "/dashboard/edit-halaman" },
    { label: "Widget Website", href: "/dashboard/widget-website" },
  ]},
  { type: "single", label: "Balance", href: "/dashboard/balance", icon: "💰" },
  { type: "single", label: "Riwayat Transaksi", href: "/dashboard/transactions", icon: "🧾" },
  { type: "single", label: "Statistik", href: "/dashboard/stats", icon: "📊" },
  { type: "single", label: "Toko Voucher", href: "/dashboard/toko-voucher", icon: "🏪" },
  { type: "group", label: "Streaming Tools", icon: "🖥", children: [
    { label: "Overlay Control", href: "/dashboard/overlay-control" },
    { label: "Replay Support", href: "/dashboard/replay-support" },
    { label: "Integrasi Overlay", href: "/dashboard/integrasi-overlay" },
  ]},
  { type: "group", label: "Filter & Moderasi", icon: "🚫", children: [
    { label: "Filter Kata", href: "/dashboard/filter-moderasi" },
    { label: "Blokir Media & IP", href: "/dashboard/blokir" },
  ]},
  { type: "single", label: "Akun & Keamanan", href: "/dashboard/akun-keamanan", icon: "🛡" },
];

function renderSidebar() {
  const path = window.location.pathname;
  const el = document.getElementById("sidebar");
  let html = `<div class="brand"><span class="dot"></span> Dashboard Kreator</div>`;

  NAV.forEach((item) => {
    if (item.type === "single") {
      const active = path === item.href;
      html += `<div class="nav-group"><a class="nav-head single ${active ? "active" : ""}" href="${item.href}">${item.icon} &nbsp;${item.label}</a></div>`;
    } else {
      const isOpen = item.children.some((c) => c.href === path);
      html += `<div class="nav-group ${isOpen ? "open" : ""}">
        <div class="nav-head" data-toggle>${item.icon} &nbsp;${item.label} <span class="chev">⌄</span></div>
        <div class="nav-children">
          ${item.children.map((c) => `<a href="${c.href}" class="${path === c.href ? "active" : ""}">${c.label}</a>`).join("")}
        </div>
      </div>`;
    }
  });
  el.innerHTML = html;

  el.querySelectorAll("[data-toggle]").forEach((h) =>
    h.addEventListener("click", () => h.closest(".nav-group").classList.toggle("open"))
  );
}

async function guardAuth() {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) throw new Error();
    const user = await res.json();
    const chip = document.getElementById("userchip");
    if (chip) chip.textContent = user.display_name || user.username;
    return user;
  } catch {
    window.location.href = "/login";
    return null;
  }
}

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) btn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  });
  const menuBtn = document.getElementById("menuBtn");
  if (menuBtn) menuBtn.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar();
  wireLogout();
  await guardAuth();
});
