let followersSet = null;   // Set of usernames, current
let followingSet = null;   // Set of usernames, current
let prevFollowersSet = null; // from loaded snapshot, or null

const eyebrowMessages = [
  'Analyzing who\'s scared of commitment',
  'Loading receipts',
  'Compiling your list of enemies',
  'Hey Nimbus, slime them',
  'Knew you since Grade 9 but ok',
];
 
function buildEyebrowMarquee(){
  const track = document.getElementById('eyebrow-track');
  if (!track) return;

  const sep = '<span class="eyebrow-sep">&middot;</span>';
  const itemsHtml = eyebrowMessages
    .map(m => '<span class="eyebrow-item">' + m + '</span>')
    .join(sep);

  // The track is built from two identical copies placed back to back.
  // The CSS animation scrolls exactly 50% of the track's width, so by the
  // time copy #1 has scrolled fully out of view, copy #2 is sitting exactly
  // where copy #1 started — the loop point is invisible.
  track.innerHTML = itemsHtml + sep + itemsHtml + sep;
}

buildEyebrowMarquee();

// ---- Floating stars beside the .wrap content ----
const STAR_COUNT_PER_SIDE = 6;
const STAR_CHASE_RADIUS = 140;   // px — how close the mouse has to get before a star reacts
const STAR_CHASE_STRENGTH = 60;  // px — how far a star can be pushed at maximum
const STAR_MIN_GUTTER = 40;      // px — hide stars if there's not this much clear space beside .wrap

let starEls = [];

// Measures the open space to the left and right of .wrap, in viewport
// coordinates. Stars are scattered anywhere within these ranges rather than
// pinned near the outer edge of the screen.
function getGutters(){
  const wrap = document.querySelector('.wrap');
  if (!wrap) return null;
  const r = wrap.getBoundingClientRect();
  const vw = window.innerWidth;
  const edgeMargin = 6; // keep stars a few px clear of the literal screen edge

  return {
    left:  { min: edgeMargin, max: r.left - edgeMargin, width: r.left - edgeMargin * 2 },
    right: { min: r.right + edgeMargin, max: vw - edgeMargin, width: vw - r.right - edgeMargin * 2 }
  };
}

function buildStarsField(){
  const field = document.getElementById('stars-field');
  if (!field) return;

  ['left', 'right'].forEach(side => {
    for (let i = 0; i < STAR_COUNT_PER_SIDE; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.dataset.side = side;

      // A random vertical position, plus a random fraction (0–1) representing
      // where across the gutter's width the star sits. Storing the fraction
      // (rather than a fixed px value) means layoutStars() can re-place every
      // star correctly whenever the gutter width changes on resize.
      star.dataset.topPct = (6 + Math.random() * 88).toFixed(2);
      star.dataset.gutterFrac = Math.random().toFixed(3);

      const shape = document.createElement('span');
      shape.className = 'star-shape';
      shape.textContent = Math.random() > 0.5 ? '✦' : '✧';
      shape.style.fontSize = (10 + Math.random() * 10).toFixed(0) + 'px';

      // Stagger each star's bob/blink so they never move in sync
      const bobDuration = (4.5 + Math.random() * 3).toFixed(2) + 's';
      const blinkDuration = (5 + Math.random() * 3).toFixed(2) + 's';
      shape.style.animationDuration = bobDuration + ', ' + blinkDuration;
      shape.style.animationDelay = (Math.random() * 4).toFixed(2) + 's, ' + (Math.random() * 4).toFixed(2) + 's';

      star.appendChild(shape);
      field.appendChild(star);
    }
  });

  starEls = Array.from(field.querySelectorAll('.star'));
}

// Places every star at an actual pixel position, derived from its stored
// side + fraction and the current gutter measurements. Also hides the whole
// field if the gutter has gotten too narrow to hold stars without them
// overlapping real content.
function layoutStars(){
  const field = document.getElementById('stars-field');
  const gutters = getGutters();
  if (!field || !gutters) return;

  const minWidth = Math.min(gutters.left.width, gutters.right.width);
  const tooNarrow = minWidth < STAR_MIN_GUTTER;
  field.style.display = tooNarrow ? 'none' : '';
  if (tooNarrow) return;

  starEls.forEach(star => {
    const g = gutters[star.dataset.side];
    const frac = parseFloat(star.dataset.gutterFrac);
    star.style.left = (g.min + frac * (g.max - g.min)) + 'px';
    star.style.top = star.dataset.topPct + '%';
  });
}

