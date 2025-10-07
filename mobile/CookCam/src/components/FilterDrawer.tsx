import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { X, Filter } from "lucide-react-native";

interface FilterOptions {
  dietary: string[];
  cuisine: string[];
  cookingTime: string;
  difficulty: string;
}

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (_filters: FilterOptions) => void;
  initialFilters: FilterOptions;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const dietaryOptions = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Dairy-Free",
    "Keto",
    "Paleo",
    "Low-Carb",
    "High-Protein",
  ];

  const cuisineOptions = [
    "Italian",
    "Mexican",
    "Asian",
    "Indian",
    "Mediterranean",
    "American",
    "French",
    "Thai",
    "Chinese",
    "Japanese",
  ];

  const cookingTimeOptions = [
    "Under 15 min",
    "15-30 min",
    "30-60 min",
    "Over 1 hour",
  ];

  const difficultyOptions = ["Easy", "Medium", "Hard"];

  const toggleDietaryFilter = (option: string) => {
    setFilters((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(option)
        ? prev.dietary.filter((item) => item !== option)
        : [...prev.dietary, option],
    }));
  };

  const toggleCuisineFilter = (option: string) => {
    setFilters((prev) => ({
      ...prev,
      cuisine: prev.cuisine.includes(option)
        ? prev.cuisine.filter((item) => item !== option)
        : [...prev.cuisine, option],
    }));
  };

  const setCookingTime = (time: string) => {
    setFilters((prev) => ({
      ...prev,
      cookingTime: prev.cookingTime === time ? "" : time,
    }));
  };

  const setDifficulty = (difficulty: string) => {
    setFilters((prev) => ({
      ...prev,
      difficulty: prev.difficulty === difficulty ? "" : difficulty,
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const clearAllFilters = () => {
    setFilters({
      dietary: [],
      cuisine: [],
      cookingTime: "",
      difficulty: "",
    });
  };

  const hasActiveFilters =
    filters.dietary.length > 0 ||
    filters.cuisine.length > 0 ||
    filters.cookingTime !== "" ||
    filters.difficulty !== "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#2D1B69" />
          </TouchableOpacity>
          <Text style={styles.title}>Filter Recipes</Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Dietary Restrictions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
            <View style={styles.optionGrid}>
              {dietaryOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    filters.dietary.includes(option) && styles.activeChip,
                  ]}
                  onPress={() => toggleDietaryFilter(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.dietary.includes(option) && styles.activeChipText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cuisine Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuisine Type</Text>
            <View style={styles.optionGrid}>
              {cuisineOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    filters.cuisine.includes(option) && styles.activeChip,
                  ]}
                  onPress={() => toggleCuisineFilter(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.cuisine.includes(option) && styles.activeChipText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cooking Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cooking Time</Text>
            <View style={styles.optionGrid}>
              {cookingTimeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    filters.cookingTime === option && styles.activeChip,
                  ]}
                  onPress={() => setCookingTime(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.cookingTime === option && styles.activeChipText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.optionGrid}>
              {difficultyOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    filters.difficulty === option && styles.activeChip,
                  ]}
                  onPress={() => setDifficulty(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.difficulty === option && styles.activeChipText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyFilters}
          >
            <Filter size={20} color="#F8F8FF" />
            <Text style={styles.applyButtonText}>
              Apply Filters{" "}
              {hasActiveFilters &&
                `(${
                  filters.dietary.length +
                  filters.cuisine.length +
                  (filters.cookingTime ? 1 : 0) +
                  (filters.difficulty ? 1 : 0)
                })`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF", // Sea-Salt White
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69", // Eggplant Midnight
  },
  clearText: {
    fontSize: 16,
    color: "#FF6B35", // Spice Orange
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69", // Eggplant Midnight
    marginBottom: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    marginBottom: 8,
  },
  activeChip: {
    backgroundColor: "#4CAF50", // Fresh Basil
    borderColor: "#4CAF50",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2D1B69", // Eggplant Midnight
  },
  activeChipText: {
    color: "#F8F8FF", // Sea-Salt White
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35", // Spice Orange
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8F8FF", // Sea-Salt White
    marginLeft: 8,
  },
});

export default FilterDrawer;
