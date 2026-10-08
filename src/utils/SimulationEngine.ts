/**
 * SimulationEngine.ts
 * Động cơ giả lập di chuyển dọc theo polyline của Route.
 * Sử dụng geoUtils để tính toán vị trí, tốc độ, góc phương vị.
 */

import { getPointAlongPolyline, getPolylineLength } from './geoUtils';
import type { LatLng } from '../types/route';
import { useSimulationStore } from '../store/useSimulationStore';

export class SimulationEngine {
  private polylinePoints: LatLng[] = [];
  private totalLengthM: number = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  
  // Vận tốc gốc theo kịch bản (ví dụ 40 km/h)
  private baseSpeedKmh: number = 40;

  constructor(routePolylineCoords: [number, number][]) {
    // Convert [lng, lat] to { latitude, longitude }
    this.polylinePoints = routePolylineCoords.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    this.totalLengthM = getPolylineLength(this.polylinePoints);
  }

  public start() {
    if (this.timer) return;
    this.lastTickTime = Date.now();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  public pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public stop() {
    this.pause();
  }

  private tick() {
    const store = useSimulationStore.getState();
    if (!store.running) {
      this.lastTickTime = Date.now();
      return;
    }

    const now = Date.now();
    const dtSeconds = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    // Tính tốc độ hiện tại với multiplier
    const currentSpeedKmh = this.baseSpeedKmh * store.speedMultiplier;
    const speedMs = (currentSpeedKmh * 1000) / 3600;

    // Quãng đường đi thêm
    const deltaDistanceM = speedMs * dtSeconds;
    
    // Quãng đường tổng cộng
    const currentDistanceM = (store.traveledKm * 1000) + deltaDistanceM;

    if (currentDistanceM >= this.totalLengthM) {
      // Đã tới đích
      const lastPoint = this.polylinePoints[this.polylinePoints.length - 1];
      store.tick({
        traveledKm: this.totalLengthM / 1000,
        position: lastPoint,
        speedKmh: 0,
      });
      store.stop(); // Ngừng giả lập
      this.pause();
      return;
    }

    // Cập nhật vị trí mới
    const { point, bearing } = getPointAlongPolyline(this.polylinePoints, currentDistanceM);

    store.tick({
      traveledKm: currentDistanceM / 1000,
      position: point,
      speedKmh: currentSpeedKmh,
    });
  }
}
