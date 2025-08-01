import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  Share,
  Linking,
} from "react-native";
import OptimizedImage from "./OptimizedImage";
import {
  Camera as CameraIcon,
  X,
  Star,
  Instagram,
  MessageCircle,
  Trophy,
} from "lucide-react-native";
import { CameraView, Camera } from "expo-camera";
import { cookCamApi } from "../services/cookCamApi";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import * as Haptics from "expo-haptics";
import logger from "../utils/logger";

interface RecipeCompletionPhotoProps {
  recipeId: string;
  recipeName: string;
  onPhotoUploaded?: (photoUrl: string) => void;
  onClose?: () => void;
  photoType?: "completion" | "process" | "ingredients"; // Different photo types
}

const { width: screenWidth } = Dimensions.get("window");

// Social platforms configuration
const SOCIAL_PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram Stories",
    icon: Instagram,
    color: "#E4405F",
    xp: XP_VALUES.SOCIAL_SHARE_INSTAGRAM,
    action: "instagram-stories",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Instagram,
    color: "#1877F2",
    xp: XP_VALUES.SOCIAL_SHARE_FACEBOOK,
    action: "facebook",
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: Instagram,
    color: "#1DA1F2",
    xp: XP_VALUES.SOCIAL_SHARE_TWITTER,
    action: "twitter",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    xp: XP_VALUES.SOCIAL_SHARE_WHATSAPP,
    action: "whatsapp",
  },
  {
    id: "copy",
    name: "Copy Link",
    icon: Instagram,
    color: "#666",
    xp: XP_VALUES.SOCIAL_SHARE_COPY_LINK,
    action: "copy",
  },
];

