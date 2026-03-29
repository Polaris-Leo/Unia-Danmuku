const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'data', 'history', '21514463', 'emots_room_21514463_10types.jsonl');
const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').filter(l => l.trim());

const emotCount = {};      // emot -> total count
const emotUserMap = {};    // emot -> { username -> count }
const emotUrl = {};        // emot -> image url

for (const line of lines) {
  const obj = JSON.parse(line);
  const emots = obj.emots;
  if (!emots) continue;
  const emotName = Object.keys(emots)[0];
  const username = obj.user ? obj.user.username : 'unknown';

  emotCount[emotName] = (emotCount[emotName] || 0) + 1;
  if (!emotUrl[emotName]) emotUrl[emotName] = emots[emotName].url;
  if (!emotUserMap[emotName]) emotUserMap[emotName] = {};
  emotUserMap[emotName][username] = (emotUserMap[emotName][username] || 0) + 1;
}

const total = Object.values(emotCount).reduce((a, b) => a + b, 0);
const sorted = Object.entries(emotCount).sort((a, b) => b[1] - a[1]);

const PALETTE = [
  '#6C63FF','#FF6584','#43CBFF','#F9A826','#2ECC71',
  '#E74C3C','#3498DB','#9B59B6','#1ABC9C','#E67E22'
];

const now = new Date().toLocaleString('zh-CN', { hour12: false });

// ---- 构造图表数据 ----
const chartLabels  = JSON.stringify(sorted.map(([e]) => e));
const chartCounts  = JSON.stringify(sorted.map(([, c]) => c));
const chartColors  = JSON.stringify(PALETTE.slice(0, sorted.length));

