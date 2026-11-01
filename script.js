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

    activate(activeIndex, { scroll: false });
    stage?.classList.add('ccm-11_ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWheel, { once: true });
  } else {
    mountWheel();
  }
})();


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

    // AUDIO
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    function reproducirSonido(tipo) {
      try {
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (tipo === 'click') {
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
          osc.start(now); osc.stop(now + 0.05);
        } else if (tipo === 'trash') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
        } else if (tipo === 'exito') {
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.start(now); osc.stop(now + 0.2);
        }
      } catch (e) {}
    }

    // ANIMACIÓN DE SCROLL DINÁMICA (REVEAL/HIDE AL DESLIZAR)
    window.addEventListener('scroll', () => {
      const hero = document.getElementById('heroSection');
      const title = document.getElementById('heroTituloText');
      const desc = document.getElementById('heroDescText');
      if (!title || !desc) return;

      const scrollY = window.scrollY;
      if (scrollY > 150) {
        title.classList.add('opacity-0', '-translate-y-6');
        title.classList.remove('opacity-100', 'translate-y-0');
        desc.classList.add('opacity-0', '-translate-y-6');
        desc.classList.remove('opacity-100', 'translate-y-0');
      } else {
        title.classList.remove('opacity-0', '-translate-y-6');
        title.classList.add('opacity-100', 'translate-y-0');
        desc.classList.remove('opacity-0', '-translate-y-6');
        desc.classList.add('opacity-100', 'translate-y-0');
      }
    });

    // CARGA DE TEXTO DE HERO
    const SWAG_THEMES = {
      original:{name:"SWAG Original",effects:false},
      navidad:{name:"Navidad",effects:true},
      "ano-nuevo":{name:"Año Nuevo",effects:true},
      noche:{name:"Midnight",effects:false}
    };
    let swagThemeData = {id:"original",effects:false};
    try { const savedTheme=JSON.parse(localStorage.getItem(STORAGE_KEY_THEME)||"null"); if(savedTheme && SWAG_THEMES[savedTheme.id]) swagThemeData={...swagThemeData,...savedTheme}; } catch(e){}
    function aplicarTemaSWAG(){
      const id=SWAG_THEMES[swagThemeData.id]?swagThemeData.id:"original";
      document.body.dataset.swagTheme=id;
      document.body.classList.toggle("swag-effects-on",!!swagThemeData.effects);
      const fx=document.getElementById("swagSeasonFx");
      if(fx){fx.className=(id==="navidad" && swagThemeData.effects)?"snow":"";}
      const toggle=document.getElementById("swagThemeEffects"); if(toggle) toggle.checked=!!swagThemeData.effects;
      const status=document.getElementById("swagThemeStatus"); if(status) status.textContent="Tema actual: "+SWAG_THEMES[id].name;
      document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("is-active",b.dataset.themeChoice===id));
    }
    function guardarTemaSWAG(){
      localStorage.setItem(STORAGE_KEY_THEME,JSON.stringify(swagThemeData));
      aplicarTemaSWAG();
      if(typeof programarGuardadoNube==="function") programarGuardadoNube();
    }
    function seleccionarTemaSWAG(id){
      if(!SWAG_THEMES[id]) return;
      swagThemeData.id=id;
      if(id==="original" || id==="noche") swagThemeData.effects=false;
      else swagThemeData.effects=true;
      guardarTemaSWAG();
      if(typeof reproducirSonido==="function") reproducirSonido("exito");
      if(typeof registrarLog==="function") registrarLog("Tema visual cambiado a "+SWAG_THEMES[id].name+".");
    }
    function cambiarEfectosTemaSWAG(enabled){swagThemeData.effects=!!enabled;guardarTemaSWAG();}

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

    // TITULAR ROTATORIO DEL HERO — fácil de editar
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
    function iniciarRotadorHero(){
      if (heroRotatorInterval !== null) clearInterval(heroRotatorInterval);
      if (heroRotatorTransition !== null) clearTimeout(heroRotatorTransition);
      heroRotatorInterval = null;
      heroRotatorTransition = null;
      const wordEl = document.getElementById("heroRotatorWord");
      if (!wordEl) return;
      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let currentIndex = 0;
      wordEl.textContent = HERO_ROTATOR_WORDS[0];
      if (reduceMotion) return;

      function cambiarPalabra(){
        if (document.hidden || !HERO_ROTATOR_WORDS.length) return;
        wordEl.classList.add("is-leaving");
        wordEl.classList.remove("is-entering");
        heroRotatorTransition = setTimeout(() => {
          currentIndex = (currentIndex + 1) % HERO_ROTATOR_WORDS.length;
          wordEl.textContent = HERO_ROTATOR_WORDS[currentIndex];
          wordEl.classList.remove("is-leaving");
          wordEl.classList.add("is-entering");
          requestAnimationFrame(() => requestAnimationFrame(() => wordEl.classList.remove("is-entering")));
          heroRotatorTransition = null;
        }, 300);
      }
      function iniciar(){
        if (heroRotatorInterval !== null) clearInterval(heroRotatorInterval);
        if (!document.hidden) heroRotatorInterval = setInterval(cambiarPalabra, 2300);
      }
      if (!window.swagHeroRotatorVisibilityHandler) {
        window.swagHeroRotatorVisibilityHandler = () => {
          if (document.hidden) {
            if (heroRotatorInterval !== null) clearInterval(heroRotatorInterval);
            heroRotatorInterval = null;
            if (heroRotatorTransition !== null) clearTimeout(heroRotatorTransition);
            heroRotatorTransition = null;
            const current = document.getElementById("heroRotatorWord");
            if (current) current.classList.remove("is-leaving", "is-entering");
          } else iniciar();
        };
        document.addEventListener("visibilitychange", window.swagHeroRotatorVisibilityHandler);
      }
      iniciar();
    }

    function renderizarTextosHero() {
      const title = document.getElementById('heroTituloText');
      const desc = document.getElementById('heroDescText');
      if (title) {
        title.innerHTML = 'Tu tienda de <span id="heroRotatorWord" class="hero-rotator-word" aria-live="polite">celulares</span>.';
      }
      const inputDesc = document.getElementById('editHeroDesc');
      if (inputDesc) inputDesc.value = heroTextData.desc;
      // El render puede reemplazar el span (por ejemplo, al sincronizar Supabase).
      // Reiniciar aquí asegura que el intervalo siempre controle el elemento visible.
      iniciarRotadorHero();
    }

    function guardarTextosHero() {
      const inputDesc = document.getElementById('editHeroDesc').value;
      if (!inputDesc.trim()) return;

      heroTextData = { ...heroTextData, titulo: "Tu tienda de [palabra automática]", desc: inputDesc };
      localStorage.setItem(STORAGE_KEY_HERO, JSON.stringify(heroTextData));
      programarGuardadoNube();
      renderizarTextosHero();
      iniciarRotadorHero();
      reproducirSonido('exito');
      registrarLog("Textos principales de la página de inicio actualizados.");
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
      return { categorias: listaCategorias, productos, logs: logsCajaNegra, hero: heroTextData, showcase: showcaseItems, theme: swagThemeData };
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
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(swagThemeData));
      localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(listaCategorias));
      localStorage.setItem(STORAGE_KEY_PRODS, JSON.stringify(productos));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logsCajaNegra));
      localStorage.setItem(STORAGE_KEY_HERO, JSON.stringify(heroTextData));
      localStorage.setItem(STORAGE_KEY_SHOWCASE, JSON.stringify(showcaseItems));
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
      if (featured.length && heroImage && heroName) {
        const p = featured[0]; const photo = p.fotos?.[p.portadaIndex] || p.fotos?.[0];
        if (photo) heroImage.src = photo;
        heroName.textContent = p.nombre || "Producto destacado";
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
