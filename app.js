(() => {
  const KEY = "aoa_training_v1";
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const state = loadState();
  applyTheme(state.theme);

  // Build date
  $("#buildDate").textContent = new Date().toLocaleDateString("es-DO", {year:"numeric", month:"long", day:"numeric"});

  // Progress
  const sections = ["intro","objetivo","radio","tfe","senalizacion","marcas","luces","normas","quiz"];
  const completed = new Set(state.completed || []);
  updateNav();
  updateProgress();

  // Active nav on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        $$(".navlink").forEach(a => a.classList.remove("active"));
        const link = $(`.navlink[data-section="${e.target.dataset.section}"]`);
        if (link) link.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });

  $$(".panel").forEach(p => observer.observe(p));

  // Complete buttons
  $$("[data-complete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sec = btn.getAttribute("data-complete");
      completed.add(sec);
      persist();
      updateNav();
      updateProgress();
      toast(`Sección “${label(sec)}” completada.`);
    });
  });

  // Theme
  $("#btnTheme").addEventListener("click", () => {
    state.theme = (state.theme === "light") ? "dark" : "light";
    applyTheme(state.theme);
    persist();
  });

  // Reset
  $("#btnReset").addEventListener("click", () => {
    if (!confirm("¿Seguro que deseas reiniciar progreso y resultados guardados?")) return;
    localStorage.removeItem(KEY);
    location.reload();
  });

  // Toggle phonetic
  $$("[data-toggle]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-toggle");
      const el = document.getElementById(id);
      el.classList.toggle("hidden");
    });
  });

  // Radio simulation (3 incorrectas + 1 correcta con retroalimentación)
  $$("[data-sim]").forEach(b => {
    b.addEventListener("click", () => {
      const kind = b.getAttribute("data-sim");
      const out = $("#simOut");

      const correctText = '“Copiado: autorizado proceder al punto de espera <strong>P 08/26</strong> vía <strong>TWY A</strong>. Notificaré establecido.”';

      const bank = {
        a: {
          ok: false,
          example: "“Ok, voy para allá.”",
          feedback: [
            "Ambigua: no incluye posición, punto, pista ni ruta.",
            "No confirma autorización ni hace colación.",
            "Riesgo: interpretación distinta y posible incursión."
          ]
        },
        b: {
          ok: false,
          example: "“Estoy en taxiway… solicito pasar.”",
          feedback: [
            "Incompleta: no identifica TWY exacta, lado, ni punto de espera.",
            "La solicitud no es específica (¿pasar a dónde?).",
            "Recomendación: indicar posición + solicitud concreta."
          ]
        },
        c: {
          ok: false,
          example: "“Copiado, procederé.”",
          feedback: [
            "La colación debe repetir elementos críticos: punto/pista/vía.",
            "Sin repetir, ATC no puede confirmar que entendiste correctamente.",
            "Recomendación: readback completo y notificación “establecido”."
          ]
        },
        d: {
          ok: true,
          example: "Colación completa",
          feedback: [
            "Incluye ruta (vía), punto de espera y pista.",
            "Reduce ambigüedades y confirma entendimiento.",
            "Cierra el circuito: notifica cuando estés establecido."
          ]
        }
      };

      const item = bank[kind];
      if (!item) return;

      if (item.ok) {
        out.innerHTML = `
          <div><span class="badge good">Correcto</span></div>
          <div style="margin-top:8px">${correctText}</div>
          <div style="margin-top:10px"><strong>Por qué:</strong>
            <ul style="margin:6px 0 0; padding-left:18px">
              ${item.feedback.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          </div>
        `;
      } else {
        out.innerHTML = `
          <div><span class="badge bad">Incorrecto</span> <strong>Ejemplo:</strong> ${escapeHtml(item.example)}</div>
          <div style="margin-top:10px"><strong>Retroalimentación:</strong>
            <ul style="margin:6px 0 0; padding-left:18px">
              ${item.feedback.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          </div>
          <div style="margin-top:10px" class="muted"><strong>Pista:</strong> identifica posición (TWY/lado), solicita autorización concreta y repite (colación) ruta + punto + pista.</div>
        `;
      }
    });
  });

  // Mini evaluation
  $$("[data-mini]").forEach(b => {
    b.addEventListener("click", () => {
      const ans = b.getAttribute("data-mini");
      const out = $("#miniOut");
      if (ans === "b") {
        out.innerHTML = `<span class="badge good">Correcto</span> Debes detenerte <strong>detrás</strong> de la línea sólida y esperar autorización ATC.`;
      } else {
        out.innerHTML = `<span class="badge bad">Incorrecto</span> No debes colocarte encima. Detente <strong>detrás</strong> de la línea sólida y confirma por radio.`;
      }
    });
  });

  // Modal content (signage)
  const modal = $("#modal");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalClose = $("#modalClose");

  const modals = {
    holdbar: {
      title: "Punto de espera de pista (Hold Bar)",
      body: `
        <p><strong>Función:</strong> identifica dónde pilotos y vehículos deben esperar autorización ATC antes de penetrar pista.</p>
        <ul>
          <li><strong>Nunca</strong> cruces sin autorización ATC.</li>
          <li>Mantente <strong>detrás</strong> de las líneas sólidas.</li>
        </ul>
        <p class="muted">Tip: si no ves claramente la marca, reduce velocidad y solicita guía/confirmación.</p>`
    },
    boundary: {
      title: "Movimiento / No movimiento (Boundary Area)",
      body: `
        <p><strong>Función:</strong> delimita el área de maniobra y movimiento.</p>
        <ul>
          <li>Requiere <strong>autorización ATC</strong> para pasar al área de maniobra.</li>
          <li>Mantente detrás de la línea sólida.</li>
        </ul>`
    },
    holding: {
      title: "Posición intermedia (Holding Position)",
      body: `
        <p>Ubicación donde aeronaves o vehículos se detienen cuando ATC lo indica, para mantener flujo de tráfico en TWY/plataforma.</p>
        <ul>
          <li>Se usa cuando existe necesidad operativa de “mantener” en intersecciones o posiciones específicas.</li>
        </ul>`
    },
    mandatory: {
      title: "Instrucciones obligatorias (Holding Position)",
      body: `
        <p>Señal para indicar una <strong>instrucción obligatoria</strong> como sistema de guía y control del movimiento en superficie.</p>
        <ul>
          <li>Complementa señales en posiciones de espera.</li>
          <li>Se utiliza junto con <strong>Hold Bars</strong>.</li>
        </ul>`
    }
  };

  $$("[data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-modal");
      const item = modals[key];
      if (!item) return;
      modalTitle.textContent = item.title;
      modalBody.innerHTML = item.body;
      openModal();
    });
  });

  function openModal(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modalClose.focus();
  }
  function closeModal(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  // Lights simulation
  const lights = {
    threshold: $("#gThreshold"),
    edge: $("#gEdge"),
    centerline: $("#gCenter"),
  };

  $$("[data-light]").forEach(b => {
    b.addEventListener("click", () => {
      const k = b.getAttribute("data-light");
      toggleLight(k);
    });
  });

  $("#btnAllOff").addEventListener("click", () => {
    Object.values(lights).forEach(g => g.classList.add("off"));
  });

  function toggleLight(k){
    const g = lights[k];
    if (!g) return;
    g.classList.toggle("off");
  }

  // Quiz
  const quizData = [
    {
      id:"q1",
      text:"1) ¿Cuál es la regla principal antes de cruzar una pista activa?",
      options:[
        "Cruzar lentamente y mirar a ambos lados",
        "Esperar autorización ATC y confirmarla con colación",
        "Cruzar si no hay aeronaves a la vista",
        "Cruzar si el supervisor lo indica por teléfono"
      ],
      answer:1,
      tags:["pista", "ATC"]
    },
    {
      id:"q2",
      text:"2) La 'colación' es:",
      options:[
        "Cambiar la frecuencia de radio",
        "Repetir el mensaje recibido para confirmar recepción correcta",
        "Hablar más lento para que ATC entienda",
        "Usar lenguaje informal para agilizar"
      ],
      answer:1,
      tags:["radio"]
    },
    {
      id:"q3",
      text:"3) ¿Qué indica un punto de espera (Hold Bar)?",
      options:[
        "Zona para estacionar el vehículo",
        "Lugar donde se reporta meteorología",
        "Lugar donde se debe detener y esperar autorización ATC antes de ingresar a pista",
        "Área de carga/descarga"
      ],
      answer:2,
      tags:["señalización"]
    },
    {
      id:"q4",
      text:"4) En una marca de 'Movimiento / No movimiento' (Boundary Area):",
      options:[
        "Se puede cruzar si llevas luces encendidas",
        "Debes tener autorización ATC para pasar al área de maniobra",
        "Solo aplica a aeronaves, no a vehículos",
        "Solo aplica de noche"
      ],
      answer:1,
      tags:["señalización", "ATC"]
    },
    {
      id:"q5",
      text:"5) ¿Cuál es el objetivo de la fraseología aeronáutica?",
      options:[
        "Hacer las comunicaciones más largas",
        "Evitar términos ambiguos y reducir errores de interpretación",
        "Permitir que cada operador use su estilo",
        "Reemplazar completamente el lenguaje simple"
      ],
      answer:1,
      tags:["radio"]
    },
    {
      id:"q6",
      text:"6) Si tienes duda sobre una instrucción por radio, lo correcto es:",
      options:[
        "Asumir el significado y continuar",
        "Detenerte y pedir aclaración (readback/colación)",
        "Esperar a que otro vehículo cruce primero",
        "Cambiar a otra frecuencia"
      ],
      answer:1,
      tags:["radio", "seguridad"]
    },
    {
      id:"q7",
      text:"7) ¿Qué color se asocia típicamente al umbral de pista en luces (Threshold Lights)?",
      options:[
        "Verde",
        "Rojo",
        "Azul",
        "Ámbar"
      ],
      answer:0,
      tags:["luces"]
    },
    {
      id:"q8",
      text:"8) El 'designador de pista' es:",
      options:[
        "Una línea discontinua en el eje",
        "Un número de dos cifras (y letra si hay paralelas) que indica la designación",
        "Una serie de luces amarillas",
        "Un letrero negro con letras amarillas"
      ],
      answer:1,
      tags:["marcas"]
    },
    {
      id:"q9",
      text:"9) ¿Qué representa la señal de eje de pista (Center Line)?",
      options:[
        "Borde utilizable de la pista",
        "Centro visual de la pista para alineación",
        "Zona de contacto de aterrizaje",
        "Salida rápida"
      ],
      answer:1,
      tags:["marcas"]
    },
    {
      id:"q10",
      text:"10) En comunicaciones, ¿por qué se busca ser breve?",
      options:[
        "Porque los canales solo permiten un transmisor a la vez",
        "Porque hablar rápido evita errores",
        "Porque ATC no necesita información de posición",
        "Porque la colación es opcional"
      ],
      answer:0,
      tags:["radio"]
    },
    {
      id:"q11",
      text:"11) Una lección práctica del caso Tenerife para operaciones en superficie es:",
      options:[
        "Confiar en que los demás siempre escuchan",
        "Evitar colación para no congestionar la frecuencia",
        "Confirmar instrucciones críticas y detenerse ante duda",
        "Cruzar rápido para salir del área de riesgo"
      ],
      answer:2,
      tags:["seguridad", "radio"]
    },
    {
      id:"q12",
      text:"12) En la zona restringida del aeródromo, está prohibido conducir si existe indicio de:",
      options:[
        "Cansancio leve",
        "Consumo de bebidas alcohólicas o sustancias prohibidas",
        "Uso de radio VHF",
        "Falta de chaleco reflectivo"
      ],
      answer:1,
      tags:["normas", "seguridad"]
    },
    {
      id:"q13",
      text:"13) En la zona restringida del aeródromo se prohíbe:",
      options:[
        "Usar luces bajas",
        "Fumar o encender fuego, incluso dentro del vehículo",
        "Circular por vías de servicio",
        "Detenerse en punto de espera"
      ],
      answer:1,
      tags:["normas", "seguridad"]
    },
    {
      id:"q14",
      text:"14) Velocidad máxima indicada para conducir en el área de movimiento:",
      options:[
        "10 km/h",
        "20 km/h",
        "30 km/h",
        "40 km/h"
      ],
      answer:1,
      tags:["normas", "conducción"]
    },
    {
      id:"q15",
      text:"15) Respecto a prioridad, siempre debes ceder el paso a:",
      options:[
        "Vehículos sin luces",
        "Aeronaves (tengan o no luces anticolisión los vehículos)",
        "Solo a vehículos de combustible",
        "Solo a autobuses de pasajeros"
      ],
      answer:1,
      tags:["normas", "prioridades"]
    },
    {
      id:"q16",
      text:"16) Distancia mínima por delante de aeronave parada con motores reactores en marcha (referencia):",
      options:[
        "2 m",
        "8.5 m",
        "25 m",
        "50 m"
      ],
      answer:1,
      tags:["normas", "distancias"]
    },
    {
      id:"q17",
      text:"17) Está prohibido cruzar por delante de una aeronave en movimiento a una distancia inferior a:",
      options:[
        "50 m",
        "100 m",
        "200 m",
        "300 m"
      ],
      answer:2,
      tags:["normas", "distancias"]
    },
    {
      id:"q18",
      text:"18) Marcha atrás / retroceso de un vehículo solo se permite cuando:",
      options:[
        "Se quiera ahorrar tiempo",
        "Sea indispensable por condiciones locales y sin invadir zonas de seguridad",
        "El conductor lo considere conveniente",
        "La plataforma esté vacía"
      ],
      answer:1,
      tags:["normas", "conducción"]
    },
    {
      id:"q19",
      text:"19) Los vehículos de emergencia que van a asistir a una aeronave en peligro tienen:",
      options:[
        "Prioridad solo en la calle de rodaje",
        "Prioridad sobre todo otro tráfico de superficie",
        "Prioridad únicamente si llevan sirena",
        "La misma prioridad que cualquier otro vehículo"
      ],
      answer:1,
      tags:["normas", "prioridades"]
    }
  ];

  const quizForm = $("#quizForm");
  renderQuiz(quizData);

  $("#btnGrade").addEventListener("click", gradeQuiz);
  $("#btnSave").addEventListener("click", () => {
    state.lastQuiz = state.lastQuiz || null;
    persist();
    toast("Resultado guardado en tu navegador.");
  });

  function renderQuiz(items){
    quizForm.innerHTML = items.map((q, i) => {
      const opts = q.options.map((opt, j) => `
        <label>
          <input type="radio" name="${q.id}" value="${j}" />
          <span>${escapeHtml(opt)}</span>
        </label>
      `).join("");
      return `
        <div class="q" data-qid="${q.id}">
          <h3>${escapeHtml(q.text)}</h3>
          <div class="opts">${opts}</div>
        </div>
      `;
    }).join("");
  }

  function gradeQuiz(){
    const answers = {};
    let correct = 0;
    const missedTags = new Map();

    quizData.forEach(q => {
      const chosen = quizForm.querySelector(`input[name="${q.id}"]:checked`);
      const val = chosen ? parseInt(chosen.value, 10) : null;
      answers[q.id] = val;

      const ok = (val === q.answer);
      if (ok) correct += 1;
      else {
        q.tags.forEach(t => missedTags.set(t, (missedTags.get(t)||0) + 1));
      }

      // simple visual feedback
      const box = quizForm.querySelector(`[data-qid="${q.id}"]`);
      box.style.borderColor = ok ? "rgba(84,209,143,.45)" : "rgba(255,93,108,.45)";
      box.style.background = ok ? "rgba(84,209,143,.08)" : "rgba(255,93,108,.06)";
    });

    const pct = Math.round((correct / quizData.length) * 100);
    const badge = pct >= 85 ? "good" : (pct >= 70 ? "warn" : "bad");
    const label = pct >= 85 ? "Aprobado" : (pct >= 70 ? "Reforzar" : "No aprobado");

    const topWeak = Array.from(missedTags.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([t,n]) => `${t} (${n})`)
      .join(", ");

    const msg = `
      <div>
        <span class="badge ${badge}">${label}</span>
        <strong>Puntaje:</strong> ${correct}/${quizData.length} · <strong>${pct}%</strong>
      </div>
      <div style="margin-top:8px">
        <strong>Recomendación:</strong> ${pct >= 85
          ? "Mantén la disciplina de colación y el respeto a puntos de espera."
          : "Repite las secciones relacionadas y vuelve a intentar el quiz."}
      </div>
      <div style="margin-top:8px">
        <strong>Áreas a reforzar:</strong> ${topWeak || "Ninguna destacada"}.
      </div>
    `;

    const result = $("#quizResult");
    result.innerHTML = msg;

    state.lastQuiz = {
      when: new Date().toISOString(),
      score: correct,
      total: quizData.length,
      pct,
      answers
    };
    persist();
    toast(`Quiz calificado: ${pct}%`);
  }

  // helpers
  function updateNav(){
    $$(".navlink").forEach(a => {
      const sec = a.getAttribute("data-section");
      a.classList.toggle("done", completed.has(sec));
    });
  }
  function updateProgress(){
    const doneCount = completed.size;
    const pct = Math.round((doneCount / sections.length) * 100);
    $(".progressbar-fill").style.width = pct + "%";
    $(".progressbar").setAttribute("aria-valuenow", String(pct));
    $("#progressPct").textContent = pct + "%";
    $("#progressText").textContent = `${doneCount}/${sections.length} secciones`;
  }
  function label(sec){
    const map = {
      intro:"Introducción",
      objetivo:"Objetivo y responsabilidades",
      radio:"Radio y fraseología",
      tfe:"Caso Tenerife",
      senalizacion:"Señalizaciones",
      marcas:"Marcas de pista",
      luces:"Luces del aeródromo",
      normas:"Normas de Control de Vehículos",
      quiz:"Quiz final"
    };
    return map[sec] || sec;
  }

  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
  }

  function persist(){
    state.completed = Array.from(completed);
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return { theme:"dark", completed:[], lastQuiz:null };
      const obj = JSON.parse(raw);
      return {
        theme: obj.theme === "light" ? "light" : "dark",
        completed: Array.isArray(obj.completed) ? obj.completed : [],
        lastQuiz: obj.lastQuiz || null
      };
    }catch{
      return { theme:"dark", completed:[], lastQuiz:null };
    }
  }

  // Simple toast (no dependency)
  let toastTimer = null;
  function toast(message){
    let el = document.getElementById("toast");
    if (!el){
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "12px";
      el.style.border = "1px solid var(--line)";
      el.style.background = "rgba(0,0,0,.55)";
      el.style.color = "var(--text)";
      el.style.backdropFilter = "blur(10px)";
      el.style.boxShadow = "var(--shadow)";
      el.style.zIndex = "200";
      el.style.maxWidth = "calc(100vw - 28px)";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2400);
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
})();