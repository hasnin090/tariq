import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import { 
  expensesService, 
  customersService, 
  unitsService, 
  paymentsService, 
  employeesService, 
  vendorsService,
  expenseCategoriesService
} from '../../../src/services/supabaseService';
import { UploadIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, RefreshIcon, EyeIcon } from '../../shared/Icons';
import ProjectSelector from '../../shared/ProjectSelector';

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface FieldMapping {
  csvColumn: string;
  dbField: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
}

interface ImportTarget {
  id: string;
  name: string;
  arabicName: string;
  fields: {
    name: string;
    arabicName: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required: boolean;
  }[];
}

const IMPORT_TARGETS: ImportTarget[] = [
  {
    id: 'expenses',
    name: 'expenses',
    arabicName: 'المصروفات',
    fields: [
      { name: 'expense_date', arabicName: 'التاريخ', type: 'date', required: true },
      { name: 'description', arabicName: 'الوصف', type: 'text', required: true },
      { name: 'amount', arabicName: 'المبلغ', type: 'number', required: true },
      { name: 'category_name', arabicName: 'نوع المصروف', type: 'text', required: false },
      { name: 'project_id', arabicName: 'معرف المشروع', type: 'text', required: false },
    ]
  },
  {
    id: 'customers',
    name: 'customers',
    arabicName: 'العملاء',
    fields: [
      { name: 'name', arabicName: 'الاسم', type: 'text', required: true },
      { name: 'phone', arabicName: 'الهاتف', type: 'text', required: true },
      { name: 'email', arabicName: 'البريد الإلكتروني', type: 'text', required: false },
    ]
  },
  {
    id: 'units',
    name: 'units',
    arabicName: 'الوحدات',
    fields: [
      { name: 'name', arabicName: 'اسم الوحدة', type: 'text', required: true },
      { name: 'type', arabicName: 'النوع', type: 'text', required: true },
      { name: 'status', arabicName: 'الحالة', type: 'text', required: true },
      { name: 'price', arabicName: 'السعر', type: 'number', required: true },
      { name: 'project_id', arabicName: 'معرف المشروع', type: 'text', required: false },
    ]
  },
  {
    id: 'payments',
    name: 'payments',
    arabicName: 'الدفعات',
    fields: [
      { name: 'amount', arabicName: 'المبلغ', type: 'number', required: true },
      { name: 'payment_date', arabicName: 'تاريخ الدفع', type: 'date', required: true },
      { name: 'booking_id', arabicName: 'معرف الحجز', type: 'text', required: true },
      { name: 'customer_id', arabicName: 'معرف العميل', type: 'text', required: false },
    ]
  },
  {
    id: 'employees',
    name: 'employees',
    arabicName: 'الموظفين',
    fields: [
      { name: 'name', arabicName: 'الاسم', type: 'text', required: true },
      { name: 'position', arabicName: 'المسمى الوظيفي', type: 'text', required: false },
      { name: 'salary', arabicName: 'الراتب', type: 'number', required: false },
    ]
  },
  {
    id: 'vendors',
    name: 'vendors',
    arabicName: 'الموردين',
    fields: [
      { name: 'name', arabicName: 'الاسم', type: 'text', required: true },
      { name: 'contact_person', arabicName: 'جهة الاتصال', type: 'text', required: false },
      { name: 'phone', arabicName: 'الهاتف', type: 'text', required: false },
    ]
  },
];

