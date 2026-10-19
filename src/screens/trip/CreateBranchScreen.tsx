import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { CreateBranchRouteProp, CreateBranchScreenNavigationProp } from '../../types/navigation';
import tripService, {
  TripDetailResponse,
  BackendBranchResponse,
  BackendStopResponse,
} from '../../services/api/tripService';
import planningService from '../../services/api/planningService';
import { goongMapService, PlacePrediction, decodePolyline } from '../../services/api/goongMapService';
import { runtimeTripBranchesCache, runtimeTripRouteCache } from '../../services/storage/runtimeCache';
import { SharedGoongMap, MapWaypoint, MapBranchRoute } from '../../components/map/SharedGoongMap';
import type { Trip } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Bảng màu đại diện nhánh chuẩn theo UI_GUIDELINES
export const BRANCH_PALETTES = [
  { id: 'teal', label: 'Xanh ngọc', hex: '#00BCD4' },
  { id: 'purple', label: 'Tím pastel', hex: '#9C27B0' },
  { id: 'amber', label: 'Vàng cam', hex: '#FF9800' },
  { id: 'rose', label: 'Hồng sen', hex: '#E91E63' },
  { id: 'blue', label: 'Xanh biển', hex: '#2196F3' },
  { id: 'green', label: 'Xanh lá', hex: '#4CAF50' },
  { id: 'brown', label: 'Nâu đồng', hex: '#8D6E63' },
  { id: 'gold', label: 'Vàng hoàng yến', hex: '#FBC02D' },
];

export interface ConfiguredBranch {
  id: string;
  name: string;
  purpose: string;
  color: string;
  splitStopId: string;
  destination: {
    place_id: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
  };
  mergeStopId: string;
  memberIds: string[];
  routeCoords?: [number, number][];
}

