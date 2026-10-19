/**
 * runtimeCache.ts — Bộ nhớ RAM (In-Memory) tạm thời trong phiên chạy của ứng dụng.
 * TUYỆT ĐỐI KHÔNG lưu xuống Local Storage / AsyncStorage / disk.
 */

// Cache đa nhánh của chuyến đi trong phiên chạy
export const runtimeTripBranchesCache = new Map<string, any[]>();

// Cache toạ độ lộ trình đã tính toán trong phiên chạy
export const runtimeTripRouteCache = new Map<string, any>();

// Tập hợp ID các chuyến đi đã bấm tạo chuyến về trong phiên chạy
export const runtimeCreatedReturnTripIds = new Set<string>();
