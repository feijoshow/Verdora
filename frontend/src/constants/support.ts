import { env } from '../config/env';

const DEFAULT_FEEDBACK_EMAIL = 'feedback@verdora.app';

/** Email address for tester feedback (Profile screen mailto link). */
export function getFeedbackEmail(): string {
  return env.feedbackEmail.trim() || DEFAULT_FEEDBACK_EMAIL;
}

export function buildFeedbackMailtoUrl(params: {
  userEmail?: string;
  userName?: string;
  appVersion?: string;
}): string {
  const to = getFeedbackEmail();
  const subject = encodeURIComponent('Verdora tester feedback');
  const bodyLines = [
    'Describe what happened or what you would like improved:',
    '',
    '---',
    params.userName ? `Name: ${params.userName}` : null,
    params.userEmail ? `Account: ${params.userEmail}` : null,
    params.appVersion ? `App: ${params.appVersion}` : null,
  ].filter(Boolean);
  const body = encodeURIComponent(bodyLines.join('\n'));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