export default function CreateBranchScreen() {
  const navigation = useNavigation<CreateBranchScreenNavigationProp>();
  const route = useRoute<CreateBranchRouteProp>();
  const { tripId } = route.params;

  // Dữ liệu từ Backend
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripGraph, setTripGraph] = useState<TripDetailResponse | null>(null);
  const [tripMembers, setTripMembers] = useState<any[]>([]);

  // Danh sách các nhánh đã cấu hình trong phiên làm việc
  const [savedBranches, setSavedBranches] = useState<ConfiguredBranch[]>([]);

  // Form State cho nhánh đang chỉnh sửa
  const [splitStopId, setSplitStopId] = useState<string>('');
  const [splitStopSearch, setSplitStopSearch] = useState<string>('');

  // Tìm kiếm địa điểm Goong cho điểm nhánh
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<{
    place_id: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
  } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Thông tin nhánh & Màu sắc
  const [branchName, setBranchName] = useState('');
  const [branchPurpose, setBranchPurpose] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(BRANCH_PALETTES[0].hex);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);

  // Phân công thành viên
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  // Toạ độ route xem trước của nhánh đang thiết lập
  const [activeBranchRouteCoords, setActiveBranchRouteCoords] = useState<[number, number][]>([]);

  // Trạng thái submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch dữ liệu Trip Graph & Members từ Backend
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tripData, graph, members] = await Promise.all([
          tripService.getTripById(tripId),
          tripService.getTripGraph(tripId),
          tripService.getTripMembers(tripId),
        ]);
        if (!isMounted) return;

        setTrip(tripData || null);
        setTripMembers(members || []);

        let currentGraph = graph;
        let mainBranch = currentGraph?.branches?.[0];
        let stops = mainBranch?.stops || [];

        // Nếu chuyến đi chưa có trạm dừng trên backend (do lúc tạo trước đây chưa lưu graph):
        if (stops.length === 0) {
          let seedPoints: Array<{ name?: string; lat?: number; lng?: number; place_id?: string; id?: string }> = [];
          if (tripData?.waypoints && tripData.waypoints.length >= 2) {
            seedPoints = tripData.waypoints;
          } else if (tripData?.name && tripData.name.includes(' → ')) {
            const parts = tripData.name.split(' → ').map((p: string) => p.trim());
            if (parts.length >= 2) {
              seedPoints = parts.map((name: string) => ({ name }));
            }
          }

          if (seedPoints.length >= 2) {
            try {
              const destIds: string[] = [];
              for (const pt of seedPoints) {
                let placeId = pt.place_id || '';
                if (!placeId && pt.name) {
                  const preds = await goongMapService.searchPlaces(pt.name);
                  if (preds.length > 0) placeId = preds[0].place_id;
                }
                if (placeId) {
                  const loc = await planningService.ensureLocation(placeId);
                  const forked = await planningService.forkLocation(loc.locationId, { name: pt.name || 'Điểm dừng' });
                  destIds.push(forked.destinationId);
                }
              }
              if (destIds.length >= 2) {
                await tripService.setTripGraph(tripId, [destIds], [false]);
                await tripService.computeStoredTravels(tripId);
                const updatedGraph = await tripService.getTripGraph(tripId);
                if (updatedGraph) {
                  currentGraph = updatedGraph;
                  mainBranch = updatedGraph?.branches?.[0];
                  stops = mainBranch?.stops || [];
                }
              }
            } catch (autoInitErr) {
              console.warn('[CreateBranchScreen] Auto-init trip graph warning:', autoInitErr);
            }
          }
        }

        setTripGraph(currentGraph);

        if (stops.length >= 1) {
          setSplitStopId(stops[0].destinationId);
        }

        // Tải các nhánh phụ đã có trên backend (lọc bỏ các nhánh rác không có điểm dừng)
        const allBranches = currentGraph?.branches || [];
        if (allBranches.length > 1) {
          const loadedBranches: ConfiguredBranch[] = [];
          for (let i = 1; i < allBranches.length; i++) {
            const b = allBranches[i];
            if (!b.stops || b.stops.length < 2) continue; // Bỏ qua nhánh rác không có điểm dừng
            const destStop = b.stops[1];
            if (destStop) {
              let coords: [number, number][] = [];
              // Chỉ lấy tối đa 2 chặng rẽ nhánh: điểm tách -> điểm đến nhánh, và điểm đến nhánh -> về lại nhánh gốc
              if (b.travels && b.travels.length > 0) {
                const detourTravels = b.travels.slice(0, 2);
                detourTravels.forEach((t) => {
                  if (t.polyline) {
                    coords = coords.concat(decodePolyline(t.polyline));
                  }
                });
              }
              if (coords.length === 0 && b.stops) {
                const detourStops = b.stops.slice(0, 3);
                coords = detourStops.map((s) => [s.lng, s.lat]);
              }
              loadedBranches.push({
                id: b.id || `branch-${i}`,
                name: b.label || `Nhánh ${i}`,
                purpose: b.description || 'Khám phá cung đường',
                color: b.color || BRANCH_PALETTES[(i - 1) % BRANCH_PALETTES.length].hex,
                splitStopId: b.splitFromDestinationId || b.stops[0]?.destinationId || '',
                destination: {
                  place_id: '',
                  name: destStop.name,
                  lat: destStop.lat,
                  lng: destStop.lng,
                },
                mergeStopId: b.mergeToDestinationId || b.stops[Math.min(2, b.stops.length - 1)]?.destinationId || '',
                memberIds: (members || []).filter((m) => m.assignedBranchId === b.id).map((m) => m.userId || m.id),
                routeCoords: coords,
              });
            }
          }
          setSavedBranches(loadedBranches);
          const nextIdx = loadedBranches.length + 1;
          setBranchName(`Nhánh ${nextIdx} - Khám phá mới`);
          setSelectedColor(BRANCH_PALETTES[(nextIdx - 1) % BRANCH_PALETTES.length].hex);
        } else {
          setBranchName('Nhánh 1 - Khám phá mới');
          setSelectedColor(BRANCH_PALETTES[0].hex);
        }
      } catch (err) {
        console.warn('[CreateBranchScreen] Error fetching data:', err);
        Alert.alert('Lỗi tải dữ liệu', 'Không thể tải lộ trình từ máy chủ. Vui lòng thử lại.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [tripId]);

  // Danh sách các điểm dừng trên nhánh chính
  const mainStops = useMemo<BackendStopResponse[]>(() => {
    return tripGraph?.branches?.[0]?.stops || [];
  }, [tripGraph]);

  // Lọc danh sách điểm dừng theo từ khoá tìm kiếm ở Bước 1
  const filteredSplitStops = useMemo<BackendStopResponse[]>(() => {
    if (!splitStopSearch.trim()) return mainStops;
    const query = splitStopSearch.trim().toLowerCase();
    return mainStops.filter((s) => s.name.toLowerCase().includes(query));
  }, [mainStops, splitStopSearch]);

  // Bảng tra cứu thành viên đã được phân công vào các nhánh đã lưu
  // Quy tắc: Mỗi thành viên chỉ được tham gia duy nhất 1 nhánh
  const assignedMembersMap = useMemo<{ [userId: string]: { branchId: string; branchName: string } }>(() => {
    const map: { [userId: string]: { branchId: string; branchName: string } } = {};
    savedBranches.forEach((b) => {
      b.memberIds.forEach((uId) => {
        map[uId] = { branchId: b.id, branchName: b.name };
      });
    });
    return map;
  }, [savedBranches]);

  // Danh sách thành viên khả dụng (chưa thuộc nhánh nào)
  const availableMembers = useMemo(() => {
    return tripMembers.filter((m) => {
      const uId = m.userId || m.id;
      return !assignedMembersMap[uId];
    });
  }, [tripMembers, assignedMembersMap]);

  // Điểm nhập lại tự động (trạm tiếp theo sau điểm tách trên tuyến chính theo yêu cầu auto openTail=false)
  const autoMergeStop = useMemo<BackendStopResponse | null>(() => {
    if (!splitStopId || mainStops.length === 0) return null;
    const splitIndex = mainStops.findIndex((s) => s.destinationId === splitStopId);
    if (splitIndex < 0) return mainStops[mainStops.length - 1] || null;
    if (splitIndex + 1 < mainStops.length) {
      return mainStops[splitIndex + 1];
    }
    return mainStops[mainStops.length - 1];
  }, [mainStops, splitStopId]);

  const splitStopName = mainStops.find((s) => s.destinationId === splitStopId)?.name || 'Chưa chọn';
  const mergeStopName = autoMergeStop?.name || 'Điểm kết thúc';

  // Cập nhật tuyến đường xem trước của nhánh khi thay đổi điểm tách hoặc điểm đến
  useEffect(() => {
    if (!splitStopId || !selectedPlace) {
      setActiveBranchRouteCoords([]);
      return;
    }

    const splitStop = mainStops.find((s) => s.destinationId === splitStopId);
    if (!splitStop || !autoMergeStop) return;

    let isCurrent = true;
    const computePreviewPath = async () => {
      try {
        const [leg1, leg2] = await Promise.all([
          goongMapService.getDirections(
            { lat: splitStop.lat, lng: splitStop.lng },
            { lat: selectedPlace.lat, lng: selectedPlace.lng }
          ),
          goongMapService.getDirections(
            { lat: selectedPlace.lat, lng: selectedPlace.lng },
            { lat: autoMergeStop.lat, lng: autoMergeStop.lng }
          ),
        ]);
        if (!isCurrent) return;

        let combined: [number, number][] = [];
        if (leg1 && leg1.coords) combined = combined.concat(leg1.coords);
        if (leg2 && leg2.coords) combined = combined.concat(leg2.coords);

        if (combined.length === 0) {
          // Fallback to straight line if directions pending
          combined = [
            [splitStop.lng, splitStop.lat],
            [selectedPlace.lng, selectedPlace.lat],
            [autoMergeStop.lng, autoMergeStop.lat],
          ];
        }
        setActiveBranchRouteCoords(combined);
      } catch {
        if (isCurrent) {
          setActiveBranchRouteCoords([
            [splitStop.lng, splitStop.lat],
            [selectedPlace.lng, selectedPlace.lat],
            [autoMergeStop.lng, autoMergeStop.lat],
          ]);
        }
      }
    };

    computePreviewPath();
    return () => {
      isCurrent = false;
    };
  }, [splitStopId, selectedPlace, autoMergeStop, mainStops]);

  // Xử lý tìm kiếm Goong Place
  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!text.trim() || text.trim().length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await goongMapService.searchPlaces(text.trim());
        setPredictions(results || []);
      } catch (err) {
        console.warn('[CreateBranchScreen] Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Chọn địa điểm từ kết quả tìm kiếm Goong
  const handleSelectPrediction = async (p: PlacePrediction) => {
    setIsSearching(true);
    try {
      const detail = await goongMapService.getPlaceDetail(p.place_id);
      if (detail) {
        setSelectedPlace({
          place_id: p.place_id,
          name: detail.name || p.structured_formatting?.main_text || p.description,
          address: detail.address || p.structured_formatting?.secondary_text || '',
          lat: detail.lat,
          lng: detail.lng,
        });
      } else {
        setSelectedPlace({
          place_id: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          address: p.structured_formatting?.secondary_text || '',
          lat: autoMergeStop?.lat || 21.0285,
          lng: autoMergeStop?.lng || 105.8542,
        });
      }
    } catch {
      setSelectedPlace({
        place_id: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        address: p.structured_formatting?.secondary_text || '',
        lat: autoMergeStop?.lat || 21.0285,
        lng: autoMergeStop?.lng || 105.8542,
      });
    } finally {
      setIsSearching(false);
      setPredictions([]);
      setSearchQuery(p.structured_formatting?.main_text || p.description);
    }

    if (!branchPurpose) {
      setBranchPurpose(`Khám phá & tham quan ${p.structured_formatting?.main_text || p.description}`);
    }
  };

  // Chọn địa điểm bằng cách giữ tay trên Map (Long-press)
  const handleMapLongPress = useCallback(
    async (coord: { lat: number; lng: number }) => {
      try {
        const place = await goongMapService.reverseGeocode(coord.lat, coord.lng);
        if (place) {
          setSelectedPlace({
            place_id: place.place_id,
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
          });
          setSearchQuery(place.name);
          if (!branchPurpose) {
            setBranchPurpose(`Khám phá & tham quan ${place.name}`);
          }
          Alert.alert('Đã chọn điểm nhánh trên bản đồ', place.name);
        }
      } catch (err) {
        console.warn('[CreateBranchScreen] Long press error:', err);
      }
    },
    [branchPurpose]
  );

  // Toggle chọn thành viên cho nhánh hiện tại (Chặn nếu đã thuộc nhánh khác)
  const handleToggleMember = (userId: string, memberName?: string) => {
    const assignedInfo = assignedMembersMap[userId];
    if (assignedInfo) {
      Alert.alert(
        'Thành viên đã có nhánh',
        `${memberName || 'Thành viên'} đã được phân công tham gia "${assignedInfo.branchName}". Mỗi thành viên chỉ được thuộc 1 nhánh duy nhất.`
      );
      return;
    }

    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Chọn tất cả / Bỏ chọn thành viên khả dụng
  const handleToggleAllMembers = () => {
    const availableIds = availableMembers.map((m) => m.userId || m.id);
    const allAvailableSelected =
      availableIds.length > 0 && availableIds.every((id) => selectedMemberIds.includes(id));

    if (allAvailableSelected) {
      setSelectedMemberIds((prev) => prev.filter((id) => !availableIds.includes(id)));
    } else {
      setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...availableIds])));
    }
  };

  // Nút "+ THÊM NHÁNH KHÁC"
  const handleAddNewBranchDraft = () => {
    if (!selectedPlace) {
      Alert.alert('Chưa chọn điểm đến', 'Vui lòng chọn địa điểm đến cho nhánh hiện tại trước khi thêm nhánh khác.');
      return;
    }
    if (!splitStopId) {
      Alert.alert('Chưa chọn điểm tách', 'Vui lòng chọn trạm tách nhánh từ lộ trình chính.');
      return;
    }
    if (!branchName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhánh hành trình.');
      return;
    }

    const currentDraft: ConfiguredBranch = {
      id: `draft-${Date.now()}`,
      name: branchName.trim(),
      purpose: branchPurpose.trim() || 'Khám phá cung đường',
      color: selectedColor,
      splitStopId,
      destination: selectedPlace,
      mergeStopId: autoMergeStop?.destinationId || '',
      memberIds: selectedMemberIds,
      routeCoords: activeBranchRouteCoords,
    };

    const updated = [...savedBranches, currentDraft];
    setSavedBranches(updated);

    // Chuẩn bị form cho nhánh tiếp theo
    const nextIdx = updated.length + 1;
    setBranchName(`Nhánh ${nextIdx} - Khám phá mới`);
    setBranchPurpose('');
    setSelectedPlace(null);
    setSearchQuery('');
    setSelectedMemberIds([]);
    setSelectedColor(BRANCH_PALETTES[(nextIdx - 1) % BRANCH_PALETTES.length].hex);
    setActiveBranchRouteCoords([]);

    Alert.alert(
      'Đã lưu nhánh',
      `Đã thêm "${currentDraft.name}" vào danh sách. Bạn có thể tiếp tục tạo thêm nhánh tiếp theo hoặc bấm "LƯU LỘ TRÌNH ĐA NHÁNH".`
    );
  };

  // Xoá một nhánh khỏi danh sách đã cấu hình
  const handleRemoveSavedBranch = (branchId: string) => {
    setSavedBranches((prev) => prev.filter((b) => b.id !== branchId));
  };

  // Xử lý LƯU LỘ TRÌNH ĐA NHÁNH vào Backend
  const handleSaveAllBranches = async () => {
    // Thu thập tất cả các nhánh (cả các nhánh đã lưu và nhánh hiện tại trên form nếu hợp lệ)
    let allBranches = [...savedBranches];

    if (selectedPlace && splitStopId && branchName.trim()) {
      const currentDraft: ConfiguredBranch = {
        id: `draft-${Date.now()}`,
        name: branchName.trim(),
        purpose: branchPurpose.trim() || 'Khám phá cung đường',
        color: selectedColor,
        splitStopId,
        destination: selectedPlace,
        mergeStopId: autoMergeStop?.destinationId || '',
        memberIds: selectedMemberIds,
        routeCoords: activeBranchRouteCoords,
      };
      allBranches.push(currentDraft);
    }

    if (allBranches.length === 0) {
      Alert.alert('Chưa có nhánh nào', 'Vui lòng chọn trạm tách và địa điểm đến để tạo ít nhất 1 nhánh hành trình.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Resolve & Fork destination cho từng nhánh mới (nếu chưa có destinationId)
      const resolvedBranches: Array<{
        name: string;
        purpose: string;
        color: string;
        splitStopId: string;
        destinationId: string;
        mergeStopId: string;
        memberIds: string[];
      }> = [];

      for (const b of allBranches) {
        let destId = '';
        if (b.destination.place_id) {
          const loc = await planningService.ensureLocation(b.destination.place_id);
          const forkRes = await planningService.forkLocation(loc.locationId, {
            name: b.destination.name,
            stayOverTime: 0,
          });
          destId = forkRes.destinationId;
        } else {
          // Fallback nếu place_id không có sẵn, dùng catalog location
          const loc = await planningService.ensureLocation('goong_' + b.destination.name);
          const forkRes = await planningService.forkLocation(loc.locationId, {
            name: b.destination.name,
            stayOverTime: 0,
          });
          destId = forkRes.destinationId;
        }

        resolvedBranches.push({
          name: b.name,
          purpose: b.purpose,
          color: b.color,
          splitStopId: b.splitStopId,
          destinationId: destId,
          mergeStopId: b.mergeStopId,
          memberIds: b.memberIds,
        });
      }

      // 2. Xây dựng đồ thị nhánh (Branch Graph) chuẩn Backend
      const mainDestIds = mainStops.map((s) => s.destinationId);
      if (mainDestIds.length === 0) {
        throw new Error('Chuyến đi chưa có lộ trình chính để tạo nhánh.');
      }

      const branchArrays: string[][] = [mainDestIds];
      const openTailArray: boolean[] = [false];

      // Đưa từng nhánh rẽ vào đồ thị: [split, branchDest, merge] với auto openTail = false
      for (const rb of resolvedBranches) {
        let mergeId = rb.mergeStopId;
        if (!mergeId || mergeId === rb.splitStopId) {
          const splitIdx = mainDestIds.indexOf(rb.splitStopId);
          mergeId = splitIdx >= 0 && splitIdx + 1 < mainDestIds.length
            ? mainDestIds[splitIdx + 1]
            : mainDestIds[mainDestIds.length - 1];
        }
        branchArrays.push([rb.splitStopId, rb.destinationId, mergeId]);
        openTailArray.push(false);
      }

      // 3. PUT /v1/trips/:tripId/graph để lưu cấu trúc đồ thị
      const savedGraph = await tripService.setTripGraph(tripId, branchArrays, openTailArray);

      // 4. POST /v1/trips/:tripId/travels để backend tự động tính route, distance, duration & polyline qua Goong
      await tripService.computeStoredTravels(tripId);

      // 5. Cập nhật display metadata (Tên/Label, Mô tả/Purpose, Màu sắc/Color) và phân công thành viên
      if (savedGraph?.branches) {
        for (let i = 1; i < savedGraph.branches.length; i++) {
          const backendBranch = savedGraph.branches[i];
          const frontendBranch = resolvedBranches[i - 1];
          if (backendBranch && frontendBranch) {
            // PATCH metadata vào backend DB
            try {
              await tripService.updateBranchMetadata(tripId, backendBranch.id, {
                label: frontendBranch.name,
                description: frontendBranch.purpose,
                color: frontendBranch.color,
              });
            } catch (err) {
              console.warn(`[CreateBranch] Update metadata branch ${backendBranch.id} warning:`, err);
            }

            // Gán thành viên cho từng nhánh
            if (frontendBranch.memberIds.length > 0) {
              await Promise.allSettled(
                frontendBranch.memberIds.map((userId) =>
                  tripService.assignMemberToBranch(tripId, userId, backendBranch.id)
                )
              );
            }
          }
        }
      }

      // 6. Cập nhật cache in-memory RAM để màn hình TripDetails & LiveTracking cập nhật ngay lập tức
      const latestGraph = await tripService.getTripGraph(tripId);
      if (latestGraph?.branches) {
        const formattedBranches = latestGraph.branches.map((b, idx) => ({
          id: b.id,
          name: idx === 0 ? 'Lộ trình chính' : (b.label || `Nhánh ${idx}`),
          color: idx === 0 ? '#CD8554' : (b.color || BRANCH_PALETTES[(idx - 1) % BRANCH_PALETTES.length].hex),
          purpose: idx === 0 ? 'Tuyến chính cả đoàn' : (b.description || 'Khám phá cung đường'),
          memberIds: tripMembers.filter((m) => m.assignedBranchId === b.id).map((m) => m.userId || m.id),
          stops: b.stops,
          travels: b.travels,
        }));
        runtimeTripBranchesCache.set(tripId, formattedBranches);
      }

      Alert.alert(
        'Thành công',
        `Đã lưu thành công ${resolvedBranches.length} nhánh hành trình vào hệ thống!`,
        [{ text: 'Đồng ý', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('[CreateBranchScreen] Submit error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu lộ trình đa nhánh.';
      Alert.alert('Không thể lưu nhánh', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tổng hợp tất cả các nhánh để vẽ trên bản đồ xem trước
  const allPreviewBranches = useMemo<MapBranchRoute[]>(() => {
    const list: MapBranchRoute[] = [];

    // Các nhánh đã thêm vào danh sách
    savedBranches.forEach((b) => {
      if (b.routeCoords && b.routeCoords.length >= 2) {
        list.push({
          id: b.id,
          name: b.name,
          color: b.color,
          coords: b.routeCoords,
        });
      }
    });

    // Nhánh hiện tại đang chỉnh sửa
    if (activeBranchRouteCoords.length >= 2) {
      list.push({
        id: 'active-branch',
        name: branchName || 'Nhánh đang tạo',
        color: selectedColor,
        coords: activeBranchRouteCoords,
      });
    }

    return list;
  }, [savedBranches, activeBranchRouteCoords, branchName, selectedColor]);

  // Tuyến đường thực tế tính toán từ Goong Directions nếu chuyến đi chưa lưu polyline
  const [mainRouteRoadCoords, setMainRouteRoadCoords] = useState<[number, number][]>([]);

  // Tự động tính toán đường đi xe máy chuẩn xác qua Goong API cho toàn bộ các chặng trên tuyến chính của trip
  useEffect(() => {
    let isCurrent = true;

    // 1. Nếu backend đã có polyline từ travels của nhánh chính
    if (tripGraph?.branches?.[0]?.travels && tripGraph.branches[0].travels.length > 0) {
      let coords: [number, number][] = [];
      tripGraph.branches[0].travels.forEach((t) => {
        if (t.polyline) {
          coords = coords.concat(decodePolyline(t.polyline));
        }
      });
      if (coords.length >= 2) {
        setMainRouteRoadCoords(coords);
        return;
      }
    }

    // 2. Nếu đã có trong in-memory cache
    const cached = runtimeTripRouteCache.get(tripId);
    if (cached && cached.length >= 2) {
      setMainRouteRoadCoords(cached);
      return;
    }

    // 3. Nếu có stops trên tuyến chính (từ 2 điểm trở lên), tự động fetch directions để vẽ đúng đường lộ thực tế
    const stopsToRoute = trip?.waypoints && trip.waypoints.length >= 2
      ? trip.waypoints
      : mainStops.length >= 2
      ? mainStops
      : [];

    if (stopsToRoute.length >= 2) {
      (async () => {
        try {
          let fullCoords: [number, number][] = [];
          for (let i = 0; i < stopsToRoute.length - 1; i++) {
            const p1 = stopsToRoute[i];
            const p2 = stopsToRoute[i + 1];
            const leg = await goongMapService.getDirections(
              { lat: p1.lat, lng: p1.lng },
              { lat: p2.lat, lng: p2.lng },
              'bike'
            );
            if (!isCurrent) return;
            if (leg && leg.coords && leg.coords.length > 0) {
              fullCoords = fullCoords.concat(leg.coords);
            } else {
              fullCoords.push([p1.lng, p1.lat], [p2.lng, p2.lat]);
            }
          }
          if (isCurrent && fullCoords.length >= 2) {
            setMainRouteRoadCoords(fullCoords);
            runtimeTripRouteCache.set(tripId, fullCoords);
          }
        } catch (e) {
          console.warn('[CreateBranchScreen] Error calculating main road route:', e);
        }
      })();
    }

    return () => {
      isCurrent = false;
    };
  }, [tripGraph, trip?.waypoints, mainStops, tripId]);

  // Lấy đường đi chính của chuyến đi (ưu tiên travels polyline đã lưu từ backend)
  const mainTripRouteCoords = useMemo<[number, number][]>(() => {
    // 1. ƯU TIÊN CAO NHẤT: travels polyline từ backend graph đã lưu trong DB
    if (tripGraph?.branches?.[0]?.travels && tripGraph.branches[0].travels.length > 0) {
      let coords: [number, number][] = [];
      tripGraph.branches[0].travels.forEach((t) => {
        if (t.polyline) {
          coords = coords.concat(decodePolyline(t.polyline));
        }
      });
      if (coords.length >= 2) return coords;
    }

    // 2. Tuyến đường thực tế tính từ Goong Directions API
    if (mainRouteRoadCoords.length >= 2) {
      return mainRouteRoadCoords;
    }

    // 3. In-memory cache
    const cached = runtimeTripRouteCache.get(tripId);
    if (cached && cached.length >= 2) return cached;

    // 4. Polyline từ trip.route
    if (trip?.route) {
      if (Array.isArray(trip.route.polyline) && trip.route.polyline.length >= 2) {
        return trip.route.polyline;
      }
      if (typeof trip.route.polyline === 'string' && trip.route.polyline.length > 5) {
        const decoded = decodePolyline(trip.route.polyline);
        if (decoded.length >= 2) return decoded;
      }
    }

    // 5. Toạ độ các điểm dừng chính trên backend
    if (mainStops && mainStops.length >= 2) {
      return mainStops.map((s) => [s.lng, s.lat]);
    }

    // 6. Toạ độ các waypoints
    if (trip?.waypoints && trip.waypoints.length >= 2) {
      return trip.waypoints.map((w) => [w.lng, w.lat]);
    }

    return [];
  }, [tripGraph, mainRouteRoadCoords, tripId, trip, mainStops]);

  // Các điểm dừng để hiển thị marker trên map xem trước (Ưu tiên các trạm dừng trên backend)
  const previewWaypoints = useMemo<MapWaypoint[]>(() => {
    let wps: MapWaypoint[] = [];
    if (mainStops.length > 0) {
      wps = mainStops.map((stop, idx) => ({
        id: stop.destinationId,
        lat: stop.lat,
        lng: stop.lng,
        name: stop.name,
        label: idx === 0 ? `Xuất phát: ${stop.name}` : idx === mainStops.length - 1 ? `Đích đến: ${stop.name}` : `Trạm ${idx}: ${stop.name}`,
        type: idx === 0 ? 'start' : idx === mainStops.length - 1 ? 'end' : 'stop',
      }));
    } else if (trip?.waypoints && trip.waypoints.length > 0) {
      wps = trip.waypoints.map((w, idx) => ({
        id: w.id || `wp-${idx}`,
        lat: w.lat,
        lng: w.lng,
        name: w.name,
        label: idx === 0 ? `Xuất phát: ${w.name}` : idx === (trip.waypoints?.length || 1) - 1 ? `Đích đến: ${w.name}` : `Trạm ${idx}: ${w.name}`,
        type: idx === 0 ? 'start' : idx === (trip.waypoints?.length || 1) - 1 ? 'end' : 'stop',
      }));
    }

    // Điểm đến của nhánh hiện tại (nếu đã chọn)
    if (selectedPlace) {
      wps.push({
        id: 'dest-current',
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        name: selectedPlace.name,
        label: branchName ? `Điểm nhánh: ${branchName}` : `Điểm nhánh: ${selectedPlace.name}`,
        type: 'stop',
      });
    }

    // Điểm đến của các nhánh đã cấu hình trong phiên
    savedBranches.forEach((b, bIdx) => {
      if (b.destination && b.destination.lat && b.destination.lng) {
        wps.push({
          id: `dest-saved-${b.id || bIdx}`,
          lat: b.destination.lat,
          lng: b.destination.lng,
          name: b.destination.name,
          label: `${b.name}: ${b.destination.name}`,
          type: 'stop',
        });
      }
    });

    return wps;
  }, [mainStops, trip?.waypoints, selectedPlace, branchName, savedBranches]);

  // Tâm toạ độ bản đồ (Ưu tiên điểm xuất phát hoặc toạ độ chặng đầu tiên trên tuyến chính)
  const mapCenter = useMemo<[number, number]>(() => {
    if (mainStops.length > 0 && Number.isFinite(mainStops[0].lng) && Number.isFinite(mainStops[0].lat)) {
      return [mainStops[0].lng, mainStops[0].lat];
    }
    if (mainTripRouteCoords.length > 0) {
      return mainTripRouteCoords[0];
    }
    if (trip?.waypoints && trip.waypoints.length > 0) {
      return [trip.waypoints[0].lng, trip.waypoints[0].lat];
    }
    return [106.8016, 10.8775];
  }, [mainStops, mainTripRouteCoords, trip?.waypoints]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C3A21" />
        <Text style={styles.loadingText}>Đang tải lộ trình chuyến đi...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1810" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thiết Lập Đa Nhánh</Text>
          <Text style={styles.headerSubtitle}>Tách cung đường & phân công đội hình</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── THÔNG TIN CHUYẾN ĐI (TÊN, QUÃNG ĐƯỜNG, THÀNH VIÊN) ── */}
        <View style={styles.tripInfoCard}>
          <View style={styles.tripInfoHeader}>
            <View style={styles.tripInfoTitleWrap}>
              <Text style={styles.tripInfoName} numberOfLines={1}>
                {trip?.name || tripGraph?.name || 'Chuyến đi Road2D'}
              </Text>
              <Text style={styles.tripInfoSub} numberOfLines={1}>
                Tuyến chính: {trip?.waypoints?.[0]?.name || mainStops[0]?.name || 'Xuất phát'} ➔ {trip?.waypoints?.[(trip.waypoints?.length || 1) - 1]?.name || mainStops[mainStops.length - 1]?.name || 'Đích đến'}
              </Text>
            </View>
            <View style={styles.tripBadgePill}>
              <Text style={styles.tripBadgeText}>CHUYẾN ĐI</Text>
            </View>
          </View>

          <View style={styles.tripStatsRow}>
            <View style={styles.tripStatItem}>
              <Ionicons name="navigate-outline" size={13} color="#5C3A21" style={{ marginRight: 4 }} />
              <Text style={styles.tripStatVal}>
                {trip?.distanceKm ? `${trip.distanceKm} km` : `${mainStops.length} trạm dừng`}
              </Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStatItem}>
              <Feather name="users" size={13} color="#5C3A21" style={{ marginRight: 4 }} />
              <Text style={styles.tripStatVal}>
                {trip?.members?.length ?? tripMembers.length} thành viên
              </Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStatItem}>
              <MaterialCommunityIcons name="routes" size={13} color="#5C3A21" style={{ marginRight: 4 }} />
              <Text style={styles.tripStatVal}>
                {allPreviewBranches.length} nhánh rẽ
              </Text>
            </View>
          </View>
        </View>

        {/* ── BẢN ĐỒ XEM TRƯỚC TỔNG THỂ CÁC NHÁNH (GOONG MAP) ── */}
        <View style={styles.mapPreviewCard}>
          <SharedGoongMap
            key={`branch_map_${tripId}_${mainStops.length}_${mainTripRouteCoords.length}_${allPreviewBranches.length}_${previewWaypoints.length}`}
            style={styles.mapPreviewView}
            initialCenter={mapCenter}
            waypoints={previewWaypoints}
            routeCoords={mainTripRouteCoords}
            branchRoutes={allPreviewBranches}
            variant="default"
            interactive={true}
            onMapLongPress={handleMapLongPress}
          />
          <View style={styles.mapOverlayTag} pointerEvents="none">
            <MaterialCommunityIcons name="routes" size={13} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.mapOverlayTagText}>
              Lộ trình chính & {allPreviewBranches.length} nhánh rẽ • Giữ 4 - 5s để chọn điểm
            </Text>
          </View>
        </View>

        {/* ── SƠ ĐỒ TRỰC QUAN (KHÔNG TRÀN BOX, MŨI TÊN MÀU NÂU) ── */}
        <View style={styles.flowSummaryCard}>
          <View style={styles.flowHeaderRow}>
            <MaterialCommunityIcons name="transit-connection-variant" size={16} color="#5C3A21" />
            <Text style={styles.flowHeaderTitle}>SƠ ĐỒ PHÂN NHÁNH TRỰC QUAN</Text>
          </View>

          <View style={styles.flowNodesRow}>
            {/* Điểm tách */}
            <View style={styles.flowNodeItem}>
              <View style={[styles.flowNodeDot, { backgroundColor: '#5C3A21' }]}>
                <Ionicons name="git-pull-request-outline" size={13} color="#FFF" />
              </View>
              <Text style={styles.flowNodeLabel}>Điểm tách</Text>
              <Text style={styles.flowNodeVal} numberOfLines={1}>
                {splitStopName}
              </Text>
            </View>

            {/* Mũi tên màu nâu */}
            <View style={styles.flowLineWrap}>
              <View style={styles.flowLineDash} />
              <Ionicons name="chevron-forward" size={15} color="#5C3A21" />
            </View>

            {/* Điểm nhánh */}
            <View style={styles.flowNodeItem}>
              <View style={[styles.flowNodeDot, { backgroundColor: selectedColor }]}>
                <Ionicons name="location" size={13} color="#FFF" />
              </View>
              <Text style={styles.flowNodeLabel}>Điểm nhánh</Text>
              <Text style={styles.flowNodeVal} numberOfLines={1}>
                {selectedPlace?.name || 'Chưa chọn'}
              </Text>
            </View>

            {/* Mũi tên màu nâu */}
            <View style={styles.flowLineWrap}>
              <View style={styles.flowLineDash} />
              <Ionicons name="chevron-forward" size={15} color="#5C3A21" />
            </View>

            {/* Điểm nhập */}
            <View style={styles.flowNodeItem}>
              <View style={[styles.flowNodeDot, { backgroundColor: '#5C3A21' }]}>
                <Ionicons name="git-merge-outline" size={13} color="#FFF" />
              </View>
              <Text style={styles.flowNodeLabel}>Điểm nhập</Text>
              <Text style={styles.flowNodeVal} numberOfLines={1}>
                {mergeStopName}
              </Text>
            </View>
          </View>
        </View>

        {/* ── DANH SÁCH CÁC NHÁNH ĐÃ LƯU TRONG PHIÊN ── */}
        {savedBranches.length > 0 && (
          <View style={styles.savedBranchesBox}>
            <Text style={styles.savedBranchesTitle}>CÁC NHÁNH ĐÃ CẤU HÌNH ({savedBranches.length}):</Text>
            {savedBranches.map((b, idx) => (
              <View key={b.id} style={styles.savedBranchItem}>
                <View style={[styles.savedBranchColorBar, { backgroundColor: b.color }]} />
                <View style={{ flex: 1, paddingVertical: 4 }}>
                  <Text style={styles.savedBranchName} numberOfLines={1}>
                    {idx + 1}. {b.name}
                  </Text>
                  <Text style={styles.savedBranchSub} numberOfLines={1}>
                    Tới: {b.destination.name} • {b.memberIds.length} thành viên
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.savedBranchDeleteBtn}
                  onPress={() => handleRemoveSavedBranch(b.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── BƯỚC 1: CHỌN TRẠM TÁCH NHÁNH ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Chọn trạm tách nhánh từ lộ trình chính</Text>
          </View>
          <Text style={styles.sectionHint}>
            Địa điểm trên tuyến đường chính nơi một nhóm thành viên sẽ bắt đầu rẽ đi riêng.
          </Text>

          {/* Thanh tìm kiếm trạm tách */}
          <View style={styles.stopSearchBox}>
            <Ionicons name="search" size={16} color="#5C3A21" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.stopSearchInput}
              placeholder="Tìm kiếm trạm tách theo tên..."
              placeholderTextColor="#A0938C"
              value={splitStopSearch}
              onChangeText={setSplitStopSearch}
            />
            {splitStopSearch.length > 0 && (
              <TouchableOpacity onPress={() => setSplitStopSearch('')}>
                <Ionicons name="close-circle" size={16} color="#A0938C" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chipsRow}>
            {filteredSplitStops.length > 0 ? (
              filteredSplitStops.map((stop, idx) => {
                const isSelected = stop.destinationId === splitStopId;
                const originalIdx = mainStops.findIndex((s) => s.destinationId === stop.destinationId);
                return (
                  <TouchableOpacity
                    key={stop.destinationId}
                    style={[styles.stopChip, isSelected && styles.stopChipActive]}
                    onPress={() => setSplitStopId(stop.destinationId)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.stopChipOrder, isSelected && styles.stopChipOrderActive]}>
                      <Text style={[styles.stopChipOrderText, isSelected && styles.stopChipOrderTextActive]}>
                        {originalIdx >= 0 ? originalIdx + 1 : idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stopChipText, isSelected && styles.stopChipTextActive]} numberOfLines={1}>
                      {stop.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyStopsSearchText}>
                Không tìm thấy trạm dừng nào khớp với "{splitStopSearch}".
              </Text>
            )}
          </View>
        </View>

        {/* ── BƯỚC 2: TÌM KIẾM ĐỊA ĐIỂM ĐẾN CỦA NHÁNH ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Địa điểm đến của nhánh rẽ</Text>
          </View>
          <Text style={styles.sectionHint}>
            Tìm kiếm địa danh hoặc giữ tay 2s trên bản đồ để chọn điểm check-in (Đỉnh Gió, bản làng, quán cà phê...).
          </Text>

          {/* Ô tìm kiếm Goong */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#5C3A21" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập tên địa điểm"
              placeholderTextColor="#A0938C"
              value={searchQuery}
              onChangeText={handleSearchTextChange}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#5C3A21" />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setPredictions([]);
                  setSelectedPlace(null);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#A0938C" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Danh sách kết quả gợi ý */}
          {predictions.length > 0 && (
            <View style={styles.predictionsList}>
              {predictions.map((p) => (
                <TouchableOpacity
                  key={p.place_id}
                  style={styles.predictionItem}
                  onPress={() => handleSelectPrediction(p)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={16} color="#5C3A21" style={{ marginRight: 8, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.predictionMainText}>
                      {p.structured_formatting?.main_text || p.description}
                    </Text>
                    {!!p.structured_formatting?.secondary_text && (
                      <Text style={styles.predictionSubText} numberOfLines={1}>
                        {p.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Đã chọn địa điểm */}
          {selectedPlace && (
            <View style={styles.selectedPlaceCard}>
              <View style={styles.selectedPlaceIconWrap}>
                <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedPlaceName}>{selectedPlace.name}</Text>
                {!!selectedPlace.address && (
                  <Text style={styles.selectedPlaceAddr} numberOfLines={1}>
                    {selectedPlace.address}
                  </Text>
                )}
              </View>
              <View style={styles.selectedPlaceBadge}>
                <Text style={styles.selectedPlaceBadgeText}>Điểm Nhánh</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── BƯỚC 3: THÔNG TIN NHÁNH, MÀU SẮC & PHÂN CÔNG THÀNH VIÊN ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Thông tin nhánh, Màu sắc & Thành viên</Text>
          </View>
          <Text style={styles.sectionHint}>
            Cấu hình tên nhánh, màu sắc nhận diện trên bản đồ và phân công các thành viên tham gia nhánh này.
          </Text>

          {/* Tên nhánh */}
          <Text style={styles.inputLabel}>Tên nhánh hành trình *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="VD: Nhánh 1 - Săn mây Đỉnh Gió"
            placeholderTextColor="#A0938C"
            value={branchName}
            onChangeText={setBranchName}
          />

          {/* Mục đích nhánh */}
          <Text style={styles.inputLabel}>Mục đích phân nhánh *</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 64, textAlignVertical: 'top' }]}
            placeholder="VD: Nhóm đi sớm chuẩn bị đồ cắm trại & pha cà phê..."
            placeholderTextColor="#A0938C"
            value={branchPurpose}
            onChangeText={setBranchPurpose}
            multiline
            numberOfLines={2}
          />

          {/* Bảng màu nhận diện dạng Dropdown */}
          <Text style={styles.inputLabel}>Màu sắc hiển thị trên Bản đồ & Mô phỏng *</Text>
          <TouchableOpacity
            style={styles.colorDropdownTrigger}
            onPress={() => setColorDropdownOpen((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.colorDropdownLeft}>
              <View style={[styles.colorDropdownPill, { backgroundColor: selectedColor }]} />
              <Text style={styles.colorDropdownSelectedLabel}>
                {BRANCH_PALETTES.find((p) => p.hex.toLowerCase() === selectedColor.toLowerCase())?.label || selectedColor}
              </Text>
              <Text style={styles.colorDropdownHexLabel}>{selectedColor.toUpperCase()}</Text>
            </View>
            <Ionicons name={colorDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#5C3A21" />
          </TouchableOpacity>

          {colorDropdownOpen && (
            <View style={styles.colorDropdownMenu}>
              {BRANCH_PALETTES.map((pal) => {
                const isSelected = selectedColor.toLowerCase() === pal.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={pal.id}
                    style={[styles.colorDropdownItem, isSelected && styles.colorDropdownItemActive]}
                    onPress={() => {
                      setSelectedColor(pal.hex);
                      setColorDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.colorDropdownItemLeft}>
                      <View style={[styles.colorPaletteCircle, { backgroundColor: pal.hex }]} />
                      <Text style={[styles.colorPaletteLabel, isSelected && styles.colorPaletteLabelActive]}>
                        {pal.label}
                      </Text>
                      <Text style={styles.colorPaletteHex}>{pal.hex.toUpperCase()}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#5C3A21" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Phân công thành viên tham gia nhánh này (Tích hợp trong Bước 3) */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            Phân công thành viên ({selectedMemberIds.length}/{tripMembers.length})
          </Text>

          {/* Nút bấm mở Dropdown danh sách thành viên */}
          <TouchableOpacity
            style={styles.memberDropdownTrigger}
            onPress={() => setMemberDropdownOpen((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.memberDropdownLeft}>
              <Feather name="users" size={17} color="#5C3A21" style={{ marginRight: 8 }} />
              <Text style={styles.memberDropdownLabel}>
                {selectedMemberIds.length > 0
                  ? `Đã chọn ${selectedMemberIds.length} thành viên cho nhánh này`
                  : 'Chọn thành viên tham gia nhánh này'}
              </Text>
            </View>
            <Ionicons name={memberDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#5C3A21" />
          </TouchableOpacity>

          {/* Khung Dropdown mở rộng */}
          {memberDropdownOpen && (
            <View style={styles.memberDropdownContainer}>
              {/* Toolbar trong dropdown: Đếm số lượng & nút Chọn tất cả khả dụng */}
              <View style={styles.memberDropdownToolbar}>
                <Text style={styles.memberDropdownCountText}>
                  Khả dụng: {availableMembers.length}/{tripMembers.length} thành viên
                </Text>
                <TouchableOpacity
                  style={styles.toggleAllBtnInside}
                  onPress={handleToggleAllMembers}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      availableMembers.length > 0 &&
                      availableMembers.every((m) => selectedMemberIds.includes(m.userId || m.id))
                        ? 'close-circle-outline'
                        : 'checkbox-outline'
                    }
                    size={16}
                    color="#5C3A21"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.toggleAllBtnInsideText}>
                    {availableMembers.length > 0 &&
                    availableMembers.every((m) => selectedMemberIds.includes(m.userId || m.id))
                      ? 'Bỏ chọn'
                      : 'Chọn tất cả khả dụng'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Danh sách thành viên */}
              <ScrollView
                style={styles.memberDropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {tripMembers.map((m) => {
                  const uId = m.userId || m.id;
                  const isSelected = selectedMemberIds.includes(uId);
                  const assignedInfo = assignedMembersMap[uId];
                  const isAssignedToOther = !!assignedInfo;

                  return (
                    <TouchableOpacity
                      key={uId}
                      style={[
                        styles.memberRowItem,
                        isSelected && styles.memberRowItemActive,
                        isAssignedToOther && styles.memberRowItemDisabled,
                      ]}
                      onPress={() => handleToggleMember(uId, m.nickname || m.username)}
                      activeOpacity={isAssignedToOther ? 0.9 : 0.75}
                    >
                      <Image
                        source={{
                          uri:
                            m.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              m.nickname || m.username || 'User'
                            )}&background=5C3A21&color=fff`,
                        }}
                        style={[styles.memberItemAvatar, isAssignedToOther && { opacity: 0.5 }]}
                      />
                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text
                          style={[styles.memberItemName, isAssignedToOther && styles.memberItemNameDisabled]}
                          numberOfLines={1}
                        >
                          {m.nickname || m.username || 'Thành viên'}
                        </Text>
                        {isAssignedToOther ? (
                          <View style={styles.memberAssignedBadge}>
                            <Ionicons name="lock-closed" size={11} color="#C0392B" style={{ marginRight: 3 }} />
                            <Text style={styles.memberAssignedBadgeText} numberOfLines={1}>
                              Đã ở: {assignedInfo.branchName}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.memberItemRole}>
                            {m.role === 'LEADER' ? 'Trưởng đoàn' : 'Thành viên'}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          isAssignedToOther
                            ? 'lock-closed-outline'
                            : isSelected
                            ? 'checkbox'
                            : 'square-outline'
                        }
                        size={22}
                        color={
                          isAssignedToOther
                            ? '#C0392B'
                            : isSelected
                            ? selectedColor
                            : '#A0938C'
                        }
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── NÚT TẠO THÊM NHÁNH KHÁC ── */}
        <TouchableOpacity
          style={styles.addAnotherBranchBtn}
          onPress={handleAddNewBranchDraft}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={19} color="#5C3A21" style={{ marginRight: 6 }} />
          <Text style={styles.addAnotherBranchBtnText}>+ THÊM NHÁNH KHÁC</Text>
        </TouchableOpacity>

        {/* ── NÚT LƯU LỘ TRÌNH ĐA NHÁNH (GIẢM 1 FONT) ── */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSaveAllBranches}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="source-branch" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>LƯU LỘ TRÌNH ĐA NHÁNH</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#5C3A21',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE6',
    backgroundColor: '#FAF8F5',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0ECE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1810',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7A6E65',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Trip info card
  tripInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    elevation: 2,
    shadowColor: '#2A1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tripInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripInfoTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  tripInfoName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A1810',
    letterSpacing: 0.3,
  },
  tripInfoSub: {
    fontSize: 12,
    color: '#7A6E65',
    marginTop: 3,
  },
  tripBadgePill: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFEBE6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tripBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5C3A21',
    letterSpacing: 0.6,
  },
  tripStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  tripStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tripStatVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C3A21',
  },
  tripStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5DED5',
    marginHorizontal: 4,
  },

  // Map preview card (Bản đồ to, trực quan, sắc nét)
  mapPreviewCard: {
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#2A1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  mapPreviewView: {
    ...StyleSheet.absoluteFill,
  },
  mapOverlayTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 58, 33, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapOverlayTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Flow summary card
  flowSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    width: '100%',
    elevation: 2,
    shadowColor: '#2A1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  flowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flowHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C3A21',
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  flowNodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  flowNodeItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  flowNodeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  flowNodeLabel: {
    fontSize: 10,
    color: '#7A6E65',
    fontWeight: '600',
  },
  flowNodeVal: {
    fontSize: 11,
    color: '#2A1810',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  flowLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    flexShrink: 0,
  },
  flowLineDash: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#5C3A21',
    width: 6,
  },

  // Saved branches list
  savedBranchesBox: {
    backgroundColor: '#FAF5EE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  savedBranchesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C3A21',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  savedBranchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  savedBranchColorBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginRight: 10,
  },
  savedBranchName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1810',
  },
  savedBranchSub: {
    fontSize: 11,
    color: '#7A6E65',
    marginTop: 2,
  },
  savedBranchDeleteBtn: {
    padding: 6,
  },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    elevation: 2,
    shadowColor: '#2A1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5C3A21',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1810',
    flex: 1,
  },
  sectionHint: {
    fontSize: 12,
    color: '#7A6E65',
    lineHeight: 18,
    marginBottom: 14,
  },

  // Stop search in Step 1
  stopSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    marginBottom: 12,
  },
  stopSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A1810',
    paddingVertical: 0,
  },
  emptyStopsSearchText: {
    fontSize: 12,
    color: '#7A6E65',
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    maxWidth: '100%',
  },
  stopChipActive: {
    backgroundColor: '#5C3A21',
    borderColor: '#5C3A21',
  },
  stopChipOrder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5DED5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stopChipOrderActive: {
    backgroundColor: '#FFFFFF',
  },
  stopChipOrderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5C3A21',
  },
  stopChipOrderTextActive: {
    color: '#5C3A21',
  },
  stopChipText: {
    fontSize: 13,
    color: '#2A1810',
    fontWeight: '600',
  },
  stopChipTextActive: {
    color: '#FFFFFF',
  },

  // Search box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A1810',
  },
  predictionsList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE6',
  },
  predictionMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1810',
  },
  predictionSubText: {
    fontSize: 11,
    color: '#7A6E65',
    marginTop: 2,
  },
  selectedPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F1',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  selectedPlaceIconWrap: {
    marginRight: 10,
  },
  selectedPlaceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
  },
  selectedPlaceAddr: {
    fontSize: 11,
    color: '#388E3C',
    marginTop: 2,
  },
  selectedPlaceBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  selectedPlaceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Form Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A1810',
    marginBottom: 6,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F7F4F0',
    borderWidth: 1,
    borderColor: '#EFEBE6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#2A1810',
    marginBottom: 12,
  },

  // Color Dropdown
  colorDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F4F0',
    borderWidth: 1,
    borderColor: '#EFEBE6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  colorDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDropdownPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  colorDropdownSelectedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1810',
    marginRight: 8,
  },
  colorDropdownHexLabel: {
    fontSize: 11,
    color: '#7A6E65',
    fontWeight: '600',
  },
  colorDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    marginTop: 6,
    overflow: 'hidden',
  },
  colorDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  colorDropdownItemActive: {
    backgroundColor: '#FAF5EE',
  },
  colorDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPaletteCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  colorPaletteLabel: {
    fontSize: 13,
    color: '#2A1810',
    fontWeight: '600',
    marginRight: 8,
  },
  colorPaletteLabelActive: {
    fontWeight: '800',
    color: '#5C3A21',
  },
  colorPaletteHex: {
    fontSize: 11,
    color: '#A0938C',
  },

  // Member Dropdown
  memberDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F4F0',
    borderWidth: 1,
    borderColor: '#EFEBE6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  memberDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1810',
  },
  memberDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE6',
    marginTop: 8,
    overflow: 'hidden',
  },
  memberDropdownToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE6',
  },
  memberDropdownCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C3A21',
  },
  toggleAllBtnInside: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  toggleAllBtnInsideText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C3A21',
  },
  memberDropdownScrollView: {
    maxHeight: 250,
  },
  memberRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F4F0',
  },
  memberRowItemActive: {
    backgroundColor: '#FAF7F2',
  },
  memberItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5DED5',
  },
  memberItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1810',
  },
  memberItemRole: {
    fontSize: 11,
    color: '#7A6E65',
    marginTop: 1,
  },
  memberRowItemDisabled: {
    backgroundColor: '#FAF5F5',
    opacity: 0.85,
  },
  memberItemNameDisabled: {
    color: '#7A6E65',
  },
  memberAssignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FDECEA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  memberAssignedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C0392B',
  },

  // Add another branch button
  addAnotherBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#5C3A21',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addAnotherBranchBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5C3A21',
    letterSpacing: 0.5,
  },

  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5C3A21',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#5C3A21',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13, // Giảm 1 đơn vị font từ 14 xuống 13
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
