import React, { useState, useEffect, useRef } from 'react';

const ADMIN_PASS = 'axelfox2024';

const DEFAULT_DATA = {
  links: {
    discord: { handle: '_axeltan', url: 'https://discord.gg/mDkd5TjB28' },
    facebook: { handle: 'AxelFurrylover', url: 'https://www.facebook.com/AxelFurrylover' },
    tiktok: { handle: '@presidentjackies', url: 'https://www.tiktok.com/@presidentjackies' },
    roblox: { handle: 'profile / 1108341430', url: 'https://www.roblox.com/users/1108341430/profile' },
    instagram: { handle: '@axel_tanyz', url: 'https://www.instagram.com/axel_tanyz/?hl=en' },
  },
  aboutTxt: `Cybersecurity student who also happens to be a blue fox.
I love hacking (the legal kind), drawing, and spending way too much time on Roblox.
Malaysian \u{1F1F2}\u{1F1FE} \u00b7 Aquarius \u2652 \u00b7 186cm \u00b7 Foundation in Computing Student.
Always down to talk tech, games, or furry stuff \u2014 just add me on Discord!`,
  yapTxt: `Okay so real talk \u2014 I got into cybersecurity because I thought hacking was cool (it still is).
Now I'm actually studying it and it turns out there's a LOT of math involved. Worth it though.

Outside of that I draw my fursona too much, play tactical shooters with questionable aim,
and I'm convinced Minesweeper is a skill issue and not luck.

If you're reading this, hi. You found the yap section. Congrats.`,
  nameCards: [
    { label: 'english', value: 'Axel Tan' },
    { label: 'chinese', value: '\u72D0\u72F8\u54E5' },
    { label: 'fursona', value: 'Fox' },
  ],
  profileImg: null,
  homeProfileImg: null,
  aboutProfileImg: null,
  bgImg: null,
};

function useStored(key, fallback) {
  const [val, setVal] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await window.storage.get(key, true);
        if (mounted && r && r.value) setVal(JSON.parse(r.value));
      } catch (e) {}
      if (mounted) setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [key]);
  const save = async (newVal) => {
    setVal(newVal);
    try { await window.storage.set(key, JSON.stringify(newVal), true); } catch (e) {}
  };
  return [val, save, loaded];
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ICONS = {
  discord: <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.916 19.916 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.893a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
  facebook: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94z"/></svg>,
  tiktok: <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>,
  roblox: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M4.678 22.003 2 4.445l17.322-2.448L22 19.555 4.678 22.003zm6.114-9.187 1.93-.273-.275-1.932-1.931.273.276 1.932zm2.8-1.95 1.93-.274-.275-1.932-1.93.273.275 1.932z"/></svg>,
  instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6.406-.617a1.44 1.44 0 1 0-2.88 0 1.44 1.44 0 0 0 2.88 0z"/></svg>,
};

const CIRCLE_BG = {
  discord: '#5865F2',
  facebook: '#1877F2',
  tiktok: '#000000',
  roblox: '#e53935',
  instagram: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
};

const PLATFORM_LABEL = {
  discord: 'discord', facebook: 'facebook', tiktok: 'tiktok', roblox: 'roblox', instagram: 'instagram',
};

