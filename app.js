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
    <div class="nav-label">ADMINISTRATION</div><a class="${active === "users" ? "active" : ""}" href="#/users">User management</a><a class="${active === "company" ? "active" : ""}" href="#/company">Company management</a>
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
      <section class="section"><h2>Administration</h2><article class="panel"><p class="muted">Manage employee invitations, roles and branch access.</p><button id="open-users" class="btn">User management →</button></article><article class="panel"><p class="muted">Company and branch administration.</p><button id="open-company" class="btn secondary">Company management →</button></article></section>
    `);
    bindShell();
    document.querySelector("#open-company").addEventListener("click", () => setRoute("company"));
    document.querySelector("#open-users").addEventListener("click", () => setRoute("users"));
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
      <article class="panel table-wrap"><table><thead><tr><th>SHIPMENT / HBL</th><th>AGENT</th><th>ORIGIN → DESTINATION</th><th>VESSEL / VOYAGE</th><th>PACKAGES</th><th>CBM</th><th>ETA</th><th>STATUS</th></tr></thead><tbody id="lcl-rows">${(shipments||[]).map(s=>`<tr class="clickable-row" data-id="${esc(s.id)}" data-search="${esc([s.shipment_no,s.hbl_no,s.mbl_no,s.agent_name,s.origin_port,s.destination_port].join(' ').toLowerCase())}" data-status="${esc(s.status)}" title="Open shipment operations"><td><strong>${esc(s.shipment_no)}</strong><br><small>${esc(s.hbl_no||'HBL pending')}</small></td><td>${esc(s.agent_name||'—')}</td><td>${esc(s.origin_port||'—')} → ${esc(s.destination_port||'—')}</td><td>${esc(s.vessel_name||'—')}<br><small>${esc(s.voyage_no||'')}</small></td><td>${Number(s.package_count||0)} ${esc(s.package_type||'')}</td><td>${Number(s.volume_cbm||0).toFixed(3)}</td><td>${esc(s.eta||'—')}</td><td><span class="status-pill">${esc(statusLabel(s.status))}</span></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No import LCL shipments yet. Select “New Import Shipment” to register your first pre-alert.</td></tr>'}</tbody></table></article></section>
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
    rows.forEach(row=>row.addEventListener('click',()=>setRoute('import-lcl-detail?id='+encodeURIComponent(row.dataset.id))));
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


