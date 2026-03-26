type ToastType = 'success' | 'error' | 'warning' | 'info';

function logToast(type: ToastType, message: string, description?: string) {
  const prefix = `[toast:${type}]`;
  if (description) {
    console[type === 'error' ? 'error' : 'log'](`${prefix} ${message} - ${description}`);
    return;
  }
  console[type === 'error' ? 'error' : 'log'](`${prefix} ${message}`);
}

export const toast = {
  success: (message: string, options?: { description?: string }) =>
    logToast('success', message, options?.description),
  error: (message: string, options?: { description?: string }) =>
    logToast('error', message, options?.description),
  warning: (message: string, options?: { description?: string }) =>
    logToast('warning', message, options?.description),
  info: (message: string, options?: { description?: string }) =>
    logToast('info', message, options?.description),
};