export default function AxelTanSite() {
  const [page, setPage] = useState('home');
  const [data, saveData, dataLoaded] = useStored('axel-site-data', DEFAULT_DATA);
  const [gallery, saveGallery, galLoaded] = useStored('axel-gallery', { fursuit: [], art: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [linkDraft, setLinkDraft] = useState({ handle: '', url: '' });
  const [openFolder, setOpenFolder] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const homeProfileInputRef = useRef(null);
  const aboutProfileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!dataLoaded || !galLoaded) {
    return (
      <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4dc8d0', fontFamily: 'monospace' }}>
        loading...
      </div>
    );
  }

  const wrap = {
    fontFamily: "'Inter', sans-serif",
    background: '#0a0c10',
    color: '#dde6f0',
    minHeight: '600px',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  };

  const mono = { fontFamily: "'Share Tech Mono', monospace" };
  const cyan = '#4dc8d0';
  const cyanDim = '#2a8a90';
  const cyanGlow = 'rgba(77,200,208,0.10)';
  const muted = '#5a6580';
  const border = '#1e2438';
  const surface = '#111318';
  const surface2 = '#181c26';

  function doLogin() {
    if (pwInput === ADMIN_PASS) {
      setIsAdmin(true);
      setShowLogin(false);
      setPwInput('');
      setPwErr(false);
    } else {
      setPwErr(true);
      setPwInput('');
    }
  }

  async function handleProfileUpload(e, field) {
    const file = e.target.files[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    await saveData({ ...data, [field]: url });
  }

  async function handleBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    await saveData({ ...data, bgImg: url });
  }

  async function handleGalleryUpload(e, folder) {
    const files = Array.from(e.target.files);
    const newImgs = await Promise.all(files.map(fileToDataUrl));
    const updated = { ...gallery, [folder]: [...gallery[folder], ...newImgs] };
    await saveGallery(updated);
    e.target.value = '';
  }

  async function deleteGalleryImg(folder, idx) {
    const updated = { ...gallery, [folder]: gallery[folder].filter((_, i) => i !== idx) };
    await saveGallery(updated);
  }

  function startEdit(field, current) {
    setEditingField(field);
    setDraftText(current);
  }

  async function saveFieldEdit() {
    await saveData({ ...data, [editingField]: draftText });
    setEditingField(null);
  }

  async function saveNameCard(idx, value) {
    const cards = [...data.nameCards];
    cards[idx] = { ...cards[idx], value };
    await saveData({ ...data, nameCards: cards });
  }

  function openLinkEditor(key) {
    setEditingLink(key);
    setLinkDraft({ handle: data.links[key].handle, url: data.links[key].url });
  }

  async function saveLinkEdit() {
    const links = { ...data.links, [editingLink]: linkDraft };
    await saveData({ ...data, links });
    setEditingLink(null);
  }

  const navBtn = (id, label) => (
    <button
      onClick={() => setPage(id)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        ...mono, fontSize: 12, letterSpacing: '0.06em', padding: '0 1.1rem',
        height: 50, borderBottom: page === id ? `2px solid ${cyan}` : '2px solid transparent',
        color: page === id ? cyan : muted,
      }}
    >{label}</button>
  );

  const editBtn = (onClick, label = 'edit') => isAdmin && (
    <button onClick={onClick} style={{
      ...mono, fontSize: 11, padding: '4px 12px', background: 'none',
      border: `1px solid ${border}`, borderRadius: 4, color: muted, cursor: 'pointer',
      letterSpacing: '0.05em',
    }}>{label}</button>
  );

  return (
    <div style={wrap}>
      {/* NAV */}
      <nav style={{
        height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', borderBottom: `1px solid ${border}`, background: 'rgba(10,12,16,0.9)',
      }}>
        <div style={{ ...mono, fontSize: 12, color: cyan }}>axeltan.exe</div>
        <div style={{ display: 'flex' }}>
          {navBtn('home', 'home')}
          {navBtn('about', 'about')}
          {navBtn('gallery', 'gallery')}
        </div>
        <button
          onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
          style={{
            ...mono, fontSize: 11, padding: '5px 12px', background: isAdmin ? cyanGlow : 'none',
            border: `1px solid ${isAdmin ? cyan : border}`, borderRadius: 4,
            color: isAdmin ? cyan : muted, cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >{isAdmin ? 'logout' : 'admin'}</button>
      </nav>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(10,12,16,0.9)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '2rem', width: 280 }}>
            <h3 style={{ ...mono, fontSize: 14, color: cyan, marginBottom: '1rem' }}>// admin access</h3>
            {pwErr && <p style={{ ...mono, fontSize: 11, color: '#e05555', marginBottom: 8 }}>wrong password</p>}
            <input
              type="password" value={pwInput} placeholder="enter password"
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', background: surface2, border: `1px solid ${border}`,
                borderRadius: 6, color: '#dde6f0', ...mono, fontSize: 14, marginBottom: 10, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowLogin(false); setPwInput(''); setPwErr(false); }} style={{
                flex: 1, padding: 9, borderRadius: 6, ...mono, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${border}`, background: 'none', color: muted,
              }}>cancel</button>
              <button onClick={doLogin} style={{
                flex: 1, padding: 9, borderRadius: 6, ...mono, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${cyan}`, background: cyan, color: '#0a0c10', fontWeight: 600,
              }}>enter</button>
            </div>
          </div>
        </div>
      )}

      {/* LINK EDIT MODAL */}
      {editingLink && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(10,12,16,0.9)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '2rem', width: 300 }}>
            <h3 style={{ ...mono, fontSize: 14, color: cyan, marginBottom: '1rem' }}>// edit {editingLink}</h3>
            <input
              type="text" value={linkDraft.handle} placeholder="display text"
              onChange={e => setLinkDraft({ ...linkDraft, handle: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', background: surface2, border: `1px solid ${border}`, borderRadius: 6, color: '#dde6f0', ...mono, fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            />
            <input
              type="text" value={linkDraft.url} placeholder="https://..."
              onChange={e => setLinkDraft({ ...linkDraft, url: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', background: surface2, border: `1px solid ${border}`, borderRadius: 6, color: '#dde6f0', ...mono, fontSize: 13, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditingLink(null)} style={{ flex: 1, padding: 9, borderRadius: 6, ...mono, fontSize: 12, cursor: 'pointer', border: `1px solid ${border}`, background: 'none', color: muted }}>cancel</button>
              <button onClick={saveLinkEdit} style={{ flex: 1, padding: 9, borderRadius: 6, ...mono, fontSize: 12, cursor: 'pointer', border: `1px solid ${cyan}`, background: cyan, color: '#0a0c10', fontWeight: 600 }}>save</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{
          position: 'absolute', inset: 0, background: 'rgba(10,12,16,0.96)', zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <img src={lightboxImg} alt="" style={{ maxWidth: '90%', maxHeight: '85%', borderRadius: 8, objectFit: 'contain' }} />
        </div>
      )}

      {/* HOME PAGE */}
      {page === 'home' && (
        <div style={{ position: 'relative', minHeight: 560, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {data.bgImg && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${data.bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.85,
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,12,16,0.15) 0%, rgba(10,12,16,0.55) 55%, rgba(10,12,16,0.97) 100%)',
          }} />
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4rem 1.5rem 3rem', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', border: `2.5px solid ${cyan}`,
                background: surface2, overflow: 'hidden', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44,
              }}>
                {data.homeProfileImg ? <img src={data.homeProfileImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '\uD83E\uDD8A'}
              </div>
              {isAdmin && (
                <button onClick={() => homeProfileInputRef.current.click()} style={{
                  position: 'absolute', bottom: 14, right: -6, width: 26, height: 26, borderRadius: '50%',
                  background: cyan, border: 'none', color: '#0a0c10', cursor: 'pointer', fontSize: 12,
                }}>+</button>
              )}
              <input ref={homeProfileInputRef} type="file" accept="image/*" onChange={e => handleProfileUpload(e, 'homeProfileImg')} style={{ display: 'none' }} />
            </div>

            <h1 style={{ fontSize: 'clamp(2rem,8vw,2.8rem)', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Axel Tan</h1>
            <div style={{ ...mono, fontSize: '0.95rem', color: cyan, margin: '0.3rem 0 0.8rem', letterSpacing: '0.1em' }}>{data.nameCards[1]?.value}</div>
            <p style={{ fontSize: 14, color: 'rgba(221,230,240,0.7)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Cybersecurity student &middot; Blue Fox Fursona &middot; He/Him<br />
              From Malaysia 🇲🇾 &middot; Aquarius ♒
            </p>

            {isAdmin && (
              <button onClick={() => bgInputRef.current.click()} style={{
                ...mono, fontSize: 11, padding: '5px 14px', marginBottom: '1.25rem', background: cyanGlow,
                border: `1px solid ${cyanDim}`, borderRadius: 6, color: cyan, cursor: 'pointer',
              }}>change background</button>
            )}
            <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: 360 }}>
              {Object.entries(data.links).map(([key, link]) => (
                <div key={key} style={{ position: 'relative' }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px',
                    background: 'rgba(17,19,24,0.82)', border: `1px solid ${border}`, borderRadius: 50,
                    textDecoration: 'none', color: '#dde6f0',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, background: CIRCLE_BG[key],
                    }}>{ICONS[key]}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.06em' }}>{PLATFORM_LABEL[key]}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{link.handle}</div>
                    </div>
                  </a>
                  {isAdmin && (
                    <button onClick={() => openLinkEditor(key)} style={{
                      position: 'absolute', top: '50%', right: -32, transform: 'translateY(-50%)',
                      width: 24, height: 24, borderRadius: '50%', background: surface2, border: `1px solid ${border}`,
                      color: muted, cursor: 'pointer', fontSize: 11,
                    }}>✎</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABOUT PAGE */}
      {page === 'about' && (
        <div style={{ padding: '2rem 1.5rem 3rem', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%', border: `2px solid ${cyan}`, background: surface2,
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0,
              }}>
                {data.aboutProfileImg ? <img src={data.aboutProfileImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '\uD83E\uDD8A'}
              </div>
              {isAdmin && (
                <button onClick={() => aboutProfileInputRef.current.click()} style={{
                  position: 'absolute', bottom: -2, right: -4, width: 22, height: 22, borderRadius: '50%',
                  background: cyan, border: 'none', color: '#0a0c10', cursor: 'pointer', fontSize: 11,
                }}>+</button>
              )}
              <input ref={aboutProfileInputRef} type="file" accept="image/*" onChange={e => handleProfileUpload(e, 'aboutProfileImg')} style={{ display: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 'clamp(1.4rem,4vw,1.9rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>Axel Tan</div>
              <div style={{ ...mono, fontSize: 12, color: cyan, marginTop: 4, letterSpacing: '0.06em' }}>he/him &middot; blue fox &middot; 🇲🇾 malaysia</div>
            </div>
          </div>

          {/* Name cards */}
          <div style={{ ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: cyan, marginBottom: '0.75rem' }}>// identity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.75rem' }}>
            {data.nameCards.map((card, i) => (
              <div key={i} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '0.9rem 0.6rem', textAlign: 'center' }}>
                <div style={{ ...mono, fontSize: 9, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>{card.label}</div>
                {editingField === `card-${i}` ? (
                  <input
                    value={draftText} autoFocus
                    onChange={e => setDraftText(e.target.value)}
                    onBlur={async () => { await saveNameCard(i, draftText); setEditingField(null); }}
                    onKeyDown={async e => { if (e.key === 'Enter') { await saveNameCard(i, draftText); setEditingField(null); } }}
                    style={{ width: '100%', background: surface2, border: `1px solid ${cyanDim}`, borderRadius: 4, color: cyan, fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <div onClick={() => isAdmin && startEdit(`card-${i}`, card.value)} style={{ fontSize: 14, fontWeight: 600, color: cyan, cursor: isAdmin ? 'pointer' : 'default' }}>{card.value}</div>
                )}
              </div>
            ))}
          </div>
          <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '1.5rem 0' }} />

          {/* About.txt */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: cyan }}>// about.txt</div>
            {editingField === 'aboutTxt'
              ? editBtn(saveFieldEdit, 'save')
              : editBtn(() => startEdit('aboutTxt', data.aboutTxt))}
          </div>
          {editingField === 'aboutTxt' ? (
            <textarea
              value={draftText} onChange={e => setDraftText(e.target.value)} autoFocus
              style={{
                width: '100%', minHeight: 120, background: surface, border: `1px solid ${cyanDim}`, borderRadius: 10,
                padding: '1.1rem 1.3rem', color: '#dde6f0', fontSize: 14, lineHeight: 1.7, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '1.1rem 1.3rem', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {data.aboutTxt}
            </div>
          )}
          <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '1.5rem 0' }} />

          {/* Currently playing */}
          <div style={{ ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: cyan, marginBottom: '0.75rem' }}>// currently playing</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: '1.75rem' }}>
            {[['Violence District', 'Roblox'], ['Operation One', 'Roblox'], ['Rainbow Six Siege', 'Tactical FPS'], ['Ready or Not', 'Tactical FPS']].map(([n, t]) => (
              <div key={n} style={{ background: surface2, border: `1px solid ${border}`, borderRadius: 8, padding: '0.85rem 0.9rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
                <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2 }}>{t}</div>
              </div>
            ))}
          </div>
          <hr style={{ border: 'none', borderTop: `1px solid ${border}`, margin: '1.5rem 0' }} />

          {/* Yap */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: cyan }}>// yapping.exe</div>
            {editingField === 'yapTxt'
              ? editBtn(saveFieldEdit, 'save')
              : editBtn(() => startEdit('yapTxt', data.yapTxt))}
          </div>
          {editingField === 'yapTxt' ? (
            <textarea
              value={draftText} onChange={e => setDraftText(e.target.value)} autoFocus
              style={{
                width: '100%', minHeight: 140, background: surface, border: `1px solid ${cyanDim}`, borderRadius: 10,
                padding: '1.1rem 1.3rem', color: 'rgba(221,230,240,0.85)', fontSize: 14, lineHeight: 1.8, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '1.1rem 1.3rem', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'rgba(221,230,240,0.85)' }}>
              {data.yapTxt}
            </div>
          )}
        </div>
      )}

      {/* GALLERY PAGE */}
      {page === 'gallery' && (
        <div style={{ padding: '2rem 1.5rem 3rem', maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem,6vw,2.6rem)', fontWeight: 900, color: '#fff', textAlign: 'center', margin: '1rem 0 1.5rem', letterSpacing: '-0.02em' }}>
            Axel <span style={{ color: cyan }}>Gallery</span>
          </h1>

          {isAdmin && (
            <div style={{
              background: cyanGlow, border: `1px solid ${cyanDim}`, borderRadius: 8, padding: '9px 14px',
              ...mono, fontSize: 11, color: cyan, marginBottom: '1.25rem', textAlign: 'center',
            }}>✦ admin mode — you can add or remove images</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: '1.75rem' }}>
            {['fursuit', 'art'].map(f => (
              <button key={f} onClick={() => setOpenFolder(openFolder === f ? null : f)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0.85rem 1.5rem', minWidth: 130,
                background: openFolder === f ? cyanGlow : surface, border: `1px solid ${openFolder === f ? cyan : border}`,
                borderRadius: 10, cursor: 'pointer', color: openFolder === f ? cyan : muted, ...mono, fontSize: 12,
                letterSpacing: '0.05em', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 18 }}>📁</span> {f === 'fursuit' ? 'fursuit' : 'my art'}
              </button>
            ))}
          </div>

          {openFolder && (
            <div>
              <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                📁 {openFolder === 'fursuit' ? 'fursuit photos' : 'my art'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {isAdmin && (
                  <div onClick={() => galleryInputRef.current.click()} style={{
                    aspectRatio: '1', borderRadius: 8, border: `1px dashed ${border}`, background: surface,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
                    cursor: 'pointer', color: muted, ...mono, fontSize: 10,
                  }}>
                    <div style={{ fontSize: 20 }}>+</div>
                    <div>add image</div>
                  </div>
                )}
                <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={e => handleGalleryUpload(e, openFolder)} style={{ display: 'none' }} />

                {gallery[openFolder].map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, cursor: 'pointer' }}>
                    <img src={url} alt="" onClick={() => setLightboxImg(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {isAdmin && (
                      <button onClick={() => deleteGalleryImg(openFolder, i)} style={{
                        position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(10,12,16,0.85)', border: `1px solid ${border}`, color: '#e05555',
                        cursor: 'pointer', fontSize: 11, lineHeight: 1,
                      }}>✕</button>
                    )}
                  </div>
                ))}

                {gallery[openFolder].length === 0 && (
                  <div style={{
                    gridColumn: '1/-1', textAlign: 'center', padding: '2.5rem 1rem', ...mono, fontSize: 12,
                    color: muted, border: `1px dashed ${border}`, borderRadius: 10,
                  }}>no images yet{isAdmin ? ' — add some above!' : ''}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
