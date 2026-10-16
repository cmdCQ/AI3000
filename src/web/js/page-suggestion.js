function getCookie(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?decodeURIComponent(m[2]):null;}
var authToken = getCookie('sqw_token');
var ratings = {};
var labelTexts = {
  overall: ['请评分', '很差', '较差', '一般', '满意', '非常满意'],
  ui: ['请评分', '很不舒适', '不太舒适', '一般', '舒适', '非常舒适'],
  feature: ['请评分', '完全不适用', '不太适用', '一般', '适用', '非常适用'],
  ai: ['请评分', '完全不准确', '不太准确', '一般', '准确', '非常准确'],
  responseSpeed: ['请评分', '非常慢', '较慢', '一般', '较快', '非常快'],
  accuracy: ['请评分', '很贫乏', '不够丰富', '一般', '丰富', '非常丰富'],
};

// Check login on load
(function(){
  if (!authToken) {
    document.getElementById('sgForm').style.display = 'none';
    document.getElementById('sgLoginRequired').style.display = 'block';
  }
})();

document.querySelectorAll('.sg-stars').forEach(function(container) {
  var name = container.dataset.rating;
  var stars = container.querySelectorAll('.sg-star');
  var labels = labelTexts[name];

  stars.forEach(function(star) {
    star.addEventListener('click', function() {
      var score = parseInt(this.dataset.score);
      ratings[name] = score;
      stars.forEach(function(s) {
        var sScore = parseInt(s.dataset.score);
        s.textContent = sScore <= score ? '★' : '☆';
        s.classList.toggle('active', sScore <= score);
      });
      var label = document.getElementById('label_' + name);
      if (label) label.textContent = labels[score] || score + ' 星';
    });

    star.addEventListener('mouseenter', function() {
      var score = parseInt(this.dataset.score);
      stars.forEach(function(s) {
        var sScore = parseInt(s.dataset.score);
        if (!s.classList.contains('active')) {
          s.style.color = sScore <= score ? 'var(--star-active)' : '';
        }
      });
    });
    star.addEventListener('mouseleave', function() {
      stars.forEach(function(s) {
        if (!s.classList.contains('active')) s.style.color = '';
      });
    });
  });
});

function updateCharCount() {
  var el = document.getElementById('sgContent');
  var len = el.value.length;
  document.getElementById('charCounter').textContent = len + ' / 4000';
}

async function submitSuggestion() {
  var btn = document.getElementById('sgSubmitBtn');
  var content = document.getElementById('sgContent').value.trim();
  if (!content) { document.getElementById('sgContent').focus(); return; }

  btn.disabled = true;
  btn.textContent = '提交中…';
  try {
    var res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({
        overall: ratings.overall || 0, ui: ratings.ui || 0, feature: ratings.feature || 0,
        ai: ratings.ai || 0, responseSpeed: ratings.responseSpeed || 0, accuracy: ratings.accuracy || 0,
        content: content,
      }),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || '提交失败');
    document.getElementById('sgForm').style.display = 'none';
    document.getElementById('sgSuccess').style.display = 'block';
  } catch (e) {
    alert('提交失败: ' + e.message + '，请稍后重试');
    btn.disabled = false;
    btn.textContent = '提交建议 ✦';
  }
}
