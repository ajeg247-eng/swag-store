/* =========================================================
   SWAG — Wheel Navigation (desktop + mobile)
   Inicialización independiente del resto de la tienda.
   ========================================================= */
(function initSwagWheel() {
  function mountWheel() {
    const wheel = document.getElementById('swagWheel');
    if (!wheel || wheel.dataset.wheelReady === '1') return;

    const machine = wheel.closest('.ccm-11_machine');
    const stage = wheel.closest('.ccm-11_stage');
    const pages = Array.from(document.querySelectorAll('.page-section'));
    const items = Array.from(wheel.querySelectorAll('.ccm-11_item')).filter(item => {
      const page = document.getElementById(item.dataset.page || '');
      return Boolean(page && page.classList.contains('page-section'));
    });
    const title = document.getElementById('swagWheelTitle');
    const count = document.getElementById('swagWheelCount');
    const previous = document.getElementById('swagWheelPrev');
    const next = document.getElementById('swagWheelNext');
    const total = items.length;
    if (!total) {
      console.error('SWAG Wheel: no hay opciones vinculadas a páginas existentes.');
      return;
    }

    wheel.dataset.wheelReady = '1';
    [machine, wheel].filter(Boolean).forEach(element => element.style.setProperty('--n', total));
    items.forEach((item, index) => {
      item.style.setProperty('--i', index);
      item.dataset.index = String(index);
      item.setAttribute('aria-controls', item.dataset.page);
      item.setAttribute('aria-label', `Ir a ${item.querySelector('.ccm-11_label')?.textContent.trim() || 'sección'}`);
    });

    const activePage = pages.find(page => page.classList.contains('active'));
    const initialIndex = items.findIndex(item => item.dataset.page === activePage?.id || item.classList.contains('is-active'));
    let activeIndex = initialIndex >= 0 ? initialIndex : 0;

    function activate(index, options = {}) {
      const selectedIndex = ((index % total) + total) % total;
      const selected = items[selectedIndex];
      const pageId = selected.dataset.page;
      const page = document.getElementById(pageId);
      if (!page || !page.classList.contains('page-section')) return false;

      activeIndex = selectedIndex;
      pages.forEach(section => {
        const current = section.id === pageId;
        section.classList.toggle('active', current);
        section.setAttribute('aria-hidden', String(!current));
      });
      items.forEach((item, itemIndex) => {
        const current = itemIndex === activeIndex;
        item.classList.toggle('is-active', current);
        if (current) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });

      const rotation = -(activeIndex * (360 / total));
      wheel.style.setProperty('--rotation', `${rotation}deg`);
      // Asignación explícita como respaldo para navegadores de escritorio antiguos.
      wheel.style.transform = `rotate(${rotation}deg)`;
      if (title) title.textContent = selected.querySelector('.ccm-11_label')?.textContent.trim() || 'SWAG';
      if (count) count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

      if (options.scroll !== false) {
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      document.dispatchEvent(new CustomEvent('swag:pagechange', { detail: { pageId, index: activeIndex } }));
      if (options.sound !== false && typeof window.reproducirSonido === 'function') window.reproducirSonido('wheel');
      return true;
    }

    // API global usada por los botones de la portada y por el catálogo.
    window.showPage = function showPage(pageId) {
      const index = items.findIndex(item => item.dataset.page === pageId);
      return index < 0 ? false : activate(index);
    };

    // Delegación: los clics funcionan aunque cambie el contenido interno del botón.
    wheel.addEventListener('click', event => {
      const item = event.target instanceof Element ? event.target.closest('.ccm-11_item') : null;
      if (!item || !wheel.contains(item)) return;
      const index = items.indexOf(item);
      if (index >= 0) activate(index);
    });
    previous?.addEventListener('click', () => activate(activeIndex - 1));
    next?.addEventListener('click', () => activate(activeIndex + 1));

    document.addEventListener('keydown', event => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey ||
          (target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]'))) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); activate(activeIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); activate(activeIndex + 1); }
    });

    activate(activeIndex, { scroll: false, sound: false });
    stage?.classList.add('ccm-11_ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWheel, { once: true });
  } else {
    mountWheel();
  }
})();


    // Navegación visual del panel CEO: resalta la pestaña seleccionada.
    document.querySelectorAll('.swag-ceo-nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelectorAll('.swag-ceo-nav a').forEach(item => item.classList.remove('is-current'));
        link.classList.add('is-current');
      });
    });

    // La animación se ejecuta al cargar/abrir la app; no interviene en la navegación interna.
    (function(){
      const splash=document.getElementById('swag-opening-splash');
      if(!splash || window.matchMedia('(prefers-reduced-motion: reduce)').matches){splash?.remove();return;}
      requestAnimationFrame(()=>splash.classList.add('is-playing'));
      const finish=()=>{if(splash.isConnected)splash.remove();};
      splash.addEventListener('animationend',e=>{if(e.target===splash && e.animationName==='swagSplashFade')finish();});
      window.setTimeout(finish,1450);
    })();
  


    // CONFIGURACIÓN SUPABASE SWAG. La publishable key está diseñada para uso público; RLS protege los datos.
    const SWAG_SUPABASE_URL = "https://mnwshzltjmfpggetkbqy.supabase.co";
    const SWAG_SUPABASE_KEY = "sb_publishable_bOhuZHMA_x0MeHgRA0O7pA_PawzKqP_";
    const swagDb = (window.supabase && typeof window.supabase.createClient === "function")
      ? window.supabase.createClient(SWAG_SUPABASE_URL, SWAG_SUPABASE_KEY)
      : null;
    let swagAdminSession = null;
    let swagCloudReady = false;
    let swagCloudSaveTimer = null;

    function safeCreateIcons() {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }

    // VISITAS COMPARTIDAS EN LA NUBE
    const STORAGE_KEY_VISITS = "swag_site_visits_total";
    const STORAGE_KEY_VISIT_SESSIONS = "swag_site_visit_sessions";
    function registrarVisitaSitio() {
      if (!swagDb) return;
      try {
        if (sessionStorage.getItem("swag_visit_counted_this_session") !== "1") {
          sessionStorage.setItem("swag_visit_counted_this_session", "1");
          swagDb.from("swag_visits").insert({ session_id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) })
            .then(({ error }) => { if (error) console.warn("Visita no registrada en nube:", error.message); });
        }
      } catch (err) { console.warn("No se pudo registrar la visita", err); }
    }
    async function renderizarEstadisticasVisitas() {
      const count = document.getElementById("contadorVisitas");
      const detail = document.getElementById("detalleVisitas");
      if (!count) return;
      if (!swagDb) { if (detail) detail.textContent = "Conexión con Supabase no disponible"; return; }
      const { count: total, error } = await swagDb.from("swag_visits").select("id", { count: "exact", head: true });
      if (!error) { count.textContent = Number(total || 0).toLocaleString(); if (detail) detail.textContent = "Visitas registradas en la nube"; }
      else if (detail) detail.textContent = "No se pudo consultar el contador de visitas";
    }

    // LLAVES LOCALSTORAGE
    const STORAGE_KEY_CATS = "swag_categorias";
    const STORAGE_KEY_PRODS = "swag_productos";
    const STORAGE_KEY_LOGS = "swag_logs";
    const STORAGE_KEY_HERO = "swag_hero_text";
    const STORAGE_KEY_SHOWCASE = "swag_tech_showcase_items";
    const STORAGE_KEY_THEME = "swag_visual_theme";
    const STORAGE_KEY_PALETTES = "swag_custom_palettes";
    const STORAGE_KEY_SOUND = "swag_sound_settings";
    const STORAGE_KEY_HOME_FEATURE = "swag_home_feature";

    // Lectura defensiva: un dato local corrupto no debe detener toda la aplicación.
    function leerJSONLocal(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        console.warn(`SWAG: no se pudo leer ${key}; se usarán los valores predeterminados.`, error);
        return fallback;
      }
    }

    // AUDIO DE INTERFAZ — Web Audio, sin archivos externos.
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let swagSoundData = leerJSONLocal(STORAGE_KEY_SOUND, { enabled: true, volume: 0.45 });
    if (!swagSoundData || typeof swagSoundData !== "object") swagSoundData = { enabled: true, volume: 0.45 };
    swagSoundData.enabled = swagSoundData.enabled !== false;
    swagSoundData.volume = Math.max(0, Math.min(1, Number(swagSoundData.volume ?? 0.45)));

    function reproducirSonido(tipo) {
      if (!swagSoundData.enabled || !AudioCtx || swagSoundData.volume <= 0) return;
      try {
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const master = Math.min(0.22, swagSoundData.volume * 0.22);
        const tone = (frequency, endFrequency, startAt, duration, wave = 'sine', peak = 0.35) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = wave;
          osc.frequency.setValueAtTime(frequency, startAt);
          if (endFrequency && endFrequency !== frequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, master * peak), startAt + Math.min(0.018, duration * 0.25));
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(startAt); osc.stop(startAt + duration + 0.01);
        };
        if (tipo === 'wheel') {
          // Doble tono limpio, breve y discreto para el cambio de sección.
          tone(520, 690, now, 0.13, 'sine', 0.42);
          tone(780, 980, now + 0.045, 0.12, 'sine', 0.24);
        } else if (tipo === 'click') {
          tone(760, 470, now, 0.065, 'sine', 0.34);
        } else if (tipo === 'trash') {
          tone(360, 115, now, 0.19, 'triangle', 0.5);
        } else if (tipo === 'exito') {
          tone(523.25, 523.25, now, 0.16, 'sine', 0.42);
          tone(659.25, 659.25, now + 0.075, 0.18, 'sine', 0.34);
        }
      } catch (e) { console.debug('Audio SWAG no disponible en este navegador.', e); }
    }
    window.reproducirSonido = reproducirSonido;

    function guardarConfiguracionSonido() {
      const enabled = document.getElementById('swagSoundEnabled');
      const volume = document.getElementById('swagSoundVolume');
      if (enabled) swagSoundData.enabled = enabled.checked;
      if (volume) swagSoundData.volume = Math.max(0, Math.min(1, Number(volume.value) / 100));
      localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(swagSoundData));
      programarGuardadoNube();
      if (swagSoundData.enabled) reproducirSonido('exito');
    }
    function actualizarVolumenSonido(value) {
      const output = document.getElementById('swagSoundVolumeValue');
      if (output) output.textContent = `${value}%`;
      swagSoundData.volume = Math.max(0, Math.min(1, Number(value) / 100));
    }
    window.guardarConfiguracionSonido = guardarConfiguracionSonido;
    window.actualizarVolumenSonido = actualizarVolumenSonido;

    // El título y la descripción del hero permanecen visibles al desplazarse.
    // Se eliminó el efecto anterior que añadía opacity-0 al superar 150px.

    // CARGA DE TEXTO DE HERO
    const SWAG_THEMES = {
      original:{name:"SWAG Original",effects:false},
      navidad:{name:"Navidad",effects:true},
      "ano-nuevo":{name:"Año Nuevo",effects:true},
      noche:{name:"Midnight",effects:false},
      custom:{name:"Personalizado",effects:false}
    };
    let swagThemeData = {id:"original",effects:false,palette:null};
    try { const savedTheme=JSON.parse(localStorage.getItem(STORAGE_KEY_THEME)||"null"); if(savedTheme && SWAG_THEMES[savedTheme.id]) swagThemeData={...swagThemeData,...savedTheme}; } catch(e){}
    let swagCustomPalettes = leerJSONLocal(STORAGE_KEY_PALETTES, []);
    if (!Array.isArray(swagCustomPalettes)) swagCustomPalettes = [];
    const SWAG_DEFAULT_PALETTE = {bg:"#080a0b",panel:"#171a1c",accent:"#76ed11",accent2:"#b5ff72",text:"#f7f8f5",muted:"#b8bec2"};
    function leerPaletaDesdeControles(){
      const get=id=>document.getElementById(id)?.value;
      return {bg:get('swagColorBg')||SWAG_DEFAULT_PALETTE.bg,panel:get('swagColorPanel')||SWAG_DEFAULT_PALETTE.panel,accent:get('swagColorAccent')||SWAG_DEFAULT_PALETTE.accent,accent2:get('swagColorAccent2')||SWAG_DEFAULT_PALETTE.accent2,text:get('swagColorText')||SWAG_DEFAULT_PALETTE.text,muted:get('swagColorMuted')||SWAG_DEFAULT_PALETTE.muted};
    }
    function pintarControlesPaleta(palette){
      if(!palette)return;
      const map={swagColorBg:'bg',swagColorPanel:'panel',swagColorAccent:'accent',swagColorAccent2:'accent2',swagColorText:'text',swagColorMuted:'muted'};
      Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=palette[key]||SWAG_DEFAULT_PALETTE[key];});
    }
    function aplicarTemaSWAG(){
      const id=SWAG_THEMES[swagThemeData.id]?swagThemeData.id:"original";
      document.body.dataset.swagTheme=id;
      if(id==='custom' && swagThemeData.palette){
        const p=swagThemeData.palette;
        const vars={bg:'--swag-theme-bg',panel:'--swag-theme-panel',accent:'--swag-theme-accent',accent2:'--swag-theme-accent2',text:'--swag-theme-text',muted:'--swag-theme-muted'};
        Object.entries(vars).forEach(([key,cssVar])=>document.body.style.setProperty(cssVar,p[key]||SWAG_DEFAULT_PALETTE[key]));
        document.body.style.setProperty('--swag-theme-border',p.accent2||SWAG_DEFAULT_PALETTE.accent2);
        document.body.style.setProperty('--swag-theme-button-text',contrasteColor(p.accent||SWAG_DEFAULT_PALETTE.accent));
      } else {
        ['--swag-theme-bg','--swag-theme-panel','--swag-theme-accent','--swag-theme-accent2','--swag-theme-text','--swag-theme-muted','--swag-theme-border','--swag-theme-button-text'].forEach(v=>document.body.style.removeProperty(v));
      }
      document.body.classList.toggle("swag-effects-on",!!swagThemeData.effects);
      const fx=document.getElementById("swagSeasonFx");
      if(fx){fx.className=(id==="navidad" && swagThemeData.effects)?"snow":(id==="ano-nuevo"&&swagThemeData.effects?"newyear":"");}
      const toggle=document.getElementById("swagThemeEffects"); if(toggle) toggle.checked=!!swagThemeData.effects;
      const status=document.getElementById("swagThemeStatus"); if(status) status.textContent="Tema actual: "+SWAG_THEMES[id].name;
      document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("is-active",b.dataset.themeChoice===id));
      if(id==='custom' && swagThemeData.palette) pintarControlesPaleta(swagThemeData.palette);
    }
    function contrasteColor(hex){
      const c=String(hex||'#76ed11').replace('#',''); if(!/^[0-9a-f]{6}$/i.test(c))return '#071006';
      const n=parseInt(c,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
      return (0.299*r+0.587*g+0.114*b)>155?'#101010':'#ffffff';
    }
    function guardarTemaSWAG(){
      localStorage.setItem(STORAGE_KEY_THEME,JSON.stringify(swagThemeData)); aplicarTemaSWAG();
      if(typeof programarGuardadoNube==="function") programarGuardadoNube();
    }
    function seleccionarTemaSWAG(id){
      if(!SWAG_THEMES[id]) return;
      swagThemeData.id=id;
      if(id==="original" || id==="noche" || id==='custom') swagThemeData.effects=false;
      else swagThemeData.effects=true;
      if(id==='custom' && !swagThemeData.palette) swagThemeData.palette={...SWAG_DEFAULT_PALETTE};
      guardarTemaSWAG();
      if(typeof reproducirSonido==="function") reproducirSonido("exito");
      if(typeof registrarLog==="function") registrarLog("Tema visual cambiado a "+SWAG_THEMES[id].name+".");
    }
    function cambiarEfectosTemaSWAG(enabled){swagThemeData.effects=!!enabled;guardarTemaSWAG();}
    function guardarPaletaPersonalizada(){
      const name=document.getElementById('swagPaletteName')?.value.trim()||`Paleta ${swagCustomPalettes.length+1}`;
      const palette=leerPaletaDesdeControles();
      const entry={id:Date.now(),name,palette};
      swagCustomPalettes.unshift(entry);
      localStorage.setItem(STORAGE_KEY_PALETTES,JSON.stringify(swagCustomPalettes));
      swagThemeData={...swagThemeData,id:'custom',effects:false,palette}; guardarTemaSWAG(); renderizarPaletasGuardadas();
      const nameInput=document.getElementById('swagPaletteName');if(nameInput)nameInput.value='';
      registrarLog(`Nueva paleta guardada: ${name}`); reproducirSonido('exito');
    }
    function aplicarPaletaGuardada(id){
      const entry=swagCustomPalettes.find(p=>String(p.id)===String(id));if(!entry)return;
      swagThemeData={...swagThemeData,id:'custom',effects:false,palette:entry.palette}; guardarTemaSWAG();
      pintarControlesPaleta(entry.palette); registrarLog(`Paleta aplicada: ${entry.name}`);
    }
    function eliminarPaletaGuardada(id){
      const entry=swagCustomPalettes.find(p=>String(p.id)===String(id));if(!entry||!confirm(`¿Eliminar la paleta \"${entry.name}\"?`))return;
      swagCustomPalettes=swagCustomPalettes.filter(p=>String(p.id)!==String(id));localStorage.setItem(STORAGE_KEY_PALETTES,JSON.stringify(swagCustomPalettes));renderizarPaletasGuardadas();programarGuardadoNube();
    }
    function renderizarPaletasGuardadas(){
      const host=document.getElementById('swagSavedPalettes');if(!host)return;host.innerHTML='';
      if(!swagCustomPalettes.length){host.innerHTML='<p class="text-[10px] text-gray-500">Aún no hay paletas guardadas.</p>';return;}
      swagCustomPalettes.forEach(entry=>{
        const row=document.createElement('div');row.className='swag-palette-chip';
        const dots=document.createElement('span');dots.className='swag-palette-dots';
        ['bg','panel','accent','accent2'].forEach(k=>{const dot=document.createElement('i');dot.style.background=entry.palette[k];dots.appendChild(dot);});
        const name=document.createElement('strong');name.textContent=entry.name;
        const apply=document.createElement('button');apply.type='button';apply.textContent='Aplicar';apply.onclick=()=>aplicarPaletaGuardada(entry.id);
        const del=document.createElement('button');del.type='button';del.textContent='×';del.setAttribute('aria-label','Eliminar paleta');del.onclick=()=>eliminarPaletaGuardada(entry.id);
        row.append(dots,name,apply,del);host.appendChild(row);
      });
    }
    function restaurarTemaSWAG(){swagThemeData={id:'original',effects:false,palette:null};guardarTemaSWAG();pintarControlesPaleta(SWAG_DEFAULT_PALETTE);registrarLog('Tema original SWAG restaurado.');}
    window.seleccionarTemaSWAG=seleccionarTemaSWAG;window.cambiarEfectosTemaSWAG=cambiarEfectosTemaSWAG;
    window.guardarPaletaPersonalizada=guardarPaletaPersonalizada;window.aplicarPaletaGuardada=aplicarPaletaGuardada;window.eliminarPaletaGuardada=eliminarPaletaGuardada;window.restaurarTemaSWAG=restaurarTemaSWAG;

    let heroTextData = leerJSONLocal(STORAGE_KEY_HERO, {
      titulo: "Tu tienda de [palabra automática]",
      desc: "Ajusta tu presupuesto disponible y consulta nuestras categorías con fotos reales en alta resolución."
    });
    if (!heroTextData || typeof heroTextData !== "object" || Array.isArray(heroTextData)) {
      heroTextData = { titulo: "Tu tienda de [palabra automática]", desc: "Ajusta tu presupuesto disponible y consulta nuestras categorías con fotos reales en alta resolución." };
    }

    const defaultShowcaseItems = [
      {id:1,titulo:"OLED TV",subtitulo:"Imagen inmersiva",imagen:"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=85"},
      {id:2,titulo:"E-Bike",subtitulo:"Movilidad eléctrica",imagen:"https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=900&q=85"},
      {id:3,titulo:"Laptops",subtitulo:"Potencia portátil",imagen:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85"},
      {id:4,titulo:"Speakers",subtitulo:"Sonido envolvente",imagen:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85"},
      {id:5,titulo:"Smartphones",subtitulo:"Conectividad total",imagen:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85"}
    ];
    let showcaseItems;
    try {
      const savedShowcase = localStorage.getItem(STORAGE_KEY_SHOWCASE);
      showcaseItems = savedShowcase ? JSON.parse(savedShowcase) : defaultShowcaseItems;
      if (!Array.isArray(showcaseItems)) showcaseItems = defaultShowcaseItems;
    } catch (err) { showcaseItems = defaultShowcaseItems; }
    let showcaseEditId = null;
    let showcasePendingImage = "";
    let homeFeature = leerJSONLocal(STORAGE_KEY_HOME_FEATURE, null);
    if (!homeFeature || typeof homeFeature !== 'object' || Array.isArray(homeFeature)) homeFeature = null;
    let homeFeaturePendingImage = "";

    function renderizarHomeFeatureAdmin(){
      const title=document.getElementById('homeFeatureTitle'),subtitle=document.getElementById('homeFeatureSubtitle'),preview=document.getElementById('homeFeaturePreview'),status=document.getElementById('homeFeatureStatus');
      if(title)title.value=homeFeature?.title||'';if(subtitle)subtitle.value=homeFeature?.subtitle||'';
      if(preview){if(homeFeature?.image){preview.src=homeFeature.image;preview.classList.remove('hidden');}else preview.classList.add('hidden');}
      if(status)status.textContent=homeFeature?'Selección personalizada activa en la portada.':'La portada utiliza automáticamente el primer producto del catálogo.';
    }
    async function guardarHomeFeature(){
      const title=document.getElementById('homeFeatureTitle')?.value.trim()||'';
      const subtitle=document.getElementById('homeFeatureSubtitle')?.value.trim()||'';
      const file=document.getElementById('homeFeatureFile')?.files?.[0];
      if(!title){alert('Escribe el nombre del producto que aparecerá en Inicio.');return;}
      let image=homeFeaturePendingImage||homeFeature?.image||'';
      if(file){try{image=await optimizarImagenShowcase(file);}catch(err){alert(err.message);return;}}
      if(!image){alert('Selecciona una fotografía desde tu dispositivo.');return;}
      homeFeature={title,subtitle,image};
      try{localStorage.setItem(STORAGE_KEY_HOME_FEATURE,JSON.stringify(homeFeature));}
      catch(err){alert('No se pudo guardar la imagen. Prueba con una fotografía más pequeña.');return;}
      homeFeaturePendingImage='';const fileInput=document.getElementById('homeFeatureFile');if(fileInput)fileInput.value='';
      renderizarInicio();renderizarHomeFeatureAdmin();programarGuardadoNube();registrarLog(`Selección principal del Inicio actualizada: ${title}`);reproducirSonido('exito');
    }
    function restaurarHomeFeature(){
      if(!confirm('¿Volver a mostrar automáticamente el primer producto del catálogo en Inicio?'))return;
      homeFeature=null;homeFeaturePendingImage='';localStorage.removeItem(STORAGE_KEY_HOME_FEATURE);
      const file=document.getElementById('homeFeatureFile');if(file)file.value='';renderizarInicio();renderizarHomeFeatureAdmin();programarGuardadoNube();registrarLog('Selección principal del Inicio restaurada al catálogo.');
    }
    window.guardarHomeFeature=guardarHomeFeature;window.restaurarHomeFeature=restaurarHomeFeature;
    document.addEventListener('DOMContentLoaded',()=>{
      const input=document.getElementById('homeFeatureFile');
      input?.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;try{homeFeaturePendingImage=await optimizarImagenShowcase(file);const preview=document.getElementById('homeFeaturePreview');if(preview){preview.src=homeFeaturePendingImage;preview.classList.remove('hidden');}}catch(err){alert(err.message);input.value='';}});
    });

    function guardarShowcaseStorage() {
      try {
        localStorage.setItem(STORAGE_KEY_SHOWCASE, JSON.stringify(showcaseItems));
        programarGuardadoNube();
        return true;
      } catch (err) {
        alert("No se pudo guardar. La imagen puede ser demasiado grande para el almacenamiento del navegador. Prueba con una imagen más pequeña.");
        return false;
      }
    }

    function optimizarImagenShowcase(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) return reject(new Error("Selecciona un archivo de imagen válido."));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error("La imagen no se pudo procesar."));
          img.onload = () => {
            const max = 1200, scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/webp", 0.82));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function renderizarListaShowcase() {
      const list = document.getElementById("listaAdminShowcase");
      const count = document.getElementById("showcaseCount");
      if (!list) return;
      list.innerHTML = "";
      if (count) count.textContent = `${showcaseItems.length} artículo${showcaseItems.length === 1 ? "" : "s"}`;
      showcaseItems.forEach(item => {
        const row = document.createElement("div");
        row.className = "flex items-center gap-2 bg-swagDark border border-white/10 rounded-xl p-2 min-w-0";
        const img = document.createElement("img"); img.src = item.imagen; img.alt = item.titulo; img.className = "w-12 h-12 rounded-lg object-cover flex-shrink-0";
        const info = document.createElement("div"); info.className = "min-w-0 flex-1";
        const title = document.createElement("p"); title.className = "text-[11px] font-bold text-white truncate"; title.textContent = item.titulo;
        const sub = document.createElement("p"); sub.className = "text-[9px] text-gray-400 truncate"; sub.textContent = item.subtitulo || "Sin subtítulo";
        info.append(title, sub);
        const actions = document.createElement("div"); actions.className = "flex gap-1 flex-shrink-0";
        const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editar"; edit.className = "text-[9px] bg-swagGray px-2 py-1.5 rounded-lg hover:bg-swagLime hover:text-black"; edit.onclick = () => editarArticuloShowcase(item.id);
        const del = document.createElement("button"); del.type = "button"; del.textContent = "×"; del.title = "Eliminar"; del.className = "text-sm font-black bg-red-600 px-2.5 py-1 rounded-lg"; del.onclick = () => eliminarArticuloShowcase(item.id);
        actions.append(edit, del); row.append(img, info, actions); list.appendChild(row);
      });
    }

    function renderizarEscaparate3DCards() {
      const ring = document.getElementById("techRing");
      if (!ring) return;
      ring.innerHTML = "";
      showcaseItems.forEach(item => {
        const card = document.createElement("article"); card.className = "tech-card";
        const img = document.createElement("img"); img.src = item.imagen; img.alt = item.titulo; img.draggable = false;
        const label = document.createElement("div"); label.className = "tech-card-label";
        const small = document.createElement("small"); small.textContent = item.subtitulo || "Descubre el producto";
        const strong = document.createElement("strong"); strong.textContent = item.titulo;
        label.append(small, strong); card.append(img, label); ring.appendChild(card);
      });
      if (window.actualizarPosicionesShowcase) window.actualizarPosicionesShowcase();
    }

    function limpiarFormularioShowcase() {
      showcaseEditId = null; showcasePendingImage = "";
      document.getElementById("showcaseTitulo").value = "";
      document.getElementById("showcaseSubtitulo").value = "";
      document.getElementById("showcaseFoto").value = "";
      document.getElementById("showcasePreview").classList.add("hidden");
      document.getElementById("btnGuardarShowcase").textContent = "Agregar al escaparate";
    }

    function editarArticuloShowcase(id) {
      const item = showcaseItems.find(x => x.id === id); if (!item) return;
      showcaseEditId = id; showcasePendingImage = item.imagen;
      document.getElementById("showcaseTitulo").value = item.titulo;
      document.getElementById("showcaseSubtitulo").value = item.subtitulo || "";
      const preview = document.getElementById("showcasePreview"); preview.src = item.imagen; preview.classList.remove("hidden");
      document.getElementById("btnGuardarShowcase").textContent = "Guardar cambios";
      document.getElementById("showcaseTitulo").focus();
    }

    async function guardarArticuloShowcase() {
      const titulo = document.getElementById("showcaseTitulo").value.trim();
      const subtitulo = document.getElementById("showcaseSubtitulo").value.trim();
      const file = document.getElementById("showcaseFoto").files[0];
      if (!titulo) { alert("Escribe el título del artículo."); return; }
      let imagen = showcasePendingImage;
      if (file) {
        try { imagen = await optimizarImagenShowcase(file); }
        catch (err) { alert(err.message); return; }
      }
      if (!imagen) { alert("Selecciona una fotografía desde tu dispositivo."); return; }
      if (showcaseEditId !== null) {
        const index = showcaseItems.findIndex(x => x.id === showcaseEditId);
        if (index >= 0) showcaseItems[index] = {...showcaseItems[index], titulo, subtitulo, imagen};
      } else {
        showcaseItems.push({id: Date.now(), titulo, subtitulo, imagen});
      }
      if (!guardarShowcaseStorage()) return;
      registrarLog(`${showcaseEditId !== null ? "Artículo 3D actualizado" : "Artículo agregado al escaparate 3D"}: ${titulo}`);
      renderizarEscaparate3DCards(); renderizarListaShowcase(); limpiarFormularioShowcase();
      reproducirSonido("exito");
    }

    function eliminarArticuloShowcase(id) {
      const item = showcaseItems.find(x => x.id === id); if (!item) return;
      if (!confirm(`¿Eliminar "${item.titulo}" del escaparate 3D?`)) return;
      showcaseItems = showcaseItems.filter(x => x.id !== id);
      if (!guardarShowcaseStorage()) return;
      registrarLog(`Artículo eliminado del escaparate 3D: ${item.titulo}`);
      renderizarEscaparate3DCards(); renderizarListaShowcase();
      if (showcaseEditId === id) limpiarFormularioShowcase();
    }

    document.addEventListener("DOMContentLoaded", () => {
      const fileInput = document.getElementById("showcaseFoto");
      if (fileInput) fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0]; if (!file) return;
        try { const data = await optimizarImagenShowcase(file); const preview = document.getElementById("showcasePreview"); preview.src = data; preview.classList.remove("hidden"); showcasePendingImage = data; }
        catch (err) { alert(err.message); fileInput.value = ""; }
      });
    });

    // TITULAR ROTATORIO DEL HERO — legible, adaptable y estable al hacer scroll
    const HERO_ROTATOR_WORDS = [
      "celulares",
      "tablets",
      "computadoras",
      "audio",
      "hogar",
      "televisores",
      "gaming",
      "relojes",
      "electrodomésticos",
      "bicicletas eléctricas"
    ];
    let heroRotatorInterval = null;
    let heroRotatorTransition = null;
    let heroRotatorIndex = 0;
    let heroRotatorObserver = null;
    let heroRotatorVisible = true;
    let heroRotatorResizeObserver = null;

    function ajustarPalabraHero(){
      const title = document.getElementById("heroTituloText");
      const wordEl = document.getElementById("heroRotatorWord");
      if (!title || !wordEl) return;
      const titleWidth = Math.max(120, title.clientWidth || title.getBoundingClientRect().width);
      const titleFont = parseFloat(getComputedStyle(title).fontSize) || 48;
      const baseSize = titleFont * 0.82;
      let low = baseSize * 0.60;
      let high = baseSize * 0.88;
      wordEl.style.whiteSpace = "nowrap";
      wordEl.style.overflow = "visible";
      wordEl.style.fontSize = `${high}px`;
      // Busca el tamaño más grande que permita mostrar la palabra completa sin cortar letras.
      for (let i = 0; i < 14; i++) {
        const mid = (low + high) / 2;
        wordEl.style.fontSize = `${mid}px`;
        if (wordEl.getBoundingClientRect().width <= titleWidth - 2) low = mid;
        else high = mid;
      }
      wordEl.style.fontSize = `${Math.max(baseSize * 0.60, Math.min(baseSize * 0.88, low))}px`;
    }

    function detenerRotadorHero(){
      if (heroRotatorInterval !== null) clearInterval(heroRotatorInterval);
      if (heroRotatorTransition !== null) clearTimeout(heroRotatorTransition);
      heroRotatorInterval = null;
      heroRotatorTransition = null;
      const current = document.getElementById("heroRotatorWord");
      if (current) current.classList.remove("is-leaving", "is-entering");
    }

    function iniciarRotadorHero(){
      detenerRotadorHero();
      const wordEl = document.getElementById("heroRotatorWord");
      const title = document.getElementById("heroTituloText");
      if (!wordEl || !title || !HERO_ROTATOR_WORDS.length) return;
      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      wordEl.textContent = HERO_ROTATOR_WORDS[heroRotatorIndex % HERO_ROTATOR_WORDS.length];
      ajustarPalabraHero();
      if (reduceMotion) return;

      if (heroRotatorResizeObserver) heroRotatorResizeObserver.disconnect();
      if ("ResizeObserver" in window) {
        heroRotatorResizeObserver = new ResizeObserver(ajustarPalabraHero);
        heroRotatorResizeObserver.observe(title);
      } else {
        window.addEventListener("resize", ajustarPalabraHero, { passive:true });
      }

      function cambiarPalabra(){
        if (document.hidden || !heroRotatorVisible) return;
        const current = document.getElementById("heroRotatorWord");
        if (!current || !current.isConnected) return;
        current.classList.add("is-leaving");
        heroRotatorTransition = setTimeout(() => {
          const visibleWord = document.getElementById("heroRotatorWord");
          if (!visibleWord) { heroRotatorTransition = null; return; }
          heroRotatorIndex = (heroRotatorIndex + 1) % HERO_ROTATOR_WORDS.length;
          visibleWord.textContent = HERO_ROTATOR_WORDS[heroRotatorIndex];
          visibleWord.classList.remove("is-leaving");
          visibleWord.classList.add("is-entering");
          ajustarPalabraHero();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const latest = document.getElementById("heroRotatorWord");
            latest?.classList.remove("is-entering");
          }));
          heroRotatorTransition = null;
        }, 420);
      }

      function iniciarIntervalo(){
        if (heroRotatorInterval !== null) clearInterval(heroRotatorInterval);
        heroRotatorInterval = null;
        if (!document.hidden && heroRotatorVisible) {
          heroRotatorInterval = setInterval(cambiarPalabra, 3400);
        }
      }

      if (!window.swagHeroRotatorVisibilityHandler) {
        window.swagHeroRotatorVisibilityHandler = () => {
          if (document.hidden) detenerRotadorHero();
          else iniciarIntervalo();
        };
        document.addEventListener("visibilitychange", window.swagHeroRotatorVisibilityHandler);
      }
      if (!heroRotatorObserver && "IntersectionObserver" in window) {
        heroRotatorObserver = new IntersectionObserver(entries => {
          heroRotatorVisible = Boolean(entries[0]?.isIntersecting);
          if (heroRotatorVisible) iniciarIntervalo();
          else detenerRotadorHero();
          // No se modifica el texto al salir de pantalla: al volver sigue visible.
          ajustarPalabraHero();
        }, { threshold:0.12 });
        heroRotatorObserver.observe(title);
      }
      iniciarIntervalo();
    }

    function renderizarTextosHero() {
      const title = document.getElementById('heroTituloText');
      const desc = document.getElementById('heroDescText');
      if (title) {
        let word = document.getElementById('heroRotatorWord');
        if (!word) {
          title.innerHTML = 'Tu tienda de <span id="heroRotatorWord" class="hero-rotator-word" aria-live="polite">celulares</span>.';
        } else {
          // Mantiene el mismo nodo para que el intervalo no apunte a un elemento eliminado.
          word.textContent = HERO_ROTATOR_WORDS[heroRotatorIndex % HERO_ROTATOR_WORDS.length];
        }
      }
      const inputDesc = document.getElementById('editHeroDesc');
      if (inputDesc) inputDesc.value = heroTextData.desc;
      iniciarRotadorHero();
    }

    function guardarTextosHero() {
      const inputDesc = document.getElementById('editHeroDesc').value;
      if (!inputDesc.trim()) return;

      heroTextData = { ...heroTextData, titulo: "Tu tienda de [palabra automática]", desc: inputDesc };
      localStorage.setItem(STORAGE_KEY_HERO, JSON.stringify(heroTextData));
      programarGuardadoNube();
      renderizarTextosHero();
      reproducirSonido('exito');
      registrarLog("Texto descriptivo de la página de inicio actualizado.");
    }

    // CARGA DE CATEGORÍAS PERSISTENTES
    const defaultCats = ["Teléfonos", "Smart TV", "Parlantes", "Perfumes", "Joyas"];
    let listaCategorias = leerJSONLocal(STORAGE_KEY_CATS, defaultCats);
    if (!Array.isArray(listaCategorias)) listaCategorias = defaultCats;

    // CARGA DE PRODUCTOS PERSISTENTES
    const defaultProds = [
      {
        id: 1,
        nombre: "iPhone 15 Pro Max 256GB",
        precio: 1199,
        categoria: "Teléfonos",
        specs: "Pantalla Super Retina XDR OLED 6.7'', Chip A17 Pro, Cámara Principal 48MP con Zoom óptico 5x, Titanio Grado 5.",
        fotos: [
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80"
        ],
        portadaIndex: 0
      },
      {
        id: 2,
        nombre: "Anillo de Oro 18K con Diamante",
        precio: 850,
        categoria: "Joyas",
        specs: "Oro amarillo macizo de 18 Quilates con diamante natural corte brillante de 0.5 ct. Incluye certificado de autenticidad.",
        fotos: [
          "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80"
        ],
        portadaIndex: 0
      }
    ];
    let productos = leerJSONLocal(STORAGE_KEY_PRODS, defaultProds);
    if (!Array.isArray(productos)) productos = defaultProds;

    // CARGA DE LOGS PERSISTENTES
    let logsCajaNegra = leerJSONLocal(STORAGE_KEY_LOGS, [
      `[${new Date().toLocaleTimeString()}] Sistema SWAG inicializado correctamente.`
    ]);
    if (!Array.isArray(logsCajaNegra)) logsCajaNegra = [];

    function obtenerEstadoSWAG() {
      return { categorias: listaCategorias, productos, logs: logsCajaNegra, hero: heroTextData, showcase: showcaseItems, theme: swagThemeData, palettes: swagCustomPalettes, sound: swagSoundData, homeFeature };
    }
    function guardarEstadoCompleto() {
      localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(listaCategorias));
      localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(productos));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logsCajaNegra));
      programarGuardadoNube();
    }
    function programarGuardadoNube() {
      if (!swagDb || !swagAdminSession || !swagCloudReady) return;
      clearTimeout(swagCloudSaveTimer);
      swagCloudSaveTimer = setTimeout(async () => {
        const { error } = await swagDb.from("swag_app_state").upsert({ id: "main", data: obtenerEstadoSWAG(), updated_at: new Date().toISOString() });
        if (error) console.error("Error guardando SWAG en nube:", error.message);
      }, 500);
    }
    async function cargarEstadoDesdeNube() {
      if (!swagDb) { console.warn("Supabase no está disponible; SWAG continúa con los datos locales."); return; }
      const { data, error } = await swagDb.from("swag_app_state").select("data").eq("id", "main").maybeSingle();
      if (error) { console.warn("No se pudo cargar el estado de nube:", error.message); return; }
      const d = data && data.data;
      if (!d || !Object.keys(d).length) { swagCloudReady = true; return; }
      if (Array.isArray(d.categorias)) listaCategorias = d.categorias;
      if (Array.isArray(d.productos)) productos = d.productos;
      if (Array.isArray(d.logs)) logsCajaNegra = d.logs;
      if (d.hero && typeof d.hero === "object") heroTextData = d.hero;
      if (Array.isArray(d.showcase)) showcaseItems = d.showcase;
      if (d.theme && typeof d.theme === "object" && SWAG_THEMES[d.theme.id]) swagThemeData = { ...swagThemeData, ...d.theme };
      if (Array.isArray(d.palettes)) swagCustomPalettes = d.palettes;
      if (d.sound && typeof d.sound === 'object') swagSoundData = { ...swagSoundData, ...d.sound };
      if (d.homeFeature === null || (d.homeFeature && typeof d.homeFeature === 'object')) homeFeature = d.homeFeature;
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(swagThemeData));
      localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(listaCategorias));
      localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(productos));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logsCajaNegra));
      localStorage.setItem(STORAGE_KEY_HERO, JSON.stringify(heroTextData));
      localStorage.setItem(STORAGE_KEY_SHOWCASE, JSON.stringify(showcaseItems));
      localStorage.setItem(STORAGE_KEY_PALETTES, JSON.stringify(swagCustomPalettes));
      localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(swagSoundData));
      if(homeFeature) localStorage.setItem(STORAGE_KEY_HOME_FEATURE, JSON.stringify(homeFeature)); else localStorage.removeItem(STORAGE_KEY_HOME_FEATURE);
      aplicarTemaSWAG();
      renderizarTextosHero(); renderizarCategorias(); renderizarProductos(); renderizarInicio();
      if (typeof renderizarEscaparate3DCards === "function") renderizarEscaparate3DCards();
      swagCloudReady = true;
    }

    function registrarLog(msg) {
      const entrada = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logsCajaNegra.unshift(entrada);
      guardarEstadoCompleto();
      renderizarLogs();
    }

    function renderizarLogs() {
      const box = document.getElementById('logBox');
      if (!box) return;
      box.innerHTML = logsCajaNegra.map(l => `<p class="text-gray-300"><span class="text-swagLime">></span> ${l}</p>`).join('');
    }

    function limpiarLogs() {
      logsCajaNegra = [`[${new Date().toLocaleTimeString()}] Registro limpiado por el CEO.`];
      guardarEstadoCompleto();
      renderizarLogs();
    }

    let categoriaSeleccionada = 'todos';
    let productoActualModal = null;
    let contadorClicsLogo = 0;
    let temporizadorClics = null;

    // SECUENCIA TRIPLE CLIC LOGO
    function registrarClicLogo() {
      reproducirSonido('click');
      contadorClicsLogo++;
      clearTimeout(temporizadorClics);

      if (contadorClicsLogo >= 3) {
        contadorClicsLogo = 0;
        solicitarAccesoCEO();
      } else {
        temporizadorClics = setTimeout(() => { contadorClicsLogo = 0; }, 800);
      }
    }

    // SECUENCIA TECLAS CTRL + SHIFT + A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        solicitarAccesoCEO();
      }
    });

    async function solicitarAccesoCEO() {
      const vault = document.getElementById('ceoVault');
      const errorBox = document.getElementById('ceoVaultError');
      if (!vault) return;
      errorBox.textContent = '';
      vault.classList.add('is-open');
      vault.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('ceoVaultEmail')?.focus(), 220);
      if (!swagDb) { errorBox.textContent = "No se pudo conectar con el servicio de autenticación. Comprueba tu conexión e inténtalo de nuevo."; return; }
      const { data: sessionData } = await swagDb.auth.getSession();
      if (sessionData.session) {
        swagAdminSession = sessionData.session;
        const { data: admin, error } = await swagDb.from("swag_admins").select("user_id").eq("user_id", sessionData.session.user.id).maybeSingle();
        if (!error && admin) { cerrarBovedaCEO(); abrirAdmin(); return; }
        await swagDb.auth.signOut();
        swagAdminSession = null;
      }
    }

    function cerrarBovedaCEO() {
      const vault = document.getElementById('ceoVault');
      if (!vault) return;
      vault.classList.remove('is-open');
      vault.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.getElementById('ceoVaultError').textContent = '';
      document.getElementById('ceoVaultForm').reset();
      const password = document.getElementById('ceoVaultPassword');
      if (password) password.type = 'password';
      safeCreateIcons();
    }

    function alternarVisibilidadClaveCEO() {
      const input = document.getElementById('ceoVaultPassword');
      const eye = document.getElementById('ceoVaultEye');
      if (!input || !eye) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      eye.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
      safeCreateIcons();
    }

    async function iniciarSesionCEO(event) {
      event.preventDefault();
      const email = document.getElementById('ceoVaultEmail').value.trim();
      const password = document.getElementById('ceoVaultPassword').value;
      const errorBox = document.getElementById('ceoVaultError');
      const button = document.getElementById('ceoVaultSubmit');
      const original = button.innerHTML;
      errorBox.textContent = '';
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i><span>Verificando credenciales...</span>';
      safeCreateIcons();
      try {
        if (!swagDb) throw new Error("No se pudo conectar con el servicio de autenticación. Comprueba tu conexión e inténtalo de nuevo.");
        const { data, error } = await swagDb.auth.signInWithPassword({ email, password });
        if (error) throw new Error('No se pudo iniciar sesión. Verifica tu correo y contraseña.');
        const { data: admin, error: adminError } = await swagDb.from("swag_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
        if (adminError || !admin) {
          await swagDb.auth.signOut();
          throw new Error('Este usuario no tiene permisos de administrador SWAG.');
        }
        swagAdminSession = data.session;
        reproducirSonido('exito');
        registrarLog("Acceso CEO autenticado mediante Supabase.");
        cerrarBovedaCEO();
        abrirAdmin();
      } catch (err) {
        errorBox.textContent = err.message || 'No se pudo validar el acceso. Inténtalo de nuevo.';
        button.innerHTML = original;
        button.disabled = false;
        safeCreateIcons();
      }
    }

    function agregarNuevaCategoria() {
      const input = document.getElementById('nuevaCatInput');
      const nuevaCat = input.value.trim();
      if (nuevaCat && !listaCategorias.includes(nuevaCat)) {
        listaCategorias.push(nuevaCat);
        guardarEstadoCompleto();
        actualizarSelectoresCategorias();
        renderizarCategorias();
        renderizarCatEliminar();
        reproducirSonido('exito');
        registrarLog(`Categoría creada: "${nuevaCat}"`);
        input.value = '';
      }
    }

    function eliminarCategoria(catNombre) {
      if (confirm(`¿Seguro que deseas eliminar la categoría "${catNombre}"?`)) {
        reproducirSonido('trash');
        listaCategorias = listaCategorias.filter(c => c !== catNombre);
        guardarEstadoCompleto();
        actualizarSelectoresCategorias();
        renderizarCategorias();
        renderizarCatEliminar();
        registrarLog(`Categoría eliminada: "${catNombre}"`);
      }
    }

    function renderizarCatEliminar() {
      const container = document.getElementById('listaCatEliminar');
      if (!container) return;
      container.innerHTML = '';
      listaCategorias.forEach(cat => {
        const badge = document.createElement('span');
        badge.className = "bg-swagGray text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/10";
        badge.innerHTML = `${cat} <button onclick="eliminarCategoria('${cat}')" class="text-red-400 hover:text-red-600 font-bold ml-1">×</button>`;
        container.appendChild(badge);
      });
    }

    function actualizarSelectoresCategorias() {
      const select = document.getElementById('pCategoria');
      if (!select) return;
      select.innerHTML = '';
      listaCategorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        select.appendChild(option);
      });
    }

    function renderizarCategorias() {
      const contenedor = document.getElementById('contenedorCategorias');
      if (!contenedor) return;
      const categoriasUnicas = ['todos', ...listaCategorias];
      contenedor.innerHTML = '';
      categoriasUnicas.forEach(cat => {
        const btn = document.createElement('button');
        const activa = categoriaSeleccionada === cat;
        btn.className = `px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold uppercase transition border text-ellipsis overflow-hidden whitespace-nowrap max-w-[140px] ${
          activa ? 'bg-swagLime text-black border-swagLime shadow-md' : 'bg-swagDark text-gray-300 border-white/10 hover:border-swagLime'
        }`;
        btn.innerText = cat === 'todos' ? 'Todos' : cat;
        btn.onclick = () => {
          reproducirSonido('click');
          categoriaSeleccionada = cat;
          renderizarCategorias();
          renderizarProductos();
        };
        contenedor.appendChild(btn);
      });
    }

    function renderizarProductos() {
      const grid = document.getElementById('gridProductos');
      if (!grid) return;
      const maxPresupuesto = parseFloat(document.getElementById('presupuestoInput').value);
      grid.innerHTML = '';

      const filtrados = productos.filter(p => {
        const coincideCat = categoriaSeleccionada === 'todos' || p.categoria === categoriaSeleccionada;
        const coincidePrecio = p.precio <= maxPresupuesto;
        return coincideCat && coincidePrecio;
      });

      if (filtrados.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><p class="text-sm font-bold">No hay artículos disponibles dentro de este presupuesto ($${maxPresupuesto} USD)</p></div>`;
        return;
      }

      filtrados.forEach(p => {
        const fotoPortada = (p.fotos && p.fotos[p.portadaIndex]) ? p.fotos[p.portadaIndex] : (p.fotos ? p.fotos[0] : '');
        const card = document.createElement('div');
        card.id = `prod-card-${p.id}`;
        card.className = "bg-swagCard rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-swagLime transition duration-300 transform hover:-translate-y-1 animate-fade-in";
        card.innerHTML = `
          <div>
            <div class="h-48 overflow-hidden relative cursor-pointer" onclick="verDetalles(${p.id}); reproducirSonido('click');">
              <img src="${fotoPortada}" alt="${p.nombre}" class="w-full h-full object-cover hover:scale-105 transition duration-500">
              <span class="absolute top-3 left-3 bg-black/80 text-swagLime border border-swagLime/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase max-w-[120px] truncate">${p.categoria}</span>
              <span class="absolute top-3 right-3 bg-swagLime text-black font-bold text-[9px] px-2 py-0.5 rounded-full">${p.fotos ? p.fotos.length : 0} Fotos</span>
            </div>
            <div class="p-5">
              <h3 class="text-base font-bold text-white mb-1 truncate">${p.nombre}</h3>
              <p class="text-xl font-black text-swagLime glow-text mb-2">$${p.precio} USD</p>
              <p class="text-[11px] text-gray-400 line-clamp-2">${p.specs || 'Sin especificaciones añadidas.'}</p>
            </div>
          </div>
          <div class="p-5 pt-0 flex gap-2">
            <button onclick="verDetalles(${p.id}); reproducirSonido('click');" class="flex-1 bg-swagGray text-white font-bold py-2.5 rounded-xl hover:bg-white hover:text-black transition uppercase text-[11px]">Ficha / Fotos</button>
            <button onclick="abrirCotizacion('${p.nombre}', ${p.precio}); reproducirSonido('click');" class="flex-1 bg-swagLime text-black font-extrabold py-2.5 rounded-xl hover:bg-white transition flex items-center justify-center gap-1 uppercase text-[11px] truncate shadow-md">Cotizar</button>
          </div>
        `;
        grid.appendChild(card);
      });
      safeCreateIcons();
    }


    // PORTADA DINÁMICA: categorías y productos destacados usan los datos reales del catálogo.
    function renderizarInicio() {
      const categoriesHost = document.getElementById("swagHomeCategories");
      const featuredHost = document.getElementById("swagHomeFeatured");
      const heroImage = document.getElementById("swagHomeHeroImage");
      const heroName = document.getElementById("swagHomeHeroName");
      const safeText = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
      const categoryPhotos = {
        "teléfonos":"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=500&q=80",
        "telefonos":"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=500&q=80",
        "smart tv":"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=80",
        "parlantes":"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=500&q=80",
        "perfumes":"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80",
        "joyas":"https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=500&q=80"
      };
      const imageFor = category => {
        const match = productos.find(p => String(p.categoria).toLowerCase() === String(category).toLowerCase() && p.fotos?.length);
        return match ? (match.fotos[match.portadaIndex] || match.fotos[0]) : (categoryPhotos[String(category).toLowerCase()] || "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80");
      };
      if (categoriesHost) {
        categoriesHost.innerHTML = "";
        const categories = (Array.isArray(listaCategorias) ? listaCategorias : []).slice(0, 10);
        if (!categories.length) categoriesHost.innerHTML = '<div class="swag-home-empty">Pronto verás aquí nuestras categorías.</div>';
        categories.forEach(category => {
          const button = document.createElement("button");
          button.type = "button"; button.className = "swag-home-category";
          const img = document.createElement("img"); img.src = imageFor(category); img.alt = ""; img.loading = "lazy";
          const label = document.createElement("span"); label.innerHTML = `${safeText(category)}<small>Explorar categoría</small>`;
          button.append(img, label);
          button.addEventListener("click", () => {
            categoriaSeleccionada = category;
            renderizarCategorias(); renderizarProductos();
            if (typeof window.showPage === "function") window.showPage("page-catalog");
          });
          categoriesHost.appendChild(button);
        });
      }
      const featured = (Array.isArray(productos) ? productos : []).slice(0, 3);
      if (heroImage && heroName) {
        if (homeFeature?.image) {
          heroImage.src = homeFeature.image;
          heroImage.alt = homeFeature.title || 'Producto destacado de SWAG';
          heroName.textContent = homeFeature.title || 'Producto destacado';
          const captionSmall=document.querySelector('.swag-visual-caption small');
          if(captionSmall)captionSmall.textContent=homeFeature.subtitle||'Una selección especial de SWAG.';
        } else if (featured.length) {
          const p = featured[0]; const photo = p.fotos?.[p.portadaIndex] || p.fotos?.[0];
          if (photo) heroImage.src = photo;
          heroImage.alt = p.nombre || 'Producto destacado';
          heroName.textContent = p.nombre || "Producto destacado";
          const captionSmall=document.querySelector('.swag-visual-caption small');
          if(captionSmall)captionSmall.textContent='Explora el catálogo y encuentra tu próximo favorito.';
        }
      }
      if (featuredHost) {
        featuredHost.innerHTML = "";
        if (!featured.length) featuredHost.innerHTML = '<div class="swag-home-empty">Estamos preparando la selección destacada. Vuelve pronto.</div>';
        featured.forEach(product => {
          const card = document.createElement("article"); card.className = "swag-home-product"; card.tabIndex = 0; card.setAttribute("role", "button"); card.setAttribute("aria-label", `Ver ${product.nombre || "producto"}`);
          const img = document.createElement("img"); img.loading = "lazy"; img.alt = product.nombre || "Producto"; img.src = product.fotos?.[product.portadaIndex] || product.fotos?.[0] || "";
          const info = document.createElement("div"); info.className = "swag-home-product-info";
          const category = document.createElement("small"); category.textContent = product.categoria || "SWAG";
          const name = document.createElement("strong"); name.textContent = product.nombre || "Producto";
          const price = document.createElement("b"); price.textContent = `$${Number(product.precio || 0).toLocaleString("en-US")} USD`;
          info.append(category,name,price); card.append(img,info);
          const open = () => { if (typeof window.showPage === "function") window.showPage("page-catalog"); if (typeof verDetalles === "function") verDetalles(product.id); };
          card.addEventListener("click",open); card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
          featuredHost.appendChild(card);
        });
      }
      if (typeof safeCreateIcons === "function") safeCreateIcons();
    }

    function abrirAdmin() {
      document.getElementById('adminSection').classList.remove('hidden');
      renderizarCatEliminar();
      renderizarListaAdmin();
      renderizarListaShowcase();
      renderizarLogs();
      renderizarEstadisticasVisitas();
      renderizarPaletasGuardadas();
      pintarControlesPaleta(swagThemeData.palette || SWAG_DEFAULT_PALETTE);
      renderizarHomeFeatureAdmin();
      const soundToggle=document.getElementById('swagSoundEnabled');if(soundToggle)soundToggle.checked=!!swagSoundData.enabled;
      const soundRange=document.getElementById('swagSoundVolume');if(soundRange)soundRange.value=Math.round(swagSoundData.volume*100);
      const soundOutput=document.getElementById('swagSoundVolumeValue');if(soundOutput)soundOutput.textContent=`${Math.round(swagSoundData.volume*100)}%`;
    }
    async function cerrarAdmin() { document.getElementById('adminSection').classList.add('hidden'); if (swagDb?.auth) await swagDb.auth.signOut(); swagAdminSession = null; }

    function renderizarListaAdmin() {
      const container = document.getElementById('listaAdminProductos');
      if (!container) return;
      container.innerHTML = '';
      productos.forEach(p => {
        const fotoPortada = (p.fotos && p.fotos[p.portadaIndex]) ? p.fotos[p.portadaIndex] : (p.fotos ? p.fotos[0] : '');
        const item = document.createElement('div');
        item.id = `admin-item-${p.id}`;
        item.className = "bg-swagDark p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2 transition duration-300";
        item.innerHTML = `
          <div class="flex items-center gap-2 overflow-hidden">
            <img src="${fotoPortada}" class="w-8 h-8 rounded-lg object-cover flex-shrink-0">
            <div class="truncate">
              <p class="text-xs font-bold text-white truncate">${p.nombre}</p>
              <p class="text-[10px] text-swagLime font-bold">$${p.precio} USD - ${p.categoria}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="eliminarProducto(${p.id})" class="bg-red-600 text-white font-extrabold p-1.5 rounded-lg hover:bg-red-500 flex-shrink-0"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        `;
        container.appendChild(item);
      });
      safeCreateIcons();
    }

    function eliminarProducto(id) {
      reproducirSonido('trash');
      const itemElem = document.getElementById(`admin-item-${id}`);
      const prod = productos.find(p => p.id === id);
      if (itemElem) itemElem.classList.add('animate-trash-slide');
      
      setTimeout(() => {
        productos = productos.filter(p => p.id !== id);
        guardarEstadoCompleto();
        if (prod) registrarLog(`Artículo eliminado: "${prod.nombre}"`);
        renderizarProductos();
        renderizarListaAdmin();
      }, 400);
    }

    function guardarProducto(e) {
      e.preventDefault();
      reproducirSonido('exito');

      const nombre = document.getElementById('pNombre').value;
      const precio = parseFloat(document.getElementById('pPrecio').value);
      const categoria = document.getElementById('pCategoria').value;
      const specs = document.getElementById('pSpecs').value;
      const portadaIdx = parseInt(document.getElementById('pPortadaIdx').value);

      const file1 = document.getElementById('pFile1').files[0];
      const file2 = document.getElementById('pFile2').files[0];
      const file3 = document.getElementById('pFile3').files[0];

      const url1 = document.getElementById('pUrl1').value || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";
      const url2 = document.getElementById('pUrl2').value || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80";
      const url3 = document.getElementById('pUrl3').value || "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80";

      const leerArchivo = (file, fallback) => {
        return new Promise((resolve) => {
          if (file) {
            const r = new FileReader();
            r.onload = (res) => resolve(res.target.result);
            r.readAsDataURL(file);
          } else {
            resolve(fallback);
          }
        });
      };

      Promise.all([leerArchivo(file1, url1), leerArchivo(file2, url2), leerArchivo(file3, url3)]).then((fotosFinales) => {
        const nuevo = {
          id: Date.now(),
          nombre,
          precio,
          categoria,
          specs,
          fotos: fotosFinales,
          portadaIndex: portadaIdx
        };

        productos.unshift(nuevo);
        guardarEstadoCompleto();
        registrarLog(`Nuevo artículo creado: "${nombre}" ($${precio} USD)`);

        renderizarCategorias();
        renderizarProductos();
        renderizarListaAdmin();
        document.getElementById('formProducto').reset();
        cerrarAdmin();
      });
    }

    function verDetalles(id) {
      const p = productos.find(item => item.id === id);
      if (!p) return;

      document.getElementById('detallesTitulo').innerText = p.nombre;
      document.getElementById('detallesPrecio').innerText = `$${p.precio} USD`;
      document.getElementById('detallesSpecs').innerText = p.specs || "Garantía de calidad SWAG.";
      document.getElementById('imagenActivaModal').src = (p.fotos && p.fotos[p.portadaIndex]) ? p.fotos[p.portadaIndex] : p.fotos[0];

      const miniContainer = document.getElementById('galeriaMiniaturas');
      miniContainer.innerHTML = '';
      if (p.fotos) {
        p.fotos.forEach((imgUrl, idx) => {
          const thumb = document.createElement('img');
          thumb.src = imgUrl;
          thumb.className = `w-14 h-14 rounded-xl object-cover cursor-pointer border-2 transition ${idx === p.portadaIndex ? 'border-swagLime' : 'border-transparent opacity-60'}`;
          thumb.onclick = () => {
            reproducirSonido('click');
            document.getElementById('imagenActivaModal').src = imgUrl;
            Array.from(miniContainer.children).forEach(t => t.classList.remove('border-swagLime', 'opacity-100'));
            thumb.classList.add('border-swagLime', 'opacity-100');
          };
          miniContainer.appendChild(thumb);
        });
      }

      document.getElementById('btnCotizarDesdeDetalle').onclick = () => {
        reproducirSonido('click');
        cerrarDetalle();
        abrirCotizacion(p.nombre, p.precio);
      };

      document.getElementById('detalleModal').classList.remove('hidden');
    }

    function cerrarDetalle() { document.getElementById('detalleModal').classList.add('hidden'); }
    
    // CONTROL DE PRESUPUESTO MANUAL O DESLIZANTE
    function actualizarDesdeSlider(val) {
      reproducirSonido('slide');
      document.getElementById('presupuestoInputNumerico').value = val;
      renderizarProductos();
    }

    function actualizarDesdeInput(val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
        const slider = document.getElementById('presupuestoInput');
        if (num <= parseFloat(slider.max)) {
          slider.value = num;
        }
        renderizarProductos();
      }
    }

    function filtrarPorPresupuesto(val) {
      actualizarDesdeSlider(val);
    }

    function abrirCotizacion(nombre, precio) {
      productoActualModal = { nombre, precio };
      document.getElementById('modalProductoNombre').innerText = `${nombre} ($${precio} USD)`;
      document.getElementById('cotizacionModal').classList.remove('hidden');
    }

    function cerrarModalCotizacion() { document.getElementById('cotizacionModal').classList.add('hidden'); }

    function enviarAWhatsApp(e) {
      e.preventDefault();
      reproducirSonido('exito');
      const nombre = document.getElementById('clienteNombre').value;
      const telefono = document.getElementById('clienteTelefono').value;
      const numWA = "50581759796";

      registrarLog(`Cotización enviada por ${nombre} (${productoActualModal.nombre})`);

      const mensaje = `¡Hola SWAG! Me interesa cotizar este producto:%0A- *Artículo:* ${productoActualModal.nombre}%0A- *Precio:* $${productoActualModal.precio} USD%0A- *Cliente:* ${nombre}%0A- *Teléfono:* ${telefono}`;
      cerrarModalCotizacion();
      window.open(`https://wa.me/${numWA}?text=${mensaje}`, '_blank');
    }


    // Interacción 3D del escaparate de inicio; los artículos se administran desde el Panel CEO.
    (function iniciarEscaparate3D(){
      const stage = document.getElementById('techStage');
      const ring = document.getElementById('techRing');
      if (!stage || !ring) return;
      let angle = 0, velocity = 0, dragging = false, lastX = 0, lastTime = 0, frame = 0, running = false;
      function placeCards(){
        const cards = Array.from(ring.querySelectorAll('.tech-card'));
        const total = cards.length;
        const mobile = window.innerWidth < 640;
        const radius = mobile ? Math.min(340, Math.max(220, total * 37)) : Math.min(620, Math.max(330, total * 58));
        cards.forEach((card,i)=>{
          const a = (360/Math.max(total,1))*i;
          card.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
        });
        ring.style.transform = `rotateY(${angle}deg)`;
      }
      window.actualizarPosicionesShowcase = placeCards;
      function animate(){
        if(!running || document.hidden) return;
        if(!dragging){ angle += velocity || 0.075; velocity *= 0.96; if(Math.abs(velocity)<0.012) velocity=0; }
        ring.style.transform = `rotateY(${angle}deg)`;
        frame = requestAnimationFrame(animate);
      }
      function startAnimation(){
        if(running || document.hidden) return;
        running = true;
        frame = requestAnimationFrame(animate);
      }
      function stopAnimation(){
        running = false;
        if(frame) cancelAnimationFrame(frame);
        frame = 0;
      }
      function pointerDown(e){ if(!ring.children.length)return; dragging=true; stage.classList.add('dragging'); lastX=e.clientX; lastTime=performance.now(); velocity=0; stage.setPointerCapture(e.pointerId); }
      function pointerMove(e){ if(!dragging)return; const now=performance.now(), dx=e.clientX-lastX, dt=Math.max(1,now-lastTime); angle += dx*0.42; velocity=(dx/dt)*2.2; lastX=e.clientX; lastTime=now; ring.style.transform=`rotateY(${angle}deg)`; }
      function pointerUp(){ dragging=false; stage.classList.remove('dragging'); }
      stage.addEventListener('pointerdown',pointerDown);
      stage.addEventListener('pointermove',pointerMove);
      stage.addEventListener('pointerup',pointerUp);
      stage.addEventListener('pointercancel',pointerUp);
      stage.addEventListener('lostpointercapture',pointerUp);
      window.addEventListener('resize',placeCards,{passive:true});
      renderizarEscaparate3DCards(); placeCards();
      // El escaparate 3D solo consume recursos cuando su página está visible.
      document.addEventListener('swag:pagechange', event => {
        if(event.detail?.pageId === 'page-tech') startAnimation();
        else stopAnimation();
      });
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden) stopAnimation();
        else if(document.getElementById('page-tech')?.classList.contains('active')) startAnimation();
      });
      if(document.getElementById('page-tech')?.classList.contains('active')) startAnimation();
    })();

    // INICIALIZACIÓN: primero mostrar datos locales y después sincronizar el estado compartido.
    aplicarTemaSWAG();
    renderizarTextosHero();
    iniciarRotadorHero();
    actualizarSelectoresCategorias();
    registrarVisitaSitio();
    renderizarCategorias();
    renderizarProductos();
    renderizarInicio();
    cargarEstadoDesdeNube().catch(err => console.warn("Sincronización inicial pendiente:", err));
  


    // Los iconos se inicializan cuando script.js ya está cargado y el DOM existe.
    safeCreateIcons();

    // PWA SWAG: instalación y caché de la interfaz. Los datos privados/API nunca se guardan en caché.
    (function(){
      const installBtn=document.getElementById('swagInstallBtn');
      let installPrompt=null;
      window.addEventListener('beforeinstallprompt',event=>{
        event.preventDefault(); installPrompt=event;
        if(installBtn) installBtn.classList.add('show');
      });
      installBtn?.addEventListener('click',async()=>{
        if(!installPrompt) return;
        installPrompt.prompt();
        try{ await installPrompt.userChoice; }catch(e){}
        installPrompt=null; installBtn.classList.remove('show');
      });
      window.addEventListener('appinstalled',()=>{installPrompt=null;installBtn?.classList.remove('show');});
      if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
        window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SWAG PWA: no se pudo registrar el service worker:',err)));
      }
    })();
