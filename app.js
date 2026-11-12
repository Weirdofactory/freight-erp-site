import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const root = document.querySelector("#app");
let currentUser = null;

const esc = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const setRoute = route => { location.hash = route; };
const route = () => (location.hash.replace(/^#\/?/, "") || "login").split("?")[0];
const message = (text, type = "error") => text ? `<p class="${type}">${esc(text)}</p>` : "";
const btn = (text, cls = "btn") => `<button class="${cls}" type="submit">${text}</button>`;

function renderLogin(error = "") {
  root.innerHTML = `
    <main class="auth-shell">
      <section class="story"><div class="brand">FREIGHT<span> ERP</span></div>
        <div class="story-copy"><div class="eyebrow">FREIGHT OPERATIONS PLATFORM</div><h1>One workspace.<br>Every shipment.</h1>
        <p>A connected operating system for forwarding, consolidation, documentation and finance.</p></div>
        <small>Built for freight teams in India · Designed for global operations</small>
      </section>
      <section class="auth-panel"><div class="auth-card"><div class="eyebrow">SECURE WORKSPACE</div><h2>Welcome back</h2>
        <p class="muted">Sign in using the account invited by your company administrator.</p>
        <form id="login-form">
          <div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="username" placeholder="name@company.com" required></div>
          <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
          ${message(error)}
          ${btn("Sign in →", "btn wide")}
        </form><p class="muted" style="font-size:12px;margin-top:22px">Access is restricted to invited users. Contact your administrator if you need an account.</p>
      </div></section>
    </main>`;
  document.querySelector("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const submit = e.currentTarget.querySelector("button");
    submit.disabled = true; submit.textContent = "Signing in…";
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("password"))
    });
    if (error) { renderLogin("Unable to sign in. Check your email and password."); return; }
    setRoute("dashboard");
  });
}

async function loadMemberships() {
  const { data, error } = await supabase.from("company_memberships")
    .select("company_id,status,companies(display_name,default_currency),roles(name,code)")
    .eq("status", "active");
  if (error) throw error;
  return data || [];
}

function shell(content, active = "dashboard") {
  const email = currentUser?.email || "Signed-in user";
  return `<div class="app-shell"><aside class="sidebar"><div class="brand">FREIGHT<span> ERP</span></div>
    <nav class="nav"><div class="nav-label">WORKSPACE</div><a class="${active === "dashboard" ? "active" : ""}" href="#/dashboard">Overview</a>
    <div class="nav-label">ADMINISTRATION</div><a class="${active === "company" ? "active" : ""}" href="#/company">Company management</a>
    <a class="${active === "platform" ? "active" : ""}" href="#/platform">Platform Super Admin</a></nav>
    <div class="sidebar-foot">${esc(email)}<br>Authenticated session</div></aside>
    <main class="main"><header class="top"><strong>Freight ERP / ${esc(active.toUpperCase())}</strong><div class="top-actions"><span class="pill">SECURE SESSION</span><button id="logout" class="btn secondary">Sign out</button></div></header>${content}</main></div>`;
}

async function renderDashboard() {
  root.innerHTML = '<main class="loading">Loading your workspace…</main>';
  try {
    const memberships = await loadMemberships();
    const company = memberships[0]?.companies?.display_name || "No company assigned";
    const role = memberships[0]?.roles?.name || "Workspace user";
    root.innerHTML = shell(`
      <section class="heading"><div class="eyebrow">OPERATIONS CONTROL CENTRE</div><h1>Good to have you back.</h1><p class="muted">Your foundation workspace is ready for configuration.</p></section>
      ${memberships.length ? "" : '<div class="notice">Your account is signed in, but no active company membership is visible. Ask your platform administrator to check your company assignment.</div>'}
      <section class="grid"><article class="stat"><small>COMPANY WORKSPACES</small><strong>${memberships.length}</strong><span>Active memberships visible</span></article>
      <article class="stat"><small>ACTIVE BRANCHES</small><strong>—</strong><span>Branch directory setup</span></article>
      <article class="stat"><small>TEAM MEMBERS</small><strong>—</strong><span>User administration</span></article>
      <article class="stat"><small>DATA SECURITY</small><strong>RLS</strong><span>Tenant-scoped policies</span></article></section>
      <section class="section"><h2>Current workspace</h2><article class="panel"><div class="row"><span>Company</span><strong>${esc(company)}</strong></div><div class="row"><span>Signed-in account</span><strong>${esc(currentUser.email)}</strong></div><div class="row"><span>Assigned role</span><strong>${esc(role)}</strong></div><div class="row"><span>Default timezone</span><strong>Asia/Kolkata</strong></div></article></section>
      <section class="section"><h2>Foundation modules</h2><article class="panel"><p class="muted">Company and branch administration, user access, roles and permissions are being connected to the protected backend.</p><button id="open-company" class="btn">Open company management →</button></article></section>
    `);
    bindShell();
    document.querySelector("#open-company").addEventListener("click", () => setRoute("company"));
  } catch (error) {
    root.innerHTML = shell(`<section class="heading"><h1>Workspace unavailable</h1>${message(error.message || "Could not load company memberships.")}<p class="muted">Check Supabase Row Level Security and your active company membership.</p></section>`);
    bindShell();
  }
}

