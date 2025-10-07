import React, { useState } from "react";
import { View, StyleSheet, ImageStyle, Image } from "react-native";
import { ChefHat } from "lucide-react-native";

// Type definitions to match the original FastImage interface
type Source = {
  uri: string;
  headers?: Record<string, string>;
};

type ResizeMode = "contain" | "cover" | "stretch" | "center";

interface OptimizedImageProps {
  source: Source | { uri: string };
  style: ImageStyle | ImageStyle[];
  resizeMode?: ResizeMode;
  placeholder?: React.ReactNode;
  fallbackColor?: string;
  _priority?: "low" | "normal" | "high";
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  resizeMode = "cover",
  placeholder,
  fallbackColor = "#E5E5E7",
  _priority = "normal", // Note: priority is ignored for standard Image
  onLoadStart,
  onLoad,
  onError,
}) => {
  const [_isLoading, setIsLoading] = useState(true); // Note: not used in UI but tracks state
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Show fallback UI if error or no source
  if (hasError || !source || (typeof source === "object" && !source.uri)) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        {placeholder || <ChefHat size={40} color={fallbackColor} />}
      </View>
    );
  }

  return (
    <Image
      source={
        typeof source === "object" && "uri" in source
          ? { uri: source.uri }
          : source
      }
      style={style}
      resizeMode={resizeMode}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: "rgba(229, 229, 231, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default OptimizedImage;
