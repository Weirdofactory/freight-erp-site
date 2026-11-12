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
          <div style="text-align:right;margin:-6px 0 16px"><button id="forgot-password" type="button" class="text-link">Forgot password?</button></div>
          ${message(error)}
          <div id="reset-status" aria-live="polite"></div>
          ${btn("Sign in →", "btn wide")}
        </form><p class="muted" style="font-size:12px;margin-top:22px">Access is restricted to invited users. Contact your administrator if you need an account.</p>
      </div></section>
    </main>`;
  document.querySelector("#forgot-password").addEventListener("click", async () => {
    const email = document.querySelector("#email").value.trim().toLowerCase();
    const status = document.querySelector("#reset-status");
    if (!email) {
      status.innerHTML = message("Enter your work email first, then select Forgot password.");
      document.querySelector("#email").focus();
      return;
    }
    const link = document.querySelector("#forgot-password");
    link.disabled = true;
    link.textContent = "Sending…";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://weirdofactory.github.io/freight-erp-site/"
    });
    status.innerHTML = resetError
      ? message("Unable to send the recovery email right now. Please try again.")
      : message("If an account exists for this email, a password recovery link has been sent. Check your inbox and spam folder.", "success");
    link.disabled = false;
    link.textContent = "Forgot password?";
  });

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

function renderResetPassword(error = "") {
  root.innerHTML = `
    <main class="auth-shell">
      <section class="story"><div class="brand">FREIGHT<span> ERP</span></div>
        <div class="story-copy"><div class="eyebrow">ACCOUNT SECURITY</div><h1>Set a new<br>password.</h1>
        <p>Choose a strong password to secure your Freight ERP workspace.</p></div>
        <small>Secure password recovery · Supabase Auth</small>
      </section>
      <section class="auth-panel"><div class="auth-card"><div class="eyebrow">PASSWORD RECOVERY</div><h2>Update password</h2>
        <p class="muted">Enter and confirm your new password below.</p>
        <form id="reset-form">
          <div class="field"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required></div>
          <div class="field"><label for="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="8" required></div>
          ${message(error)}
          <button class="btn wide" type="submit">Save new password →</button>
        </form>
      </div></section>
    </main>`;
  document.querySelector("#reset-form").addEventListener("submit", async e => {
    e.preventDefault();
    const password = document.querySelector("#new-password").value;
    const confirm = document.querySelector("#confirm-password").value;
    if (password.length < 8) { renderResetPassword("Use at least 8 characters."); return; }
    if (password !== confirm) { renderResetPassword("The passwords do not match. Please try again."); return; }
    const submit = e.currentTarget.querySelector("button");
    submit.disabled = true;
    submit.textContent = "Updating…";
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { renderResetPassword("Password update failed. The recovery link may have expired. Request a new one and try again."); return; }
    recoveryMode = false;
    await renderDashboard();
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
    <div class="nav-label">OPERATIONS</div><a class="${active === "import-lcl" ? "active" : ""}" href="#/import-lcl">Import LCL</a>
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
      <section class="section"><h2>Operations modules</h2><article class="panel"><h3>Import LCL</h3><p class="muted">Register overseas pre-alerts, track HBLs, vessels, arrival, CFS, customs and delivery.</p><button id="open-import-lcl" class="btn">Open Import LCL →</button></article></section>
      <section class="section"><h2>Administration</h2><article class="panel"><p class="muted">Company and branch administration, user access and role permissions.</p><button id="open-company" class="btn secondary">Company management →</button></article></section>
    `);
    bindShell();
    document.querySelector("#open-company").addEventListener("click", () => setRoute("company"));
    document.querySelector("#open-import-lcl").addEventListener("click", () => setRoute("import-lcl"));
  } catch (error) {
    root.innerHTML = shell(`<section class="heading"><h1>Workspace unavailable</h1>${message(error.message || "Could not load company memberships.")}<p class="muted">Check Supabase Row Level Security and your active company membership.</p></section>`);
    bindShell();
  }
}