async function renderImportLclDetail(id) {
 root.innerHTML='<main class="loading">Loading shipment…</main>';
 try {
  const memberships=await loadMemberships(), membership=memberships[0];
  if(!membership) throw new Error('No active company membership.');
  const companyId=membership.company_id;
  const qs=await Promise.all([
   supabase.from('import_lcl_shipments').select('*').eq('id',id).eq('company_id',companyId).single(),
   supabase.from('import_lcl_containers').select('*').eq('shipment_id',id).eq('company_id',companyId).order('created_at'),
   supabase.from('import_lcl_milestones').select('*').eq('shipment_id',id).eq('company_id',companyId).order('milestone_at',{ascending:false}),
   supabase.from('import_lcl_charges').select('*').eq('shipment_id',id).eq('company_id',companyId).order('created_at',{ascending:false}),
   supabase.from('import_lcl_documents').select('*').eq('shipment_id',id).eq('company_id',companyId).order('uploaded_at',{ascending:false}),
   supabase.from('audit_logs').select('action,actor_user_id,metadata,created_at').eq('company_id',companyId).eq('entity_type','import_lcl_shipment').eq('entity_id',id).order('created_at',{ascending:false}).limit(50)
  ]);
  qs.forEach(x=>{if(x.error)throw x.error;});
  const s=qs[0].data, containers=qs[1].data||[], milestones=qs[2].data||[], charges=qs[3].data||[], documents=qs[4].data||[], auditRows=qs[5].data||[];
  const nice=x=>String(x||'').replaceAll('_',' ').replace(/\\b\\w/g,a=>a.toUpperCase());
  const fmt=x=>x?new Date(x).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
  const field=(label,name,value,type='text')=>'<div class="field"><label>'+label+'</label><input name="'+name+'" type="'+type+'" value="'+esc(value||'')+'"></div>';
  const select=(label,name,values,current)=>'<div class="field"><label>'+label+'</label><select name="'+name+'">'+values.map(v=>'<option value="'+v+'" '+(v===current?'selected':'')+'>'+nice(v)+'</option>').join('')+'</select></div>';
  const statuses=['pre_alert','in_transit','arrived','destuffed','customs_hold','customs_cleared','ready_for_delivery','delivered','closed','cancelled'];
  const codes=['pre_alert_received','documents_received','vessel_departed','vessel_arrived','arrival_notice_sent','cfs_received','destuffing_completed','customs_filed','customs_cleared','do_issued','cargo_delivered'];
  const containerRows=containers.map(x=>'<tr><td>'+esc(x.container_no)+'</td><td>'+esc(x.container_size||'—')+'</td><td>'+esc(x.seal_no||'—')+'</td><td>'+esc(x.gross_weight_kg||'—')+'</td></tr>').join('')||'<tr><td colspan="4" class="empty">No containers added.</td></tr>';
  const milestoneRows=milestones.map(x=>'<div class="timeline-item"><strong>'+esc(nice(x.milestone_code))+'</strong><span>'+esc(fmt(x.milestone_at))+'</span><p>'+esc(x.location||'')+(x.notes?' · '+esc(x.notes):'')+'</p></div>').join('')||'<div class="empty">No milestones recorded.</div>';
  const chargeRows=charges.map(x=>'<tr><td>'+esc(x.charge_code)+'<br>'+esc(x.description)+'</td><td>'+esc(nice(x.charge_basis))+'</td><td>'+esc(x.quantity)+' × '+esc(x.rate)+' '+esc(x.currency_code)+'</td><td>'+esc(x.amount)+' '+esc(x.currency_code)+'</td><td>'+esc(nice(x.charge_side))+'</td><td>'+esc(nice(x.billing_status))+'</td><td><button type="button" class="btn secondary charge-edit" data-id="'+esc(x.id)+'" '+(x.billing_status!=='unbilled'?'disabled title="Only unbilled charges can be edited"':'')+'>Edit</button> <button type="button" class="btn secondary charge-delete" data-id="'+esc(x.id)+'" '+(x.billing_status!=='unbilled'?'disabled title="Only unbilled charges can be deleted"':'')+'>Delete</button></td></tr>').join('')||'<tr><td colspan="7" class="empty">No charges entered.</td></tr>';
  const docRows=documents.map(x=>'<tr><td><strong>'+esc(nice(x.document_type))+'</strong><br><small>'+esc(x.file_name)+'</small></td><td>'+esc(x.document_number||'—')+'</td><td>'+esc((x.file_size/1024/1024).toFixed(2))+' MB</td><td><select class="doc-status" data-id="'+esc(x.id)+'">'+['received','verified','rejected'].map(v=>'<option value="'+v+'" '+(x.status===v?'selected':'')+'>'+nice(v)+'</option>').join('')+'</select></td><td><button type="button" class="btn secondary doc-download" data-path="'+esc(x.storage_path)+'">Download</button></td></tr>').join('')||'<tr><td colspan="5" class="empty">No shipment documents uploaded yet.</td></tr>';
  const coreFields=field('Agent / overseas partner','agent_name',s.agent_name)+field('Agent reference','agent_reference',s.agent_reference)+field('Agent email','agent_email',s.agent_email,'email')+field('Origin country','origin_country',s.origin_country)+field('Origin port','origin_port',s.origin_port)+field('Origin port code','origin_port_code',s.origin_port_code)+field('Destination port','destination_port',s.destination_port)+field('Destination port code','destination_port_code',s.destination_port_code)+field('Vessel name','vessel_name',s.vessel_name)+field('Voyage number','voyage_no',s.voyage_no)+field('MBL number','mbl_no',s.mbl_no)+field('HBL number','hbl_no',s.hbl_no)+field('Shipper name','shipper_name',s.shipper_name)+field('Shipper address','shipper_address',s.shipper_address)+field('Consignee name','consignee_name',s.consignee_name)+field('Consignee address','consignee_address',s.consignee_address)+field('Consignee email','consignee_email',s.consignee_email,'email')+field('Consignee phone','consignee_phone',s.consignee_phone,'tel')+field('Notify party','notify_party',s.notify_party)+field('Commodity','commodity',s.commodity)+field('Package count','package_count',s.package_count,'number')+field('Package type','package_type',s.package_type)+field('Gross weight (kg)','gross_weight_kg',s.gross_weight_kg,'number')+field('Volume (CBM)','volume_cbm',s.volume_cbm,'number')+select('Freight term','freight_term',['prepaid','collect'],s.freight_term)+field('ETD','etd',s.etd,'date')+field('ETA','eta',s.eta,'date');
  const auditHtml=auditRows.map(x=>{const changes=x.metadata?.changes||{};const detail=x.action.endsWith('.created')?'Shipment record created':Object.entries(changes).map(([k,v])=>nice(k)+': '+String(v.old??'—')+' → '+String(v.new??'—')).join(' · ');return '<div class="timeline-item"><strong>'+esc(x.action.replaceAll('.',' '))+'</strong><span>'+esc(fmt(x.created_at))+'</span><p>'+esc(detail||'Record updated')+' · User '+esc((x.actor_user_id||'system').slice(-6))+'</p></div>';}).join('')||'<div class="empty">No audit events available for this shipment.</div>';
  const ops=field('ATA','ata',s.ata,'date')+field('Arrival notice date','arrival_notice_date',s.arrival_notice_date,'date')+field('CFS name','cfs_name',s.cfs_name)+field('CFS arrival','cfs_arrival_at',s.cfs_arrival_at?new Date(s.cfs_arrival_at).toISOString().slice(0,16):'','datetime-local')+field('Destuffed at','destuffed_at',s.destuffed_at?new Date(s.destuffed_at).toISOString().slice(0,16):'','datetime-local')+select('Shipment status','status',statuses,s.status)+select('Customs status','customs_status',['pending','filed','hold','exam','cleared'],s.customs_status)+select('Delivery status','delivery_status',['pending','do_issued','part_delivered','delivered'],s.delivery_status)+field('Remarks','remarks',s.remarks);
  root.innerHTML=shell(
   '<section class="heading"><div class="eyebrow">IMPORT LCL / SHIPMENT DETAIL</div><div class="module-heading"><div><h1>'+esc(s.shipment_no)+'</h1><p class="muted">'+esc(s.hbl_no||'HBL pending')+' · '+esc(s.agent_name||'')+' · '+esc(nice(s.status))+'</p></div><button id="back-lcl" class="btn secondary" type="button">← Shipment list</button></div></section>'+
   '<section class="grid"><article class="stat"><small>ROUTE</small><strong class="small-stat">'+esc(s.origin_port||'—')+' → '+esc(s.destination_port||'—')+'</strong></article><article class="stat"><small>VESSEL / VOYAGE</small><strong class="small-stat">'+esc(s.vessel_name||'—')+'</strong><span>'+esc(s.voyage_no||'')+'</span></article><article class="stat"><small>ETA / ATA</small><strong class="small-stat">'+esc(s.eta||'—')+'</strong><span>'+esc(s.ata||'—')+'</span></article><article class="stat"><small>CARGO</small><strong>'+Number(s.volume_cbm||0).toFixed(3)+' CBM</strong><span>'+Number(s.package_count||0)+' pkgs · '+Number(s.gross_weight_kg||0)+' kg</span></article></section>'+
   '<section class="section"><h2>Shipment information</h2><article class="panel"><form id="core-form"><div class="form-grid">'+coreFields+'</div><div id="core-message" aria-live="polite"></div><button class="btn" type="submit">Save shipment information →</button></form></article></section>'+
   '<section class="section"><h2>Arrival, CFS, customs & delivery</h2><article class="panel"><form id="ops-form"><div class="form-grid">'+ops+'</div><div id="ops-message"></div><button class="btn" type="submit">Save operations →</button></form></article></section>'+
   '<section class="section"><h2>Container / consol details</h2><article class="panel"><form id="container-form"><div class="form-grid">'+field('Container number *','container_no','')+select('Size','container_size',['20','40','40 HQ','45'],'40 HQ')+field('Seal number','seal_no','')+field('Gross weight kg','gross_weight_kg','','number')+'</div><button class="btn" type="submit">Add container</button></form><div class="table-wrap"><table><thead><tr><th>CONTAINER</th><th>SIZE</th><th>SEAL</th><th>WEIGHT</th></tr></thead><tbody>'+containerRows+'</tbody></table></div></article></section>'+
   '<section class="section"><h2>Shipment milestones</h2><article class="panel"><form id="milestone-form"><div class="form-grid">'+select('Milestone','milestone_code',codes,'vessel_arrived')+field('Date & time','milestone_at',new Date().toISOString().slice(0,16),'datetime-local')+field('Location','location','')+field('Notes','notes','')+'</div><button class="btn" type="submit">Record milestone</button></form><div class="timeline">'+milestoneRows+'</div></article></section>'+
   '<section class="section"><h2>Shipment documents</h2><article class="panel"><form id="document-form"><div class="form-grid">'+select('Document type','document_type',['hbl','mbl','commercial_invoice','packing_list','arrival_notice','delivery_order','customs_document','delivery_proof','photo','other'],'hbl')+field('Document number','document_number','')+'<div class="field"><label>Choose file * (PDF, image, Word or Excel; max 25 MB)</label><input name="document_file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" required></div>'+field('Remarks','document_remarks','')+'</div><div id="document-message" aria-live="polite"></div><button class="btn" type="submit">Upload document →</button></form><div class="table-wrap"><table><thead><tr><th>DOCUMENT</th><th>NUMBER</th><th>SIZE</th><th>STATUS</th><th>FILE</th></tr></thead><tbody>'+docRows+'</tbody></table></div></article></section>'+
   '<section class="section"><h2>Audit history</h2><article class="panel"><div class="timeline">'+auditHtml+'</div></article></section>'+
   '<section class="section"><div class="module-heading"><div><h2>Billing & invoices</h2><p class="muted">Prepare a Proforma Invoice or GST Tax Invoice from customer-side shipment charges.</p></div><button id="open-billing" class="btn" type="button">Open billing →</button></div></section>'+
   '<section class="section"><h2>Shipment charges</h2><article class="panel"><form id="charge-form"><input type="hidden" name="charge_id" value=""><div class="form-grid">'+field('Charge code *','charge_code','')+field('Description *','description','')+field('SAC code','sac_code','')+select('Basis','charge_basis',['shipment','w_m','cbm','rt','hbl','container','package','other'],'shipment')+field('Quantity','quantity','1','number')+select('Currency','currency_code',['INR','USD','EUR','CNY','GBP'],'INR')+field('Rate','rate','0','number')+select('Charge side','charge_side',['customer','vendor'],'customer')+field('Remarks','remarks','')+'</div><div id="charge-message" aria-live="polite"></div><button id="charge-submit" class="btn" type="submit">Add charge</button> <button id="charge-cancel" class="btn secondary" type="button" hidden>Cancel edit</button></form><div class="table-wrap"><table><thead><tr><th>CHARGE</th><th>BASIS</th><th>QTY × RATE</th><th>AMOUNT</th><th>SIDE</th><th>BILLING</th><th>ACTIONS</th></tr></thead><tbody>'+chargeRows+'</tbody></table></div></article></section>',
   'import-lcl');
  bindShell();
  document.querySelector('#back-lcl').onclick=()=>setRoute('import-lcl');
  document.querySelector('#open-billing').onclick=()=>setRoute('import-lcl-billing?id='+encodeURIComponent(id));
  document.querySelector('#core-form').addEventListener('submit',async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries()),p={};
   const strings=['agent_name','agent_reference','agent_email','origin_country','origin_port','origin_port_code','destination_port','destination_port_code','vessel_name','voyage_no','mbl_no','hbl_no','shipper_name','shipper_address','consignee_name','consignee_address','consignee_email','consignee_phone','notify_party','commodity','package_type','freight_term','etd','eta'];
   strings.forEach(k=>p[k]=d[k]||null);
   p.package_count=d.package_count===''?0:Math.max(0,Math.trunc(Number(d.package_count)));
   p.gross_weight_kg=d.gross_weight_kg===''?0:Number(d.gross_weight_kg);
   p.volume_cbm=d.volume_cbm===''?0:Number(d.volume_cbm);
   if(!Number.isFinite(p.gross_weight_kg)||!Number.isFinite(p.volume_cbm)||p.gross_weight_kg<0||p.volume_cbm<0){document.querySelector('#core-message').innerHTML=message('Weight and volume must be zero or greater.');return;}
   p.updated_at=new Date().toISOString();const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;button.textContent='Saving…';
   const {error}=await supabase.from('import_lcl_shipments').update(p).eq('id',id).eq('company_id',companyId);
   if(error){document.querySelector('#core-message').innerHTML=message(error.message);button.disabled=false;button.textContent='Save shipment information →';return;}
   await renderImportLclDetail(id);
  });
  document.querySelector('#ops-form').addEventListener('submit',async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries()),p={};
   ['ata','arrival_notice_date','cfs_name','remarks','status','customs_status','delivery_status'].forEach(k=>p[k]=d[k]||null);
   ['cfs_arrival_at','destuffed_at'].forEach(k=>p[k]=d[k]?new Date(d[k]).toISOString():null);
   p.updated_at=new Date().toISOString();
   const {error}=await supabase.from('import_lcl_shipments').update(p).eq('id',id).eq('company_id',companyId);
   if(error){document.querySelector('#ops-message').innerHTML=message(error.message);return;}await renderImportLclDetail(id);
  });
  document.querySelector('#container-form').addEventListener('submit',async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());
   const {error}=await supabase.from('import_lcl_containers').insert({company_id:companyId,shipment_id:id,container_no:d.container_no.trim(),container_size:d.container_size||null,seal_no:d.seal_no||null,gross_weight_kg:d.gross_weight_kg?Number(d.gross_weight_kg):null});
   if(error){alert(error.message);return;}await renderImportLclDetail(id);
  });
  document.querySelector('#milestone-form').addEventListener('submit',async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());
   const {error}=await supabase.from('import_lcl_milestones').insert({company_id:companyId,shipment_id:id,milestone_code:d.milestone_code,milestone_at:d.milestone_at?new Date(d.milestone_at).toISOString():new Date().toISOString(),location:d.location||null,notes:d.notes||null});
   if(error){alert(error.message);return;}
   const occurred=d.milestone_at?new Date(d.milestone_at):new Date(),stamp=occurred.toISOString(),day=stamp.slice(0,10);
   const milestoneUpdates={vessel_departed:{status:'in_transit'},vessel_arrived:{status:'arrived',ata:day},arrival_notice_sent:{arrival_notice_date:day},cfs_received:{cfs_arrival_at:stamp},destuffing_completed:{status:'destuffed',destuffed_at:stamp},customs_filed:{customs_status:'filed'},customs_cleared:{status:'customs_cleared',customs_status:'cleared'},do_issued:{status:'ready_for_delivery',delivery_status:'do_issued'},cargo_delivered:{status:'delivered',delivery_status:'delivered'}};
   if(milestoneUpdates[d.milestone_code]){const {error:updateError}=await supabase.from('import_lcl_shipments').update({...milestoneUpdates[d.milestone_code],updated_at:new Date().toISOString()}).eq('id',id).eq('company_id',companyId);if(updateError){alert('Milestone saved, but shipment summary was not updated: '+updateError.message);}}
   await renderImportLclDetail(id);
  });
  document.querySelector('#document-form').addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,file=form.querySelector('input[name="document_file"]').files[0],out=document.querySelector('#document-message'),button=form.querySelector('button[type=submit]');
   if(!file){out.innerHTML=message('Choose a document to upload.');return;}
   const allowed=['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
   if(!allowed.includes(file.type)||file.size>25*1024*1024){out.innerHTML=message('Unsupported file type or file exceeds 25 MB.');return;}
   const d=Object.fromEntries(new FormData(form).entries()),safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=companyId+'/'+id+'/'+crypto.randomUUID()+'-'+safeName;
   button.disabled=true;button.textContent='Uploading…';
   const {error:uploadError}=await supabase.storage.from('import-lcl-documents').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError){out.innerHTML=message(uploadError.message);button.disabled=false;button.textContent='Upload document →';return;}
   const {error:metaError}=await supabase.from('import_lcl_documents').insert({company_id:companyId,shipment_id:id,document_type:d.document_type,document_number:d.document_number||null,file_name:file.name,storage_path:path,mime_type:file.type,file_size:file.size,remarks:d.document_remarks||null});
   if(metaError){await supabase.storage.from('import-lcl-documents').remove([path]);out.innerHTML=message(metaError.message);button.disabled=false;button.textContent='Upload document →';return;}
   await renderImportLclDetail(id);
  });
  document.querySelectorAll('.doc-download').forEach(button=>button.addEventListener('click',async()=>{
   button.disabled=true;const {data,error}=await supabase.storage.from('import-lcl-documents').createSignedUrl(button.dataset.path,60);
   if(error){alert(error.message);button.disabled=false;return;}window.open(data.signedUrl,'_blank','noopener');button.disabled=false;
  }));
  document.querySelectorAll('.doc-status').forEach(selectEl=>selectEl.addEventListener('change',async()=>{
   const status=selectEl.value,update={status,verified_by:status==='verified'?currentUser.id:null,verified_at:status==='verified'?new Date().toISOString():null};
   selectEl.disabled=true;const {error}=await supabase.from('import_lcl_documents').update(update).eq('id',selectEl.dataset.id).eq('company_id',companyId);
   if(error){alert(error.message);selectEl.disabled=false;return;}await renderImportLclDetail(id);
  }));
  const chargeForm=document.querySelector('#charge-form'), chargeOut=document.querySelector('#charge-message');
  document.querySelector('#charge-cancel').addEventListener('click',()=>{chargeForm.reset();chargeForm.elements.charge_id.value='';document.querySelector('#charge-submit').textContent='Add charge';document.querySelector('#charge-cancel').hidden=true;});
  document.querySelectorAll('.charge-edit').forEach(button=>button.addEventListener('click',()=>{
   const charge=charges.find(x=>x.id===button.dataset.id);if(!charge)return;
   if(charge.billing_status!=='unbilled'){alert('This charge is locked because it has been invoiced or paid.');return;}
   chargeForm.elements.charge_id.value=charge.id;
   ['charge_code','description','sac_code','charge_basis','quantity','currency_code','rate','charge_side','remarks'].forEach(k=>{chargeForm.elements[k].value=charge[k]??'';});
   document.querySelector('#charge-submit').textContent='Save charge changes';document.querySelector('#charge-cancel').hidden=false;chargeForm.scrollIntoView({behavior:'smooth',block:'center'});
  }));
  document.querySelectorAll('.charge-delete').forEach(button=>button.addEventListener('click',async()=>{
   const charge=charges.find(x=>x.id===button.dataset.id);if(!charge||charge.billing_status!=='unbilled')return;
   if(!confirm('Delete this unbilled charge? This cannot be undone.'))return;
   button.disabled=true;const {error}=await supabase.from('import_lcl_charges').delete().eq('id',charge.id).eq('company_id',companyId);
   if(error){alert(error.message);button.disabled=false;return;}await renderImportLclDetail(id);
  }));
  chargeForm.addEventListener('submit',async e=>{
   e.preventDefault();const d=Object.fromEntries(new FormData(chargeForm).entries()),chargeId=d.charge_id;
   const quantity=Number(d.quantity),rate=Number(d.rate);
   if(!d.charge_code.trim()||!d.description.trim()||!Number.isFinite(quantity)||!Number.isFinite(rate)||quantity<0||rate<0){chargeOut.innerHTML=message('Enter a charge code, description, and valid non-negative quantity and rate.');return;}
   const payload={charge_code:d.charge_code.trim(),description:d.description.trim(),sac_code:d.sac_code.trim()||null,charge_basis:d.charge_basis,quantity,currency_code:d.currency_code,rate,charge_side:d.charge_side,remarks:d.remarks||null};
   const submit=document.querySelector('#charge-submit');submit.disabled=true;submit.textContent=chargeId?'Saving…':'Adding…';
   const result=chargeId
    ? await supabase.from('import_lcl_charges').update(payload).eq('id',chargeId).eq('company_id',companyId)
    : await supabase.from('import_lcl_charges').insert({...payload,company_id:companyId,shipment_id:id,billing_status:'unbilled'});
   if(result.error){chargeOut.innerHTML=message(result.error.message);submit.disabled=false;submit.textContent=chargeId?'Save charge changes':'Add charge';return;}
   await renderImportLclDetail(id);
  });
 } catch(error) {
  root.innerHTML=shell('<section class="heading"><h1>Shipment detail unavailable</h1>'+message(error.message||'Unable to load shipment.')+'<button id="back-lcl-error" class="btn secondary">← Back</button></section>','import-lcl');
  bindShell();document.querySelector('#back-lcl-error')?.addEventListener('click',()=>setRoute('import-lcl'));
 }
}



