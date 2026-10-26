export type ToastVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export type ToastPositionType =
  | 'top-right'
  | 'top-center'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastContentProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Duration in ms. 0 = persistent (no auto-dismiss). Default: 4000 */
  duration?: number;
  /** Show countdown progress bar. Default: true when duration > 0 */
  showProgress?: boolean;
  onClose?: () => void;
  /** Injected by react-toastify when used as toast content */
  closeToast?: () => void;
  className?: string;
}

export interface ToastParams {
  title: string;
  description?: string;
  /** Duration in ms. 0 = persistent. Default: 4000 */
  duration?: number;
  position?: ToastPositionType;
  /** Show countdown bar. Default: true when duration > 0 */
  showProgress?: boolean;
  action?: ToastAction;
  onClose?: () => void;
}

export interface ToastContainerProps {
  position?: ToastPositionType;
  /** Maximum toasts shown at once. Default: 3 */
  limit?: number;
}
