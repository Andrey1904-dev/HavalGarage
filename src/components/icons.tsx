import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  ChevronDown,
  Columns3,
  Eye,
  Handshake,
  Heart,
  ListChecks,
  Menu,
  PiggyBank,
  Printer,
  Repeat,
  Route,
  Scale,
  Search,
  SlidersHorizontal,
  Star,
  Target,
  BadgeRussianRuble,
  BarChart3,
  Download,
  FileText,
  IdCard,
  ArrowUpRight,
  Bell,
  Bot,
  Calendar,
  ClipboardList,
  Clock,
  Disc3,
  Droplet,
  History,
  CarFront,
  Check,
  ChevronRight,
  CreditCard,
  Database,
  Fuel,
  Gauge,
  Info,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'

export interface IconProps {
  className?: string
  strokeWidth?: number
}

const DEFAULT_STROKE = 1.85
const base = (className?: string) => className ?? 'w-5 h-5'

export const HomeIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <LayoutDashboard className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const BotIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Bot className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CardIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <CreditCard className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const WalletIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Wallet className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CarIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <CarFront className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const FuelIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Fuel className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const WrenchIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Wrench className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ShieldIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ShieldCheck className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const DotsIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <MoreHorizontal className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const PlusIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Plus className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CloseIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <X className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TrashIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Trash2 className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const EditIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Pencil className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const RefreshIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <RefreshCw className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const LogoutIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <LogOut className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CalendarIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Calendar className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const GaugeIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Gauge className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const PercentIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Percent className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const InfoIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Info className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const AlertIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <AlertTriangle className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CheckIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Check className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ChevronRightIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ChevronRight className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ArrowUpRightIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ArrowUpRight className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SparklesIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Sparkles className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const DropletIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Droplet className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const DatabaseIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Database className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ClockIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Clock className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ChecklistIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ClipboardList className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SnowIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Snowflake className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SunIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Sun className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TyreIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Disc3 className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TrendIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <TrendingUp className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SettingsIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Settings2 className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const BellIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Bell className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const HistoryIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <History className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TrendDownIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <TrendingDown className={base(className)} strokeWidth={strokeWidth} />
)

export const ChartIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <BarChart3 className={base(className)} strokeWidth={strokeWidth} />
)

export const DocIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <FileText className={base(className)} strokeWidth={strokeWidth} />
)

export const LicenseIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <IdCard className={base(className)} strokeWidth={strokeWidth} />
)

export const TaxIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <BadgeRussianRuble className={base(className)} strokeWidth={strokeWidth} />
)

export const DownloadIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Download className={base(className)} strokeWidth={strokeWidth} />
)

/* --- Иконки, добавленные для разделов сравнения, подбора, владения и плана --- */

export const HeartIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Heart className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const MenuIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Menu className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ScaleIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Scale className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const StarIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Star className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const PrinterIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Printer className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SearchIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Search className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const FilterIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <SlidersHorizontal className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const CompareIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Columns3 className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ChevronDownIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ChevronDown className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ArrowRightIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ArrowRight className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SwapIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ArrowLeftRight className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const SavingsIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <PiggyBank className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TargetIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Target className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const TradeInIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Handshake className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const BookmarkIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Bookmark className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const RouteIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Route className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ListIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <ListChecks className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const ViewIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Eye className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)

export const LoopIcon = ({ className, strokeWidth = DEFAULT_STROKE }: IconProps) => (
  <Repeat className={base(className)} strokeWidth={strokeWidth} aria-hidden="true" />
)
