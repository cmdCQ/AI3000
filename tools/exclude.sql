-- 由 gen_exclude_sql.py 生成：封住向量库瘦身的回流
-- 恢复方式：把 status 改回 'pending' 再跑 ingest-all

-- 1) 本站无该体系 / 现存内容全是杂占，整类排除
UPDATE reference_books SET status='excluded', updated_at=(UNIX_TIMESTAMP()*1000)
  WHERE category IN ('general','xiangshu','ziwei');

-- 2) 已从 mingli_liuyao 删除的 60 部（易类注疏 + 杂占）
UPDATE reference_books SET status='excluded', updated_at=(UNIX_TIMESTAMP()*1000)
  WHERE title IN (
    '三易备遗',
    '丙子学易编',
    '乾坤凿度',
    '了斋易说',
    '南轩易说',
    '卦变考略',
    '古周易',
    '启蒙意见',
    '吴园周易解',
    '吴园易解',
    '周易举正',
    '周易卦爻经传训解',
    '周易图说',
    '周易干凿度',
    '周易易简说',
    '周易札记（明逯中立）',
    '周易札记（清杨名时）',
    '周易略例',
    '周易稗疏',
    '周易章句外编',
    '周易通论',
    '周易郑康成注',
    '周易音义',
    '增补郑氏周易',
    '复斋易说',
    '学易初津',
    '推易始末',
    '新本郑氏周易',
    '易传灯',
    '易例',
    '易图说',
    '易图通变',
    '易学变通',
    '易学启蒙小传',
    '易学滥觞',
    '易学辨惑',
    '易小帖',
    '易汉学',
    '易璇玑',
    '易童子问',
    '易纂言外翼洛书说',
    '易纬乾元序制记',
    '易纬坤灵图',
    '易纬是类谋',
    '易纬略义',
    '易纬稽览图',
    '易纬辨终备',
    '易纬通卦验',
    '易经衷论',
    '易裨传',
    '温公易说',
    '读易举要',
    '读易余言',
    '读易私言',
    '读易考原',
    '赵氏易说',
    '陆氏易解',
    '灵棋经',
    '秘本诸葛神数',
    '正易心法'
  );

-- 3) yijing 待入库的 119 部义理注疏（2325 万字）：若入库会重建 mingli_yijing，
--    而 retrieve() 对每条六爻/梅花查询都强制追加 yijing → 每次检索被义理注疏稀释。
--    只留《周易筮述》（筮法书）。
UPDATE reference_books SET status='excluded', updated_at=(UNIX_TIMESTAMP()*1000)
  WHERE category='yijing' AND status='pending' AND title <> '周易筮述';

SELECT category, status, COUNT(*) n FROM reference_books GROUP BY category, status ORDER BY category, status;
