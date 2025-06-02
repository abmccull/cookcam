import React, {useState, useRef} from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle, Animated} from 'react-native';
import {Heart} from 'lucide-react-native';
import LottieView from 'lottie-react-native';

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorited?: boolean;
  onToggle?: (recipeId: string, isFavorited: boolean) => void;
  size?: number;
  style?: ViewStyle;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  recipeId,
  initialFavorited = false,
  onToggle,
  size = 24,
  style,
}) => {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [showAnimation, setShowAnimation] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef<LottieView>(null);

  const handlePress = () => {
    const newFavoritedState = !isFavorited;
    setIsFavorited(newFavoritedState);

    // Trigger scale animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Show Lottie animation for favoriting
    if (newFavoritedState) {
      setShowAnimation(true);
      lottieRef.current?.play();

      // Hide animation after completion
      setTimeout(() => {
        setShowAnimation(false);
      }, 1500);
    }

    // Call the onToggle callback
    onToggle?.(recipeId, newFavoritedState);
  };

  return (
    <>
      <Animated.View style={{transform: [{scale: scaleValue}]}}>
        <TouchableOpacity
          style={[styles.button, style]}
          onPress={handlePress}
          activeOpacity={0.7}>
          <Heart
            size={size}
            color={isFavorited ? '#FF6B35' : '#8E8E93'} // Spice Orange : Pepper Gray
            fill={isFavorited ? '#FF6B35' : 'transparent'}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Lottie Animation Overlay */}
      {showAnimation && (
        <LottieView
          ref={lottieRef}
          source={{
            // Using a simple heart animation JSON
            // In a real app, you'd import a proper Lottie file
            v: '5.7.4',
            fr: 30,
            ip: 0,
            op: 60,
            w: 100,
            h: 100,
            nm: 'Heart Animation',
            ddd: 0,
            assets: [],
            layers: [
              {
                ddd: 0,
                ind: 1,
                ty: 4,
                nm: 'Heart',
                sr: 1,
                ks: {
                  o: {a: 0, k: 100, ix: 11},
                  r: {a: 0, k: 0, ix: 10},
                  p: {a: 0, k: [50, 50, 0], ix: 2},
                  a: {a: 0, k: [0, 0, 0], ix: 1},
                  s: {
                    a: 1,
                    k: [
                      {
                        i: {x: [0.833], y: [0.833]},
                        o: {x: [0.167], y: [0.167]},
                        t: 0,
                        s: [0],
                      },
                      {
                        i: {x: [0.833], y: [0.833]},
                        o: {x: [0.167], y: [0.167]},
                        t: 15,
                        s: [120],
                      },
                      {
                        i: {x: [0.833], y: [0.833]},
                        o: {x: [0.167], y: [0.167]},
                        t: 30,
                        s: [100],
                      },
                      {t: 60, s: [100]},
                    ],
                    ix: 6,
                  },
                },
                ao: 0,
                shapes: [
                  {
                    ty: 'gr',
                    it: [
                      {
                        d: 1,
                        ty: 'el',
                        s: {a: 0, k: [20, 20], ix: 2},
                        p: {a: 0, k: [0, 0], ix: 3},
                      },
                      {
                        ty: 'fl',
                        c: {a: 0, k: [1, 0.42, 0.21, 1], ix: 4}, // Spice Orange
                        o: {a: 0, k: 100, ix: 5},
                      },
                    ],
                  },
                ],
                ip: 0,
                op: 60,
                st: 0,
                bm: 0,
              },
            ],
          }}
          style={styles.lottieAnimation}
          autoPlay={false}
          loop={false}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: -18,
    left: -18,
    pointerEvents: 'none',
    zIndex: 1000,
  },
});

export default FavoriteButton;
