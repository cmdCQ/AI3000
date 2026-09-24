
// ===== 渲染全部64卦卡片 =====
function renderGrid() {
  var h = '';
  for (var name in HEXAGRAM_DATA) {
    var d = HEXAGRAM_DATA[name];
    h += '<div class="hex-card" data-name="'+name+'" onclick="showDetail(\''+name+'\')" id="card-'+name+'">';
    h += '<div class="sym">'+d.s+'</div>';
    h += '<div class="nm">'+d.n+'卦</div>';
    h += '<div class="py">'+d.p+'</div>';
    h += '</div>';
  }
  document.getElementById('grid').innerHTML = h;
}

function filterGrid(q) {
  var cards = document.querySelectorAll('.hex-card');
  var s = q.toLowerCase().trim();
  cards.forEach(function(c){
    var name = c.dataset.name;
    var d = HEXAGRAM_DATA[name];
    if (!d) { c.style.display='none'; return; }
    if (!s) { c.style.display=''; return; }
    var match = d.n.indexOf(s)>=0 || d.p.toLowerCase().indexOf(s)>=0 ||
                d.g.indexOf(s)>=0 || d.c.indexOf(s)>=0 ||
                (d.kw||[]).some(function(k){return k.indexOf(s)>=0});
    c.style.display = match ? '' : 'none';
  });
}

// ===== 展示详情 =====
function showDetail(name) {
  var d = HEXAGRAM_DATA[name];
  if (!d) return;

  // 高亮
  document.querySelectorAll('.hex-card').forEach(function(c){c.classList.remove('active')});
  var card = document.getElementById('card-'+name);
  if (card) { card.classList.add('active'); card.scrollIntoView({behavior:'smooth',block:'center'}); }

  var h = '';
  // 标题
  h += '<div class="detail-title">';
  h += '<span class="dsym">'+d.s+'</span>';
  h += '<div><span class="dname">'+d.n+'卦</span> <span class="dpy">'+d.p+'</span></div>';
  h += '</div>';
  // 元数据
  h += '<div class="detail-meta">';
  h += '<span>'+d.g+'</span><span>'+d.c+'</span><span>第'+d.i+'卦</span>';
  h += '</div>';
  // 核心要义
  h += '<div class="sec"><div class="sec-label">☯ 核心要义</div>';
  h += '<div class="sec-text">'+d.m+'</div></div>';
  // 卦辞
  h += '<div class="sec"><div class="sec-label">📜 卦辞</div>';
  h += '<div class="block-q">'+d.gc+'</div>';
  h += '<div class="sec-text">'+d.gb+'</div></div>';
  // 象传
  h += '<div class="sec"><div class="sec-label">🐘 象传</div>';
  h += '<div class="block-q">'+d.xz+'</div>';
  h += '<div class="sec-text">'+d.st+'</div></div>';
  // 爻辞
  h += '<div class="sec"><div class="sec-label">📊 爻辞详解</div>';
  h += '<div class="yao-list">';
  for (var i=0;i<d.y.length;i++) {
    h += '<div class="yao-item"><span class="yn">'+d.y[i].n+'</span><span class="yt">'+d.y[i].t+'</span></div>';
  }
  h += '</div>';
  if (d.yy) h += '<div class="yongyao">⚡ '+d.yy+'</div>';
  h += '</div>';
  // 现代应用
  h += '<div class="sec"><div class="sec-label">🔮 现代应用指南</div>';
  h += '<div class="app-grid">';
  h += '<div class="app-item app-career"><strong>💼 事业</strong><br>'+d.a.ca+'</div>';
  h += '<div class="app-item app-love"><strong>💕 感情</strong><br>'+d.a.re+'</div>';
  h += '<div class="app-item app-decision"><strong>🎯 决策</strong><br>'+d.a.de+'</div>';
  h += '<div class="app-item app-warning"><strong>⚠️ 警示</strong><br>'+d.a.wa+'</div>';
  h += '</div></div>';
  // 适用场景
  if (d.sc && d.sc.length>0) {
    h += '<div class="sec"><div class="sec-label">🎯 适用场景</div><div class="sc-tags">';
    d.sc.forEach(function(s){h+='<span>'+s+'</span>';});
    h += '</div></div>';
  }
  // 历史典故
  if (d.hi) {
    h += '<div class="sec"><div class="sec-label">📚 历史典故</div>';
    h += '<div class="history">'+d.hi+'</div></div>';
  }
  // 相关卦象
  if (d.r && d.r.length>0) {
    h += '<div class="sec"><div class="sec-label">🔗 相关卦象</div><div class="related">';
    d.r.forEach(function(r){h+='<a onclick="showDetail(\''+r.n.replace(/卦$/,'')+'\')">'+r.s+' '+r.n+'</a>';});
    h += '</div></div>';
  }
  // 关键词
  if (d.kw && d.kw.length>0) {
    h += '<div class="kw-tags">';
    d.kw.forEach(function(k){h+='<span>'+k+'</span>';});
    h += '</div>';
  }
  document.getElementById('detail').innerHTML = h;
  document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'start'});
}

renderGrid();
