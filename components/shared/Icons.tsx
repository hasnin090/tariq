import React from 'react';
import {
  // Navigation & General
  Home,
  Building2,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  SwitchCamera,
  Mic,
  X,
  Edit,
  Wifi,
  Plus,
  ArrowRight,
  ArrowLeft,
  Key,
  Check,

  // UI Elements
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  Filter,
  XCircle,
  PlusCircle,
  Link,

  // Financial & Sales
  CreditCard,
  TrendingUp,
  Receipt,
  Scale,
  Tag,
  Calculator,
  Archive,
  Banknote,
  Wallet,
  PieChart,

  // Documents & Reports
  BarChart3,
  FileText,
  Briefcase,
  FileArchive,
  BarChart,
  Download,
  Printer,
  Upload,
  RefreshCw,
  Flame,
  Heart,
  Star,
  Globe,
  Building,
  UserCircle2,
  
  // Date & Time
  Calendar,
  Clock,
  
  // Status Icons
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  
  // File Types
  FileImage,
  File,
  
  // Modern Icons
  Sparkles,
  Rocket,
  Zap,
} from 'lucide-react';

// General & Navigation
export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => <Home {...props} />;
export const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <Building2 {...props} />;
export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <Users {...props} />;
export const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => <Users {...props} />;
export const CogIcon = (props: React.SVGProps<SVGSVGElement>) => <Settings {...props} />;
export const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => <LogOut {...props} />;
export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => <Search {...props} />;
export const BellIcon = (props: React.SVGProps<SVGSVGElement>) => <Bell {...props} />;
export const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => <Key {...props} />;
export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => <Check {...props} />;
export const SwitchHorizontalIcon = (props: React.SVGProps<SVGSVGElement>) => <SwitchCamera {...props} />;
export const MicrophoneIcon = (props: React.SVGProps<SVGSVGElement>) => <Mic {...props} />;
export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <X {...props} />;
export const EditIcon = (props: React.SVGProps<SVGSVGElement>) => <Edit {...props} />;
export const WifiIcon = (props: React.SVGProps<SVGSVGElement>) => <Wifi strokeWidth={1.5} {...props} />;
export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <Plus strokeWidth={1.5} {...props} />;
export const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => <ArrowRight strokeWidth={1.5} {...props} />;
export const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <ArrowLeft strokeWidth={1.5} {...props} />;

// UI Elements
export const ChevronIcon = ({ isExpanded, ...props }: { isExpanded?: boolean } & React.SVGProps<SVGSVGElement>) => {
  const Icon = isExpanded ? ChevronUp : ChevronDown;
  return <Icon strokeWidth={1.5} className={`transition-transform duration-200 ${props.className || ''}`} {...props} />;
};

export const SortIcon = ({ direction, ...props }: { direction?: 'ascending' | 'descending' } & React.SVGProps<SVGSVGElement>) => {
  if (!direction) return <ChevronDown className="h-4 w-4 text-slate-400" {...props} />;
  if (direction === 'ascending') return <ChevronUp className="h-4 w-4 text-slate-600" {...props} />;
  return <ChevronDown className="h-4 w-4 text-slate-600" {...props} />;
};

export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => <Eye strokeWidth={1.5} {...props} />;
export const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => <Paperclip strokeWidth={1.5} {...props} />;
export const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => <Filter strokeWidth={1.5} {...props} />;
export const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <XCircle strokeWidth={1.5} {...props} />;
export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <ChevronDown strokeWidth={1.5} {...props} />;
export const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <PlusCircle strokeWidth={1.5} {...props} />;
export const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => <Link strokeWidth={1.5} {...props} />;