// Arabic column name mappings for auto-detection
const ARABIC_COLUMN_MAPPINGS: Record<string, string[]> = {
  'expense_date': ['التاريخ', 'تاريخ', 'date', 'تاريخ المصروف', 'تاريخ العملية'],
  'payment_date': ['تاريخ الدفع', 'تاريخ الدفعة', 'payment_date', 'payment date'],
  'hire_date': ['تاريخ التعيين', 'تاريخ الالتحاق', 'hire_date', 'hire date'],
  'description': ['الوصف', 'وصف', 'البيان', 'description', 'التفاصيل'],
  'amount': ['المبلغ', 'مبلغ', 'القيمة', 'قيمة', 'amount', 'total', 'الإجمالي'],
  'name': ['الاسم', 'اسم', 'name', 'العميل', 'الموظف', 'المورد'],
  'phone': ['الهاتف', 'هاتف', 'رقم الهاتف', 'جوال', 'الجوال', 'phone', 'mobile'],
  'email': ['البريد', 'الإيميل', 'البريد الإلكتروني', 'email', 'e-mail'],
  'notes': ['ملاحظات', 'ملاحظة', 'notes', 'note', 'تعليق'],
  'type': ['النوع', 'نوع', 'type', 'kind'],
  'status': ['الحالة', 'حالة', 'status', 'state'],
  'price': ['السعر', 'سعر', 'price', 'cost', 'التكلفة'],
  'category_name': ['نوع المصروف', 'الفئة', 'فئة', 'التصنيف', 'category', 'نوع', 'البند', 'بند'],
  'salary': ['الراتب', 'راتب', 'salary', 'wage'],
  'position': ['المسمى', 'الوظيفة', 'المنصب', 'position', 'job', 'title'],
  'address': ['العنوان', 'عنوان', 'address', 'location'],
  'category_id': ['الفئة', 'فئة', 'category', 'التصنيف'],
  'project_id': ['المشروع', 'مشروع', 'project'],
  'customer_id': ['العميل', 'رقم العميل', 'customer'],
  'booking_id': ['الحجز', 'رقم الحجز', 'booking'],
};

