// src/pages/AdminPanel.jsx
// Drop this into your existing frontend. Route it at /admin in App.jsx.
// Protect it — only you know the URL and the login password.

import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = process.env.REACT_APP_API_URL; // set this in Vercel env vars
const TYPES = ['Silk','Cotton','Pattu','Georgette','Linen','Chiffon','Other'];
const STATUSES = ['pending','confirmed','shipped','delivered','cancelled'];

// ── axios-lite: simple fetch wrapper ─────────────────────────
async function api(method, path, body, token, isFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── empty form state ──────────────────────────────────────────
const BLANK = {
  sku:'', name:'', description:'', type:'Silk', color:'',
  price:'', originalPrice:'', stock:'', size:'5.5m',
  weight:'', blouseIncluded:false, isFeatured:false,
  isActive:true, tags:'', sortOrder:'0',
};

// ═════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [token, setToken]   = useState(() => localStorage.getItem('cg_admin_token') || '');
  const [tab, setTab]       = useState('sarees');
  const [sarees, setSarees] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toast, setToast]   = useState({ msg:'', ok:true });
  const [loading, setLoading] = useState(false);

  // form state
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);  // null = new saree
  const [form, setForm]             = useState(BLANK);
  const [imgFiles, setImgFiles]     = useState([]);
  const [vidFile, setVidFile]       = useState(null);
  const [uploading, setUploading]   = useState(false);
  const imgRef = useRef();
  const vidRef = useRef();

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg:'', ok:true }), 3500);
  };

  // ── data loaders ─────────────────────────────────────────
  const loadSarees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setSarees(await api('GET', '/api/sarees/admin/all', null, token)); }
    catch (e) { notify(e.message, false); }
    finally { setLoading(false); }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try { const d = await api('GET', '/api/orders', null, token); setOrders(d.orders || []); }
    catch (e) { notify(e.message, false); }
  }, [token]);

  useEffect(() => { if (token) { loadSarees(); loadOrders(); } }, [token, loadSarees, loadOrders]);

  // ── login ─────────────────────────────────────────────────
  if (!token) return <Login onLogin={t => { localStorage.setItem('cg_admin_token', t); setToken(t); }} />;

  function logout() { localStorage.removeItem('cg_admin_token'); setToken(''); }

  // ── open form ─────────────────────────────────────────────
  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setImgFiles([]);
    setVidFile(null);
    setShowForm(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      sku: s.sku, name: s.name, description: s.description || '',
      type: s.type, color: s.color,
      price: s.price, originalPrice: s.originalPrice || '',
      stock: s.stock, size: s.size || '5.5m',
      weight: s.weight || '', blouseIncluded: !!s.blouseIncluded,
      isFeatured: !!s.isFeatured, isActive: s.isActive !== false,
      tags: (s.tags || []).join(', '), sortOrder: s.sortOrder ?? 0,
    });
    setImgFiles([]);
    setVidFile(null);
    setShowForm(true);
  }

  // ── save saree ────────────────────────────────────────────
  async function saveSaree(e) {
    e.preventDefault();
    setUploading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        sortOrder: Number(form.sortOrder),
        originalPrice: form.originalPrice !== '' ? Number(form.originalPrice) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      let id;
      if (editing) {
        await api('PUT', `/api/sarees/${editing._id}`, payload, token);
        id = editing._id;
        notify(`"${form.name}" updated ✓`);
      } else {
        const res = await api('POST', '/api/sarees', payload, token);
        id = res._id;
        notify(`"${form.name}" created ✓`);
      }

      // Upload images if any selected
      if (imgFiles.length) {
        const fd = new FormData();
        imgFiles.forEach(f => fd.append('images', f));
        await api('POST', `/api/sarees/${id}/images`, fd, token, true);
        notify(`${imgFiles.length} image(s) uploaded ✓`);
      }

      // Upload video if selected
      if (vidFile) {
        const fd = new FormData();
        fd.append('video', vidFile);
        await api('POST', `/api/sarees/${id}/video`, fd, token, true);
        notify('Video uploaded ✓');
      }

      setShowForm(false);
      loadSarees();
    } catch (err) {
      notify(err.message, false);
    } finally {
      setUploading(false);
    }
  }

  // ── delete image ──────────────────────────────────────────
  async function removeImage(saree, url) {
    if (!window.confirm('Remove this image?')) return;
    try {
      await api('DELETE', `/api/sarees/${saree._id}/images`, { url }, token);
      // update local state so UI reflects immediately
      setSarees(prev => prev.map(s => s._id === saree._id
        ? { ...s, imageUrls: s.imageUrls.filter(u => u !== url) } : s));
      if (editing?._id === saree._id)
        setEditing(prev => ({ ...prev, imageUrls: prev.imageUrls.filter(u => u !== url) }));
      notify('Image removed');
    } catch (e) { notify(e.message, false); }
  }

  // ── toggle active ─────────────────────────────────────────
  async function toggleActive(s) {
    try {
      await api('PUT', `/api/sarees/${s._id}`, { isActive: !s.isActive }, token);
      notify(s.isActive ? 'Hidden from shop' : 'Now visible in shop');
      loadSarees();
    } catch (e) { notify(e.message, false); }
  }

  // ── toggle featured ───────────────────────────────────────
  async function toggleFeatured(s) {
    try {
      await api('PUT', `/api/sarees/${s._id}`, { isFeatured: !s.isFeatured }, token);
      notify(s.isFeatured ? 'Removed from featured' : 'Added to featured');
      loadSarees();
    } catch (e) { notify(e.message, false); }
  }

  // ── quick stock update ────────────────────────────────────
  async function quickStock(s) {
    const val = window.prompt(`Stock for "${s.name}" (current: ${s.stock}):`, s.stock);
    if (val === null || val === '' || isNaN(val)) return;
    try {
      await api('PATCH', `/api/sarees/${s._id}/stock`, { stock: Number(val) }, token);
      notify(`Stock set to ${val}`);
      loadSarees();
    } catch (e) { notify(e.message, false); }
  }

  // ── delete saree ──────────────────────────────────────────
  async function deleteSaree(s) {
    if (!window.confirm(`Permanently delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await api('DELETE', `/api/sarees/${s._id}?hard=true`, null, token);
      notify(`"${s.name}" deleted`);
      loadSarees();
    } catch (e) { notify(e.message, false); }
  }

  // ── update order status ───────────────────────────────────
  async function updateStatus(o, status) {
    try {
      await api('PATCH', `/api/orders/${o._id}/status`, { status }, token);
      setOrders(prev => prev.map(x => x._id === o._id ? { ...x, status } : x));
      notify(`Order marked as "${status}"`);
    } catch (e) { notify(e.message, false); }
  }

  const f = form; // shorthand
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ─────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>

      {/* TOPBAR */}
      <div style={S.topbar}>
        <span style={S.logo}>🥻 City Girl Admin</span>
        <div style={S.tabs}>
          {['sarees','orders'].map(t => (
            <button key={t} style={tab===t ? {...S.tab,...S.tabActive} : S.tab} onClick={() => setTab(t)}>
              {t === 'sarees' ? `Sarees (${sarees.length})` : `Orders (${orders.length})`}
            </button>
          ))}
        </div>
        <button style={S.logoutBtn} onClick={logout}>Logout</button>
      </div>

      {/* TOAST */}
      {toast.msg && (
        <div style={{ ...S.toast, background: toast.ok ? '#2E7D32' : '#B03A2E' }}>
          {toast.msg}
        </div>
      )}

      {/* ══ SAREES TAB ══════════════════════════════════════ */}
      {tab === 'sarees' && (
        <div style={S.content}>
          <div style={S.actionBar}>
            <button style={S.btnGold} onClick={openNew}>+ Add New Saree</button>
            <span style={S.hint}>Click "Edit" on any row to modify. Use "Stock" for quick quantity changes.</span>
          </div>

          {loading ? <p style={S.loading}>Loading sarees…</p> : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['SKU','Name','Type','Color','Price','Stock','Featured','Status','Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sarees.map(s => (
                    <tr key={s._id} style={!s.isActive ? S.rowDim : {}}>
                      <td style={S.td}><code style={S.code}>{s.sku}</code></td>
                      <td style={S.td}>
                        <strong style={{ color:'#1A0F00' }}>{s.name}</strong>
                        {s.imageUrls?.length > 0 && (
                          <img src={s.imageUrls[0]} alt="" style={S.microThumb} />
                        )}
                      </td>
                      <td style={S.td}>{s.type}</td>
                      <td style={S.td}>{s.color}</td>
                      <td style={S.td}>₹{s.price?.toLocaleString('en-IN')}</td>
                      <td style={S.td}>
                        <span style={s.stock === 0 ? S.stockRed : s.stock < 5 ? S.stockAmber : S.stockGreen}>
                          {s.stock}
                        </span>
                        {' '}
                        <button style={S.btnXs} onClick={() => quickStock(s)}>Edit</button>
                      </td>
                      <td style={S.td}>
                        <button
                          style={s.isFeatured ? S.badgeFeatured : S.badgeNone}
                          onClick={() => toggleFeatured(s)}
                        >
                          {s.isFeatured ? '★ Yes' : '☆ No'}
                        </button>
                      </td>
                      <td style={S.td}>
                        <button
                          style={s.isActive ? S.badgeActive : S.badgeHidden}
                          onClick={() => toggleActive(s)}
                        >
                          {s.isActive ? 'Live' : 'Hidden'}
                        </button>
                      </td>
                      <td style={{...S.td, whiteSpace:'nowrap'}}>
                        <button style={S.btnEdit} onClick={() => openEdit(s)}>Edit</button>
                        <button style={S.btnDel} onClick={() => deleteSaree(s)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ ORDERS TAB ══════════════════════════════════════ */}
      {tab === 'orders' && (
        <div style={S.content}>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Order ID','Customer','Phone','Address','Items','Total','Status','Date'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={S.td}><code style={S.code}>{o.orderId}</code></td>
                    <td style={S.td}><strong>{o.customer?.name}</strong></td>
                    <td style={S.td}>{o.customer?.phone}</td>
                    <td style={{...S.td, maxWidth:180, fontSize:12}}>{o.customer?.address}</td>
                    <td style={S.td}>
                      {o.items?.map((item, i) => (
                        <div key={i} style={{ fontSize:12, color:'#5A3E28' }}>
                          {item.name} × {item.qty}
                        </div>
                      ))}
                    </td>
                    <td style={{...S.td, color:'#C9923A', fontWeight:500}}>
                      ₹{o.pricing?.grandTotal?.toLocaleString('en-IN')}
                    </td>
                    <td style={S.td}>
                      <select
                        style={S.statusSelect}
                        value={o.status}
                        onChange={e => updateStatus(o, e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{...S.td, fontSize:12}}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#7A6247' }}>
                    No orders yet
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT FORM MODAL ════════════════════════════ */}
      {showForm && (
        <div style={S.modalBg} onClick={() => !uploading && setShowForm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={S.modalHead}>
              <h2 style={S.modalTitle}>
                {editing ? `Edit — ${editing.name}` : 'Add New Saree'}
              </h2>
              <button style={S.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={saveSaree} style={S.form}>

              {/* ── Row 1: SKU + Name ── */}
              <div style={S.row}>
                <div style={S.fg}>
                  <label style={S.label}>SKU *</label>
                  <input style={S.input} value={f.sku} required
                    placeholder="CG-SILK-001"
                    onChange={e => set('sku', e.target.value)} />
                  <span style={S.fieldHint}>Unique code, no spaces. e.g. CG-SILK-001</span>
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Saree Name *</label>
                  <input style={S.input} value={f.name} required
                    placeholder="Kanjivaram Crimson Bridal"
                    onChange={e => set('name', e.target.value)} />
                </div>
              </div>

              {/* ── Description ── */}
              <div style={S.fg}>
                <label style={S.label}>Description</label>
                <textarea style={{...S.input, resize:'vertical', minHeight:70}} value={f.description}
                  placeholder="Describe the saree — fabric, occasion, specialty..."
                  onChange={e => set('description', e.target.value)} />
              </div>

              {/* ── Row 2: Type + Color + Size ── */}
              <div style={S.row}>
                <div style={S.fg}>
                  <label style={S.label}>Fabric Type *</label>
                  <select style={S.input} value={f.type} onChange={e => set('type', e.target.value)}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Color *</label>
                  <input style={S.input} value={f.color} required
                    placeholder="Red, Blue, Multicolor…"
                    onChange={e => set('color', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Size</label>
                  <input style={S.input} value={f.size}
                    placeholder="5.5m"
                    onChange={e => set('size', e.target.value)} />
                </div>
              </div>

              {/* ── Row 3: Price + Original + Stock + Sort ── */}
              <div style={S.row}>
                <div style={S.fg}>
                  <label style={S.label}>Selling Price (₹) *</label>
                  <input style={S.input} type="number" value={f.price} required min={0}
                    placeholder="2499"
                    onChange={e => set('price', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Original / MRP (for strikethrough)</label>
                  <input style={S.input} type="number" value={f.originalPrice} min={0}
                    placeholder="3000 (optional)"
                    onChange={e => set('originalPrice', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Stock Qty *</label>
                  <input style={S.input} type="number" value={f.stock} required min={0}
                    placeholder="10"
                    onChange={e => set('stock', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <label style={S.label}>Sort Order</label>
                  <input style={S.input} type="number" value={f.sortOrder}
                    onChange={e => set('sortOrder', e.target.value)} />
                  <span style={S.fieldHint}>Lower = appears first. 0 is default.</span>
                </div>
              </div>

              {/* ── Row 4: Weight + Tags ── */}
              <div style={S.row}>
                <div style={S.fg}>
                  <label style={S.label}>Weight</label>
                  <input style={S.input} value={f.weight}
                    placeholder="400g"
                    onChange={e => set('weight', e.target.value)} />
                </div>
                <div style={{...S.fg, flex:2}}>
                  <label style={S.label}>Tags (comma-separated)</label>
                  <input style={S.input} value={f.tags}
                    placeholder="bridal, festive, daily-wear, office"
                    onChange={e => set('tags', e.target.value)} />
                </div>
              </div>

              {/* ── Checkboxes ── */}
              <div style={S.checkRow}>
                {[
                  ['blouseIncluded', 'Blouse Included'],
                  ['isFeatured',     'Show on Home Page (Featured)'],
                  ['isActive',       'Active — visible in shop'],
                ].map(([key, lbl]) => (
                  <label key={key} style={S.checkLabel}>
                    <input type="checkbox" checked={f[key]}
                      onChange={e => set(key, e.target.checked)}
                      style={{ marginRight:6 }} />
                    {lbl}
                  </label>
                ))}
              </div>

              {/* ── IMAGE UPLOAD ── */}
              <div style={S.uploadSection}>
                <div style={S.uploadTitle}>📸 Product Images</div>
                <span style={S.fieldHint}>
                  Select up to 15 photos. First image = thumbnail shown in shop.
                  JPG, PNG or WebP. Compress to &lt;300KB each for fast loading.
                </span>
                <button type="button" style={S.uploadBtn} onClick={() => imgRef.current.click()}>
                  Choose Images
                </button>
                <input ref={imgRef} type="file" accept="image/*" multiple style={{ display:'none' }}
                  onChange={e => setImgFiles(Array.from(e.target.files))} />

                {imgFiles.length > 0 && (
                  <div style={{ marginTop:8, fontSize:13, color:'#2E7D32' }}>
                    {imgFiles.length} file(s) selected: {imgFiles.map(f => f.name).join(', ')}
                  </div>
                )}

                {/* Existing images with delete button */}
                {editing?.imageUrls?.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:12, color:'#7A6247', marginBottom:6 }}>
                      Current images (click × to remove):
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {editing.imageUrls.map((url, i) => (
                        <div key={i} style={{ position:'relative' }}>
                          <img src={url} alt="" style={S.existThumb} />
                          <button
                            type="button"
                            style={S.removeImgBtn}
                            onClick={() => removeImage(editing, url)}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── VIDEO UPLOAD ── */}
              <div style={S.uploadSection}>
                <div style={S.uploadTitle}>🎬 Product Video</div>
                <span style={S.fieldHint}>
                  One MP4 video. Keep under 30 seconds for best results. Max 100MB.
                  Customers see a ▶ button on the product card.
                </span>
                <button type="button" style={S.uploadBtn} onClick={() => vidRef.current.click()}>
                  Choose Video
                </button>
                <input ref={vidRef} type="file" accept="video/mp4,video/mov,video/webm"
                  style={{ display:'none' }}
                  onChange={e => setVidFile(e.target.files[0])} />

                {vidFile && (
                  <div style={{ marginTop:8, fontSize:13, color:'#2E7D32' }}>
                    Selected: {vidFile.name} ({(vidFile.size / 1024 / 1024).toFixed(1)} MB)
                  </div>
                )}

                {editing?.videoUrl && (
                  <div style={{ marginTop:8, fontSize:12, color:'#7A6247' }}>
                    Current video:{' '}
                    <a href={editing.videoUrl} target="_blank" rel="noreferrer"
                      style={{ color:'#C9923A' }}>
                      View ↗
                    </a>
                    {' '}(upload a new file above to replace it)
                  </div>
                )}
              </div>

              {/* ── Submit ── */}
              <div style={S.formActions}>
                <button type="button" style={S.btnCancel}
                  onClick={() => setShowForm(false)} disabled={uploading}>
                  Cancel
                </button>
                <button type="submit" style={S.btnGold} disabled={uploading}>
                  {uploading
                    ? 'Saving & uploading…'
                    : editing ? 'Save Changes' : 'Create Saree'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.token);
    } catch (e) {
      setErr(e.message || 'Login failed');
    }
  }

  return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <div style={S.loginLogo}>🥻</div>
        <div style={{ fontSize:22, fontWeight:500, color:'#1A0F00', marginBottom:4 }}>City Girl</div>
        <div style={{ fontSize:13, color:'#7A6247', marginBottom:28, letterSpacing:'0.1em' }}>
          ADMIN PANEL
        </div>
        <form onSubmit={submit}>
          <input style={{...S.input, display:'block', width:'100%', marginBottom:12}}
            type="text" placeholder="Username" value={u}
            onChange={e => setU(e.target.value)} autoFocus required />
          <input style={{...S.input, display:'block', width:'100%', marginBottom:16}}
            type="password" placeholder="Password" value={p}
            onChange={e => setP(e.target.value)} required />
          {err && <div style={{ color:'#B03A2E', fontSize:13, marginBottom:12 }}>{err}</div>}
          <button style={{...S.btnGold, width:'100%', padding:'12px'}} type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

// ── STYLES (all inline so no extra CSS file needed) ───────────
const S = {
  wrap:      { minHeight:'100vh', background:'#F5F3EF', fontFamily:"'DM Sans', sans-serif" },
  topbar:    { background:'#1A0F00', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:58 },
  logo:      { color:'#F2DDB4', fontSize:15, fontWeight:500, letterSpacing:'0.06em' },
  tabs:      { display:'flex', gap:4 },
  tab:       { background:'none', border:'1px solid transparent', color:'#7A6247', padding:'7px 18px', borderRadius:4, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans', sans-serif" },
  tabActive: { background:'rgba(201,146,58,0.18)', borderColor:'#C9923A', color:'#C9923A' },
  logoutBtn: { background:'none', border:'1px solid #5A3E28', color:'#7A6247', padding:'6px 14px', borderRadius:4, cursor:'pointer', fontSize:12, fontFamily:"'DM Sans', sans-serif" },
  toast:     { position:'fixed', top:16, right:16, color:'#fff', padding:'12px 20px', borderRadius:6, fontSize:13, zIndex:9999, boxShadow:'0 4px 16px rgba(0,0,0,0.2)' },
  content:   { padding:'24px' },
  actionBar: { display:'flex', alignItems:'center', gap:16, marginBottom:20 },
  hint:      { fontSize:12, color:'#7A6247' },
  loading:   { color:'#7A6247', padding:40, textAlign:'center' },
  tableWrap: { background:'#fff', borderRadius:8, border:'1px solid #E8D9C0', overflowX:'auto' },
  table:     { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:        { textAlign:'left', padding:'11px 14px', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#7A6247', background:'#FBF5E9', borderBottom:'1px solid #E8D9C0' },
  td:        { padding:'11px 14px', borderBottom:'1px solid #F0E8D8', color:'#2D1F0A', verticalAlign:'middle' },
  rowDim:    { opacity:0.45 },
  code:      { fontFamily:'monospace', fontSize:11, background:'#F5F3EF', padding:'2px 6px', borderRadius:3, color:'#5A3E28' },
  microThumb:{ width:28, height:36, objectFit:'cover', borderRadius:3, marginLeft:8, verticalAlign:'middle', border:'1px solid #E8D9C0' },
  stockGreen:{ color:'#2E7D32', fontWeight:500 },
  stockAmber:{ color:'#854F0B', fontWeight:500 },
  stockRed:  { color:'#B03A2E', fontWeight:500 },
  btnXs:     { marginLeft:6, background:'none', border:'1px solid #E8D9C0', borderRadius:3, padding:'2px 8px', fontSize:11, cursor:'pointer', color:'#7A6247' },
  badgeFeatured: { background:'#FBF5E9', border:'1px solid #C9923A', color:'#C9923A', borderRadius:12, padding:'3px 10px', fontSize:11, cursor:'pointer' },
  badgeNone:     { background:'#F5F3EF', border:'1px solid #E8D9C0', color:'#7A6247', borderRadius:12, padding:'3px 10px', fontSize:11, cursor:'pointer' },
  badgeActive:   { background:'#EAF3DE', border:'none', color:'#3B6D11', borderRadius:12, padding:'4px 10px', fontSize:11, cursor:'pointer' },
  badgeHidden:   { background:'#F1EFE8', border:'none', color:'#7A6247', borderRadius:12, padding:'4px 10px', fontSize:11, cursor:'pointer' },
  btnEdit:   { background:'none', border:'1px solid #E8D9C0', borderRadius:3, padding:'4px 12px', fontSize:12, cursor:'pointer', color:'#2D1F0A', marginRight:4 },
  btnDel:    { background:'none', border:'1px solid #F7C1C1', borderRadius:3, padding:'4px 12px', fontSize:12, cursor:'pointer', color:'#B03A2E' },
  statusSelect: { border:'1px solid #E8D9C0', borderRadius:4, padding:'5px 8px', fontSize:12, background:'#fff', fontFamily:"'DM Sans', sans-serif", cursor:'pointer' },
  // modal
  modalBg:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px' },
  modal:     { background:'#fff', borderRadius:10, width:'100%', maxWidth:780, boxShadow:'0 24px 80px rgba(0,0,0,0.25)', marginTop:'auto', marginBottom:'auto' },
  modalHead: { background:'#1A0F00', borderRadius:'10px 10px 0 0', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  modalTitle:{ color:'#F2DDB4', fontSize:16, fontWeight:500, margin:0 },
  closeBtn:  { background:'none', border:'none', color:'#7A6247', fontSize:22, cursor:'pointer', lineHeight:1 },
  form:      { padding:24 },
  row:       { display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' },
  fg:        { flex:1, minWidth:140, display:'flex', flexDirection:'column' },
  label:     { fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#7A6247', fontWeight:500, marginBottom:5 },
  input:     { padding:'10px 12px', border:'1px solid #E8D9C0', borderRadius:4, fontFamily:"'DM Sans', sans-serif", fontSize:13, color:'#2D1F0A', background:'#FEFCF8', outline:'none', boxSizing:'border-box', width:'100%' },
  fieldHint: { fontSize:11, color:'#AAA', marginTop:4 },
  checkRow:  { display:'flex', gap:20, flexWrap:'wrap', marginBottom:20 },
  checkLabel:{ fontSize:13, color:'#2D1F0A', display:'flex', alignItems:'center', cursor:'pointer' },
  uploadSection: { background:'#FBF5E9', border:'1px solid #E8D9C0', borderRadius:6, padding:16, marginBottom:16 },
  uploadTitle:   { fontSize:13, fontWeight:500, color:'#1A0F00', marginBottom:4 },
  uploadBtn:     { marginTop:10, background:'#1A0F00', color:'#F2DDB4', border:'none', borderRadius:4, padding:'8px 20px', fontSize:12, cursor:'pointer', letterSpacing:'0.06em' },
  existThumb:    { width:70, height:90, objectFit:'cover', borderRadius:4, display:'block' },
  removeImgBtn:  { position:'absolute', top:-6, right:-6, background:'#B03A2E', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 },
  formActions:   { display:'flex', justifyContent:'flex-end', gap:12, marginTop:8 },
  btnGold:   { background:'#C9923A', color:'#1A0F00', border:'none', borderRadius:4, padding:'10px 28px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", letterSpacing:'0.06em' },
  btnCancel: { background:'none', border:'1px solid #E8D9C0', borderRadius:4, padding:'10px 20px', fontSize:13, cursor:'pointer', color:'#7A6247', fontFamily:"'DM Sans', sans-serif" },
  // login
  loginWrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F5F3EF' },
  loginBox:  { background:'#fff', border:'1px solid #E8D9C0', borderRadius:10, padding:'48px 40px', width:340, textAlign:'center', boxShadow:'0 8px 32px rgba(26,15,0,0.08)' },
  loginLogo: { fontSize:48, marginBottom:8 },
};