// ---- Top-3 用户数据（横向柱状图数据集） ----
const top3Datasets = [];
const top3ByEmot = {};
sorted.forEach(([emot]) => {
  const entries = Object.entries(emotUserMap[emot]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  top3ByEmot[emot] = entries;
});

// ---- 生成 HTML 报告 ----
const tableRows = sorted.map(([emot, count], idx) => {
  const pct = ((count / total) * 100).toFixed(2);
  const userEntries = Object.entries(emotUserMap[emot]).sort((a, b) => b[1] - a[1]);
  const [topUser, topCount] = userEntries[0];
  const imgUrl = emotUrl[emot] || '';
  const color = PALETTE[idx % PALETTE.length];
  return `
    <tr>
      <td>${idx + 1}</td>
      <td>
        <span class="emot-badge" style="border-color:${color}">
          ${imgUrl ? `<img src="${imgUrl}" alt="${emot}" />` : ''}
          ${emot}
        </span>
      </td>
      <td>${count.toLocaleString()}</td>
      <td>
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          <span>${pct}%</span>
        </div>
      </td>
      <td>${topUser}</td>
      <td>${topCount}</td>
    </tr>`;
}).join('');

const detailCards = sorted.map(([emot, count], idx) => {
  const pct = ((count / total) * 100).toFixed(2);
  const color = PALETTE[idx % PALETTE.length];
  const top5 = Object.entries(emotUserMap[emot]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVal = top5[0][1];
  const barRows = top5.map(([u, c]) => `
    <div class="user-row">
      <span class="uname">${u}</span>
      <div class="ubar-wrap">
        <div class="ubar-fill" style="width:${(c/maxVal*100).toFixed(1)}%;background:${color}"></div>
      </div>
      <span class="ucount">${c}</span>
    </div>`).join('');

  const imgUrl = emotUrl[emot] || '';
  return `
  <div class="card">
    <div class="card-header" style="border-left:4px solid ${color}">
      ${imgUrl ? `<img src="${imgUrl}" class="card-emot-img" alt="${emot}" />` : ''}
      <span class="card-title">${emot}</span>
      <span class="card-meta">${count.toLocaleString()} 次 &nbsp;|&nbsp; 占比 ${pct}%</span>
    </div>
    <div class="card-body">${barRows}</div>
  </div>`;
}).join('');

// 横向柱状图：各表情使用数量
const barChartData = JSON.stringify({
  labels: sorted.map(([e]) => e),
  datasets: [{
    label: '使用次数',
    data: sorted.map(([, c]) => c),
    backgroundColor: PALETTE.slice(0, sorted.length),
    borderRadius: 6,
  }]
});

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>表情弹幕分析报告 · 房间 21514463</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;background:#0f0f1a;color:#e0e0f0;padding:32px 24px}
  h1{text-align:center;font-size:1.8rem;font-weight:700;margin-bottom:4px;
     background:linear-gradient(135deg,#6C63FF,#43CBFF);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{text-align:center;color:#888;font-size:.85rem;margin-bottom:36px}
  .subtitle span{margin:0 12px}

  .section-title{font-size:1.1rem;font-weight:600;color:#a0a0c0;margin:36px 0 16px;
    border-left:3px solid #6C63FF;padding-left:10px}

  /* stat cards */
  .stat-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .stat-card{flex:1;min-width:140px;background:#1a1a2e;border-radius:12px;padding:18px 20px;
    border:1px solid #2a2a4a;text-align:center}
  .stat-card .val{font-size:1.8rem;font-weight:700;color:#6C63FF}
  .stat-card .lbl{font-size:.78rem;color:#888;margin-top:4px}

  /* charts */
  .charts-row{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
  .chart-box{background:#1a1a2e;border-radius:12px;border:1px solid #2a2a4a;padding:20px;flex:1;min-width:280px}
  .chart-box h3{font-size:.9rem;color:#a0a0c0;margin-bottom:14px;text-align:center}
  .pie-wrap{max-width:340px;margin:0 auto}
  .bar-chart-wrap{width:100%}

  /* table */
  table{width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:12px;overflow:hidden;
    border:1px solid #2a2a4a;margin-bottom:8px}
  thead tr{background:#22224a}
  th{padding:10px 14px;text-align:left;font-size:.8rem;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  td{padding:10px 14px;font-size:.88rem;border-top:1px solid #1e1e38;vertical-align:middle}
  tr:hover td{background:#1e1e36}
  .emot-badge{display:inline-flex;align-items:center;gap:6px;background:#12122a;border:1px solid;
    border-radius:20px;padding:3px 10px 3px 4px;font-size:.85rem}
  .emot-badge img{width:26px;height:26px;object-fit:contain}
  .bar-wrap{display:flex;align-items:center;gap:8px;min-width:120px}
  .bar-fill{height:10px;border-radius:5px;transition:width .3s}
  .bar-wrap span{font-size:.8rem;color:#aaa;white-space:nowrap}

  /* detail cards */
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  .card{background:#1a1a2e;border-radius:12px;border:1px solid #2a2a4a;overflow:hidden}
  .card-header{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#14142a}
  .card-emot-img{width:32px;height:32px;object-fit:contain}
  .card-title{font-weight:600;font-size:.95rem}
  .card-meta{margin-left:auto;font-size:.78rem;color:#888;white-space:nowrap}
  .card-body{padding:14px 16px}
  .user-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .uname{flex:0 0 120px;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ccc}
  .ubar-wrap{flex:1;background:#12122a;border-radius:4px;height:8px;overflow:hidden}
  .ubar-fill{height:100%;border-radius:4px;transition:width .3s}
  .ucount{flex:0 0 36px;text-align:right;font-size:.78rem;color:#aaa}

  footer{text-align:center;color:#444;font-size:.75rem;margin-top:40px}
</style>
</head>
<body>

<h1>房间 21514463 · 表情弹幕分析报告</h1>
<p class="subtitle">
  <span>生成时间：${now}</span>
  <span>数据来源：emots_room_21514463_10types.jsonl</span>
</p>

<!-- 总览 stat cards -->
<div class="section-title">总览</div>
<div class="stat-row">
  <div class="stat-card"><div class="val">${total.toLocaleString()}</div><div class="lbl">总弹幕条数</div></div>
  <div class="stat-card"><div class="val">${sorted.length}</div><div class="lbl">表情种类</div></div>
  <div class="stat-card"><div class="val">${sorted[0][0]}</div><div class="lbl">最热门表情</div></div>
  <div class="stat-card"><div class="val">${((sorted[0][1]/total)*100).toFixed(1)}%</div><div class="lbl">最热门占比</div></div>
</div>

<!-- 图表区 -->
<div class="section-title">图表分析</div>
<div class="charts-row">
  <div class="chart-box" style="flex:1.1;min-width:300px">
    <h3>各表情使用次数（横向柱状图）</h3>
    <div class="bar-chart-wrap"><canvas id="barChart"></canvas></div>
  </div>
  <div class="chart-box" style="flex:0.9;min-width:280px">
    <h3>各表情占比（饼图）</h3>
    <div class="pie-wrap"><canvas id="pieChart"></canvas></div>
  </div>
</div>

<!-- 汇总表格 -->
<div class="section-title">各表情使用统计</div>
<table>
  <thead>
    <tr>
      <th>排名</th><th>表情</th><th>使用次数</th><th>占比</th><th>发送最多的用户</th><th>该用户次数</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<!-- 明细卡片 -->
<div class="section-title">各表情 Top 5 用户明细</div>
<div class="cards-grid">${detailCards}</div>

<footer>由 analyze_emots.js 自动生成 · ${now}</footer>

<script>
// 饼图
new Chart(document.getElementById('pieChart'), {
  type: 'doughnut',
  data: {
    labels: ${chartLabels},
    datasets: [{
      data: ${chartCounts},
      backgroundColor: ${chartColors},
      borderColor: '#0f0f1a',
      borderWidth: 3,
      hoverOffset: 10
    }]
  },
  options: {
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#aaa', font: { size: 12 }, padding: 12, boxWidth: 14 }
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const sum = ctx.dataset.data.reduce((a,b)=>a+b,0);
            return ' ' + val.toLocaleString() + ' 次  (' + (val/sum*100).toFixed(2) + '%)';
          }
        }
      }
    }
  }
});

// 横向柱状图
new Chart(document.getElementById('barChart'), {
  type: 'bar',
  data: ${barChartData},
  options: {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ' ' + ctx.parsed.x.toLocaleString() + ' 次'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#888' },
        grid: { color: '#1e1e38' }
      },
      y: {
        ticks: { color: '#ccc', font: { size: 13 } },
        grid: { display: false }
      }
    }
  }
});
</script>
</body>
</html>`;

const reportPath = path.join(__dirname, 'backend', 'data', 'history', '21514463', 'emots_report_21514463.html');
fs.writeFileSync(reportPath, html, 'utf-8');
console.log('HTML 报告已生成：' + reportPath);

// ---- 控制台摘要 ----
console.log('\n====== 表情弹幕分析摘要 ======');
console.log('总弹幕条数：' + total);
console.log('');
console.log('排名 | 表情            | 次数  | 占比     | 最多用户');
console.log('-----|-----------------|-------|----------|------------------');
sorted.forEach(([emot, count], idx) => {
  const pct = ((count / total) * 100).toFixed(2) + '%';
  const userEntries = Object.entries(emotUserMap[emot]).sort((a, b) => b[1] - a[1]);
  const [topUser, topCount] = userEntries[0];
  const rank = String(idx + 1).padStart(4);
  const emotPad = emot.padEnd(16);
  const cntPad = String(count).padStart(5);
  const pctPad = pct.padStart(7);
  console.log(`${rank} | ${emotPad} | ${cntPad} | ${pctPad} | ${topUser}（${topCount}次）`);
});