function recalcStarBases(){
  layoutStars();
  // Reads each star's resting position with no chase-offset applied, so the
  // chase math always has a stable "home" point to measure distance from and
  // spring back to.
  starEls.forEach(star => {
    star.style.transform = 'translate(0px, 0px)';
    const r = star.getBoundingClientRect();
    star.dataset.bx = r.left + r.width / 2;
    star.dataset.by = r.top + r.height / 2;
  });
}

function handleStarChase(e){
  const mx = e.clientX, my = e.clientY;
  starEls.forEach(star => {
    const bx = parseFloat(star.dataset.bx);
    const by = parseFloat(star.dataset.by);
    const dx = bx - mx;
    const dy = by - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < STAR_CHASE_RADIUS && dist > 0.01) {
      const strength = 1 - dist / STAR_CHASE_RADIUS; // closer = stronger push
      const push = strength * STAR_CHASE_STRENGTH;
      const ux = dx / dist, uy = dy / dist; // unit vector pointing away from the cursor
      star.style.transform = 'translate(' + (ux * push).toFixed(1) + 'px, ' + (uy * push).toFixed(1) + 'px)';
    } else {
      star.style.transform = 'translate(0px, 0px)';
    }
  });
}

function initStars(){
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  buildStarsField();
  layoutStars();
  if (reduceMotion) return; // leave them static, no idle motion or chase

  recalcStarBases();
  window.addEventListener('resize', recalcStarBases);
  window.addEventListener('mousemove', handleStarChase);
}

initStars();

function usernameFromHref(href){
  // Pulls the last path segment off an instagram.com URL, e.g.
  // https://www.instagram.com/_u/__kennywu__  ->  __kennywu__
  // https://www.instagram.com/amamomeletteya  ->  amamomeletteya
  if (!href) return null;
  try {
    const parts = new URL(href).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch (e) {
    return null;
  }
}

function extractUsernames(json){
  // Instagram export formats vary by version AND by file (followers vs following
  // don't even share the same shape as each other). Handle the shapes seen in practice:
  // 1. Bare array of entries              -> followers_1.json
  // 2. { "relationships_following": [...] } (or similarly-named key) -> following.json
  // 3. Username location varies per entry:
  //    - followers_1.json:  entry.string_list_data[0].value  (has "value")
  //    - following.json:    entry.title  (string_list_data items only have href/timestamp, no "value")
  //    - fallback:           parsed from entry.string_list_data[0].href
  let arr = null;
  if (Array.isArray(json)) {
    arr = json;
  } else if (json && typeof json === 'object') {
    const key = Object.keys(json).find(k => Array.isArray(json[k]));
    if (key) arr = json[key];
  }
  if (!arr) throw new Error('Unrecognized export format');

  const names = new Set();
  for (const entry of arr) {
    if (!entry) continue;

    if (Array.isArray(entry.string_list_data) && entry.string_list_data.length) {
      for (const s of entry.string_list_data) {
        const uname = (s && s.value) || entry.title || usernameFromHref(s && s.href);
        if (uname) names.add(String(uname).toLowerCase());
      }
    } else if (entry.value) {
      names.add(String(entry.value).toLowerCase());
    } else if (entry.title) {
      names.add(String(entry.title).toLowerCase());
    } else if (typeof entry === 'string') {
      names.add(entry.toLowerCase());
    }
  }
  if (names.size === 0) throw new Error('No usernames found in file');
  return names;
}

function setDropFilled(id, label){
  const el = document.getElementById(id);
  el.classList.add('filled');
  document.getElementById(id + '-text').textContent = label;
}

function setStatus(msg, isErr){
  const s = document.getElementById('status');
  s.textContent = msg || '';
  s.classList.toggle('err', !!isErr);
}

function wireDrop(dropId, fileId, onLoaded){
  const drop = document.getElementById(dropId);
  const input = document.getElementById(fileId);

  function handleFile(file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        onLoaded(json, file.name);
      } catch (err) {
        setStatus('Could not parse ' + file.name + ': ' + err.message, true);
      }
    };
    reader.readAsText(file);
  }

  input.addEventListener('change', () => handleFile(input.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = '#454C54'; });
  drop.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  });
}

function checkReady(){
  document.getElementById('btn-compare').disabled = !(followersSet && followingSet);
  document.getElementById('btn-save').disabled = !(followersSet && followingSet);
}

