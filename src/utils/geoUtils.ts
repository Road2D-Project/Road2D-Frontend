/**
 * geoUtils.ts
 * Các hàm hỗ trợ tính toán địa lý: khoảng cách, góc phương vị (bearing),
 * dự phóng điểm (projection), và nội suy (interpolation).
 */

import type { LatLng } from '../types/route';

const R = 6371e3; // Bán kính Trái Đất theo mét

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Tính khoảng cách Haversine giữa 2 điểm (mét).
 */
export function getDistance(p1: LatLng, p2: LatLng): number {
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const lat1 = toRad(p1.latitude);
  const lat2 = toRad(p2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Tính góc phương vị (bearing) từ p1 đến p2 (độ).
 */
export function getBearing(p1: LatLng, p2: LatLng): number {
  const lat1 = toRad(p1.latitude);
  const lat2 = toRad(p2.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

/**
 * Tìm tọa độ điểm nằm trên đường thẳng p1-p2, cách p1 một khoảng distance (mét).
 */
export function interpolatePoint(p1: LatLng, p2: LatLng, distanceM: number): LatLng {
  const totalDist = getDistance(p1, p2);
  if (totalDist === 0 || distanceM <= 0) return { ...p1 };
  if (distanceM >= totalDist) return { ...p2 };

  const fraction = distanceM / totalDist;
  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * fraction,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * fraction,
  };
}

/**
 * Tính tổng chiều dài của một polyline (mảng các LatLng) (mét).
 */
export function getPolylineLength(points: LatLng[]): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += getDistance(points[i], points[i + 1]);
  }
  return length;
}

/**
 * Trả về tọa độ dựa trên khoảng cách đi được dọc theo polyline.
 */
export function getPointAlongPolyline(points: LatLng[], distanceM: number): { point: LatLng, bearing: number, segmentIndex: number } {
  if (points.length === 0) throw new Error("Polyline is empty");
  if (points.length === 1) return { point: points[0], bearing: 0, segmentIndex: 0 };
  if (distanceM <= 0) return { point: points[0], bearing: getBearing(points[0], points[1]), segmentIndex: 0 };

  let traveled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segmentLength = getDistance(p1, p2);

    if (traveled + segmentLength >= distanceM) {
      const remainingDistance = distanceM - traveled;
      return {
        point: interpolatePoint(p1, p2, remainingDistance),
        bearing: getBearing(p1, p2),
        segmentIndex: i
      };
    }
    traveled += segmentLength;
  }

  // Quá chặng cuối
  const lastIndex = points.length - 1;
  return {
    point: points[lastIndex],
    bearing: getBearing(points[lastIndex - 1], points[lastIndex]),
    segmentIndex: lastIndex - 1
  };
}
