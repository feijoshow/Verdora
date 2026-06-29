import * as Print from 'expo-print';
import { Platform } from 'react-native';
import type { AdminDashboardInsights } from '../../types/analytics';
import { buildInsightsReportHtml } from './pdfReportBuilder';
import { saveAnalyticsPdf } from './pdfReport';

/** Regenerate-ready insights snapshot → print dialog (web) or shareable PDF (mobile). */
export async function printInsightsReport(data: AdminDashboardInsights): Promise<string> {
  const html = buildInsightsReportHtml({
    ...data,
    exportedAt: new Date().toISOString(),
  });
  const filename = `verdora_insights_${new Date().toISOString().slice(0, 10)}.pdf`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return filename;
  }

  return saveAnalyticsPdf(filename, html);
}