async function renderImportLclBilling(id) {
 root.innerHTML='<main class="loading">Loading shipment billing…</main>';
 try {
  const memberships=await loadMemberships(),membership=memberships[0];
  if(!membership) throw new Error('No active company membership.');
  const companyId=membership.company_id;
  const [shipmentRes,chargesRes,invoiceRes,companyRes]=await Promise.all([
   supabase.from('import_lcl_shipments').select('*').eq('id',id).eq('company_id',companyId).single(),
   supabase.from('import_lcl_charges').select('*').eq('shipment_id',id).eq('company_id',companyId).eq('charge_side','customer').order('created_at',{ascending:false}),
   supabase.from('import_lcl_invoices').select('*').eq('shipment_id',id).eq('company_id',companyId).order('created_at',{ascending:false}),
   supabase.from('companies').select('*').eq('id',companyId).single()
  ]);
  [shipmentRes,chargesRes,invoiceRes,companyRes].forEach(x=>{if(x.error)throw x.error;});
  const shipment=shipmentRes.data,charges=chargesRes.data||[],invoices=invoiceRes.data||[],company=companyRes.data;
  const branchRes=await supabase.from('branches').select('*').eq('id',shipment.branch_id).eq('company_id',companyId).single();
  if(branchRes.error)throw branchRes.error;
  const branch=branchRes.data;
  const money=(n,c)=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+c;
  const dateToday=new Date().toISOString().slice(0,10);
  const available=charges.filter(c=>c.billing_status==='unbilled');
  const currencies=[...new Set(available.map(c=>c.currency_code.trim()))];
  const currencyOptions=currencies.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  const chargeRows=charges.map(c=>'<tr><td>'+(c.billing_status==='unbilled'?'<input class="bill-charge-check" type="checkbox" value="'+esc(c.id)+'" data-currency="'+esc(c.currency_code.trim())+'">':'—')+'</td><td><strong>'+esc(c.charge_code)+'</strong><br>'+esc(c.description)+'</td><td>'+esc(c.charge_side)+'</td><td>'+esc(c.quantity)+' × '+esc(c.rate)+'</td><td>'+money(c.amount,c.currency_code)+'</td><td>'+esc(c.billing_status)+'</td></tr>').join('')||'<tr><td colspan="6" class="empty">No customer charges entered.</td></tr>';
  const invoiceRows=invoices.map(i=>{
   const finalExists=invoices.some(x=>x.source_invoice_id===i.id&&x.invoice_type==='tax'&&x.status!=='cancelled');
   const copyButton=i.invoice_type==='proforma'&&i.status!=='cancelled'
    ?(finalExists?'<span class="muted">Final invoice created</span>':'<button type="button" class="btn invoice-copy-final" data-id="'+esc(i.id)+'">Copy to Final Tax Invoice</button>'):'';
   const deleteButton=i.invoice_type==='proforma'&&i.status==='draft'
    ?'<button type="button" class="btn secondary invoice-delete" data-id="'+esc(i.id)+'">Delete Draft</button>':'';
   return '<tr><td><strong>'+esc(i.invoice_no||'Draft')+'</strong><br>'+esc(i.invoice_type==='proforma'?'Proforma Invoice':'Tax Invoice')+(i.source_invoice_id?'<br><small>Copied from Proforma</small>':'')+'</td><td>'+esc(i.invoice_date)+'</td><td>'+esc(i.status)+'</td><td>'+money(i.total_amount,i.currency_code)+'</td><td><button type="button" class="btn secondary invoice-preview" data-id="'+esc(i.id)+'">Preview / Print</button> '+(i.status==='draft'?'<button type="button" class="btn invoice-issue" data-id="'+esc(i.id)+'">Issue</button>':'')+' '+copyButton+' '+deleteButton+'</td></tr>';
  }).join('')||'<tr><td colspan="5" class="empty">No invoices created for this shipment.</td></tr>';
  root.innerHTML=shell(
   '<section class="heading"><div class="eyebrow">IMPORT LCL / BILLING</div><div class="module-heading"><div><h1>Billing · '+esc(shipment.shipment_no)+'</h1><p class="muted">'+esc(shipment.hbl_no||'HBL pending')+' · '+esc(shipment.consignee_name||'Consignee pending')+'</p></div><button id="billing-back" class="btn secondary" type="button">← Shipment detail</button></div></section>'+
   '<section class="grid"><article class="stat"><small>CUSTOMER CHARGES</small><strong>'+charges.filter(c=>c.charge_side==='customer').length+'</strong><span>All customer-side charges</span></article><article class="stat"><small>UNBILLED</small><strong>'+available.length+'</strong><span>Available for invoice</span></article><article class="stat"><small>INVOICES</small><strong>'+invoices.length+'</strong><span>Draft and issued</span></article><article class="stat"><small>BRANCH</small><strong class="small-stat">'+esc(branch.name)+'</strong><span>'+esc(branch.gstin||'GSTIN not configured')+'</span></article></section>'+
   '<section class="section"><h2>Create invoice draft</h2><article class="panel"><p class="muted">Select customer charges in one currency. Proforma invoices are estimates; tax invoices become final only after issuing. Confirm GST treatment and rate with your tax advisor before issue.</p><form id="billing-form"><div class="form-grid">'+
   '<div class="field"><label>Invoice type *</label><select name="invoice_type"><option value="proforma">Proforma Invoice</option><option value="tax">GST Tax Invoice</option></select></div>'+
   '<div class="field"><label>Currency *</label><select name="currency_code" required>'+currencyOptions+'</select></div>'+
   '<div class="field"><label>Invoice date *</label><input name="invoice_date" type="date" value="'+dateToday+'" required></div>'+
   '<div class="field"><label>Due date</label><input name="due_date" type="date"></div>'+
   '<div class="field"><label>Bill to name *</label><input name="bill_to_name" required value="'+esc(shipment.consignee_name||'')+'"></div>'+
   '<div class="field"><label>Customer GSTIN</label><input name="bill_to_gstin" maxlength="15" placeholder="GSTIN"></div>'+
   '<div class="field"><label>Billing state</label><input name="bill_to_state" value="" placeholder="State"></div>'+
   '<div class="field"><label>Place of supply state</label><input name="place_of_supply_state" placeholder="State"></div>'+
   '<div class="field"><label>GST treatment *</label><select name="tax_treatment"><option value="cgst_sgst">CGST + SGST (intra-state)</option><option value="igst">IGST (inter-state)</option><option value="no_tax">No GST / exempt</option></select></div>'+
   '<div class="field"><label>GST rate (%) *</label><select name="gst_rate"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18" selected>18%</option><option value="28">28%</option></select></div>'+
   '<div class="field"><label>Terms & payment instructions</label><input name="terms" placeholder="Payment due within…"></div>'+
   '<div class="field"><label>Notes</label><input name="notes" placeholder="Additional invoice notes"></div>'+
   '</div><div class="field"><label>Billing address</label><textarea name="bill_to_address" rows="2">'+esc(shipment.consignee_address||'')+'</textarea></div>'+
   '<div class="field"><label>Customer charges to include</label><div class="table-wrap"><table><thead><tr><th>SELECT</th><th>CHARGE</th><th>SIDE</th><th>QTY × RATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>'+chargeRows+'</tbody></table></div></div>'+
   '<div id="billing-message" aria-live="polite"></div><button class="btn" type="submit" '+(!available.length?'disabled':'')+'>Create invoice draft →</button></form></article></section>'+
   '<section class="section"><h2>Invoices for this shipment</h2><article class="panel table-wrap"><table><thead><tr><th>INVOICE</th><th>DATE</th><th>STATUS</th><th>TOTAL</th><th>ACTION</th></tr></thead><tbody>'+invoiceRows+'</tbody></table></article></section>',
   'import-lcl'
  );
  bindShell();
  document.querySelector('#billing-back').onclick=()=>setRoute('import-lcl-detail?id='+encodeURIComponent(id));
  const currencySelect=document.querySelector('[name="currency_code"]');
  currencySelect.addEventListener('change',()=>document.querySelectorAll('.bill-charge-check').forEach(c=>{c.disabled=c.dataset.currency!==currencySelect.value;c.checked=false;}));
  document.querySelector('#billing-form').addEventListener('submit',async e=>{
   e.preventDefault();const form=e.currentTarget,d=Object.fromEntries(new FormData(form).entries());
   const selected=[...form.querySelectorAll('.bill-charge-check:checked')].map(x=>x.value);
   if(!selected.length){document.querySelector('#billing-message').innerHTML=message('Select at least one unbilled customer charge.');return;}
   if(d.tax_treatment==='cgst_sgst'&&branch.state_region&&d.place_of_supply_state&&branch.state_region.trim().toLowerCase()!==d.place_of_supply_state.trim().toLowerCase()){
    document.querySelector('#billing-message').innerHTML=message('The place of supply differs from the supplier branch state. Please select IGST or verify the correct GST treatment.');return;
   }
   const payload={company_id:companyId,branch_id:shipment.branch_id,shipment_id:id,invoice_type:d.invoice_type,invoice_date:d.invoice_date,due_date:d.due_date,
    bill_to_name:d.bill_to_name,bill_to_gstin:d.bill_to_gstin,bill_to_address:d.bill_to_address,bill_to_state:d.bill_to_state,
    place_of_supply_state:d.place_of_supply_state,tax_treatment:d.tax_treatment,currency_code:d.currency_code,gst_rate:Number(d.gst_rate),terms:d.terms,notes:d.notes};
   const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Creating draft…';
   const {data,error}=await supabase.rpc('create_import_lcl_invoice',{p_payload:payload,p_charge_ids:selected});
   if(error){document.querySelector('#billing-message').innerHTML=message(error.message);button.disabled=false;button.textContent='Create invoice draft →';return;}
   await renderImportLclBilling(id);
  });
  document.querySelectorAll('.invoice-issue').forEach(button=>button.addEventListener('click',async()=>{
   if(!confirm('Issue this invoice now? An issued tax invoice will lock its linked charges.'))return;
   button.disabled=true;button.textContent='Issuing…';
   const {error}=await supabase.rpc('issue_import_lcl_invoice',{p_invoice_id:button.dataset.id});
   if(error){alert(error.message);button.disabled=false;button.textContent='Issue';return;}
   await renderImportLclBilling(id);
  }));
  document.querySelectorAll('.invoice-delete').forEach(button=>button.addEventListener('click',async()=>{
   if(!confirm('Delete this draft proforma? Its invoice lines will also be deleted. This cannot be undone.'))return;
   button.disabled=true;button.textContent='Deleting…';
   const {error}=await supabase.from('import_lcl_invoices').delete().eq('id',button.dataset.id).eq('company_id',companyId).eq('invoice_type','proforma').eq('status','draft');
   if(error){alert(error.message);button.disabled=false;button.textContent='Delete Draft';return;}
   await renderImportLclBilling(id);
  }));
  document.querySelectorAll('.invoice-copy-final').forEach(button=>button.addEventListener('click',async()=>{
   if(!confirm('Copy this proforma into a new Final Tax Invoice draft? The original proforma will remain unchanged.'))return;
   button.disabled=true;button.textContent='Copying…';
   const {data,error}=await supabase.rpc('create_import_lcl_tax_invoice_from_proforma',{
    p_source_invoice_id:button.dataset.id,p_invoice_date:new Date().toISOString().slice(0,10),p_due_date:null
   });
   if(error){alert(error.message);button.disabled=false;button.textContent='Copy to Final Tax Invoice';return;}
   await renderImportLclBilling(id);
  }));
  document.querySelectorAll('.invoice-preview').forEach(button=>button.addEventListener('click',async()=>{
   button.disabled=true;const invoiceId=button.dataset.id;
   const [invRes,itemRes]=await Promise.all([
    supabase.from('import_lcl_invoices').select('*').eq('id',invoiceId).eq('company_id',companyId).single(),
    supabase.from('import_lcl_invoice_items').select('*').eq('invoice_id',invoiceId).eq('company_id',companyId).order('created_at')
   ]);
   if(invRes.error||itemRes.error){alert(invRes.error?.message||itemRes.error?.message);button.disabled=false;return;}
   const inv=invRes.data,items=itemRes.data||[];
   const popup=window.open('','_blank','width=1000,height=800');
   if(!popup){alert('Allow pop-ups to preview or print invoices.');button.disabled=false;return;}
   const fmtMoney=(n)=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+esc(inv.currency_code);
   const lineHtml=items.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.sac_code||'—')+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(fmtMoney(x.rate))+'</td><td>'+esc(fmtMoney(x.taxable_amount))+'</td><td>'+Number(x.gst_rate).toFixed(2)+'%</td><td>'+esc(fmtMoney(x.line_total))+'</td></tr>').join('');
   const draftMark=inv.status==='draft'?'<div class="draft">DRAFT — NOT AN ISSUED '+(inv.invoice_type==='tax'?'TAX INVOICE':'PROFORMA INVOICE')+'</div>':'';
   popup.document.write('<!doctype html><html><head><title>'+esc(inv.invoice_no||'Draft Invoice')+'</title><style>body{font:13px Arial,sans-serif;color:#111;margin:34px}h1{font-size:22px;margin:0 0 5px}.muted{color:#555}.head{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:18px}.draft{margin:16px 0;padding:10px;border:1px dashed #b00;color:#b00;text-align:center;font-weight:bold}.parties{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:22px 0}.meta{margin:20px 0;line-height:1.8}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #aaa;padding:8px;text-align:left}th{background:#eee}.totals{margin:20px 0 0 auto;width:330px}.totals div{display:flex;justify-content:space-between;padding:5px;border-bottom:1px solid #ddd}.grand{font-weight:bold;font-size:16px}.foot{margin-top:45px;display:flex;justify-content:space-between}.small{font-size:11px;color:#555}@media print{button{display:none}}</style></head><body>'+draftMark+'<div class="head"><div><h1>'+esc(company.legal_name||company.display_name)+'</h1><div>'+esc([branch.address_line_1,branch.address_line_2,branch.city,branch.state_region,branch.postal_code].filter(Boolean).join(', '))+'</div><div>GSTIN: '+esc(branch.gstin||company.gstin||'Not configured')+' · '+esc(branch.email||company.email||'')+' · '+esc(branch.phone||company.phone||'')+'</div></div><div><h1>'+(inv.invoice_type==='tax'?'TAX INVOICE':'PROFORMA INVOICE')+'</h1><div>Invoice No: '+esc(inv.invoice_no||'Draft')+'</div><div>Date: '+esc(inv.invoice_date)+'</div><div>Due: '+esc(inv.due_date||'—')+'</div></div></div><div class="parties"><div><b>Bill To</b><div>'+esc(inv.bill_to_name)+'</div><div>'+esc(inv.bill_to_address||'')+'</div><div>GSTIN: '+esc(inv.bill_to_gstin||'—')+'</div><div>State: '+esc(inv.bill_to_state||'—')+'</div></div><div><b>Shipment Details</b><div>Shipment: '+esc(shipment.shipment_no)+'</div><div>HBL: '+esc(shipment.hbl_no||'—')+'</div><div>MBL: '+esc(shipment.mbl_no||'—')+'</div><div>Vessel / Voyage: '+esc(shipment.vessel_name||'—')+' / '+esc(shipment.voyage_no||'—')+'</div><div>Place of Supply: '+esc(inv.place_of_supply_state||'—')+'</div></div></div><table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Taxable Value</th><th>GST</th><th>Total</th></tr></thead><tbody>'+lineHtml+'</tbody></table><div class="totals"><div><span>Taxable value</span><b>'+fmtMoney(inv.taxable_value)+'</b></div>'+(inv.tax_treatment==='cgst_sgst'?'<div><span>CGST</span><b>'+fmtMoney(inv.cgst_amount)+'</b></div><div><span>SGST</span><b>'+fmtMoney(inv.sgst_amount)+'</b></div>':'')+(inv.tax_treatment==='igst'?'<div><span>IGST</span><b>'+fmtMoney(inv.igst_amount)+'</b></div>':'')+'<div class="grand"><span>Grand Total</span><b>'+fmtMoney(inv.total_amount)+'</b></div></div><p><b>Terms:</b> '+esc(inv.terms||'')+'</p><p><b>Notes:</b> '+esc(inv.notes||'')+'</p><div class="foot"><div class="small">This document is generated by Freight ERP. Amounts are in '+esc(inv.currency_code)+'.</div><div>For '+esc(company.legal_name||company.display_name)+'<br><br><br>Authorised Signatory</div></div><script>window.onload=()=>window.print()<\/script></body></html>');
   popup.document.close();button.disabled=false;
  }));
 } catch(error) {
  root.innerHTML=shell('<section class="heading"><h1>Billing unavailable</h1>'+message(error.message||'Unable to load billing.')+'<button id="billing-error-back" class="btn secondary">← Back</button></section>','import-lcl');
  bindShell();document.querySelector('#billing-error-back')?.addEventListener('click',()=>setRoute('import-lcl-detail?id='+encodeURIComponent(id)));
 }
}

