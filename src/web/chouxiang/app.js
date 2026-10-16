(function(){
  "use strict";

  var BANKS = {
    subj:["领导","甲方","空调","食堂阿姨","隔壁桌","我的头发","WiFi","作业","数学卷子","英语单词","我妈","班主任","闹钟","外卖小哥","快递","朋友圈","高三","晚自习","月考","错题本","手机","被窝","镜子","早读"],
    subj2:["计划","耐心","热情","睡眠","尊严","发际线","精神状态","早睡的决心","今日份快乐","最后一点力气"],
    time:["凌晨","早上六点","午休","晚自习","周末","周一的课间","半夜两点"],
    place:["教室","后门","天台","走廊","食堂","被窝里","书桌前","操场边","楼梯拐角"],
    exagg:["浑身发抖","双手冰凉","血压拉满","天灵盖发麻","心口一紧","原地升天","瞳孔地震","呼吸暂停"],
    act:["一句话都说不出来","默默把眼泪憋回去","笑了但没完全笑","深呼吸了半小时","盯着天花板发呆","把手机反扣在桌上"],
    metaphor:["你多变的表情","风里的秘密","草原上的风","雪山顶的光","牧区的落日","没回消息的沉默"],
    thing:["雨滴","星星","云","风","影子","浪","灰尘"],
    yi:["信号","思绪","叹气","一句话","沉默"],
    line:["服务器在低鸣，灯是绿的","数据像雪一样落进磁盘","代码里没有月亮，只有注释","缓存里存着一场没下完的雨","信号穿过海底，抵达时已经旧了","日志写到最后一行，就停在你的名字上"],
    gua:["乾为天","坤为地","水雷屯","山水蒙","泽水困","风火家人","雷地豫","地山谦","天风姤","火水未济"],
    good:["早睡","摸鱼","喝冰美式","删聊天记录","洗头","发呆","订个闹钟"],
    bad:["熬夜","说真心话","看数学","借钱","发凌晨朋友圈","跟人对线"],
    comment:["象曰：你最近想的事，卦里没写。","断语：早点睡，比什么都灵。","批语：所求之事，到头来还是取决于你自己。","签曰：卦象不太稳定，跟你一样。"],
    pishi:["同意","原则同意","不予批准","暂缓办理","已知悉"],
    reason:["请按有关规定执行。","请进一步说明情况后另行研究。","建议你自行解决。","相关费用自理。","此事关系重大，请慎重。"],
    weather:["晴朗","多云","飘着点小雨","热到不行","冷得发抖"],
    saw:["我看到小草在生长","我看到一只蚂蚁在搬家","我什么也没看到，但我很开心","我看到夕阳把操场染成了橘色"],
    moral:["我们要爱护环境","时间真的很宝贵","还是家里好","要好好学习，天天向上"],
    ask:["你凭什么","为什么呢","谁懂啊","不是"],
    why:["凭什么","为什么","到底为什么"]
  };

  var STYLES = [
    {id:"feng", name:"发疯文学", tpls:[
      "我真的会谢。{subj}是，{subj}也是，{subj}还是，你们是不是商量好了来搞我。",
      "破防了家人们，{subj}，{subj}，还是{subj}！我{exagg}，{exagg}，{exagg}！",
      "谁懂啊，{time}的{place}，我对着{subj}，{act}，然后我{subj2}就没了。真的没了。",
      "不是，我就问一句：{time}为什么会有{subj}这种东西？我{subj2}都要交代在这里了。",
      "谢谢{subj}，谢谢{subj}，谢谢{subj}。我{exagg}，我{act}。(´･_･)"
    ]},
    {id:"ding", name:"丁真体", tpls:[
      "窗外的{subj}，呼！就像是{metaphor}。",
      "{subj}，呼！{subj}，呼！就像{metaphor}的{thing}，呼！",
      "{place}的{time}，{subj}，呼！我不懂，但我大受震撼，呼！"
    ]},
    {id:"saibo", name:"赛博诗人", tpls:[
      "我在{place}读着{subj}，{line}。",
      "{time}，{subj}折叠成{thing}。{line}。",
      "如果{yi}有重量，那{time}的{place}一定压弯了{thing}。{line}。"
    ]},
    {id:"xuan", name:"电子算命", tpls:[
      "今日卦象：{gua}。宜{good}，忌{bad}。{comment}",
      "给你起了一卦，{gua}。{comment}宜{good}，忌{bad}。",
      "卦象：{gua}。{comment}（另外，忌{bad}，别问了。）"
    ]},
    {id:"gongwen", name:"公文批复", tpls:[
      "关于{subj}的请示收悉。经研究，现批复如下：一、{pishi}。二、{reason}三、请{subj}本人好自为之。",
      "你反映的{subj}问题已阅。批：{pishi}。{reason}",
      "关于{time}在{place}{subj}一事：{pishi}。{reason}"
    ]},
    {id:"xiaoxue", name:"小学生作文", tpls:[
      "今天天气{weather}，我和{subj}一起去{place}。{saw}。我明白了：{moral}。",
      "今天{time}，{weather}。{saw}。虽然{subj2}，但我还是觉得：{moral}。"
    ]},
    {id:"chouxiang", name:"抽象话", tpls:[
      "{subj}是{subj}的{subj}，{subj2}才是{subj2}的{subj2}。懂的人自然懂。",
      "不要问{subj}为什么，{subj}就是{subj}。{exagg}。",
      "所谓{subj2}，就是一边{act}，一边告诉自己：{subj}。"
    ]}
  ];

  var KAO = {
    "开心":["(｡･ω･｡)","(๑•̀ㅂ•́)و","(≧▽≦)","(*^▽^*)","(⌒‿⌒)","(๑˃̵ᴗ˂̵)","(´▽｀ʃ♡ƪ)"],
    "无语":["(￣▽￣)","(－_－)","(￢_￢)","(・_・;)","(´･_･)","(⊙_⊙)","(￣～￣)"],
    "生气":["(╯°□°)╯︵ ┻━┻","(¬_¬)","(҂｀_´)","(ง •̀_•́)ง","ヽ(｀⌒´)ノ"],
    "卖萌":["(=^･ｪ･^=)","(๑´ω｀๑)","(｡•ᴗ•｡)","U・ᴥ・U","(◍•ᴗ•◍)","(*/ω＼*)"],
    "哭":["(｡•́︿•̀｡)","(´；ω；)","(╥﹏╥)","(இ﹏இ｡)","(ᵕ̣̣﹏ᵕ̣̣)"],
    "抽象":["(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧","(づ｡◕‿‿◕｡)づ","彡(￣_￣)彡","(☞ﾟヮﾟ)☞","(⌐■_■)"]
  };

  var TICKER = ["(｡･ω･｡)","(´･_･)","(￣▽￣)","(๑•̀ㅂ•́)و","(╯°□°)╯︵ ┻━┻","(¬_¬)","(づ｡◕‿‿◕｡)づ"];

  function pick(a){ return a[(Math.random()*a.length)|0]; }

  function fill(tpl){
    var out = "", i = 0;
    while(i < tpl.length){
      var ch = tpl.charAt(i);
      if(ch === "{"){
        var j = tpl.indexOf("}", i);
        if(j > i){
          var key = tpl.slice(i+1, j);
          out += pick(BANKS[key] || [key]);
          i = j + 1;
          continue;
        }
      }
      out += ch; i++;
    }
    return out;
  }

  function make(styleId){
    var s = null;
    for(var k=0;k<STYLES.length;k++){ if(STYLES[k].id === styleId){ s = STYLES[k]; break; } }
    if(!s){ s = STYLES[0]; }
    return fill(pick(s.tpls));
  }

  var $ = function(id){ return document.getElementById(id); };
  var current = STYLES[0].id;

  function renderChips(){
    var box = $("styles");
    for(var i=0;i<STYLES.length;i++){
      (function(s){
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip" + (s.id === current ? " on" : "");
        b.textContent = s.name;
        b.addEventListener("click", function(){ current = s.id; renderChips(); go(); });
        box.appendChild(b);
      })(STYLES[i]);
    }
    box.innerHTML = "";
    for(var j=0;j<STYLES.length;j++){
      (function(s){
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip" + (s.id === current ? " on" : "");
        b.textContent = s.name;
        b.addEventListener("click", function(){ current = s.id; renderChips(); go(); });
        box.appendChild(b);
      })(STYLES[j]);
    }
  }

  var last = "";
  function go(){
    last = make(current);
    var out = $("out");
    out.textContent = last;
    out.classList.remove("pop");
    void out.offsetWidth;
    out.classList.add("pop");
  }

  function toast(msg){
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function(){ t.classList.remove("show"); }, 1400);
  }

  function fallbackCopy(text){
    try{
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly","");
      ta.style.position = "fixed"; ta.style.top = "-1000px";
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    }catch(e){ return false; }
  }

  function copy(text, okMsg){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ toast(okMsg); }, function(){ toast(fallbackCopy(text) ? okMsg : "复制失败，手动选一下"); });
    }else{
      toast(fallbackCopy(text) ? okMsg : "复制失败，手动选一下");
    }
  }

  function renderKao(cat){
    var grid = $("kaoGrid");
    grid.innerHTML = "";
    var list = KAO[cat] || [];
    for(var i=0;i<list.length;i++){
      (function(txt){
        var b = document.createElement("button");
        b.type = "button"; b.className = "kao"; b.textContent = txt;
        b.addEventListener("click", function(){
          copy(txt, "已复制 " + txt);
          b.classList.add("ok");
          setTimeout(function(){ b.classList.remove("ok"); }, 500);
        });
        grid.appendChild(b);
      })(list[i]);
    }
  }

  function renderTabs(){
    var tabs = $("kaoTabs");
    var cats = [];
    for(var k in KAO){ if(Object.prototype.hasOwnProperty.call(KAO,k)){ cats.push(k); } }
    for(var i=0;i<cats.length;i++){
      (function(cat){
        var b = document.createElement("button");
        b.type = "button"; b.className = "tab" + (i === 0 ? " on" : "");
        b.textContent = cat;
        b.addEventListener("click", function(){
          var all = tabs.getElementsByClassName("tab");
          for(var m=0;m<all.length;m++){ all[m].classList.remove("on"); }
          b.classList.add("on");
          renderKao(cat);
        });
        tabs.appendChild(b);
      })(cats[i]);
    }
    renderKao(cats[0]);
  }

  function ticker(){
    var el = $("ticker"), n = 0;
    setInterval(function(){
      n = (n + 1) % TICKER.length;
      el.style.opacity = "0";
      setTimeout(function(){ el.textContent = TICKER[n]; el.style.opacity = "1"; }, 280);
    }, 2600);
  }

  $("gen").addEventListener("click", go);
  $("again").addEventListener("click", go);
  $("copy").addEventListener("click", function(){ copy(last || "今天没有抽象，只有你。", "已复制"); });
  $("yr").textContent = String(new Date().getFullYear());

  renderChips();
  renderTabs();
  ticker();
  go();
})();
