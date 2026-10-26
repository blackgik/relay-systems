'use client';

/**
 * The app's UI icons, drawn with lucide-react.
 *
 * Generated when the app moved from its own single-colour SVGs
 * (`public/svgs/*.svg`) to lucide. Each entry keeps the size, line weight and
 * colour its SVG had, so a bare `<DeleteIcon />` looks as it did — with the
 * colour now a semantic token instead of a baked-in hex, so it follows dark
 * mode. `public/svgs` keeps only illustrations and brand marks.
 *
 * Colour: an icon draws in `currentColor`. Its default tone applies only when
 * the caller's className sets no text colour of its own, so
 * `<DeleteIcon className="text-icon-muted" />` recolours it — never
 * `[&>path]:fill-*` / `stroke-*`, which fill lucide's outlines.
 */
import React from 'react';
import clsx from 'clsx';
import {
  AlarmClock,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Barcode,
  Bell,
  BellRing,
  Box,
  Briefcase,
  BriefcaseBusiness,
  Bug,
  Building2,
  Calculator,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChartCandlestick,
  ChartColumn,
  ChartNoAxesColumn,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  CircleHelp,
  CirclePause,
  CirclePlus,
  CircleX,
  ClipboardList,
  ClipboardPlus,
  CloudUpload,
  Columns3,
  CornerDownLeft,
  CreditCard,
  Crown,
  DollarSign,
  DoorClosed,
  Download,
  EllipsisVertical,
  Expand,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  Funnel,
  GripVertical,
  HandCoins,
  Handshake,
  House,
  Info,
  Landmark,
  LayoutGrid,
  List,
  Lock,
  LockOpen,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageCircleQuestion,
  MessageSquare,
  MessageSquareText,
  Minus,
  NotebookPen,
  NotebookText,
  Package,
  PackageCheck,
  Pill,
  Plus,
  Printer,
  Receipt,
  RotateCw,
  ScanLine,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Split,
  SquareCheck,
  SquarePen,
  SquarePlus,
  SquareX,
  Store,
  SwitchCamera,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Truck,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserRound,
  UserX,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/** A text-colour class, as opposed to a font-size / alignment `text-*`. */
const HAS_TEXT_COLOR =
  /(^|\s)(?:[\w-]+:)*!?text-(?!(?:xs|sm|base|lg|[2-9]?xl|left|right|center|justify|start|end|wrap|nowrap|ellipsis|clip|balance|pretty|body-|label-|title-|headline-|display-|caption|micro)\b)/;

/**
 * Typed as a plain SVG component so an app icon drops in anywhere an SVGR
 * import used to (`Icon icon={...}`, sidebar link tables, props typed
 * `ComponentType<SVGProps<SVGSVGElement>>`).
 */
export type AppIconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

const appIcon = (
  Icon: LucideIcon,
  defaults: { size: number; strokeWidth: number; tone?: string }
): React.FC<AppIconProps> => {
  const AppIcon = React.forwardRef<SVGSVGElement, Omit<LucideProps, 'ref'>>(
    ({ className, size = defaults.size, strokeWidth = defaults.strokeWidth, ...props }, ref) => (
      <Icon
        ref={ref}
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden={props['aria-label'] ? undefined : true}
        className={clsx(
          'shrink-0',
          defaults.tone && !HAS_TEXT_COLOR.test(className ?? '') && defaults.tone,
          className
        )}
        {...props}
      />
    )
  );
  AppIcon.displayName = `AppIcon(${Icon.displayName ?? 'Icon'})`;
  return AppIcon as unknown as React.FC<AppIconProps>;
};

/** activate-acct-icon.svg */
export const ActivateAcctIcon = appIcon(UserCheck, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** add-circle-icon.svg */
export const AddCircleIcon = appIcon(CirclePlus, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** add-square.svg */
export const AddSquareIcon = appIcon(SquarePlus, { size: 20, strokeWidth: 1.5, tone: 'text-icon-on-brand' });
/** add.svg */
export const AddIcon = appIcon(Plus, { size: 14, strokeWidth: 1.5, tone: 'text-icon-default' });
/** alarm-blue.svg */
export const AlarmBlueIcon = appIcon(AlarmClock, { size: 16, strokeWidth: 1.5, tone: 'text-icon-info' });
/** alarm-outline-icon.svg */
export const AlarmOutlineIcon = appIcon(AlarmClock, { size: 16, strokeWidth: 1.5, tone: 'text-icon-warning' });
/** alarm.svg */
export const AlarmIcon = appIcon(AlarmClock, { size: 16, strokeWidth: 1.5, tone: 'text-icon-default' });
/** alert-sm.svg */
export const AlertSmIcon = appIcon(CircleAlert, { size: 31, strokeWidth: 1, tone: 'text-icon-default' });
/** alert.svg */
export const AlertIcon = appIcon(CircleAlert, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** arrow-back.svg */
export const ArrowBackIcon = appIcon(ArrowLeft, { size: 19, strokeWidth: 1.5, tone: 'text-icon-default' });
/** arrow-down-lg.svg */
export const ArrowDownLgIcon = appIcon(ChevronDown, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** arrow-down-sort.svg */
export const ArrowDownSortIcon = appIcon(ArrowDown, { size: 16, strokeWidth: 2, tone: 'text-icon-muted' });
/** arrow-down.svg */
export const ArrowDownIcon = appIcon(ChevronDown, { size: 20, strokeWidth: 2, tone: 'text-icon-muted' });
/** arrow-left.svg */
export const ArrowLeftIcon = appIcon(ArrowLeft, { size: 25, strokeWidth: 1.5, tone: 'text-icon-default' });
/** bank-icon.svg */
export const BankIcon = appIcon(Landmark, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** barcode.svg */
export const BarcodeIcon = appIcon(Barcode, { size: 16, strokeWidth: 1.5, tone: 'text-icon-on-brand' });
/** bold-arrow-right.svg */
export const BoldArrowRightIcon = appIcon(ArrowRight, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** box.svg */
export const BoxIcon = appIcon(Package, { size: 20, strokeWidth: 1.5, tone: 'text-icon-warning' });
/** brief-case-icon.svg */
export const BriefCaseIcon = appIcon(BriefcaseBusiness, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** briefcase.svg */
export const BriefcaseIcon = appIcon(Briefcase, { size: 16, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** bug-icon.svg */
export const BugIcon = appIcon(Bug, { size: 20, strokeWidth: 1.75 });
/** buildings.svg */
export const BuildingsIcon = appIcon(Building2, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** calendar-date.svg */
export const CalendarDateIcon = appIcon(CalendarDays, { size: 20, strokeWidth: 2, tone: 'text-icon-muted' });
/** calendar-tick.svg */
export const CalendarTickIcon = appIcon(CalendarCheck, { size: 25, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** calendar.svg */
export const CalendarIcon = appIcon(Calendar, { size: 17, strokeWidth: 1.75, tone: 'text-icon-muted' });
/** camera-switch-fill.svg */
export const CameraSwitchFillIcon = appIcon(SwitchCamera, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** candle-icon.svg */
export const CandleIcon = appIcon(ChartCandlestick, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** capsule-orange.svg */
export const CapsuleOrangeIcon = appIcon(Pill, { size: 20, strokeWidth: 1.5, tone: 'text-icon-warning' });
/** capsule-red.svg */
export const CapsuleRedIcon = appIcon(Pill, { size: 20, strokeWidth: 1.5, tone: 'text-icon-error' });
/** card-pos.svg */
export const CardPosIcon = appIcon(CreditCard, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** cart-icon.svg */
export const CartIcon = appIcon(ShoppingCart, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** chart-square.svg */
export const ChartSquareIcon = appIcon(ChartNoAxesColumn, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** check-double-line.svg */
export const CheckDoubleLineIcon = appIcon(CheckCheck, { size: 20, strokeWidth: 1.5, tone: 'text-icon-on-brand' });
/** check-fill.svg */
export const CheckFillIcon = appIcon(CircleCheck, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** check-icon.svg */
export const CheckIcon = appIcon(CircleCheck, { size: 16, strokeWidth: 2.5, tone: 'text-icon-default' });
/** chevron-down-icon.svg */
export const ChevronDownIcon = appIcon(ChevronDown, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** chevron-right-lg.svg */
export const ChevronRightLgIcon = appIcon(ChevronRight, { size: 24, strokeWidth: 2, tone: 'text-icon-disabled' });
/** chevron-right.svg */
export const ChevronRightIcon = appIcon(ChevronRight, { size: 16, strokeWidth: 2, tone: 'text-icon-disabled' });
/** circle.svg */
export const CircleIcon = appIcon(Circle, { size: 25, strokeWidth: 2, tone: 'text-icon-default' });
/** circled-check.svg */
export const CircledCheckIcon = appIcon(CircleCheck, { size: 106, strokeWidth: 2, tone: 'text-icon-on-brand' });
/** close-circle-bold.svg */
export const CloseCircleBoldIcon = appIcon(CircleX, { size: 14, strokeWidth: 1, tone: 'text-icon-default' });
/** close-menu.svg */
export const CloseMenuIcon = appIcon(X, { size: 21, strokeWidth: 1.5, tone: 'text-icon-default' });
/** close-register-icon.svg */
export const CloseRegisterIcon = appIcon(DoorClosed, { size: 20, strokeWidth: 1, tone: 'text-icon-muted' });
/** close-square.svg */
export const CloseSquareIcon = appIcon(SquareX, { size: 25, strokeWidth: 1.5, tone: 'text-icon-default' });
/** close.svg */
export const CloseIcon = appIcon(X, { size: 24, strokeWidth: 1.5 });
/** customer-note.svg */
export const CustomerNoteIcon = appIcon(NotebookPen, { size: 22, strokeWidth: 1.5, tone: 'text-icon-default' });
/** deactivate-acct-icon.svg */
export const DeactivateAcctIcon = appIcon(UserX, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** delete-icon.svg */
export const DeleteIcon = appIcon(Trash2, { size: 20, strokeWidth: 1.5, tone: 'text-icon-error' });
/** document-text.svg */
export const DocumentTextIcon = appIcon(FileText, { size: 20, strokeWidth: 1.5, tone: 'text-icon-info' });
/** document.svg */
export const DocumentIcon = appIcon(File, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** dollar-blue.svg */
export const DollarBlueIcon = appIcon(CircleDollarSign, { size: 20, strokeWidth: 1.5, tone: 'text-icon-info' });
/** dollar-red.svg */
export const DollarRedIcon = appIcon(CircleDollarSign, { size: 20, strokeWidth: 1.5, tone: 'text-icon-error' });
/** dollar.svg */
export const DollarIcon = appIcon(DollarSign, { size: 16, strokeWidth: 2, tone: 'text-icon-default' });
/** download-line.svg */
export const DownloadLineIcon = appIcon(Download, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** drag-handle-icon.svg */
export const DragHandleIcon = appIcon(GripVertical, { size: 10, strokeWidth: 1.5 });
/** edit-icon-variant-1.svg */
export const EditIconVariant1Icon = appIcon(SquarePen, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** edit-icon.svg */
export const EditIcon = appIcon(SquarePen, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** empty-upload-icon.svg */
export const EmptyUploadIcon = appIcon(CloudUpload, { size: 32, strokeWidth: 1.5, tone: 'text-icon-disabled' });
/** enter-arrow.svg */
export const EnterArrowIcon = appIcon(CornerDownLeft, { size: 29, strokeWidth: 1.5, tone: 'text-icon-default' });
/** error-warning-fill.svg */
export const ErrorWarningFillIcon = appIcon(CircleAlert, { size: 16, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** expand.svg */
export const ExpandIcon = appIcon(Expand, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** export.svg */
export const ExportIcon = appIcon(Upload, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** external-link-icon.svg */
export const ExternalLinkIcon = appIcon(ExternalLink, { size: 16, strokeWidth: 2 });
/** eye-closed-icon.svg */
export const EyeClosedIcon = appIcon(EyeOff, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** eye-icon.svg */
export const EyeIcon = appIcon(Eye, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** filter.svg */
export const FilterIcon = appIcon(Funnel, { size: 20, strokeWidth: 2 });
/** grid-layout-icon.svg */
export const GridLayoutIcon = appIcon(LayoutGrid, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** handshake-icon.svg */
export const HandshakeIcon = appIcon(Handshake, { size: 20, strokeWidth: 1.75 });
/** help-circle-icon.svg */
export const HelpCircleIcon = appIcon(CircleHelp, { size: 20, strokeWidth: 1.75 });
/** important.svg */
export const ImportantIcon = appIcon(CircleAlert, { size: 25, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** import.svg */
export const ImportIcon = appIcon(Download, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** info-icon.svg */
export const InfoIcon = appIcon(Info, { size: 12, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** information-fill.svg */
export const InformationFillIcon = appIcon(Info, { size: 16, strokeWidth: 1.5, tone: 'text-icon-info' });
/** list-layout-icon.svg */
export const ListLayoutIcon = appIcon(List, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** location-icon-bold.svg */
export const LocationIconBoldIcon = appIcon(MapPin, { size: 18, strokeWidth: 1.5, tone: 'text-icon-default' });
/** location-icon.svg */
export const LocationIcon = appIcon(MapPin, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** lock-manual.svg */
export const LockManualIcon = appIcon(Lock, { size: 12, strokeWidth: 1.5, tone: 'text-icon-default' });
/** lock.svg */
export const LockIcon = appIcon(Lock, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** logout-icon.svg */
export const LogoutIcon = appIcon(LogOut, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** logout-outline-icon.svg */
export const LogoutOutlineIcon = appIcon(LogOut, { size: 20, strokeWidth: 1.75 });
/** mail-icon.svg */
export const MailIcon = appIcon(Mail, { size: 20, strokeWidth: 1.75 });
/** megaphone-line.svg */
export const MegaphoneLineIcon = appIcon(Megaphone, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** menu-icon.svg */
export const MenuIcon = appIcon(Menu, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** message-question-icon.svg */
export const MessageQuestionIcon = appIcon(MessageCircleQuestion, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** message-text.svg */
export const MessageTextIcon = appIcon(MessageSquareText, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** minus-icon.svg */
export const MinusIcon = appIcon(Minus, { size: 13, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** money-add-icon.svg */
export const MoneyAddIcon = appIcon(HandCoins, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** money-recive.svg */
export const MoneyReciveIcon = appIcon(HandCoins, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** moneys-icon.svg */
export const MoneysIcon = appIcon(Wallet, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** moneys.svg */
export const MoneysAltIcon = appIcon(Banknote, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** more-icon.svg */
export const MoreIcon = appIcon(EllipsisVertical, { size: 20, strokeWidth: 2, tone: 'text-icon-muted' });
/** note.svg */
export const NoteIcon = appIcon(NotebookText, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** notif-check.svg */
export const NotifCheckIcon = appIcon(Check, { size: 16, strokeWidth: 1.75, tone: 'text-icon-default' });
/** notif-error-icon.svg */
export const NotifErrorIcon = appIcon(CircleX, { size: 24, strokeWidth: 2, tone: 'text-icon-error' });
/** notif-info-icon.svg */
export const NotifInfoIcon = appIcon(Info, { size: 24, strokeWidth: 2, tone: 'text-icon-default' });
/** notif-success-icon.svg */
export const NotifSuccessIcon = appIcon(CircleCheck, { size: 24, strokeWidth: 2, tone: 'text-icon-success' });
/** notification-bing.svg */
export const NotificationBingIcon = appIcon(BellRing, { size: 12, strokeWidth: 1.5, tone: 'text-icon-warning' });
/** notification.svg */
export const NotificationIcon = appIcon(Bell, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** pause.svg */
export const PauseIcon = appIcon(CirclePause, { size: 25, strokeWidth: 2, tone: 'text-icon-default' });
/** plus-icon.svg */
export const PlusIcon = appIcon(Plus, { size: 14, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** premium-icon.svg */
export const PremiumIcon = appIcon(Crown, { size: 14, strokeWidth: 1.5, tone: 'text-icon-warning' });
/** prescription-note.svg */
export const PrescriptionNoteIcon = appIcon(ClipboardPlus, { size: 20, strokeWidth: 1.5 });
/** printer.svg */
export const PrinterIcon = appIcon(Printer, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** profile-outline-icon.svg */
export const ProfileOutlineIcon = appIcon(User, { size: 20, strokeWidth: 1.75 });
/** profile-users.svg */
export const ProfileUsersIcon = appIcon(Users, { size: 16, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** receipt-icon.svg */
export const ReceiptIcon = appIcon(Receipt, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** received.svg */
export const ReceivedIcon = appIcon(PackageCheck, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** reload.svg */
export const ReloadIcon = appIcon(RotateCw, { size: 16, strokeWidth: 1.5, tone: 'text-icon-default' });
/** scan.svg */
export const ScanIcon = appIcon(ScanLine, { size: 25, strokeWidth: 1.5, tone: 'text-icon-default' });
/** search-icon.svg */
export const SearchIcon = appIcon(Search, { size: 22, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** sell-nav-icon.svg */
export const SellNavIcon = appIcon(ShoppingBag, { size: 20, strokeWidth: 1, tone: 'text-icon-muted' });
/** send-message-icon.svg */
export const SendMessageIcon = appIcon(Send, { size: 20, strokeWidth: 1.75 });
/** setting-2.svg */
export const Setting2Icon = appIcon(SlidersHorizontal, { size: 16, strokeWidth: 1.5, tone: 'text-icon-default' });
/** setting.svg */
export const SettingIcon = appIcon(Settings, { size: 16, strokeWidth: 1.5, tone: 'text-icon-default' });
/** settings-outline-icon.svg */
export const SettingsOutlineIcon = appIcon(Settings, { size: 20, strokeWidth: 1.75 });
/** settings-pause-fill.svg */
export const SettingsPauseFillIcon = appIcon(CirclePause, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** shield-plain.svg */
export const ShieldPlainIcon = appIcon(Shield, { size: 24, strokeWidth: 2, tone: 'text-icon-info' });
/** shield-tick-icon.svg */
export const ShieldTickIcon = appIcon(ShieldCheck, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** shop.svg */
export const ShopIcon = appIcon(Store, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** sms.svg */
export const SmsIcon = appIcon(MessageSquare, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** sparkle-icon.svg */
export const SparkleIcon = appIcon(Sparkles, { size: 20, strokeWidth: 1.75 });
/** split-pay-icon.svg */
export const SplitPayIcon = appIcon(Split, { size: 20, strokeWidth: 1.5, tone: 'text-icon-default' });
/** square-close-icon.svg */
export const SquareCloseIcon = appIcon(SquareX, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** task-square.svg */
export const TaskSquareIcon = appIcon(SquareCheck, { size: 22, strokeWidth: 1.5, tone: 'text-icon-default' });
/** tick-square-green.svg */
export const TickSquareGreenIcon = appIcon(SquareCheck, { size: 24, strokeWidth: 1.5, tone: 'text-icon-success' });
/** timer.svg */
export const TimerIcon = appIcon(Timer, { size: 20, strokeWidth: 2, tone: 'text-icon-default' });
/** trash-2-icon.svg */
export const Trash2Icon = appIcon(Trash2, { size: 20, strokeWidth: 2, tone: 'text-icon-muted' });
/** trash-bin.svg */
export const TrashBinIcon = appIcon(Trash2, { size: 16, strokeWidth: 1.5, tone: 'text-icon-default' });
/** trash.svg */
export const TrashIcon = appIcon(Trash2, { size: 25, strokeWidth: 1.5, tone: 'text-icon-default' });
/** truck-fast.svg */
export const TruckFastIcon = appIcon(Truck, { size: 16, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** unlock.svg */
export const UnlockIcon = appIcon(LockOpen, { size: 12, strokeWidth: 1.5, tone: 'text-icon-success' });
/** user-customers-icon.svg */
export const UserCustomersIcon = appIcon(UsersRound, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-home-icon.svg */
export const UserHomeIcon = appIcon(House, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-icon.svg */
export const UserIcon = appIcon(User, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** user-inventory-icon.svg */
export const UserInventoryIcon = appIcon(Archive, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-orders-icon.svg */
export const UserOrdersIcon = appIcon(ClipboardList, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-pos-icon.svg */
export const UserPosIcon = appIcon(Calculator, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-product-icon.svg */
export const UserProductIcon = appIcon(Box, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-remove.svg */
export const UserRemoveIcon = appIcon(UserMinus, { size: 20, strokeWidth: 1.5, tone: 'text-icon-error' });
/** user-reports-icon.svg */
export const UserReportsIcon = appIcon(ChartColumn, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-sales-icon.svg */
export const UserSalesIcon = appIcon(TrendingUp, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-settings-icon.svg */
export const UserSettingsIcon = appIcon(Settings, { size: 24, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** user-users-icon.svg */
export const UserUsersIcon = appIcon(UserRound, { size: 20, strokeWidth: 1.25, tone: 'text-icon-muted' });
/** view-column-order.svg */
export const ViewColumnOrderIcon = appIcon(Columns3, { size: 14, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** view-column.svg */
export const ViewColumnIcon = appIcon(Columns3, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** wallet.svg */
export const WalletIcon = appIcon(Wallet, { size: 16, strokeWidth: 1.5, tone: 'text-icon-muted' });

// ── Framed icons ──────────────────────────────────────────────────────────────
// SVGs that drew their own tile or circle behind the glyph. The frame is now
// built from tokens around a lucide icon, so it follows dark mode too.

const HAS_SIZE = /(^|\s)(?:[\w-]+:)*(?:w|h|size)-/;

const framedIcon = (
  Icon: LucideIcon,
  d: { box: number; size: number; strokeWidth?: number; tone?: string; frame: string }
): React.FC<AppIconProps> => {
  const Framed = ({ className, style, ...props }: AppIconProps) => (
    <span
      aria-hidden={props['aria-label'] ? undefined : true}
      aria-label={props['aria-label']}
      role={props['aria-label'] ? 'img' : undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center',
        d.frame,
        d.tone && !HAS_TEXT_COLOR.test(className ?? '') && d.tone,
        className
      )}
      style={HAS_SIZE.test(className ?? '') ? style : { width: d.box, height: d.box, ...style }}
    >
      <Icon size={d.size} strokeWidth={d.strokeWidth ?? 1.5} aria-hidden />
    </span>
  );
  Framed.displayName = `FramedIcon(${Icon.displayName ?? 'Icon'})`;
  return Framed;
};

const TILE = 'rounded-lg border border-border bg-background';

/** add-prescription.svg */
export const AddPrescriptionIcon = framedIcon(ClipboardPlus, { box: 33, size: 18, tone: 'text-icon-default', frame: TILE });
/** add-section.svg */
export const AddSectionIcon = framedIcon(Plus, { box: 58, size: 24, tone: 'text-icon-default', frame: TILE });
/** arrow-back-fill.svg */
export const ArrowBackFillIcon = framedIcon(ArrowLeft, { box: 38, size: 20, tone: 'text-icon-default', frame: 'rounded-xl bg-muted' });
/** chevron-up-gray-bg.svg */
export const ChevronUpGrayBgIcon = framedIcon(ChevronUp, { box: 24, size: 16, strokeWidth: 2, tone: 'text-icon-default', frame: 'rounded-sm bg-muted' });
/** close-card.svg */
export const CloseCardIcon = framedIcon(X, { box: 33, size: 18, tone: 'text-icon-default', frame: 'rounded bg-destructive-subtle' });
/** delete-btn-gray-bg.svg */
export const DeleteBtnGrayBgIcon = framedIcon(Trash2, { box: 40, size: 20, tone: 'text-icon-default', frame: 'rounded bg-muted' });
/** delete-plain.svg */
export const DeletePlainIcon = framedIcon(Trash2, { box: 40, size: 20, tone: 'text-icon-muted', frame: '' });
/** export-sm.svg */
export const ExportSmIcon = framedIcon(Upload, { box: 38, size: 18, tone: 'text-icon-default', frame: TILE });
/** file-upload-icon.svg */
export const FileUploadIcon = framedIcon(CloudUpload, { box: 36, size: 18, tone: 'text-icon-brand', frame: 'rounded-full bg-brand/10 ring-4 ring-brand/5' });
/** upload-cloud-icon.svg */
export const UploadCloudIcon = FileUploadIcon;
/** lock-icon.svg */
export const LockCircleIcon = framedIcon(Lock, { box: 32, size: 16, tone: 'text-icon-default', frame: 'rounded-full bg-muted' });
/** printer-line.svg */
export const PrinterLineIcon = framedIcon(Printer, { box: 41, size: 20, tone: 'text-icon-muted', frame: TILE });
/** scan-sm.svg */
export const ScanSmIcon = framedIcon(ScanLine, { box: 38, size: 18, tone: 'text-icon-default', frame: TILE });
/** upload-icon.svg */
export const UploadCircleIcon = framedIcon(Upload, { box: 24, size: 14, tone: 'text-icon-on-brand', frame: 'rounded-full bg-brand' });
/** yellow-notif.svg */
export const YellowNotifIcon = framedIcon(Bell, { box: 33, size: 18, tone: 'text-icon-warning', frame: 'rounded-lg bg-warning-subtle' });
/** yellow-alert.svg */
export const YellowAlertIcon = framedIcon(TriangleAlert, { box: 48, size: 24, tone: 'text-icon-warning', frame: 'rounded-full bg-warning-subtle' });

/** search-outline.svg */
export const SearchOutlineIcon = appIcon(Search, { size: 24, strokeWidth: 1.5, tone: 'text-icon-default' });
/** arrow-right.svg */
export const ArrowRightIcon = appIcon(ArrowRight, { size: 20, strokeWidth: 1.5, tone: 'text-icon-muted' });
/** chevron-right-icon.svg */
export const ChevronRightIconIcon = appIcon(ChevronRight, { size: 24, strokeWidth: 1.5, tone: 'text-icon-muted' });