async function renderUserManagement() {
  root.innerHTML='<main class="loading">Loading user management…</main>';
  try {
    const memberships=await loadMemberships();
    const membership=memberships[0];
    if(!membership) throw new Error('No active company membership found.');
    const companyId=membership.company_id;
    const {data,error}=await supabase.functions.invoke('company-users',{body:{action:'list',company_id:companyId}});
    if(error||!data||data.error) throw new Error(data?.error||error?.message||'Unable to load users.');
    const users=data.users||[], roles=data.roles||[], branches=data.branches||[];
    const roleOptions=roles.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>').join('');
    const branchChecks=branches.filter(b=>b.status==='active').map(b=>'<label class="branch-check"><input type="checkbox" name="branch_ids" value="'+esc(b.id)+'"><span>'+esc(b.name)+' <small>'+esc(b.branch_code)+'</small></span></label>').join('');
    const rows=users.map(u=>{
      const assigned=u.branches?.length?u.branches.map(b=>b.name).join(', '):u.branch_scope==='all'?'All branches':'No branch selected';
      const access=u.email_confirmed?'Email confirmed':u.status==='invited'?'Invitation pending':'Not confirmed';
      return '<tr data-user-search="'+esc((u.email+' '+u.display_name+' '+(u.role?.name||'')).toLowerCase())+'" data-user-status="'+esc(u.status)+'"><td><strong>'+esc(u.display_name||'Name not set')+'</strong><br><small>'+esc(u.email)+'</small><br><small class="muted">'+esc(access)+'</small></td><td><select class="user-role" data-id="'+esc(u.membership_id)+'" '+(u.user_id===currentUser?.id?'disabled':'')+'>'+roles.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===u.role_id?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></td><td><select class="user-status" data-id="'+esc(u.membership_id)+'" '+(u.user_id===currentUser?.id?'disabled':'')+'>'+['active','invited','suspended','deactivated'].map(v=>'<option value="'+v+'" '+(v===u.status?'selected':'')+'>'+v.replaceAll('_',' ')+'</option>').join('')+'</select></td><td>'+esc(assigned)+'</td><td>'+esc(u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleDateString('en-IN'):'Never')+'</td><td><button class="btn secondary user-save" data-id="'+esc(u.membership_id)+'" '+(u.user_id===currentUser?.id?'disabled':'')+'>Save</button></td></tr>';
    }).join('')||'<tr><td colspan="6" class="empty">No company users found yet.</td></tr>';
    root.innerHTML=shell(
      '<section class="heading"><div class="eyebrow">ADMINISTRATION / ACCESS CONTROL</div><div class="module-heading"><div><h1>User Management</h1><p class="muted">Invite team members, assign roles and control branch access for this company.</p></div><span class="pill">'+users.length+' users</span></div></section>'+
      '<section class="grid"><article class="stat"><small>TOTAL USERS</small><strong>'+users.length+'</strong><span>Company memberships</span></article><article class="stat"><small>ACTIVE</small><strong>'+users.filter(u=>u.status==='active').length+'</strong><span>Access enabled</span></article><article class="stat"><small>INVITATIONS</small><strong>'+users.filter(u=>u.status==='invited').length+'</strong><span>Awaiting email confirmation</span></article><article class="stat"><small>BRANCHES</small><strong>'+branches.filter(b=>b.status==='active').length+'</strong><span>Available for assignment</span></article></section>'+
      '<section class="section"><h2>Invite a team member</h2><article class="panel"><form id="invite-user-form"><div class="form-grid">'+
      '<div class="field"><label>Full name *</label><input name="display_name" required maxlength="120" placeholder="Employee full name"></div>'+
      '<div class="field"><label>Work email *</label><input name="email" type="email" required placeholder="employee@company.com"></div>'+
      '<div class="field"><label>Phone</label><input name="phone" type="tel" placeholder="+91"></div>'+
      '<div class="field"><label>Role *</label><select name="role_id" required>'+roleOptions+'</select></div>'+
      '<div class="field"><label>Branch access *</label><select name="branch_scope" id="invite-branch-scope"><option value="all">All branches</option><option value="selected">Selected branches only</option></select></div>'+
      '</div><div id="invite-branch-list" class="branch-check-grid" hidden>'+branchChecks+'</div><div id="invite-user-message" aria-live="polite"></div><button class="btn" type="submit">Send invitation →</button></form></article></section>'+
      '<section class="section"><div class="module-toolbar"><h2>Company users</h2><input id="users-search" class="search-input" placeholder="Search name, email or role…"><select id="users-status" class="filter-select"><option value="">All statuses</option><option>active</option><option>invited</option><option>suspended</option><option>deactivated</option></select></div><article class="panel table-wrap"><table><thead><tr><th>USER</th><th>ROLE</th><th>MEMBERSHIP</th><th>BRANCH ACCESS</th><th>LAST SIGN IN</th><th>ACTION</th></tr></thead><tbody id="company-user-rows">'+rows+'</tbody></table></article></section>',
      'users'
    );
    bindShell();
    const scope=document.querySelector('#invite-branch-scope'), branchList=document.querySelector('#invite-branch-list');
    scope.addEventListener('change',()=>{branchList.hidden=scope.value!=='selected';});
    document.querySelector('#invite-user-form').addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget, d=Object.fromEntries(new FormData(form).entries()), button=form.querySelector('button[type=submit]'), out=document.querySelector('#invite-user-message');
      const branchIds=[...form.querySelectorAll('input[name="branch_ids"]:checked')].map(x=>x.value);
      if(d.branch_scope==='selected'&&!branchIds.length){out.innerHTML=message('Select at least one branch.');return;}
      button.disabled=true;button.textContent='Sending invitation…';
      const {data:result,error:inviteError}=await supabase.functions.invoke('company-users',{body:{action:'invite',company_id:companyId,email:d.email,display_name:d.display_name,phone:d.phone,role_id:d.role_id,branch_scope:d.branch_scope,branch_ids:branchIds}});
      if(inviteError||result?.error){out.innerHTML=message(result?.error||inviteError?.message||'Invitation failed.');button.disabled=false;button.textContent='Send invitation →';return;}
      out.innerHTML=message(result.invited?'Invitation sent to '+result.user.email+'. The membership will activate after the user confirms the email.':'Existing account added to this company. The user can sign in with their existing account.','success');
      await renderUserManagement();
    });
    const applyUserFilters=()=>{
      const q=document.querySelector('#users-search').value.toLowerCase(), st=document.querySelector('#users-status').value;
      document.querySelectorAll('#company-user-rows tr[data-user-search]').forEach(row=>{row.hidden=!(row.dataset.userSearch.includes(q)&&(!st||row.dataset.userStatus===st));});
    };
    document.querySelector('#users-search').addEventListener('input',applyUserFilters);
    document.querySelector('#users-status').addEventListener('change',applyUserFilters);
    document.querySelectorAll('.user-save').forEach(button=>button.addEventListener('click',async()=>{
      const id=button.dataset.id, role=document.querySelector('.user-role[data-id="'+id+'"]')?.value, status=document.querySelector('.user-status[data-id="'+id+'"]')?.value;
      button.disabled=true;button.textContent='Saving…';
      const {data:result,error:updateError}=await supabase.functions.invoke('company-users',{body:{action:'update',company_id:companyId,membership_id:id,role_id:role,status}});
      if(updateError||result?.error){alert(result?.error||updateError?.message||'Unable to update user.');button.disabled=false;button.textContent='Save';return;}
      await renderUserManagement();
    }));
  } catch(error) {
    root.innerHTML=shell('<section class="heading"><div class="eyebrow">ADMINISTRATION</div><h1>User Management</h1>'+message(error.message||'Unable to load user management.')+'</section>','users');
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
  if (recoveryMode && user) { renderResetPassword(); return; }
  const page = route();
  if (!user) { renderLogin(); return; }
  if (page === "platform") { await renderPlatform(); return; }
  if (page === "company") { await renderCompany(); return; }
  if (page === "users") { await renderUserManagement(); return; }
  if (page === "import-lcl") { await renderImportLcl(); return; }
  if (page === "import-lcl-detail") { const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id'); if(id){await renderImportLclDetail(id);return;} await renderImportLcl(); return; }
  if (page === "import-lcl-billing") { const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id'); if(id){await renderImportLclBilling(id);return;} await renderImportLcl(); return; }
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