import { format, formatDistance, differenceInDays, addDays } from 'date-fns';

/**
 * Format a Firestore timestamp or Date to a readable string
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  if (!date) return '';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return format(dateObj, formatStr);
}

/**
 * Format date as relative time (e.g., "in 30 days", "2 months ago")
 */
export function formatRelativeDate(date) {
  if (!date) return '';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Calculate days until a date
 */
export function daysUntil(date) {
  if (!date) return null;
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return differenceInDays(dateObj, new Date());
}

/**
 * Get urgency level based on days until expiration
 */
export function getUrgencyLevel(daysUntilExpiry) {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 60) return 'high';
  if (daysUntilExpiry <= 90) return 'medium';
  return 'low';
}

/**
 * Get color class based on urgency
 */
export function getUrgencyColor(urgency) {
  const colors = {
    expired: 'bg-gray-100 text-gray-800',
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };
  return colors[urgency] || colors.low;
}

/**
 * Get risk level color
 */
export function getRiskColor(riskLevel) {
  const colors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  };
  return colors[riskLevel] || colors.low;
}

/**
 * Convert file to base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file type
 */
export function isValidFileType(file, allowedTypes = ['application/pdf']) {
  return allowedTypes.includes(file.type);
}

/**
 * Calculate cancellation deadline
 */
export function calculateCancellationDeadline(endDate, noticeDays) {
  if (!endDate || !noticeDays) return null;
  
  const dateObj = endDate.toDate ? endDate.toDate() : new Date(endDate);
  return addDays(dateObj, -noticeDays);
}

/**
 * Check if past cancellation deadline
 */
export function isPastCancellationDeadline(cancellationDeadline) {
  if (!cancellationDeadline) return false;
  
  const deadline = cancellationDeadline.toDate ? cancellationDeadline.toDate() : new Date(cancellationDeadline);
  return new Date() > deadline;
}

/**
 * Generate month labels for calendar
 */
export function getMonthLabels(year) {
  return [
    `Jan ${year}`,
    `Feb ${year}`,
    `Mar ${year}`,
    `Apr ${year}`,
    `May ${year}`,
    `Jun ${year}`,
    `Jul ${year}`,
    `Aug ${year}`,
    `Sep ${year}`,
    `Oct ${year}`,
    `Nov ${year}`,
    `Dec ${year}`
  ];
}

/**
 * Group contracts by month
 */
export function groupContractsByMonth(contracts, year) {
  const grouped = Array(12).fill(null).map(() => []);
  
  contracts.forEach(contract => {
    const endDate = contract.endDate?.toDate?.() || new Date(contract.endDate);
    if (endDate.getFullYear() === year) {
      const month = endDate.getMonth();
      grouped[month].push(contract);
    }
  });
  
  return grouped;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
