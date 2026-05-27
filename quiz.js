(function () {
  'use strict';

  /* ── Ramas del derecho panameño ─────────────────── */
  var BRANCHES = {
    penal:        
    { 
      name: 'Derecho Penal',
      emoji: '⚖️',
      desc: 'Normas que regulan delitos, faltas y penas en Panamá.' 
    },

    civil:        
    { name: 'Derecho Civil',                    
      emoji: '📜',  
      desc: 'Contratos, propiedad, obligaciones y relaciones entre particulares.' 
    },

    familia:      
    { 
      name: 'Derecho de Familia',               
      emoji: '👨‍👩‍👧',  
      desc: 'Matrimonio, divorcio, custodia, alimentos y herencias.' 
    },
    laboral:      
    { 
      name: 'Derecho Laboral',                  
      emoji: '👷',  
      desc: 'Derechos y deberes del trabajador y el empleador en Panamá.' 
    },
    comercial:    
    { 
      name: 'Derecho Comercial',                
      emoji: '🏢',  
      desc: 'Empresas, contratos mercantiles, sociedades y comercio.' 
    },

    const_:       
    { 
      name: 'Derecho Constitucional',           
      emoji: '🏛️',  
      desc: 'La Constitución Política y los derechos fundamentales del ciudadano.' 
    },

    admin:        
    { 
      name: 'Derecho Administrativo',           
      emoji: '📋',  
      desc: 'Permisos, licitaciones y contrataciones con el Estado panameño.' 
    },
    tributario:   
    { 
      name: 'Derecho Tributario',               
      emoji: '💰',  
      desc: 'Impuestos, obligaciones fiscales y relaciones con la DGI.' 
    },
    ambiental:    
    { 
      name: 'Derecho Ambiental',                
      emoji: '🌿',  
      desc: 'Protección del ambiente y recursos naturales en Panamá.' 
    },
    internacional:
    { 
      name: 'Derecho Internacional',            
      emoji: '🌐',  
      desc: 'Tratados, relaciones entre Estados y derecho internacional privado.' 
    },
    maritimo:     
    { 
      name: 'Derecho Marítimo',                 
      emoji: '⚓',  
      desc: 'Canal de Panamá, transporte marítimo y banderas de conveniencia.' 
    },
    bancario:     
    { 
      name: 'Derecho Bancario',                 
      emoji: '🏦',  
      desc: 'Sistema financiero, banca, inversiones y regulación de la SBP.' 
    },
    pi:           
    { 
      name: 'Derecho de Propiedad Intelectual', 
      emoji: '💡',  
      desc: 'Patentes, marcas, derechos de autor e innovación tecnológica.' 
    },
    agrario:      
    { 
      name: 'Derecho Agrario',                  
      emoji: '🌾',  
      desc: 'Tierras, reforma agraria y actividades agropecuarias en Panamá.' 
    },
    consumidor:   
    { 
      name: 'Derecho del Consumidor',           
      emoji: '🛒',  
      desc: 'Protección al consumidor, ACODECO, garantías y publicidad.' 
    },
  };

  /* ── Preguntas (8) ──────────────────────────────── */
  var QUESTIONS = [
    {
      text: '¿Qué tipo de situación legal te preocupa más?',
      options: [
        { text: 'Una injusticia, delito o crimen',                    scores: { penal: 3, const_: 1 } },
        { text: 'Problemas familiares o personales',                   scores: { familia: 3, civil: 1, consumidor: 1 } },
        { text: 'Negocios, contratos o empresa',                       scores: { comercial: 3, tributario: 1, bancario: 1 } },
        { text: 'Mis derechos frente al Estado o instituciones',       scores: { admin: 3, const_: 2, ambiental: 1 } },
      ],
    },
    {
      text: '¿Cuándo escuchas "abogado", qué imagen te viene a la mente?',
      options: [
        { text: 'En un tribunal, defendiendo o acusando a alguien',   scores: { penal: 3, const_: 1 } },
        { text: 'Mediando una separación o custodia de hijos',         scores: { familia: 3, laboral: 1 } },
        { text: 'Negociando un contrato o cerrando un negocio',        scores: { comercial: 3, bancario: 1, pi: 1 } },
        { text: 'Demandando a una institución del gobierno',           scores: { admin: 3, const_: 2 } },
      ],
    },
    {
      text: '¿Qué área del derecho te interesa conocer más?',
      options: [
        { text: 'Crímenes, investigaciones y el sistema judicial',     scores: { penal: 3, const_: 1 } },
        { text: 'Familia, herencias y derechos de las personas',       scores: { familia: 3, civil: 2, consumidor: 1 } },
        { text: 'Empresas, impuestos, banca y comercio',               scores: { comercial: 2, tributario: 2, bancario: 2, maritimo: 1 } },
        { text: 'El Estado, el ambiente y las tierras de Panamá',      scores: { admin: 2, ambiental: 2, agrario: 2, const_: 1 } },
      ],
    },
    {
      text: '¿Cuál describe mejor tu situación actual?',
      options: [
        { text: 'Tuve un problema con la justicia o la policía',                scores: { penal: 4 } },
        { text: 'Tengo un conflicto familiar, de pareja o de herencia',         scores: { familia: 3, civil: 2 } },
        { text: 'Necesito asesoría para mi empresa, impuestos o marca',         scores: { comercial: 2, tributario: 2, pi: 2 } },
        { text: 'Tengo un problema con una institución pública o un permiso',   scores: { admin: 3, ambiental: 1, const_: 1 } },
      ],
    },
    {
      text: '¿Qué te motiva más dentro del mundo del derecho?',
      options: [
        { text: 'Defender personas de injusticias y delitos',          scores: { penal: 3, const_: 1 } },
        { text: 'Preservar el bienestar de familias y comunidades',    scores: { familia: 2, laboral: 2, consumidor: 1 } },
        { text: 'Impulsar la economía y el crecimiento empresarial',   scores: { comercial: 2, bancario: 2, tributario: 1, maritimo: 1 } },
        { text: 'Garantizar transparencia y orden en el Estado',       scores: { admin: 2, const_: 2, ambiental: 1, agrario: 1 } },
      ],
    },
    {
      text: '¿Cuál es tu mayor preocupación legal hoy?',
      options: [
        { text: 'Ser acusado injustamente o ser víctima de un delito',        scores: { penal: 4 } },
        { text: 'Divorcio, custodia, alimentos o repartición de herencia',     scores: { familia: 3, civil: 2 } },
        { text: 'Impuestos, contratos, deudas o propiedad intelectual',        scores: { tributario: 2, comercial: 2, pi: 1, bancario: 1 } },
        { text: 'Permisos, licitaciones o derechos como funcionario público',  scores: { admin: 3, const_: 1, laboral: 1 } },
      ],
    },
    {
      text: 'Si tuvieras que visitar una institución panameña, ¿cuál sería?',
      options: [
        { text: 'Ministerio Público / Fiscalía',              scores: { penal: 4 } },
        { text: 'Tribunal de Familia / Juzgados de Niñez',    scores: { familia: 3, civil: 1 } },
        { text: 'MICI / DGI / Registro Público',              scores: { comercial: 2, tributario: 2, pi: 1 } },
        { text: 'Contraloría / MIDES / MiAmbiente',           scores: { admin: 2, ambiental: 2, const_: 1 } },
      ],
    },
    {
      text: '¿Cuál de estos perfiles te describe mejor?',
      options: [
        { text: 'Analítico, investigador y defensor de la justicia',           scores: { penal: 3, const_: 1 } },
        { text: 'Empático, conciliador y orientado a las personas',            scores: { familia: 2, laboral: 2, consumidor: 1, civil: 1 } },
        { text: 'Estratégico, emprendedor y orientado a resultados',           scores: { comercial: 2, bancario: 2, tributario: 1, maritimo: 1, pi: 1 } },
        { text: 'Sistemático, cívico e interesado en el bien público',         scores: { admin: 2, const_: 2, ambiental: 1, agrario: 1, internacional: 1 } },
      ],
    },
  ];

  /* ── Estado ─────────────────────────────────────── */
  var current = 0;
  var scores  = {};

  function resetScores() {
    Object.keys(BRANCHES).forEach(function (k) { scores[k] = 0; });
  }

  /* ── Refs ───────────────────────────────────────── */
  var root, body, progressFill, stepLabel;

  /* ── Init ───────────────────────────────────────── */
  function init() {
    root = document.getElementById('quizRoot');
    if (!root) return;

    body         = root.querySelector('.quiz-body');
    progressFill = root.querySelector('.quiz-progress-fill');
    stepLabel    = root.querySelector('.quiz-step-label');

    var closeBtn  = root.querySelector('.quiz-close');
    var startBtn  = document.getElementById('quizStartBtn');

    if (startBtn) {
      startBtn.addEventListener('click', openQuiz);
      startBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') openQuiz();
      });
    }

    closeBtn.addEventListener('click', closeQuiz);
    root.addEventListener('click', function (e) {
      if (e.target === root) closeQuiz();
    });
  }

  function openQuiz() {
    current = 0;
    resetScores();
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    showQuestion();
  }

  function closeQuiz() {
    root.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ── Pregunta ────────────────────────────────────── */
  function showQuestion() {
    var q     = QUESTIONS[current];
    var total = QUESTIONS.length;
    var pct   = Math.round((current / total) * 100);

    progressFill.style.width = pct + '%';
    stepLabel.textContent    = 'Pregunta ' + (current + 1) + ' de ' + total;

    body.innerHTML =
      '<div class="quiz-question" role="group">' +
        '<p class="quiz-q-num">Pregunta ' + (current + 1) + ' / ' + total + '</p>' +
        '<p class="quiz-q-text">' + q.text + '</p>' +
        '<div class="quiz-options">' +
          q.options.map(function (opt, i) {
            return '<button class="quiz-opt" data-idx="' + i + '">' + opt.text + '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    body.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleAnswer(parseInt(btn.dataset.idx, 10));
      });
    });
  }

  function handleAnswer(idx) {
    var opt = QUESTIONS[current].options[idx];
    Object.entries(opt.scores).forEach(function (pair) {
      scores[pair[0]] = (scores[pair[0]] || 0) + pair[1];
    });

    body.querySelectorAll('.quiz-opt').forEach(function (b, i) {
      b.disabled = true;
      if (i === idx) b.classList.add('selected');
    });

    setTimeout(function () {
      current++;
      if (current < QUESTIONS.length) {
        showQuestion();
      } else {
        showAnalyzing();
      }
    }, 380);
  }

  /* ── Analizando ──────────────────────────────────── */
  function showAnalyzing() {
    progressFill.style.width = '100%';
    stepLabel.textContent    = 'Analizando resultados…';

    body.innerHTML =
      '<div class="quiz-analyzing">' +
        '<div class="quiz-analyzing-ring"></div>' +
        '<p>Procesando tu perfil legal…</p>' +
      '</div>';

    setTimeout(showResults, 2200);
  }

  /* ── Resultados ──────────────────────────────────── */
  function showResults() {
    var sorted = Object.entries(scores)
      .filter(function (p) { return p[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; });

    var top = sorted.slice(0, 3).map(function (p) { return p[0]; });
    var keys = Object.keys(BRANCHES);
    while (top.length < 3) {
      var next = keys.find(function (k) { return top.indexOf(k) === -1; });
      if (next) top.push(next); else break;
    }

    var first  = top[0];
    var second = top[1];
    var third  = top[2];

    stepLabel.textContent    = 'Tu resultado';
    progressFill.style.width = '100%';

    // Persist result to Supabase (best-effort, non-blocking).
    if (typeof window.saveQuizResult === 'function') {
      window.saveQuizResult(first, second, third, scores).catch(function () {});
    }

    body.innerHTML =
      '<div class="quiz-result">' +
        '<p class="quiz-result-intro">Basado en tus respuestas, tu perfil legal encaja con:</p>' +
        '<div class="quiz-podium">' +
          podiumCard('podiumSecond', 'silver',  '2°', second) +
          podiumCard('podiumFirst',  'gold',    '1°', first)  +
          podiumCard('podiumThird',  'bronze',  '3°', third)  +
        '</div>' +
        '<div class="quiz-actions">' +
          '<button class="quiz-act secondary" id="quizRepeat">↺ Repetir</button>' +
          '<button class="quiz-act secondary" id="quizSave">⬇ Guardar</button>' +
          '<button class="quiz-act primary"   id="quizConsult">Consultar con TuProcesoIA →</button>' +
        '</div>' +
      '</div>';

    /* Animación podio: 3° → 2° → 1° */
    setTimeout(function () { animateCard('podiumThird');  },  300);
    setTimeout(function () { animateCard('podiumSecond'); },  900);
    setTimeout(function () { animateCard('podiumFirst');  }, 1600);

    document.getElementById('quizRepeat').addEventListener('click', function () {
      current = 0;
      resetScores();
      progressFill.style.width = '0%';
      stepLabel.textContent = 'Pregunta 1 de ' + QUESTIONS.length;
      showQuestion();
    });

    document.getElementById('quizSave').addEventListener('click', function () {
      saveResult(first, second, third);
    });

    document.getElementById('quizConsult').addEventListener('click', function () {
      consultBranch(first);
    });
  }

  function podiumCard(id, variant, pos, key) {
    var b = BRANCHES[key];
    return (
      '<div class="quiz-podium-card ' + variant + '" id="' + id + '" style="opacity:0;transform:translateY(24px)">' +
        '<div class="quiz-podium-pos">' + pos + '</div>' +
        '<div class="quiz-podium-emoji">' + b.emoji + '</div>' +
        '<div class="quiz-podium-name">' + b.name + '</div>' +
        '<div class="quiz-podium-desc">' + b.desc + '</div>' +
      '</div>'
    );
  }

  function animateCard(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    el.style.opacity    = '1';
    el.style.transform  = 'translateY(0)';
  }

  /* ── Guardar resultado ───────────────────────────── */
  function saveResult(first, second, third) {
    var lines = [
      'Tu Proceso Legal — Descubre tu Rama',
      '=====================================',
      'Fecha: ' + new Date().toLocaleDateString('es-PA'),
      '',
      'Tu perfil legal:',
      '',
      '  1° ' + BRANCHES[first].emoji  + '  ' + BRANCHES[first].name,
      '     ' + BRANCHES[first].desc,
      '',
      '  2° ' + BRANCHES[second].emoji + '  ' + BRANCHES[second].name,
      '     ' + BRANCHES[second].desc,
      '',
      '  3° ' + BRANCHES[third].emoji  + '  ' + BRANCHES[third].name,
      '     ' + BRANCHES[third].desc,
      '',
      'Consulta en: tuprocesoia.com',
    ];

    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'mi-rama-legal.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Consultar con TuProcesoIA ───────────────────── */
  function consultBranch(key) {
    var b = BRANCHES[key];
    closeQuiz();

    var appRoot = document.getElementById('appRoot');
    var isChat  = appRoot && appRoot.classList.contains('active');

    if (!isChat) {
      var startBtn = document.getElementById('startChatHero');
      if (startBtn) startBtn.click();
    }

    setTimeout(function () {
      var input = document.getElementById('chatInput');
      if (!input) return;
      input.value = 'Hola, según el quiz "Descubre tu Rama" mi área legal principal es ' +
        b.name + '. ¿Puedes orientarme sobre los temas más importantes de esta rama del derecho panameño?';
      input.dispatchEvent(new Event('input'));
      input.focus();
    }, isChat ? 100 : 750);
  }

  /* ── Arranque ────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
