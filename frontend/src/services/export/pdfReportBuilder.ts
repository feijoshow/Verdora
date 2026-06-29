import type { AdminDashboardInsights, ChatQuestionRecord, UserActivityProfile } from '../../types/analytics';

export type AnalyticsPdfData = AdminDashboardInsights & {
  exportedAt: string;
  source: 'cloud' | 'local' | 'mixed';
  chatQuestions: ChatQuestionRecord[];
};

function escapeHtml(value: unknown): string {
  const text = String(value ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<p class="empty">No records</p>`;
  }
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function section(title: string, content: string): string {
  return `<section class="block"><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

export type InsightsReportData = AdminDashboardInsights & { exportedAt: string };

function cssBarChart(
  title: string,
  items: { label: string; value: number; color: string }[],
): string {
  if (items.length === 0) {
    return `<div class="chart-block"><h3>${escapeHtml(title)}</h3><p class="empty">No data yet</p></div>`;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const rows = items
    .map((item) => {
      const pct = Math.max(8, Math.round((item.value / max) * 100));
      return `<div class="chart-row">
        <span class="chart-label">${escapeHtml(item.label)}</span>
        <div class="chart-track"><div class="chart-fill" style="width:${pct}%;background:${item.color}"></div></div>
        <span class="chart-value">${item.value}</span>
      </div>`;
    })
    .join('');
  return `<div class="chart-block"><h3>${escapeHtml(title)}</h3>${rows}</div>`;
}

function statCards(items: { label: string; value: string | number }[]): string {
  return `<div class="stat-grid">${items
    .map(
      (item) =>
        `<div class="stat-card"><div class="stat-value">${escapeHtml(item.value)}</div><div class="stat-label">${escapeHtml(item.label)}</div></div>`,
    )
    .join('')}</div>`;
}

/** Build a visual insights report with charts for printing */
export function buildInsightsReportHtml(data: InsightsReportData): string {
  const { summary, regionalIntelligence, environmentSummary } = data;

  const activityItems = [
    { label: 'Scans', value: summary.totalScans, color: '#40916c' },
    { label: 'Calendar', value: summary.totalFarmingRecords, color: '#52b788' },
    { label: 'Chat', value: summary.totalChatQuestions, color: '#74c69d' },
    { label: 'Weather', value: summary.totalEnvironmentLogs, color: '#95d5b2' },
  ];

  const diseaseItems = data.diseaseOutbreaks.slice(0, 6).map((o, i) => ({
    label: o.disease,
    value: o.count,
    color: ['#d00000', '#e85d04', '#2d6a4f', '#40916c'][i % 4],
  }));

  const chatItems = data.chatInsights.slice(0, 6).map((c) => ({
    label: c.topic,
    value: c.questionCount,
    color: '#40916c',
  }));

  const gapItems = regionalIntelligence.knowledgeGaps.slice(0, 5).map((g) => ({
    label: g.topic,
    value: g.questionCount,
    color: '#1b4332',
  }));

  const farmerTypeItems = Object.entries(data.segments.byFarmerType).map(([type, count]) => ({
    label: type,
    value: count,
    color: '#2d6a4f',
  }));

  const alertsTable = table(
    ['Disease', 'Scans', 'Radius (km)', 'Severity'],
    regionalIntelligence.diseaseAlerts.map((a) => [
      a.disease,
      String(a.scanCount),
      String(a.radiusKm),
      a.severity,
    ]),
  );

  const plantingTable = table(
    ['Crop', 'Region', 'Optimal months', 'Farmers', 'Recommendation'],
    regionalIntelligence.plantingInsights.map((p) => [
      p.cropName,
      p.region,
      p.optimalMonths.join(', ') || '—',
      String(p.farmerCount),
      p.recommendation,
    ]),
  );

  const lastAggregated = regionalIntelligence.lastAggregatedAt
    ? fmtDate(regionalIntelligence.lastAggregatedAt)
    : 'Not computed yet';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Verdora Insights Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1b4332;
      font-size: 11px;
      line-height: 1.45;
      margin: 0;
      padding: 28px 32px;
      background: #f8fdf9;
    }
    h1 { font-size: 24px; margin: 0 0 6px; color: #2d6a4f; }
    .meta { color: #52796f; margin-bottom: 24px; font-size: 10px; }
    h2 {
      font-size: 15px;
      color: #2d6a4f;
      border-bottom: 2px solid #95d5b2;
      padding-bottom: 4px;
      margin: 0 0 12px;
    }
    .block { margin-bottom: 24px; page-break-inside: avoid; }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #d8f3dc;
      border-radius: 10px;
      padding: 12px 10px;
      text-align: center;
    }
    .stat-value { font-size: 20px; font-weight: 700; color: #2d6a4f; }
    .stat-label { font-size: 9px; color: #52796f; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .chart-block {
      background: #fff;
      border: 1px solid #d8f3dc;
      border-radius: 10px;
      padding: 14px;
      page-break-inside: avoid;
    }
    .chart-block h3 {
      font-size: 12px;
      margin: 0 0 10px;
      color: #1b4332;
      font-weight: 700;
    }
    .chart-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .chart-label { width: 90px; font-size: 9px; color: #52796f; word-break: break-word; }
    .chart-track {
      flex: 1;
      height: 12px;
      background: #e9f5ec;
      border-radius: 999px;
      overflow: hidden;
    }
    .chart-fill { height: 100%; border-radius: 999px; }
    .chart-value { width: 32px; font-size: 9px; font-weight: 700; text-align: right; color: #1b4332; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th { background: #2d6a4f; color: #fff; text-align: left; padding: 7px 8px; font-weight: 600; }
    td { border: 1px solid #d8f3dc; padding: 6px 8px; vertical-align: top; word-break: break-word; background: #fff; }
    tr:nth-child(even) td { background: #f8fdf9; }
    .empty { font-style: italic; color: #52796f; margin: 0; }
    .env-banner {
      background: #fff;
      border: 1px solid #d8f3dc;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 16px;
      font-size: 10px;
      color: #52796f;
    }
    @media print {
      body { padding: 16px; background: #fff; }
      .charts-grid { grid-template-columns: 1fr 1fr; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Verdora Insights Report</h1>
  <p class="meta">
    Generated ${escapeHtml(fmtDate(data.exportedAt))} · Last aggregation: ${escapeHtml(lastAggregated)} ·
    Aggregated regional intelligence only
  </p>

  ${statCards([
    { label: 'Farmers', value: summary.totalFarmers },
    { label: 'Crop scans', value: summary.totalScans },
    { label: 'Farming records', value: summary.totalFarmingRecords },
    { label: 'Chat questions', value: summary.totalChatQuestions },
  ])}

  <div class="env-banner">
    Environment: avg ${environmentSummary.avgTemperature}°C · ${environmentSummary.avgHumidity}% humidity ·
    ${environmentSummary.topConditions.map((c) => `${c.condition} (${c.count})`).join(', ') || 'No conditions logged'}
  </div>

  ${section(
    'Visual insights',
    `<div class="charts-grid">
      ${cssBarChart('Platform activity', activityItems)}
      ${cssBarChart('Disease detections', diseaseItems)}
      ${cssBarChart('Chat topics', chatItems)}
      ${cssBarChart('Knowledge gaps', gapItems)}
      ${cssBarChart('Farmers by type', farmerTypeItems)}
    </div>`,
  )}

  ${section('Disease alert clusters', alertsTable)}
  ${section('Planting window optimization', plantingTable)}
</body>
</html>`;
}

/** Build print-ready HTML for PDF export */
export function buildAnalyticsPdfHtml(data: AnalyticsPdfData): string {
  const { summary, users, cropScans, farmingData, environmentLogs, chatQuestions } = data;
  const farmers = users.filter((u) => u.role === 'farmer');

  const summaryTable = table(
    ['Metric', 'Count'],
    [
      ['Total users', String(summary.totalUsers)],
      ['Farmers', String(summary.totalFarmers)],
      ['Crop scans', String(summary.totalScans)],
      ['Farming records', String(summary.totalFarmingRecords)],
      ['Chat questions', String(summary.totalChatQuestions)],
      ['Weather logs', String(summary.totalEnvironmentLogs)],
    ],
  );

  const farmersTable = table(
    ['Name', 'Email', 'Location', 'Type', 'Farm size', 'Consent', 'Crops'],
    farmers.map((u) => [
      u.name,
      u.email,
      u.location ?? '—',
      u.farmerType ?? '—',
      u.farmSize ?? '—',
      u.dataConsent ? 'Yes' : 'No',
      (u.cropsPlanted ?? []).join(', ') || '—',
    ]),
  );

  const scansTable = table(
    ['Farmer', 'Crop', 'Disease', 'Confidence', 'Location', 'Date', 'Treatment'],
    cropScans.map((s) => [
      s.userName,
      s.cropType,
      s.disease ?? 'Healthy',
      `${Math.round(s.confidence * 100)}%`,
      s.location,
      fmtDate(s.timestamp),
      s.treatment,
    ]),
  );

  const farmingTable = table(
    ['Crop', 'Location', 'Plant date', 'Harvest', 'Field', 'Soil', 'Updated'],
    farmingData.map((r) => [
      r.cropName,
      r.location,
      r.plantDate,
      r.harvestDate ?? '—',
      r.fieldName ?? '—',
      r.soilType ?? '—',
      fmtDate(r.updatedAt),
    ]),
  );

  const weatherTable = table(
    ['Location', 'Temp (°C)', 'Humidity', 'Condition', 'Date'],
    environmentLogs.map((e) => [
      e.location,
      String(e.temperature),
      `${e.humidity}%`,
      e.condition,
      fmtDate(e.timestamp),
    ]),
  );

  const chatTable = table(
    ['Location', 'Question', 'Assistant reply', 'Date'],
    chatQuestions.map((c) => [
      c.location,
      c.question,
      c.aiResponse ?? '—',
      fmtDate(c.timestamp),
    ]),
  );

  const outbreaksTable = table(
    ['Disease', 'Cases', 'Locations', 'Crops affected'],
    data.diseaseOutbreaks.map((o) => [
      o.disease,
      String(o.count),
      o.locations.join(', '),
      o.cropsAffected.join(', '),
    ]),
  );

  const chatInsightsTable = table(
    ['Topic', 'Questions', 'Sample question', 'Regions'],
    data.chatInsights.map((i) => [
      i.topic,
      String(i.questionCount),
      i.sampleQuestion,
      i.locations.join(', '),
    ]),
  );

  const envSummaryTable = table(
    ['Avg temperature', 'Avg humidity', 'Top conditions'],
    [
      [
        `${data.environmentSummary.avgTemperature}°C`,
        `${data.environmentSummary.avgHumidity}%`,
        data.environmentSummary.topConditions
          .map((c) => `${c.condition} (${c.count})`)
          .join(', ') || '—',
      ],
    ],
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Verdora Analytics Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1b4332;
      font-size: 11px;
      line-height: 1.45;
      margin: 0;
      padding: 28px 32px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 6px;
      color: #2d6a4f;
    }
    .meta {
      color: #52796f;
      margin-bottom: 24px;
      font-size: 10px;
    }
    h2 {
      font-size: 14px;
      color: #2d6a4f;
      border-bottom: 2px solid #95d5b2;
      padding-bottom: 4px;
      margin: 0 0 10px;
    }
    .block { margin-bottom: 22px; page-break-inside: avoid; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 10px;
    }
    th {
      background: #2d6a4f;
      color: #fff;
      text-align: left;
      padding: 7px 8px;
      font-weight: 600;
    }
    td {
      border: 1px solid #d8f3dc;
      padding: 6px 8px;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #f8fdf9; }
    .empty {
      font-style: italic;
      color: #52796f;
      margin: 0;
    }
    @media print {
      body { padding: 16px; }
      .block { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Verdora Analytics Report</h1>
  <p class="meta">
    Generated ${escapeHtml(fmtDate(data.exportedAt))} · Source: ${escapeHtml(data.source)} ·
    Consented farmer data only
  </p>

  ${section('Summary', summaryTable)}
  ${section(`Farmers (${farmers.length})`, farmersTable)}
  ${section('Environment summary', envSummaryTable)}
  ${section(`Crop scans (${cropScans.length})`, scansTable)}
  ${section(`Plantation calendar (${farmingData.length})`, farmingTable)}
  ${section(`Weather logs (${environmentLogs.length})`, weatherTable)}
  ${section(`Chat history (${chatQuestions.length})`, chatTable)}
  ${section('Disease outbreaks', outbreaksTable)}
  ${section('Chat topic insights', chatInsightsTable)}
</body>
</html>`;
}

export type UserActivityPdfData = UserActivityProfile & { exportedAt: string };

/** Build PDF HTML for a single farmer's activity */
export function buildUserActivityPdfHtml(data: UserActivityPdfData): string {
  const { user, scans, farmingRecords, environmentLogs, chatQuestions, stats } = data;

  const profileTable = table(
    ['Field', 'Value'],
    [
      ['Name', user.name],
      ['Email', user.email],
      ['Location', user.location ?? '—'],
      ['Region', user.region ?? '—'],
      ['Village', user.village ?? '—'],
      ['Farmer type', user.farmerType ?? '—'],
      ['Farm size', user.farmSize ?? '—'],
      ['Soil type', user.soilType ?? '—'],
      ['Methods', user.farmingMethods?.join(', ') || '—'],
      ['Crops', user.cropsPlanted?.join(', ') || 'None'],
      ['Data consent', user.dataConsent ? 'Yes' : 'No'],
      ['Joined', fmtDate(user.createdAt)],
    ],
  );

  const statsTable = table(
    ['Scans', 'Calendar', 'Chat', 'Weather'],
    [[String(stats.scanCount), String(stats.farmingCount), String(stats.chatCount), String(stats.environmentCount)]],
  );

  const scansTable = table(
    ['Crop', 'Disease', 'Confidence', 'Date', 'Treatment'],
    scans.map((s) => [
      s.cropType,
      s.disease ?? 'Healthy',
      `${Math.round(s.confidence * 100)}%`,
      fmtDate(s.timestamp),
      s.treatment,
    ]),
  );

  const farmingTable = table(
    ['Crop', 'Plant date', 'Harvest', 'Field', 'Soil'],
    farmingRecords.map((r) => [
      r.cropName,
      r.plantDate,
      r.harvestDate ?? '—',
      r.fieldName ?? '—',
      r.soilType ?? '—',
    ]),
  );

  const weatherTable = table(
    ['Condition', 'Temp', 'Humidity', 'Location', 'Date'],
    environmentLogs.map((e) => [
      e.condition,
      `${e.temperature}°C`,
      `${e.humidity}%`,
      e.location,
      fmtDate(e.timestamp),
    ]),
  );

  const chatTable = table(
    ['Question', 'Reply', 'Date'],
    chatQuestions.map((c) => [c.question, c.aiResponse ?? '—', fmtDate(c.timestamp)]),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Verdora Farmer Report — ${escapeHtml(user.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1b4332;
      font-size: 11px;
      line-height: 1.45;
      margin: 0;
      padding: 28px 32px;
    }
    h1 { font-size: 22px; margin: 0 0 6px; color: #2d6a4f; }
    .meta { color: #52796f; margin-bottom: 24px; font-size: 10px; }
    h2 {
      font-size: 14px;
      color: #2d6a4f;
      border-bottom: 2px solid #95d5b2;
      padding-bottom: 4px;
      margin: 0 0 10px;
    }
    .block { margin-bottom: 22px; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th { background: #2d6a4f; color: #fff; text-align: left; padding: 7px 8px; font-weight: 600; }
    td { border: 1px solid #d8f3dc; padding: 6px 8px; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) td { background: #f8fdf9; }
    .empty { font-style: italic; color: #52796f; margin: 0; }
    @media print { body { padding: 16px; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Farmer Activity Report</h1>
  <p class="meta">
    ${escapeHtml(user.name)} · ${escapeHtml(user.email)} ·
    Generated ${escapeHtml(fmtDate(data.exportedAt))}
  </p>

  ${section('Activity summary', statsTable)}
  ${section('Profile', profileTable)}
  ${section(`Crop scans (${scans.length})`, scansTable)}
  ${section(`Plantation calendar (${farmingRecords.length})`, farmingTable)}
  ${section(`Weather checks (${environmentLogs.length})`, weatherTable)}
  ${section(`Chat history (${chatQuestions.length})`, chatTable)}
</body>
</html>`;
}