// Financial & Sales
export const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => <CreditCard strokeWidth={1.5} {...props} />;
export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => <TrendingUp strokeWidth={1.5} {...props} />;
export const ReceiptIcon = (props: React.SVGProps<SVGSVGElement>) => <Receipt strokeWidth={1.5} {...props} />;
export const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => <Scale strokeWidth={1.5} {...props} />;
export const TagIcon = (props: React.SVGProps<SVGSVGElement>) => <Tag strokeWidth={1.5} {...props} />;
export const CalculatorIcon = (props: React.SVGProps<SVGSVGElement>) => <Calculator strokeWidth={1.5} {...props} />;
export const CollectionIcon = (props: React.SVGProps<SVGSVGElement>) => <Archive strokeWidth={1.5} {...props} />;
export const BanknotesIcon = (props: React.SVGProps<SVGSVGElement>) => <Banknote strokeWidth={1.5} {...props} />;
export const CashIcon = (props: React.SVGProps<SVGSVGElement>) => <Wallet strokeWidth={1.5} {...props} />;
export const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => <PieChart strokeWidth={1.5} {...props} />;


// Documents & Reports
export const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => <BarChart3 strokeWidth={2} {...props} />;
export const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => <FileText strokeWidth={2} {...props} />;
export const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => <Briefcase strokeWidth={2} {...props} />;
export const ArchiveIcon = (props: React.SVGProps<SVGSVGElement>) => <FileArchive strokeWidth={2} {...props} />;
export const DocumentReportIcon = (props: React.SVGProps<SVGSVGElement>) => <BarChart strokeWidth={2} {...props} />;
export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <Download strokeWidth={2} {...props} />;
export const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => <Printer strokeWidth={2} {...props} />;
export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => <Upload strokeWidth={2} {...props} />;
export const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => <RefreshCw strokeWidth={2} {...props} />;
export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <Trash2 strokeWidth={2} {...props} />;

export const SpinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Loader2 className={`animate-spin h-6 w-6 ${props.className || ''}`} {...props} />
);

export const FileIcon = ({ mimeType, ...props }: { mimeType?: string } & React.SVGProps<SVGSVGElement>) => {
  if (mimeType?.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-sky-500" strokeWidth={2} {...props} />;
  }
  if (mimeType === 'application/pdf') {
    return <File className="h-5 w-5 text-rose-500" strokeWidth={2} {...props} />;
  }
  return <File className="h-5 w-5 text-slate-500" strokeWidth={2} {...props} />;
};

// Misc & Other
export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <Calendar strokeWidth={2} {...props} />;
export const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <Clock strokeWidth={2} {...props} />;
export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <CheckCircle strokeWidth={2} {...props} />;
export const ArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => <ArrowUp strokeWidth={2} {...props} />;
export const ArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => <ArrowDown strokeWidth={2} {...props} />;
export const SuccessIcon = (props: React.SVGProps<SVGSVGElement>) => <CheckCircle fill="currentColor" {...props} />;
export const ErrorIcon = (props: React.SVGProps<SVGSVGElement>) => <XCircle fill="currentColor" {...props} />;
export const WarningIcon = (props: React.SVGProps<SVGSVGElement>) => <AlertTriangle strokeWidth={2} {...props} />;
export const QuestionIcon = (props: React.SVGProps<SVGSVGElement>) => <HelpCircle strokeWidth={2} {...props} />;
export const UnitsEmptyIcon = (props: React.SVGProps<SVGSVGElement>) => <Building strokeWidth={1.5} {...props} />;
export const CustomersEmptyIcon = (props: React.SVGProps<SVGSVGElement>) => <UserCircle2 strokeWidth={1.5} {...props} />;
export const BankIcon = (props: React.SVGProps<SVGSVGElement>) => <Building2 strokeWidth={2} {...props} />;

// Modern Icons
export const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <Sparkles strokeWidth={1.5} {...props} />;
export const RocketIcon = (props: React.SVGProps<SVGSVGElement>) => <Rocket strokeWidth={1.5} {...props} />;
export const LightningIcon = (props: React.SVGProps<SVGSVGElement>) => <Zap strokeWidth={1.5} {...props} />;
export const FireIcon = (props: React.SVGProps<SVGSVGElement>) => <Flame strokeWidth={1.5} {...props} />;
export const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => <Heart strokeWidth={1.5} {...props} />;
export const StarIcon = (props: React.SVGProps<SVGSVGElement>) => <Star strokeWidth={1.5} {...props} />;
export const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => <Globe strokeWidth={1.5} {...props} />;