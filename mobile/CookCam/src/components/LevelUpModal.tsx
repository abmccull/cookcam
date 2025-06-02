import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Trophy, Star, Gift, ChevronRight} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  rewards?: string[];
  onClose: () => void;
}

const {width: screenWidth} = Dimensions.get('window');

const LevelUpModal: React.FC<LevelUpModalProps> = ({
  visible,
  newLevel,
  rewards = [],
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef(
    Array.from({length: 8}, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Trigger celebration haptic
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      // Main trophy animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Star burst animations
      starAnims.forEach((anim, index) => {
        const angle = (index * 45) * Math.PI / 180;
        const distance = 100;
        
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              tension: 40,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      ...starAnims.map(anim => 
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ),
    ]).start(() => {
      // Reset animations
      rotateAnim.setValue(0);
      starAnims.forEach(anim => {
        anim.scale.setValue(0);
        anim.rotate.setValue(0);
      });
      onClose();
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {/* Star burst background */}
          {starAnims.map((anim, index) => {
            const angle = (index * 45) * Math.PI / 180;
            const x = Math.cos(angle) * 100;
            const y = Math.sin(angle) * 100;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.star,
                  {
                    opacity: anim.opacity,
                    transform: [
                      {translateX: x},
                      {translateY: y},
                      {scale: anim.scale},
                      {
                        rotate: anim.rotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}>
                <Star size={24} color="#FFB800" fill="#FFB800" />
              </Animated.View>
            );
          })}

          {/* Trophy Icon */}
          <Animated.View
            style={[
              styles.trophyContainer,
              {transform: [{rotate: spin}]},
            ]}>
            <Trophy size={80} color="#FFD700" />
          </Animated.View>

          {/* Level Up Text */}
          <Text style={styles.title}>LEVEL UP!</Text>
          <Text style={styles.levelText}>
            You've reached <Text style={styles.levelNumber}>Level {newLevel}</Text>
          </Text>

          {/* Rewards Section */}
          {rewards.length > 0 && (
            <View style={styles.rewardsContainer}>
              <View style={styles.rewardHeader}>
                <Gift size={20} color="#FF6B35" />
                <Text style={styles.rewardTitle}>Rewards Unlocked</Text>
              </View>
              {rewards.map((reward, index) => (
                <View key={index} style={styles.rewardItem}>
                  <Text style={styles.rewardText}>{reward}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
            <Text style={styles.continueText}>Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: screenWidth * 0.85,
    maxWidth: 350,
    position: 'relative',
  },
  star: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  trophyContainer: {
    marginBottom: 24,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  levelText: {
    fontSize: 18,
    color: '#2D1B69',
    marginBottom: 24,
  },
  levelNumber: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#FF6B35',
  },
  rewardsContainer: {
    backgroundColor: '#FFF9F7',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  rewardItem: {
    paddingVertical: 8,
  },
  rewardText: {
    fontSize: 14,
    color: '#2D1B69',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LevelUpModal; 