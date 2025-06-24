/**
 * Appliances Step Component
 * Handles kitchen appliance selection
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { AppliancesStepProps } from '../../types/preferences';
import KitchenApplianceIcon from '../KitchenApplianceIcon';
import { moderateScale, verticalScale } from '../../utils/responsive';

const AppliancesStep: React.FC<AppliancesStepProps> = React.memo(({
  appliances,
  onToggleAppliance,
}) => {
  const selectedApplianceCount = useMemo(() => 
    appliances.filter(appliance => appliance.selected).length,
    [appliances]
  );

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.applianceGrid}>
        {appliances.map((appliance) => (
          <TouchableOpacity
            key={appliance.id}
            style={[
              styles.applianceCard,
              appliance.selected && styles.applianceCardSelected,
            ]}
            onPress={() => onToggleAppliance(appliance.id)}
          >
            <View style={styles.applianceIconContainer}>
              <KitchenApplianceIcon
                appliance={appliance.icon}
                size={moderateScale(40)}
              />
            </View>
            <Text
              style={[
                styles.applianceName,
                appliance.selected && styles.applianceNameSelected,
              ]}
            >
              {appliance.name}
            </Text>
            <Text
              style={[
                styles.applianceDescription,
                appliance.selected && styles.applianceDescriptionSelected,
              ]}
            >
              {appliance.description}
            </Text>
            {appliance.selected && (
              <View style={styles.applianceCheckbox}>
                <Check size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.applianceHint}>
        {selectedApplianceCount} selected • Select all that you have
      </Text>
    </ScrollView>
  );
});

AppliancesStep.displayName = 'AppliancesStep';

const styles = StyleSheet.create({
  applianceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    paddingTop: 8,
  },
  applianceCard: {
    width: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  applianceCardSelected: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "#4CAF50",
  },
  applianceIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
    height: moderateScale(48),
    width: moderateScale(48),
  },
  applianceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 4,
  },
  applianceNameSelected: {
    color: "#4CAF50",
  },
  applianceDescription: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  applianceDescriptionSelected: {
    color: "#4CAF50",
  },
  applianceCheckbox: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  applianceHint: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 12,
  },
});

export default AppliancesStep; 