async function renderImportLcl() {
  root.innerHTML = '<main class="loading">Loading Import LCL operations…</main>';
  try {
    const memberships = await loadMemberships();
    const membership = memberships[0];
    if (!membership) throw new Error('Your account does not have an active company membership.');
    const companyId = membership.company_id;
    const [{ data: branches, error: branchError }, { data: shipments, error: shipmentError }] = await Promise.all([
      supabase.from('branches').select('id,name,branch_code').eq('status','active').order('name'),
      supabase.from('import_lcl_shipments').select('id,shipment_no,status,agent_name,origin_port,destination_port,vessel_name,voyage_no,hbl_no,mbl_no,eta,package_count,package_type,gross_weight_kg,volume_cbm,customs_status,delivery_status,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(200)
    ]);
    if (branchError) throw branchError;
    if (shipmentError) throw shipmentError;
    const branchOptions = (branches || []).map(b => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.branch_code)})</option>`).join('');
    const statusLabel = s => ({pre_alert:'Pre-alert',in_transit:'In transit',arrived:'Arrived',destuffed:'Destuffed',customs_hold:'Customs hold',customs_cleared:'Customs cleared',ready_for_delivery:'Ready for delivery',delivered:'Delivered',closed:'Closed',cancelled:'Cancelled'}[s] || s);
    root.innerHTML = shell(`
      <section class="heading"><div class="eyebrow">IMPORT OPERATIONS / LCL</div><div class="module-heading"><div><h1>Import LCL</h1><p class="muted">Manage overseas pre-alerts through arrival, customs clearance and cargo delivery.</p></div><button id="new-import" class="btn">+ New Import Shipment</button></div></section>
      <section class="grid"><article class="stat"><small>TOTAL SHIPMENTS</small><strong>${(shipments||[]).length}</strong><span>Visible in this workspace</span></article><article class="stat"><small>IN TRANSIT</small><strong>${(shipments||[]).filter(s=>s.status==='in_transit').length}</strong><span>Awaiting arrival</span></article><article class="stat"><small>ARRIVED</small><strong>${(shipments||[]).filter(s=>['arrived','destuffed'].includes(s.status)).length}</strong><span>At destination / CFS</span></article><article class="stat"><small>DELIVERY PENDING</small><strong>${(shipments||[]).filter(s=>!['delivered','closed','cancelled'].includes(s.status)).length}</strong><span>Open shipments</span></article></section>
      <section class="section"><div class="module-toolbar"><input id="lcl-search" class="search-input" placeholder="Search shipment / HBL / MBL / agent…"><select id="lcl-status" class="filter-select"><option value="">All statuses</option><option value="pre_alert">Pre-alert</option><option value="in_transit">In transit</option><option value="arrived">Arrived</option><option value="destuffed">Destuffed</option><option value="customs_hold">Customs hold</option><option value="customs_cleared">Customs cleared</option><option value="ready_for_delivery">Ready for delivery</option><option value="delivered">Delivered</option><option value="closed">Closed</option></select></div>
      <article class="panel table-wrap"><table><thead><tr><th>SHIPMENT / HBL</th><th>AGENT</th><th>ORIGIN → DESTINATION</th><th>VESSEL / VOYAGE</th><th>PACKAGES</th><th>CBM</th><th>ETA</th><th>STATUS</th></tr></thead><tbody id="lcl-rows">${(shipments||[]).map(s=>`<tr data-search="${esc([s.shipment_no,s.hbl_no,s.mbl_no,s.agent_name,s.origin_port,s.destination_port].join(' ').toLowerCase())}" data-status="${esc(s.status)}"><td><strong>${esc(s.shipment_no)}</strong><br><small>${esc(s.hbl_no||'HBL pending')}</small></td><td>${esc(s.agent_name||'—')}</td><td>${esc(s.origin_port||'—')} → ${esc(s.destination_port||'—')}</td><td>${esc(s.vessel_name||'—')}<br><small>${esc(s.voyage_no||'')}</small></td><td>${Number(s.package_count||0)} ${esc(s.package_type||'')}</td><td>${Number(s.volume_cbm||0).toFixed(3)}</td><td>${esc(s.eta||'—')}</td><td><span class="status-pill">${esc(statusLabel(s.status))}</span></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No import LCL shipments yet. Select “New Import Shipment” to register your first pre-alert.</td></tr>'}</tbody></table></article></section>
      <section id="lcl-form-wrap" class="section" hidden><article class="panel"><div class="module-heading"><div><h2>Register Import LCL Shipment</h2><p class="muted">Create a shipment record from the overseas pre-alert.</p></div><button id="cancel-import" class="btn secondary" type="button">Close</button></div>
      <form id="lcl-create-form"><div class="form-grid">
        <div class="field"><label>Branch *</label><select name="branch_id" required>${branchOptions}</select></div>
        <div class="field"><label>Overseas agent *</label><input name="agent_name" required placeholder="Agent / co-loader name"></div>
        <div class="field"><label>Agent reference</label><input name="agent_reference" placeholder="Agent file reference"></div>
        <div class="field"><label>Agent email</label><input name="agent_email" type="email" placeholder="operations@agent.com"></div>
        <div class="field"><label>Origin port *</label><input name="origin_port" required placeholder="Shanghai"></div>
        <div class="field"><label>Destination port *</label><input name="destination_port" required value="Chennai"></div>
        <div class="field"><label>Vessel name</label><input name="vessel_name"></div>
        <div class="field"><label>Voyage number</label><input name="voyage_no"></div>
        <div class="field"><label>MBL number</label><input name="mbl_no"></div>
        <div class="field"><label>HBL number</label><input name="hbl_no"></div>
        <div class="field"><label>Shipper name</label><input name="shipper_name"></div>
        <div class="field"><label>Consignee name *</label><input name="consignee_name" required></div>
        <div class="field"><label>Consignee email</label><input name="consignee_email" type="email"></div>
        <div class="field"><label>Consignee phone</label><input name="consignee_phone"></div>
        <div class="field"><label>Commodity</label><input name="commodity"></div>
        <div class="field"><label>Packages</label><input name="package_count" type="number" min="0" value="0"></div>
        <div class="field"><label>Package type</label><input name="package_type" placeholder="Cartons / pallets / drums"></div>
        <div class="field"><label>Gross weight (kg)</label><input name="gross_weight_kg" type="number" min="0" step="0.001" value="0"></div>
        <div class="field"><label>Volume (CBM)</label><input name="volume_cbm" type="number" min="0" step="0.0001" value="0"></div>
        <div class="field"><label>Freight term</label><select name="freight_term"><option value="">Select</option><option value="prepaid">Prepaid</option><option value="collect">Collect</option></select></div>
        <div class="field"><label>ETD</label><input name="etd" type="date"></div>
        <div class="field"><label>ETA</label><input name="eta" type="date"></div>
        <div class="field"><label>CFS name</label><input name="cfs_name"></div>
        <div class="field"><label>Remarks</label><input name="remarks"></div>
      </div><div id="lcl-form-message"></div><button class="btn" type="submit">Save Import Shipment →</button></form></article></section>
    `, 'import-lcl');
    bindShell();
    const rows = [...document.querySelectorAll('#lcl-rows tr[data-search]')];
    const filterRows = () => { const q=document.querySelector('#lcl-search').value.toLowerCase(); const st=document.querySelector('#lcl-status').value; rows.forEach(row=>{row.hidden=!(row.dataset.search.includes(q)&&(!st||row.dataset.status===st));}); };
    document.querySelector('#lcl-search').addEventListener('input',filterRows);
    document.querySelector('#lcl-status').addEventListener('change',filterRows);
    document.querySelector('#new-import').addEventListener('click',()=>{document.querySelector('#lcl-form-wrap').hidden=false;document.querySelector('#lcl-form-wrap').scrollIntoView({behavior:'smooth'});});
    document.querySelector('#cancel-import').addEventListener('click',()=>{document.querySelector('#lcl-form-wrap').hidden=true;});
    document.querySelector('#lcl-create-form').addEventListener('submit',async e=>{
      e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form).entries()); const msg=document.querySelector('#lcl-form-message'); const submit=form.querySelector('button[type=submit]');
      submit.disabled=true; submit.textContent='Saving shipment…';
      const payload={company_id:companyId,branch_id:data.branch_id,agent_name:data.agent_name.trim(),agent_reference:data.agent_reference||null,agent_email:data.agent_email||null,origin_port:data.origin_port.trim(),destination_port:data.destination_port.trim(),vessel_name:data.vessel_name||null,voyage_no:data.voyage_no||null,mbl_no:data.mbl_no||null,hbl_no:data.hbl_no||null,shipper_name:data.shipper_name||null,consignee_name:data.consignee_name.trim(),consignee_email:data.consignee_email||null,consignee_phone:data.consignee_phone||null,commodity:data.commodity||null,package_count:Number(data.package_count||0),package_type:data.package_type||null,gross_weight_kg:Number(data.gross_weight_kg||0),volume_cbm:Number(data.volume_cbm||0),freight_term:data.freight_term||null,etd:data.etd||null,eta:data.eta||null,cfs_name:data.cfs_name||null,remarks:data.remarks||null};
      const {data:created,error:createError}=await supabase.from('import_lcl_shipments').insert(payload).select('id,shipment_no').single();
      if(createError){msg.innerHTML=message(createError.message||'Unable to save shipment. Check your role permissions and required fields.');submit.disabled=false;submit.textContent='Save Import Shipment →';return;}
      await supabase.from('import_lcl_milestones').insert({company_id:companyId,shipment_id:created.id,milestone_code:'pre_alert_received',notes:'Shipment registered in Freight ERP'});
      msg.innerHTML=message('Shipment '+created.shipment_no+' created successfully.','success');
      await renderImportLcl();
    });
  } catch(error) { root.innerHTML=shell(`<section class="heading"><h1>Import LCL unavailable</h1>${message(error.message||'Unable to load Import LCL.')}</section>`,'import-lcl');bindShell(); }
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
  if (recoveryMode && user) { renderResetPassword(); return; }
  const page = route();
  if (!user) { renderLogin(); return; }
  if (page === "platform") { await renderPlatform(); return; }
  if (page === "company") { await renderCompany(); return; }
  if (page === "import-lcl") { await renderImportLcl(); return; }
  await renderDashboard();
}

let recoveryMode = false;
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  if (event === "PASSWORD_RECOVERY" && session?.user) {
    recoveryMode = true;
    renderResetPassword();
    return;
  }
  if (!session && route() !== "login") setRoute("login");
});
window.addEventListener("hashchange", navigate);
navigate();