const RecipeCompletionPhoto: React.FC<RecipeCompletionPhotoProps> = ({
  recipeId,
  recipeName,
  onPhotoUploaded,
  onClose,
  photoType = "completion",
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const camera = useRef<CameraView>(null);
  const { addXP } = useGamification();

  const [isVisible, setIsVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  // Photo type configurations
  const photoTypeConfig = {
    completion: {
      title: "Share Your Masterpiece",
      subtitle: "Show off your finished dish!",
      xp: XP_VALUES.RECIPE_COMPLETION_PHOTO,
      buttonText: "Complete & Share",
      emoji: "🍽️",
    },
    process: {
      title: "Cooking in Progress",
      subtitle: "Capture the cooking process!",
      xp: XP_VALUES.RECIPE_PROCESS_PHOTO,
      buttonText: "Share Progress",
      emoji: "👨‍🍳",
    },
    ingredients: {
      title: "Ingredient Setup",
      subtitle: "Show your mise en place!",
      xp: XP_VALUES.RECIPE_INGREDIENT_PHOTO,
      buttonText: "Share Setup",
      emoji: "🥕",
    },
  };

  const config = photoTypeConfig[photoType];

  useEffect(() => {
    checkCameraPermissions();
    // If this component is opened from RecipeRatingModal, automatically open camera
    if (onPhotoUploaded) {
      handleOpenCamera();
    }
  }, []);

  const checkCameraPermissions = async () => {
    const { status } = await Camera.getCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    return status === "granted";
  };

  const handleOpenCamera = async () => {
    if (!hasPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert(
          "Camera Permission",
          "Camera access is needed to take photos of your recipe!",
        );
        return;
      }
    }
    setShowCamera(true);
    setIsVisible(true);
  };

  const handleTakePhoto = async () => {
    if (!camera.current) {
      Alert.alert("Error", "Camera not available");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await camera.current.takePictureAsync({
        quality: 0.7,
      });

      const tempPhotoUri = photo.uri;
      setPhotoUri(tempPhotoUri);
      setShowCamera(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // If this is from RecipeRatingModal, automatically return the photo
      if (onPhotoUploaded) {
        // Return photo immediately without showing upload UI
        setTimeout(() => {
          onPhotoUploaded(tempPhotoUri);
          handleClose();
        }, 100);
      }
    } catch (error) {
      logger.error("Failed to take photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoUri) {
      Alert.alert("Error", "Please take a photo first");
      return;
    }

    setIsUploading(true);

    try {
      // Convert photo to base64 or use file URI for demo
      const imageData = photoUri;

      // TODO: Implement photo upload in cookCamApi
      const response = {
        success: true,
        data: { photoUrl: photoUri },
      };

      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Award XP based on photo type
        await addXP(config.xp, `${photoType.toUpperCase()}_PHOTO`);

        setUploadedPhotoUrl(response.data?.photoUrl || photoUri);

        if (onPhotoUploaded) {
          // For RecipeRatingModal, return photo immediately without alert
          onPhotoUploaded(response.data?.photoUrl || photoUri);
          handleClose();
        } else {
          setShowSocialShare(true); // Show social sharing options

          Alert.alert(
            `${config.emoji} Photo Uploaded!`,
            `🎉 Your ${photoType} photo has been shared! +${config.xp} XP`,
            [
              {
                text: "Share More!",
                onPress: () => setShowSocialShare(true),
              },
              {
                text: "Done",
                onPress: () => {
                  if (!showSocialShare) {
                    handleClose();
                  }
                },
              },
            ],
          );
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      logger.error("Upload error:", error);
      Alert.alert("Upload Error", "Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSocialShare = async (platform: (typeof SOCIAL_PLATFORMS)[0]) => {
    try {
      const shareContent = {
        title: `Check out my ${recipeName}!`,
        message: `Just made this amazing ${recipeName} using CookCam! ${
          description || "🍽️✨"
        }`,
        url: uploadedPhotoUrl || `https://cookcam.app/recipe/${recipeId}`,
      };

      let success = false;

      switch (platform.action) {
        case "instagram-stories": {
          // Open Instagram if available
          const instagramUrl = "instagram://story-camera";
          const canOpenInstagram = await Linking.canOpenURL(instagramUrl);
          if (canOpenInstagram) {
            await Linking.openURL(instagramUrl);
            success = true;
          } else {
            await Share.share(shareContent);
            success = true;
          }
          break;
        }

        case "facebook":
          await Share.share(shareContent);
          success = true;
          break;

        case "twitter":
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareContent.message,
          )}&url=${encodeURIComponent(shareContent.url)}`;
          const canOpenTwitter = await Linking.canOpenURL(twitterUrl);
          if (canOpenTwitter) {
            await Linking.openURL(twitterUrl);
            success = true;
          } else {
            await Share.share(shareContent);
            success = true;
          }
          break;

        case "whatsapp":
          const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
            shareContent.message,
          )}`;
          const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
          if (canOpenWhatsApp) {
            await Linking.openURL(whatsappUrl);
            success = true;
          } else {
            await Share.share(shareContent);
            success = true;
          }
          break;

        case "copy":
          // Copy link to clipboard (would need Clipboard API)
          await Share.share(shareContent);
          success = true;
          break;

        default:
          await Share.share(shareContent);
          success = true;
      }

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Award XP for social sharing
        await addXP(platform.xp, `SOCIAL_SHARE_${platform.id.toUpperCase()}`);

        Alert.alert(
          "🎉 Shared Successfully!",
          `Thanks for sharing! +${platform.xp} XP earned`,
          [{ text: "Awesome!" }],
        );
      }
    } catch (error) {
      logger.error("Share error:", error);
      Alert.alert("Share Error", "Failed to share. Please try again.");
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowCamera(false);
    setShowSocialShare(false);
    setPhotoUri(null);
    setDescription("");
    setUploadedPhotoUrl(null);
    onClose?.();
  };

  const handleCancelCamera = () => {
    setShowCamera(false);
    if (!photoUri) {
      // If no photo was taken, close the entire modal
      handleClose();
    }
  };

  const openModal = () => {
    setIsVisible(true);
    // Automatically open camera when modal opens
    handleOpenCamera();
  };

  if (!isVisible && !showCamera && !showSocialShare) {
    return (
      <View style={styles.triggerContainer}>
        <TouchableOpacity style={styles.triggerButton} onPress={openModal}>
          <CameraIcon size={24} color="#FFFFFF" />
          <Text style={styles.triggerButtonText}>{config.buttonText}</Text>
          <Text style={styles.xpBadge}>+{config.xp} XP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible || showCamera || showSocialShare}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {showSocialShare ? (
          // Social sharing modal
          <View style={styles.socialShareContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowSocialShare(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.title}>Share Your Creation</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.socialShareContent}>
              <View style={styles.photoPreviewSmall}>
                {uploadedPhotoUrl && (
                  <OptimizedImage
                    source={{ uri: uploadedPhotoUrl }}
                    style={styles.socialPreviewImage}
                  />
                )}
              </View>

              <Text style={styles.socialShareTitle}>
                🎉 Great shot! Share to earn even more XP
              </Text>

              <View style={styles.socialPlatforms}>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={[
                      styles.socialPlatformButton,
                      { borderColor: platform.color },
                    ]}
                    onPress={() => handleSocialShare(platform)}
                  >
                    <platform.icon size={24} color={platform.color} />
                    <Text style={styles.socialPlatformName}>
                      {platform.name}
                    </Text>
                    <Text
                      style={[
                        styles.socialPlatformXP,
                        { color: platform.color },
                      ]}
                    >
                      +{platform.xp} XP
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.skipSocialButton}
                onPress={() => setShowSocialShare(false)}
              >
                <Text style={styles.skipSocialText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showCamera ? (
          <View style={styles.cameraContainer}>
            <CameraView ref={camera} style={styles.camera} facing="back" />
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelCamera}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleTakePhoto}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={styles.placeholder} />
            </View>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.title}>{config.title}</Text>
              <View style={styles.placeholder} />
            </View>

            {!photoUri ? (
              <View style={styles.photoSelectContainer}>
                <Text style={styles.subtitle}>{config.subtitle}</Text>

                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={handleOpenCamera}
                >
                  <CameraIcon size={32} color="#FFFFFF" />
                  <Text style={styles.buttonText}>{config.buttonText}</Text>
                </TouchableOpacity>

                <View style={styles.xpRewardBanner}>
                  <Star size={20} color="#FFB800" />
                  <Text style={styles.xpRewardText}>
                    Earn {config.xp} XP + social bonuses!
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.photoPreviewContainer}>
                <OptimizedImage
                  source={{ uri: photoUri }}
                  style={styles.photoPreview}
                />

                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe your creation... (optional)"
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={200}
                />

                <View style={styles.uploadButtonContainer}>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      isUploading && styles.uploadButtonDisabled,
                    ]}
                    onPress={handleUploadPhoto}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Trophy size={20} color="#FFFFFF" />
                        <Text style={styles.uploadButtonText}>
                          {config.buttonText}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  triggerContainer: {
    marginVertical: 20,
  },
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  triggerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  xpBadge: {
    color: "#FFB800",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B35",
  },
  uploadContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  photoSelectContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  photoPreviewContainer: {
    flex: 1,
    padding: 20,
  },
  photoPreview: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  uploadButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 12,
  },
  retakeButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: "#CCC",
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  placeholder: {
    width: 50,
  },
  socialShareContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  socialShareContent: {
    flex: 1,
    padding: 20,
  },
  photoPreviewSmall: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  socialPreviewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  socialShareTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  socialPlatforms: {
    gap: 12,
    marginBottom: 30,
  },
  socialPlatformButton: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  socialPlatformName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  socialPlatformXP: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  skipSocialButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 12,
  },
  skipSocialText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  xpRewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFB800",
    borderRadius: 12,
    marginBottom: 20,
  },
  xpRewardText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Recipe claiming styles
  claimContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  claimButtonDisabled: {
    backgroundColor: "#CCC",
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  claimXpBadge: {
    color: "#FFB800",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  claimDescription: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default RecipeCompletionPhoto;

// Additional export for recipe claiming functionality
export const RecipeClaimButton: React.FC<{
  recipeId: string;
  recipeName: string;
  onRecipeClaimed?: () => void;
}> = ({ recipeId, recipeName, onRecipeClaimed }) => {
  const { addXP } = useGamification();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimRecipe = async () => {
    setIsClaiming(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Award significant XP for claiming a recipe
      await addXP(XP_VALUES.CLAIM_RECIPE, "CLAIM_RECIPE");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "🏆 Recipe Claimed!",
        `🎉 You've claimed "${recipeName}"! This recipe is now yours to customize and share. +${XP_VALUES.CLAIM_RECIPE} XP earned!`,
        [
          {
            text: "Awesome!",
            onPress: () => onRecipeClaimed?.(),
          },
        ],
      );
    } catch (error) {
      logger.error("Recipe claim error:", error);
      Alert.alert("Claim Error", "Failed to claim recipe. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <View style={styles.claimContainer}>
      <TouchableOpacity
        style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
        onPress={handleClaimRecipe}
        disabled={isClaiming}
      >
        {isClaiming ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Trophy size={24} color="#FFFFFF" />
            <Text style={styles.claimButtonText}>Claim Recipe</Text>
            <Text style={styles.claimXpBadge}>
              +{XP_VALUES.CLAIM_RECIPE} XP
            </Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={styles.claimDescription}>
        Make this recipe yours! Customize, share, and earn rewards.
      </Text>
    </View>
  );
};
