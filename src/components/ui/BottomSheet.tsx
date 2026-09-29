import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: number[];
  isOpen: boolean;
  onClose: () => void;
}

export const BottomSheet = ({
  children,
  snapPoints = [SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT * 0.8],
  isOpen,
  onClose,
}: BottomSheetProps) => {
  const MAX_TRANSLATE_Y = -snapPoints[snapPoints.length - 1];
  const MIN_TRANSLATE_Y = 0; // completely hidden

  const translateY = useSharedValue(MIN_TRANSLATE_Y);
  const context = useSharedValue({ y: 0 });
  const backdropOpacity = useSharedValue(0);

  const scrollTo = useCallback((destination: number) => {
    'worklet';
    translateY.value = withSpring(destination, { damping: 50, stiffness: 400 });
    if (destination === MIN_TRANSLATE_Y) {
      backdropOpacity.value = withTiming(0, { duration: 300 });
      runOnJS(onClose)();
    } else {
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    }
  }, [translateY, backdropOpacity, onClose, MIN_TRANSLATE_Y]);

  useEffect(() => {
    if (isOpen) {
      scrollTo(-snapPoints[0]);
    } else {
      scrollTo(MIN_TRANSLATE_Y);
    }
  }, [isOpen, snapPoints, scrollTo, MIN_TRANSLATE_Y]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(Math.min(event.translationY + context.value.y, MIN_TRANSLATE_Y), MAX_TRANSLATE_Y);
    })
    .onEnd((event) => {
      const closestSnapPoint = snapPoints.reduce((prev, curr) => {
        return Math.abs(-curr - translateY.value) < Math.abs(-prev - translateY.value) ? curr : prev;
      });

      // If dragging down fast or past the threshold, close it
      if (event.velocityY > 500 || translateY.value > -snapPoints[0] * 0.5) {
        scrollTo(MIN_TRANSLATE_Y);
      } else {
        scrollTo(-closestSnapPoint);
      }
    });

  const bottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
      display: backdropOpacity.value === 0 ? 'none' : 'flex',
    };
  });

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableWithoutFeedback onPress={() => scrollTo(MIN_TRANSLATE_Y)}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.bottomSheetContainer, bottomSheetStyle]}>
          <View style={styles.line} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: colors.background,
    position: 'absolute',
    top: SCREEN_HEIGHT,
    borderRadius: 25,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
  line: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginVertical: 15,
    borderRadius: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 99,
  },
});
