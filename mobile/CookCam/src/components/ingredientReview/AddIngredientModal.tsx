import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Plus } from "lucide-react-native";
import { tokens, mixins } from "../../styles";

interface AddIngredientModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (ingredientName: string) => void;
}

const AddIngredientModal: React.FC<AddIngredientModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [ingredientName, setIngredientName] = useState("");

  const handleAdd = () => {
    const trimmedName = ingredientName.trim();
    if (trimmedName) {
      onAdd(trimmedName);
      setIngredientName("");
      onClose();
    }
  };

  const handleClose = () => {
    setIngredientName("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Ingredient</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={tokens.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            What ingredient would you like to add?
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g., tomatoes, onions, chicken..."
            placeholderTextColor={tokens.colors.text.tertiary}
            value={ingredientName}
            onChangeText={setIngredientName}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.addButton,
                !ingredientName.trim() && styles.disabledButton,
              ]}
              onPress={handleAdd}
              disabled={!ingredientName.trim()}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    backgroundColor: tokens.colors.background.primary,
    borderRadius: tokens.borderRadius.large,
    padding: tokens.spacing.lg,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: tokens.spacing.sm,
  },
  title: {
    ...mixins.text.h3,
    color: tokens.colors.text.primary,
    fontWeight: "700",
  },
  closeButton: {
    padding: tokens.spacing.xs,
  },
  subtitle: {
    ...mixins.text.body,
    color: tokens.colors.text.secondary,
    marginBottom: tokens.spacing.lg,
  },
  input: {
    ...mixins.text.body,
    backgroundColor: tokens.colors.background.secondary,
    borderRadius: tokens.borderRadius.medium,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.lg,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  cancelButton: {
    backgroundColor: tokens.colors.background.secondary,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
  },
  cancelButtonText: {
    ...mixins.text.body,
    color: tokens.colors.text.secondary,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: tokens.colors.brand.primary,
  },
  addButtonText: {
    ...mixins.text.body,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: tokens.colors.background.tertiary,
    opacity: 0.5,
  },
});

export default AddIngredientModal;