async function renderPlatform() {
  root.innerHTML = '<main class="loading">Verifying platform access…</main>';
  const { data, error } = await supabase.functions.invoke("platform-overview", { method: "POST" });
  if (error || !data || data.error) {
    root.innerHTML = shell(`<section class="heading"><div class="eyebrow">PLATFORM CONTROL</div><h1>Access restricted</h1><p class="muted">This area is available only to verified Platform Super Admin accounts.</p>${message(data?.error || error?.message || "Access denied.")}</section>`);
    bindShell(); return;
  }
  const m = data.metrics;
  root.innerHTML = shell(`
    <section class="heading"><div class="eyebrow">GLOBAL OPERATIONS CONTROL</div><h1>Platform overview</h1><p class="muted">Central view of the freight ERP network.</p></section>
    <section class="grid"><article class="stat"><small>TOTAL COMPANIES</small><strong>${m.total_companies ?? 0}</strong><span>Registered workspaces</span></article>
    <article class="stat"><small>ACTIVE COMPANIES</small><strong>${m.active_companies ?? 0}</strong><span>Operational tenants</span></article>
    <article class="stat"><small>ACTIVE BRANCHES</small><strong>${m.active_branches ?? 0}</strong><span>Across all companies</span></article>
    <article class="stat"><small>ACTIVE MEMBERSHIPS</small><strong>${m.active_memberships ?? 0}</strong><span>User assignments</span></article></section>
    <section class="section"><h2>Recently added companies</h2><article class="panel table-wrap">${(data.recent_companies || []).length ? `<table><thead><tr><th>COMPANY</th><th>CODE</th><th>COUNTRY</th><th>STATUS</th></tr></thead><tbody>${data.recent_companies.map(c => `<tr><td><strong>${esc(c.display_name)}</strong></td><td><code>${esc(c.company_code)}</code></td><td>${esc(c.country_code)}</td><td>${esc(c.status)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">No companies found.</div>'}</article></section>
    <section class="section"><button id="manage-companies" class="btn">Manage companies →</button></section>
  `, "platform");
  bindShell();
  document.querySelector("#manage-companies").addEventListener("click", () => setRoute("company"));
}

async function renderCompany() {
  root.innerHTML = '<main class="loading">Loading company administration…</main>';
  const { data, error } = await supabase.functions.invoke("company-management", { method: "POST", body: { action: "list" } });
  if (error || !data || data.error) {
    root.innerHTML = shell(`<section class="heading"><h1>Company management</h1><p class="muted">This function requires Platform Super Admin authorization.</p>${message(data?.error || error?.message || "Unable to load companies.")}</section>`);
    bindShell(); return;
  }
  const companies = Array.isArray(data.companies) ? data.companies : [];
  root.innerHTML = shell(`<section class="heading"><div class="eyebrow">TENANT DIRECTORY</div><h1>Company management</h1><p class="muted">Manage company workspaces through the verified platform function.</p></section>
    <article class="panel table-wrap">${companies.length ? `<table><thead><tr><th>COMPANY</th><th>CODE</th><th>COUNTRY</th><th>STATUS</th></tr></thead><tbody>${companies.map(c => `<tr><td><strong>${esc(c.display_name)}</strong></td><td><code>${esc(c.company_code)}</code></td><td>${esc(c.country_code)}</td><td>${esc(c.status)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">No company records returned.</div>'}</article>
  `, "company");
  bindShell();
}

function bindShell() {
  document.querySelector("#logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    currentUser = null; setRoute("login");
  });
}

async function navigate() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  const page = route();
  if (!user) { renderLogin(); return; }
  if (page === "platform") { await renderPlatform(); return; }
  if (page === "company") { await renderCompany(); return; }
  await renderDashboard();
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  if (!session && route() !== "login") setRoute("login");
});
window.addEventListener("hashchange", navigate);
navigate();