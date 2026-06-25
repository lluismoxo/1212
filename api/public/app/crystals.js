// Niveles + cristal SVG (idéntico al prototipo).
window.LEVELS = [
  { n:1, name:'Aprendiz',      desc:'El primer paso. La piedra aún en bruto.',     aura:'#8B3FE6', colors:{deep:'#160F26',mid:'#241738',light:'#3C2A5E',edge:'#6A4FB0',glow:'#8B3FE6'} },
  { n:2, name:'Acompañante',   desc:'Caminas con constancia. La forma emerge.',    aura:'#3F63E6', colors:{deep:'#0C1626',mid:'#142540',light:'#22416E',edge:'#4F74E6',glow:'#3F63E6'} },
  { n:3, name:'Maestro',       desc:'Dominas tu disciplina. La gema toma color.',  aura:'#2FB98A', colors:{deep:'#0A211B',mid:'#103229',light:'#1A5141',edge:'#2FB98A',glow:'#2FB98A'} },
  { n:4, name:'Guardián',      desc:'Proteges tu progreso. La luz crece.',         aura:'#FF4FA8', colors:{deep:'#2A0F22',mid:'#451631',light:'#7C2A57',edge:'#FF4FA8',glow:'#FF4FA8'} },
  { n:5, name:'Vidente',       desc:'Ves más allá. Brillo y claridad.',            aura:'#2FE0D2', colors:{deep:'#0C2F3A',mid:'#134E5C',light:'#21788C',edge:'#2FE0D2',glow:'#2FE0D2'} },
  { n:6, name:'Arquitecto',    desc:'Construyes tu propio camino. Energía pura.',  aura:'#4F9BFF', colors:{deep:'#15334C',mid:'#28567B',light:'#4787BE',edge:'#4F9BFF',glow:'#4F9BFF'} },
  { n:7, name:'Soberano',      desc:'Dueño de tu evolución. Casi pulido.',         aura:'#9FB2D0', colors:{deep:'#34415A',mid:'#566A8C',light:'#869CC0',edge:'#B0C4E0',glow:'#9FB2D0'} },
  { n:8, name:'Iluminado',     desc:'Resplandor sereno. La perfección se acerca.', aura:'#6FE6FF', colors:{deep:'#6A6A80',mid:'#9696AE',light:'#C6C6D8',edge:'#E6E6F0',glow:'#6FE6FF'} },
  { n:9, name:'Grado Supremo', desc:'La cima. Cristal puro de luz y oro.',         aura:'#E6C77A', colors:{deep:'#9A8748',mid:'#D0AE5A',light:'#F2DC90',edge:'#FFF6D6',glow:'#E6C77A'} },
];

// Cristal facetado (del prototipo, simplificado e idéntico en aspecto).
window.crystalSVG = function (lv, size) {
  size = size || 130;
  var c = lv.colors, id = 'c' + lv.n + Math.random().toString(36).slice(2,6);
  return '<div style="width:'+size+'px;height:'+(size*1.12)+'px;position:relative;animation:floatY 7s ease-in-out infinite">'
    + '<svg width="'+size+'" height="'+(size*1.12)+'" viewBox="0 0 200 224" style="overflow:visible">'
    + '<defs>'
    + '<radialGradient id="'+id+'g"><stop offset="0" stop-color="'+c.glow+'" stop-opacity=".55"/><stop offset="1" stop-color="'+c.glow+'" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="'+id+'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c.mid+'"/><stop offset="1" stop-color="'+c.deep+'"/></linearGradient>'
    + '<linearGradient id="'+id+'u" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="'+c.light+'"/><stop offset="1" stop-color="'+c.mid+'"/></linearGradient>'
    + '<linearGradient id="'+id+'c" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="'+c.edge+'"/><stop offset="1" stop-color="'+c.light+'"/></linearGradient>'
    + '</defs>'
    + '<ellipse cx="100" cy="120" rx="86" ry="96" fill="url(#'+id+'g)"/>'
    + '<polygon points="28,200 64,120 100,12 100,224" fill="url(#'+id+'f)"/>'
    + '<polygon points="100,12 136,120 172,200 100,224" fill="url(#'+id+'u)"/>'
    + '<polygon points="64,120 100,12 136,120 100,160" fill="url(#'+id+'c)" fill-opacity=".9"/>'
    + '<polygon points="64,120 100,160 136,120 100,224" fill="'+c.light+'" fill-opacity=".35"/>'
    + '<polygon points="100,12 118,76 100,90 82,76" fill="#fff" fill-opacity=".25"/>'
    + '</svg></div>';
};
