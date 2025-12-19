// ============================================================================
// Analytics Utilities - Trends, Forecasting, and KPIs
// ============================================================================

export interface DataPoint {
  date: Date;
  value: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  description: string;
}

export interface ForecastResult {
  date: Date;
  predicted: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface KPI {
  name: string;
  value: number;
  target?: number;
  unit: string;
  trend: TrendAnalysis;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

// ============================================================================
// Trend Analysis
// ============================================================================

/**
 * Calculate trend between two time periods
 */
export function calculateTrend(currentPeriod: number, previousPeriod: number): TrendAnalysis {
  if (previousPeriod === 0) {
    return {
      direction: currentPeriod > 0 ? 'up' : 'stable',
      percentage: 0,
      description: 'لا توجد بيانات سابقة للمقارنة'
    };
  }

  const change = currentPeriod - previousPeriod;
  const percentage = (change / previousPeriod) * 100;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(percentage) < 5) {
    direction = 'stable';
  } else if (percentage > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return {
    direction,
    percentage: Math.abs(percentage),
    description: direction === 'up' 
      ? `زيادة بنسبة ${percentage.toFixed(1)}%`
      : direction === 'down'
      ? `انخفاض بنسبة ${percentage.toFixed(1)}%`
      : 'مستقر (أقل من 5% تغيير)'
  };
}

/**
 * Calculate moving average for smoothing data
 */
export function calculateMovingAverage(data: DataPoint[], windowSize: number = 3): DataPoint[] {
  if (data.length < windowSize) return data;

  const result: DataPoint[] = [];
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const average = window.reduce((sum, point) => sum + point.value, 0) / windowSize;
    result.push({
      date: data[i].date,
      value: average
    });
  }

  return result;
}

/**
 * Detect trend direction from time series data
 */
export function detectTrendDirection(data: DataPoint[]): TrendAnalysis {
  if (data.length < 2) {
    return {
      direction: 'stable',
      percentage: 0,
      description: 'بيانات غير كافية'
    };
  }

  // Calculate linear regression slope
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  data.forEach((point, index) => {
    const x = index;
    const y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgValue = sumY / n;
  const slopePercentage = (slope / avgValue) * 100;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(slopePercentage) < 2) {
    direction = 'stable';
  } else if (slopePercentage > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return {
    direction,
    percentage: Math.abs(slopePercentage),
    description: direction === 'up'
      ? 'اتجاه تصاعدي'
      : direction === 'down'
      ? 'اتجاه تنازلي'
      : 'اتجاه مستقر'
  };
}

// ============================================================================
// Forecasting (Simple Linear Regression)
// ============================================================================

/**
 * Simple linear forecasting based on historical data
 */
export function forecastLinear(data: DataPoint[], periodsAhead: number = 3): ForecastResult[] {
  if (data.length < 3) {
    throw new Error('يجب توفر 3 نقاط بيانات على الأقل للتنبؤ');
  }

  // Calculate linear regression
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  data.forEach((point, index) => {
    const x = index;
    const y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared for confidence
  const avgY = sumY / n;
  let ssTotal = 0, ssResidual = 0;
  
  data.forEach((point, index) => {
    const predicted = slope * index + intercept;
    ssTotal += Math.pow(point.value - avgY, 2);
    ssResidual += Math.pow(point.value - predicted, 2);
  });

  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (rSquared > 0.8) confidence = 'high';
  else if (rSquared > 0.5) confidence = 'medium';
  else confidence = 'low';

  // Generate forecasts
  const forecasts: ForecastResult[] = [];
  const lastDate = data[data.length - 1].date;
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= periodsAhead; i++) {
    const x = n + i - 1;
    const predicted = Math.max(0, slope * x + intercept); // Don't allow negative predictions
    const forecastDate = new Date(lastDate.getTime() + i * 30 * dayMs); // Assuming monthly data

    forecasts.push({
      date: forecastDate,
      predicted,
      confidence
    });
  }

  return forecasts;
}

/**
 * Exponential smoothing forecast
 */
export function forecastExponential(data: DataPoint[], periodsAhead: number = 3, alpha: number = 0.3): ForecastResult[] {
  if (data.length < 2) {
    throw new Error('يجب توفر نقطتي بيانات على الأقل للتنبؤ');
  }

  // Calculate exponential smoothing
  let smoothed = data[0].value;
  const smoothedValues: number[] = [smoothed];

  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i].value + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }

  // Generate forecasts
  const forecasts: ForecastResult[] = [];
  const lastDate = data[data.length - 1].date;
  const lastSmoothed = smoothedValues[smoothedValues.length - 1];
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= periodsAhead; i++) {
    const forecastDate = new Date(lastDate.getTime() + i * 30 * dayMs);
    forecasts.push({
      date: forecastDate,
      predicted: Math.max(0, lastSmoothed),
      confidence: 'medium'
    });
  }

  return forecasts;
}

// ============================================================================
// KPI Calculations
// ============================================================================

/**
 * Calculate Customer Acquisition Cost (CAC)
 */
export function calculateCAC(marketingExpenses: number, salesExpenses: number, newCustomers: number): number {
  if (newCustomers === 0) return 0;
  return (marketingExpenses + salesExpenses) / newCustomers;
}

/**
 * Calculate Customer Lifetime Value (CLV)
 */
export function calculateCLV(avgRevenuePerCustomer: number, avgCustomerLifespan: number, profitMargin: number): number {
  return avgRevenuePerCustomer * avgCustomerLifespan * profitMargin;
}

/**
 * Calculate Return on Investment (ROI)
 */
export function calculateROI(gain: number, cost: number): number {
  if (cost === 0) return 0;
  return ((gain - cost) / cost) * 100;
}

/**
 * Calculate Gross Profit Margin
 */
export function calculateGrossProfitMargin(revenue: number, costOfGoods: number): number {
  if (revenue === 0) return 0;
  return ((revenue - costOfGoods) / revenue) * 100;
}

/**
 * Calculate Average Revenue Per Unit (ARPU)
 */
export function calculateARPU(totalRevenue: number, totalUnits: number): number {
  if (totalUnits === 0) return 0;
  return totalRevenue / totalUnits;
}

/**
 * Calculate Conversion Rate
 */
export function calculateConversionRate(conversions: number, totalVisitors: number): number {
  if (totalVisitors === 0) return 0;
  return (conversions / totalVisitors) * 100;
}

/**
 * Calculate Churn Rate
 */
export function calculateChurnRate(lostCustomers: number, totalCustomers: number): number {
  if (totalCustomers === 0) return 0;
  return (lostCustomers / totalCustomers) * 100;
}

/**
 * Determine KPI status based on value vs target
 */
export function determineKPIStatus(value: number, target: number, higherIsBetter: boolean = true): 'excellent' | 'good' | 'warning' | 'critical' {
  if (!target) return 'good';

  const ratio = value / target;
  
  if (higherIsBetter) {
    if (ratio >= 1.1) return 'excellent';
    if (ratio >= 0.9) return 'good';
    if (ratio >= 0.7) return 'warning';
    return 'critical';
  } else {
    if (ratio <= 0.7) return 'excellent';
    if (ratio <= 0.9) return 'good';
    if (ratio <= 1.1) return 'warning';
    return 'critical';
  }
}

// ============================================================================
// Data Aggregation Helpers
// ============================================================================

/**
 * Group data by month
 */
export function groupByMonth(data: { date: Date; value: number }[]): Map<string, number[]> {
  const grouped = new Map<string, number[]>();

  data.forEach(item => {
    const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item.value);
  });

  return grouped;
}

/**
 * Calculate period-over-period growth
 */
export function calculateGrowthRate(data: DataPoint[]): number[] {
  if (data.length < 2) return [];

  const growthRates: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const previous = data[i - 1].value;
    const current = data[i].value;
    
    if (previous === 0) {
      growthRates.push(0);
    } else {
      growthRates.push(((current - previous) / previous) * 100);
    }
  }

  return growthRates;
}

/**
 * Calculate year-over-year comparison
 */
export function calculateYoY(currentYear: number, previousYear: number): TrendAnalysis {
  return calculateTrend(currentYear, previousYear);
}

/**
 * Find anomalies in time series data (values > 2 standard deviations)
 */
export function detectAnomalies(data: DataPoint[]): DataPoint[] {
  if (data.length < 3) return [];

  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const threshold = 2 * stdDev;

  return data.filter(point => Math.abs(point.value - mean) > threshold);
}
