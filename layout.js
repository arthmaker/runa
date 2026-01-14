/* global interact */
// Simple draggable + resizable layout manager (client-side only)
// - Toggle edit mode
// - Save layout to localStorage (percent-based, responsive)
// - Reset layout (clear storage)

(function(){
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function getKey(k){
    return String(k || 'runa_layout_default');
  }

  function q(sel, root=document){
    return root.querySelector(sel);
  }
  function qa(sel, root=document){
    return Array.from(root.querySelectorAll(sel));
  }

  function ensurePanelIds(panels){
    panels.forEach((p, idx)=>{
      if(!p.dataset.panelId){
        // stable-ish id: use heading text if exists, else index
        const h2 = p.querySelector('h2');
        const base = (h2?.textContent || `panel-${idx+1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g,'-')
          .replace(/^-+|-+$/g,'');
        p.dataset.panelId = base || `panel-${idx+1}`;
      }
    });
  }

  function readLayout(storageKey){
    try{
      const raw = localStorage.getItem(getKey(storageKey));
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== 'object') return null;
      return parsed;
    }catch{ return null; }
  }

  function writeLayout(storageKey, obj){
    localStorage.setItem(getKey(storageKey), JSON.stringify(obj));
  }

  function clearLayout(storageKey){
    localStorage.removeItem(getKey(storageKey));
  }

  function toPercentBox(boxPx, wrapRect){
    const w = Math.max(1, wrapRect.width);
    const h = Math.max(1, wrapRect.height);
    return {
      x: boxPx.x / w,
      y: boxPx.y / h,
      w: boxPx.w / w,
      h: boxPx.h / h,
    };
  }

  function fromPercentBox(boxPct, wrapRect){
    const w = Math.max(1, wrapRect.width);
    const h = Math.max(1, wrapRect.height);
    return {
      x: boxPct.x * w,
      y: boxPct.y * h,
      w: boxPct.w * w,
      h: boxPct.h * h,
    };
  }

  function applyBox(panel, box){
    panel.style.left = `${box.x}px`;
    panel.style.top = `${box.y}px`;
    panel.style.width = `${box.w}px`;
    panel.style.height = `${box.h}px`;
  }

  function measureNaturalBoxes(wrap, panels){
    const wrapRect = wrap.getBoundingClientRect();
    return panels.map((p)=>{
      const r = p.getBoundingClientRect();
      return {
        id: p.dataset.panelId,
        x: r.left - wrapRect.left + wrap.scrollLeft,
        y: r.top - wrapRect.top + wrap.scrollTop,
        w: r.width,
        h: r.height,
      };
    });
  }

  function setLayoutMode(wrap, panels, on){
    wrap.classList.toggle('layout-on', !!on);
    panels.forEach((p)=>p.classList.toggle('layout-panel', !!on));
  }

  function makeInteractable(wrap, panels, enabled){
    if(!window.interact) return;
    panels.forEach((p)=>{
      interact(p).unset();
      if(!enabled) return;

      interact(p)
        .draggable({
          listeners: {
            move (event) {
              const target = event.target;
              const x = (parseFloat(target.style.left) || 0) + event.dx;
              const y = (parseFloat(target.style.top) || 0) + event.dy;
              target.style.left = `${x}px`;
              target.style.top = `${y}px`;
            }
          },
          modifiers: [
            interact.modifiers.restrictRect({
              restriction: wrap,
              endOnly: true
            })
          ],
          inertia: true
        })
        .resizable({
          edges: { left: true, right: true, bottom: true, top: true },
          listeners: {
            move (event) {
              const target = event.target;
              let x = parseFloat(target.style.left) || 0;
              let y = parseFloat(target.style.top) || 0;

              // update the element's style
              target.style.width = `${event.rect.width}px`;
              target.style.height = `${event.rect.height}px`;

              // translate when resizing from top/left
              x += event.deltaRect.left;
              y += event.deltaRect.top;
              target.style.left = `${x}px`;
              target.style.top = `${y}px`;
            }
          },
          modifiers: [
            interact.modifiers.restrictEdges({
              outer: wrap
            }),
            interact.modifiers.restrictSize({
              min: { width: 260, height: 180 }
            })
          ],
          inertia: true
        });
    });
  }

  function autoExpandWrapHeight(wrap, panels){
    // Ensure wrapper is tall enough to contain absolutely positioned panels
    const wrapRect = wrap.getBoundingClientRect();
    let maxBottom = 0;
    panels.forEach((p)=>{
      const top = parseFloat(p.style.top) || 0;
      const h = parseFloat(p.style.height) || p.getBoundingClientRect().height;
      maxBottom = Math.max(maxBottom, top + h);
    });
    const min = 480;
    wrap.style.minHeight = `${Math.max(min, Math.ceil(maxBottom + 24))}px`;
    // keep width responsive; height expands only
    wrapRect; // silence lint
  }

  function initLayoutManager(opts){
    const wrap = q(opts.containerSelector || '.grid');
    if(!wrap) return;
    const panels = qa(opts.panelSelector || '.card', wrap);
    if(!panels.length) return;
    ensurePanelIds(panels);

    const storageKey = opts.storageKey || 'runa_layout';
    const btnEdit  = q(opts.btnEditSelector  || '#btnLayoutEdit');
    const btnSave  = q(opts.btnSaveSelector  || '#btnLayoutSave');
    const btnReset = q(opts.btnResetSelector || '#btnLayoutReset');
    const pill     = q(opts.pillSelector || '#layoutPill');

    let editing = false;
    let layout = readLayout(storageKey);

    function applyFromStorage(){
      layout = readLayout(storageKey);
      if(!layout || !layout.panels) {
        // default mode
        setLayoutMode(wrap, panels, false);
        wrap.style.minHeight = '';
        panels.forEach((p)=>{
          p.style.left=''; p.style.top=''; p.style.width=''; p.style.height='';
        });
        makeInteractable(wrap, panels, false);
        if(pill) pill.textContent = 'Default';
        return;
      }

      setLayoutMode(wrap, panels, true);
      const wrapRect = wrap.getBoundingClientRect();
      panels.forEach((p)=>{
        const boxPct = layout.panels[p.dataset.panelId];
        if(!boxPct) return;
        const box = fromPercentBox(boxPct, wrapRect);
        // keep in bounds-ish
        box.x = clamp(box.x, 0, Math.max(0, wrapRect.width - 120));
        box.y = clamp(box.y, 0, Math.max(0, wrapRect.height - 120));
        box.w = clamp(box.w, 260, wrapRect.width);
        box.h = clamp(box.h, 180, 2000);
        applyBox(p, box);
      });
      autoExpandWrapHeight(wrap, panels);
      makeInteractable(wrap, panels, editing);
      if(pill) pill.textContent = editing ? 'Edit' : 'Custom';
    }

    function enableEditing(on){
      editing = !!on;
      wrap.classList.toggle('layout-editing', editing);
      makeInteractable(wrap, panels, editing);
      if(btnEdit) btnEdit.textContent = editing ? 'Selesai Atur' : 'Atur Layout';
      if(pill){
        const hasCustom = !!readLayout(storageKey);
        pill.textContent = editing ? 'Edit' : (hasCustom ? 'Custom' : 'Default');
      }
    }

    function bootstrapToAbsoluteIfNeeded(){
      // If layout doesn't exist yet but user starts editing,
      // convert current grid layout to absolute positions.
      if(readLayout(storageKey)) return;
      // measure while still in normal flow
      const natural = measureNaturalBoxes(wrap, panels);
      setLayoutMode(wrap, panels, true);
      // apply px boxes
      natural.forEach((b)=>{
        const p = panels.find(x=>x.dataset.panelId === b.id);
        if(p) applyBox(p, b);
      });
      autoExpandWrapHeight(wrap, panels);
      // save immediately as baseline
      save();
    }

    function save(){
      setLayoutMode(wrap, panels, true);
      const wrapRect = wrap.getBoundingClientRect();
      const obj = { version: 1, updatedAt: Date.now(), panels: {} };
      panels.forEach((p)=>{
        const x = parseFloat(p.style.left) || 0;
        const y = parseFloat(p.style.top) || 0;
        const w = parseFloat(p.style.width) || p.getBoundingClientRect().width;
        const h = parseFloat(p.style.height) || p.getBoundingClientRect().height;
        obj.panels[p.dataset.panelId] = toPercentBox({x,y,w,h}, wrapRect);
      });
      writeLayout(storageKey, obj);
      autoExpandWrapHeight(wrap, panels);
      if(pill) pill.textContent = editing ? 'Edit' : 'Custom';
    }

    function reset(){
      clearLayout(storageKey);
      editing = false;
      applyFromStorage();
      wrap.classList.remove('layout-editing');
      if(btnEdit) btnEdit.textContent = 'Atur Layout';
    }

    // Buttons
    if(btnEdit){
      btnEdit.addEventListener('click', ()=>{
        if(!editing){
          bootstrapToAbsoluteIfNeeded();
          enableEditing(true);
        }else{
          enableEditing(false);
          save();
        }
      });
    }
    if(btnSave){
      btnSave.addEventListener('click', ()=>{
        bootstrapToAbsoluteIfNeeded();
        save();
      });
    }
    if(btnReset){
      btnReset.addEventListener('click', ()=>{
        reset();
      });
    }

    // Apply stored layout on load
    applyFromStorage();

    // Re-apply on resize for responsiveness
    let t;
    window.addEventListener('resize', ()=>{
      clearTimeout(t);
      t = setTimeout(()=>applyFromStorage(), 80);
    });

    // Public API (optional)
    window.RunaLayout = {
      save, reset, enableEditing, apply: applyFromStorage
    };
  }

  window.initLayoutManager = initLayoutManager;
})();