wireDrop('drop-followers', 'file-followers', (json, name) => {
  try {
    followersSet = extractUsernames(json);
    setDropFilled('drop-followers', name + ' — ' + followersSet.size + ' followers loaded');
    document.getElementById('lbl-followers').textContent = followersSet.size;
    setStatus('');
  } catch (err) { setStatus('followers file: ' + err.message, true); }
  checkReady();
});

wireDrop('drop-following', 'file-following', (json, name) => {
  try {
    followingSet = extractUsernames(json);
    setDropFilled('drop-following', name + ' — ' + followingSet.size + ' accounts loaded');
    document.getElementById('lbl-following').textContent = followingSet.size;
    setStatus('');
  } catch (err) { setStatus('following file: ' + err.message, true); }
  checkReady();
});

wireDrop('drop-snapshot', 'file-snapshot', (json, name) => {
  try {
    if (!json.followers || !Array.isArray(json.followers)) throw new Error('not a ledger snapshot file');
    prevFollowersSet = new Set(json.followers.map(u => u.toLowerCase()));
    setDropFilled('drop-snapshot', name + ' — snapshot from ' + (json.savedAt || 'unknown date'));
    document.getElementById('lbl-snapshot').textContent = prevFollowersSet.size;
    setStatus('');
  } catch (err) { setStatus('snapshot file: ' + err.message, true); }
});

let showAvatars = false;
let lastOneway = null, lastLost = null, lastGained = null;

function makeAvatarEl(username){
  const wrap = document.createElement('span');
  wrap.className = 'avatar';

  const fallback = document.createElement('span');
  fallback.className = 'avatar-fallback';
  fallback.textContent = username.charAt(0).toUpperCase();
  wrap.appendChild(fallback);

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.src = 'https://unavatar.io/instagram/' + encodeURIComponent(username);
  img.onerror = () => { img.remove(); }; // leave the fallback letter showing
  img.onload = () => { fallback.remove(); };
  wrap.appendChild(img);

  return wrap;
}

function renderList(containerId, items, emptyMsg){
  const el = document.getElementById(containerId);
  if (items.length === 0) {
    el.innerHTML = '<div class="empty">' + emptyMsg + '</div>';
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'list';
  items.sort().forEach(u => {
    const li = document.createElement('li');
    if (showAvatars) li.appendChild(makeAvatarEl(u));
    const a = document.createElement('a');
    a.href = 'https://instagram.com/' + u;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = '@' + u;
    li.appendChild(a);
    ul.appendChild(li);
  });
  el.innerHTML = '';
  el.appendChild(ul);
}

function renderAll(){
  if (!lastOneway) return; // nothing computed yet

  document.getElementById('count-lost').textContent = prevFollowersSet ? lastLost.length : 'no previous snapshot loaded';
  renderList('list-lost', lastLost, prevFollowersSet ? 'No one unfollowed you since your last snapshot.' : 'Load a previous snapshot (Step 3) to see this.');

  document.getElementById('count-oneway').textContent = lastOneway.length;
  renderList('list-oneway', lastOneway, 'Everyone you follow, follows you back.');

  document.getElementById('count-gained').textContent = prevFollowersSet ? lastGained.length : 'no previous snapshot loaded';
  renderList('list-gained', lastGained, prevFollowersSet ? 'No new followers since your last snapshot.' : 'Load a previous snapshot (Step 3) to see this.');
}

document.getElementById('chk-avatars').addEventListener('change', (e) => {
  showAvatars = e.target.checked;
  renderAll();
});

document.getElementById('btn-compare').addEventListener('click', () => {
  if (!followersSet || !followingSet) return;

  lastOneway = [...followingSet].filter(u => !followersSet.has(u));

  lastLost = [];
  lastGained = [];
  if (prevFollowersSet) {
    lastLost = [...prevFollowersSet].filter(u => !followersSet.has(u));
    lastGained = [...followersSet].filter(u => !prevFollowersSet.has(u));
  }

  document.getElementById('results').style.display = 'block';
  renderAll();
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
});

document.getElementById('btn-save').addEventListener('click', () => {
  if (!followersSet) return;
  const snapshot = {
    savedAt: new Date().toISOString().slice(0,10),
    followers: [...followersSet]
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ledger-snapshot-' + snapshot.savedAt + '.json';
  a.click();
  URL.revokeObjectURL(url);
  setStatus('Snapshot saved. Keep this file — load it into Step 3 next time you check.');
});