const DataImport: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeProject, availableProjects, setActiveProject } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload');
  const [selectedTarget, setSelectedTarget] = useState<ImportTarget | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  // حالة مؤشر التقدم
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    currentItem: string;
    status: 'idle' | 'processing' | 'done';
  }>({
    current: 0,
    total: 0,
    percentage: 0,
    currentItem: '',
    status: 'idle'
  });

  // Check admin permission
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">غير مصرح</h2>
          <p className="text-red-600 dark:text-red-300 mt-2">هذه الصفحة متاحة للمدير فقط</p>
        </div>
      </div>
    );
  }

  const parseCSV = (text: string): CSVData => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Detect delimiter (comma or semicolon)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });

    return { headers, rows };
  };

  const autoDetectMapping = (headers: string[], target: ImportTarget): FieldMapping[] => {
    return target.fields.map(field => {
      // Try to find a matching header
      let matchedHeader = '';
      
      // Check if there's a direct or Arabic match
      const possibleNames = ARABIC_COLUMN_MAPPINGS[field.name] || [field.name];
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim();
        if (possibleNames.some(name => normalizedHeader.includes(name.toLowerCase()))) {
          matchedHeader = header;
          break;
        }
      }

      return {
        csvColumn: matchedHeader,
        dbField: field.name,
        dataType: field.type,
      };
    });
  };

  // Parse Excel file
  const parseExcel = (buffer: ArrayBuffer): CSVData => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      if (jsonData.length === 0) {
        return { headers: [], rows: [] };
      }
      
      // First row is headers
      const headers = jsonData[0].map((h: any) => String(h || '').trim());
      
      // Rest are data rows
      const rows = jsonData.slice(1).map(row => 
        row.map((cell: any) => {
          if (cell instanceof Date) {
            // Format date as YYYY-MM-DD
            return cell.toISOString().split('T')[0];
          }
          return String(cell || '').trim();
        })
      ).filter(row => row.some(cell => cell !== '')); // Remove empty rows
      
      return { headers, rows };
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return { headers: [], rows: [] };
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTarget) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    setFileType(isExcel ? 'excel' : 'csv');

    if (isExcel) {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const data = parseExcel(buffer);
        setCsvData(data);
        
        // Auto-detect field mappings
        const mappings = autoDetectMapping(data.headers, selectedTarget);
        setFieldMappings(mappings);
        setStep('map');
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        setCsvData(data);
        
        // Auto-detect field mappings
        const mappings = autoDetectMapping(data.headers, selectedTarget);
        setFieldMappings(mappings);
        setStep('map');
      };
      reader.readAsText(file, 'UTF-8');
    }
  }, [selectedTarget]);

  const handleMappingChange = (dbField: string, csvColumn: string) => {
    setFieldMappings(prev => 
      prev.map(m => m.dbField === dbField ? { ...m, csvColumn } : m)
    );
  };

  // Helper function to convert Arabic numerals to English and clean special characters
  const arabicToEnglishNumerals = (str: string): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = str;
    
    // Convert Arabic numerals to English
    arabicNumerals.forEach((arabic, index) => {
      result = result.replace(new RegExp(arabic, 'g'), englishNumerals[index]);
    });
    
    // Remove invisible Unicode characters (like Arabic formatting marks)
    // Keep only digits, letters, spaces, and common punctuation
    result = result.replace(/[\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/g, '');
    
    return result;
  };

  const convertValue = (value: string, type: 'text' | 'number' | 'date' | 'boolean'): any => {
    if (!value || value.trim() === '') return null;
    
    // Convert Arabic numerals to English first
    const normalizedValue = arabicToEnglishNumerals(value);
    
    switch (type) {
      case 'number':
        const num = parseFloat(normalizedValue.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;
      case 'date':
        // Try different date formats
        const dateStr = normalizedValue.trim();
        // Format: DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyy = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (ddmmyyyy) {
          return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
        }
        // Format: YYYY-MM-DD or YYYY/MM/DD
        const yyyymmdd = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (yyyymmdd) {
          return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
        }
        return dateStr;
      case 'boolean':
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'نعم' || lower === 'yes';
      default:
        return value.trim();
    }
  };

  const handleImport = async () => {
    if (!csvData || !selectedTarget) return;

    setIsImporting(true);
    const totalRows = csvData.rows.length;
    
    // تهيئة مؤشر التقدم
    setImportProgress({
      current: 0,
      total: totalRows,
      percentage: 0,
      currentItem: 'جاري التحضير...',
      status: 'processing'
    });
    
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      for (let rowIndex = 0; rowIndex < csvData.rows.length; rowIndex++) {
        const row = csvData.rows[rowIndex];
        
        // تحديث مؤشر التقدم
        const percentage = Math.round(((rowIndex + 1) / totalRows) * 100);
        setImportProgress({
          current: rowIndex + 1,
          total: totalRows,
          percentage,
          currentItem: `معالجة الصف ${rowIndex + 2} من ${totalRows + 1}`,
          status: 'processing'
        });
        const record: Record<string, any> = {
          id: `${selectedTarget.id.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${rowIndex}`,
        };

        // Build the record from mappings
        for (const mapping of fieldMappings) {
          if (mapping.csvColumn) {
            const columnIndex = csvData.headers.indexOf(mapping.csvColumn);
            if (columnIndex !== -1) {
              record[mapping.dbField] = convertValue(row[columnIndex], mapping.dataType);
            }
          }
        }

        // Validate required fields
        const missingRequired = selectedTarget.fields
          .filter(f => f.required && !record[f.name])
          .map(f => f.arabicName);

        if (missingRequired.length > 0) {
          results.failed++;
          results.errors.push(`صف ${rowIndex + 2}: حقول مطلوبة ناقصة: ${missingRequired.join(', ')}`);
          continue;
        }

        try {
          // Insert to database based on target
          switch (selectedTarget.id) {
            case 'expenses':
              // التعرف على نوع المصروف وإنشاؤه تلقائياً إذا لم يكن موجوداً
              let categoryId: string | null = null;
              const categoryName = record.category_name?.trim();
              
              if (categoryName) {
                try {
                  // البحث عن الفئة أو إنشاؤها (مخصصة للمشروع الحالي)
                  const category = await expenseCategoriesService.findOrCreate(
                    categoryName, 
                    activeProject?.id || null
                  );
                  categoryId = category?.id || null;
                } catch (catError) {
                  console.warn(`تعذر إنشاء فئة "${categoryName}":`, catError);
                }
              }
              
              await expensesService.create({
                date: record.expense_date || new Date().toISOString().split('T')[0],
                description: record.description || '',
                amount: record.amount || 0,
                categoryId: categoryId,
                projectId: activeProject?.id || null,  // Use selected project
                accountId: null,
              });
              break;
            case 'customers':
              await customersService.create({
                name: record.name || '',
                phone: record.phone || '',
                email: record.email || '',
              });
              break;
            case 'units':
              await unitsService.create({
                name: record.name || '',
                type: record.type || '',
                status: record.status || 'متاح',
                price: record.price || 0,
                projectId: activeProject?.id || record.project_id || null,
              });
              break;
            case 'payments':
              await paymentsService.create({
                amount: record.amount || 0,
                paymentDate: record.payment_date || new Date().toISOString().split('T')[0],
                bookingId: record.booking_id || null,
                customerId: record.customer_id || null,
                unitPrice: 0,
              });
              break;
            case 'employees':
              await employeesService.create({
                name: record.name || '',
                position: record.position || '',
                salary: record.salary || 0,
              });
              break;
            case 'vendors':
              await vendorsService.create({
                name: record.name || '',
                contactPerson: record.contact_person || '',
                phone: record.phone || '',
              });
              break;
          }
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`صف ${rowIndex + 2}: ${error.message || 'خطأ غير معروف'}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`خطأ عام: ${error.message}`);
    }

    // تحديث مؤشر التقدم عند الانتهاء
    setImportProgress(prev => ({
      ...prev,
      percentage: 100,
      currentItem: 'تم الانتهاء!',
      status: 'done'
    }));
    
    setImportResults(results);
    setStep('result');
    setIsImporting(false);
  };

  const resetImport = () => {
    setStep('upload');
    setSelectedTarget(null);
    setCsvData(null);
    setFieldMappings([]);
    setImportResults(null);
    // إعادة تعيين مؤشر التقدم
    setImportProgress({
      current: 0,
      total: 0,
      percentage: 0,
      currentItem: '',
      status: 'idle'
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getMappedPreviewData = () => {
    if (!csvData || fieldMappings.length === 0) return [];
    
    return csvData.rows.slice(0, 5).map(row => {
      const mapped: Record<string, any> = {};
      for (const mapping of fieldMappings) {
        if (mapping.csvColumn) {
          const columnIndex = csvData.headers.indexOf(mapping.csvColumn);
          if (columnIndex !== -1) {
            mapped[mapping.dbField] = row[columnIndex];
          }
        }
      }
      return mapped;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg p-6 border border-white/20 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <UploadIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">استيراد البيانات</h1>
            <p className="text-slate-600 dark:text-slate-300">رفع ملفات CSV أو Excel واستيرادها إلى النظام</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {['upload', 'map', 'preview', 'result'].map((s, index) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                step === s 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                  : index < ['upload', 'map', 'preview', 'result'].indexOf(step)
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  index < ['upload', 'map', 'preview', 'result'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : step === s
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}>
                  {index < ['upload', 'map', 'preview', 'result'].indexOf(step) ? '✓' : index + 1}
                </span>
                <span className="hidden sm:inline">
                  {s === 'upload' ? 'رفع الملف' : s === 'map' ? 'ربط الأعمدة' : s === 'preview' ? 'معاينة' : 'النتيجة'}
                </span>
              </div>
              {index < 3 && <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-600"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Project Selector */}
      <ProjectSelector 
        projects={availableProjects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
      />

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg p-6 border border-white/20 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">1. اختر نوع البيانات</h2>
          
          {/* Project Info */}
          {activeProject && (
            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">سيتم استيراد البيانات إلى مشروع:</span>{' '}
                <span className="text-primary-600 dark:text-primary-400 font-bold">{activeProject.name}</span>
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {IMPORT_TARGETS.map(target => (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedTarget?.id === target.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-slate-200 dark:border-slate-600 hover:border-primary-300'
                }`}
              >
                <DocumentTextIcon className={`h-8 w-8 mx-auto mb-2 ${
                  selectedTarget?.id === target.id ? 'text-primary-500' : 'text-slate-400'
                }`} />
                <span className={`text-sm font-medium ${
                  selectedTarget?.id === target.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {target.arabicName}
                </span>
              </button>
            ))}
          </div>

          {selectedTarget && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">2. رفع ملف CSV أو Excel</h2>
              
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-2">اسحب الملف هنا أو انقر للاختيار</p>
                <p className="text-sm text-slate-500">يدعم ملفات CSV و Excel (xlsx, xls)</p>
                <div className="flex justify-center gap-4 mt-4">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                    📊 Excel
                  </span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    📄 CSV
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Field Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">الحقول المطلوبة لـ {selectedTarget.arabicName}:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTarget.fields.map(field => (
                    <span
                      key={field.name}
                      className={`px-3 py-1 rounded-full text-sm ${
                        field.required
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {field.arabicName} {field.required && '*'}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Map Fields */}
      {step === 'map' && csvData && selectedTarget && (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg p-6 border border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">ربط الأعمدة</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              fileType === 'excel' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {fileType === 'excel' ? '📊 Excel' : '📄 CSV'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-6">اختر عمود {fileType === 'excel' ? 'Excel' : 'CSV'} المناسب لكل حقل في النظام</p>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">حقل النظام</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">عمود CSV</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">نوع البيانات</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">مطلوب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {selectedTarget.fields.map(field => {
                  const mapping = fieldMappings.find(m => m.dbField === field.name);
                  return (
                    <tr key={field.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{field.arabicName}</span>
                        <span className="text-xs text-slate-400 mr-2">({field.name})</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping?.csvColumn || ''}
                          onChange={(e) => handleMappingChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          <option value="">-- لا يوجد --</option>
                          {csvData.headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.type === 'number' ? 'bg-blue-100 text-blue-700' :
                          field.type === 'date' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {field.type === 'number' ? 'رقم' : field.type === 'date' ? 'تاريخ' : 'نص'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {field.required ? (
                          <span className="text-red-500">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              رجوع
            </button>
            <button
              onClick={() => setStep('preview')}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
            >
              <EyeIcon className="h-5 w-5" />
              معاينة
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && csvData && selectedTarget && (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg p-6 border border-white/20 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">معاينة البيانات</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            سيتم استيراد <span className="font-bold text-primary-600">{csvData.rows.length}</span> صف إلى جدول <span className="font-bold">{selectedTarget.arabicName}</span>
          </p>
          
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">#</th>
                  {selectedTarget.fields.map(field => (
                    <th key={field.name} className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {field.arabicName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {getMappedPreviewData().map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    {selectedTarget.fields.map(field => (
                      <td key={field.name} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {row[field.name] || <span className="text-slate-300">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {csvData.rows.length > 5 && (
            <p className="text-sm text-slate-500 mt-2 text-center">
              ... و {csvData.rows.length - 5} صفوف أخرى
            </p>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep('map')}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              رجوع
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <RefreshIcon className="h-5 w-5 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  تأكيد الاستيراد
                </>
              )}
            </button>
          </div>
          
          {/* مؤشر التقدم الحقيقي */}
          {isImporting && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-700 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      {importProgress.currentItem}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      {importProgress.current} من {importProgress.total} صف
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {importProgress.percentage}%
                  </span>
                </div>
              </div>
              
              {/* شريط التقدم */}
              <div className="relative h-4 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              
              {/* تفاصيل إضافية */}
              <div className="flex justify-between mt-2 text-xs text-blue-600 dark:text-blue-400">
                <span>البداية</span>
                <span>جاري المعالجة...</span>
                <span>النهاية</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && importResults && (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg p-6 border border-white/20 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">نتيجة الاستيراد</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
              <div className="text-green-700 dark:text-green-300">تم بنجاح</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
              <div className="text-red-700 dark:text-red-300">فشل</div>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">الأخطاء:</h3>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {importResults.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 dark:text-red-400">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={resetImport}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
            >
              <RefreshIcon className="h-5 w-5" />
              استيراد ملف جديد
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-700">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3">تعليمات هامة:</h3>
        <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-400">
          <li>• <strong>ملفات Excel:</strong> يدعم النظام ملفات xlsx و xls - سيتم قراءة الورقة الأولى تلقائياً</li>
          <li>• <strong>ملفات CSV:</strong> تأكد من أن الملف بترميز UTF-8 لدعم اللغة العربية</li>
          <li>• يجب أن يحتوي الصف الأول على أسماء الأعمدة</li>
          <li>• صيغة التاريخ المدعومة: YYYY-MM-DD أو DD/MM/YYYY أو تنسيق التاريخ في Excel</li>
          <li>• الأرقام يجب أن تكون بدون فواصل الآلاف (أو استخدم Excel للتنسيق الصحيح)</li>
          <li>• النظام سيحاول التعرف تلقائياً على الأعمدة بناءً على أسمائها العربية أو الإنجليزية</li>
          <li>• يمكنك تعديل ربط الأعمدة يدوياً إذا لم يتم التعرف عليها بشكل صحيح</li>
        </ul>
      </div>
    </div>
  );
};

export default DataImport;
