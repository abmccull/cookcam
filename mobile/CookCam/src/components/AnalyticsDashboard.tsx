import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { cookCamApi } from "../services/cookCamApi";
import { useSubscription } from "../context/SubscriptionContext";
import FeatureGate from "./FeatureGate";
import logger from "../utils/logger";

const { width: screenWidth } = Dimensions.get("window");

// Types for dashboard data
interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  totalScans: number;
  totalRecipes: number;
  revenue: number;
  growthRate: number;
  engagement: {
    avgSessionDuration: number;
    avgScansPerUser: number;
    recipeConversionRate: number;
  };
  charts: {
    userGrowth: Array<{ date: string; count: number }>;
    scanActivity: Array<{ date: string; count: number }>;
    revenueGrowth: Array<{ date: string; amount: number }>;
  };
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon?: string;
  color?: string;
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = "#007BFF",
}: MetricCardProps) {
  const trendColor =
    trend && trend > 0 ? "#28A745" : trend && trend < 0 ? "#DC3545" : "#6C757D";
  const trendIcon =
    trend && trend > 0 ? "↗️" : trend && trend < 0 ? "↘️" : "➡️";

  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon && <Text style={styles.metricIcon}>{icon}</Text>}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendIcon} {Math.abs(trend).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
}

// Simple Chart Component (you could replace with a proper charting library)
interface SimpleChartProps {
  data: Array<{ date: string; count?: number; amount?: number }>;
  title: string;
  color?: string;
  valueKey: "count" | "amount";
}

function SimpleChart({
  data,
  title,
  color = "#007BFF",
  valueKey,
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No data available</Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => item[valueKey] || 0));
  const chartWidth = screenWidth - 40;
  const chartHeight = 120;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartArea}>
        <View
          style={[styles.chart, { width: chartWidth, height: chartHeight }]}
        >
          {data.map((item, index) => {
            const barHeight =
              maxValue > 0
                ? ((item[valueKey] || 0) / maxValue) * chartHeight
                : 0;
            const barWidth = (chartWidth - 20) / data.length;

            return (
              <View
                key={index}
                style={[
                  styles.chartBar,
                  {
                    width: barWidth - 2,
                    height: barHeight,
                    backgroundColor: color,
                    left: index * barWidth + 10,
                    bottom: 0,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          {data.slice(0, 5).map((item, index) => (
            <Text key={index} style={styles.chartLabel}>
              {new Date(item.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// Main Dashboard Component
export function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [refreshing, setRefreshing] = useState(false);

  const { isSubscribed } = useSubscription();

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const response = await cookCamApi.getAnalyticsDashboard(period);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError("Failed to load analytics data");
      }
    } catch (err) {
      logger.error("Failed to load dashboard data:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${Math.floor(seconds % 60)}s`;
  };

  if (!isSubscribed()) {
    return (
      <FeatureGate feature="analytics_dashboard" userId="current-user">
        <View style={styles.container}>
          <Text style={styles.title}>Analytics Dashboard</Text>
        </View>
      </FeatureGate>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDashboardData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Analytics Dashboard</Text>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["day", "week", "month"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p as "day" | "week" | "month")}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {data && (
        <>
          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Users"
              value={formatNumber(data.totalUsers)}
              icon="👥"
              color="#007BFF"
              trend={data.growthRate}
            />
            <MetricCard
              title="Active Users"
              value={formatNumber(data.activeUsers)}
              icon="🟢"
              color="#28A745"
              subtitle={`${((data.activeUsers / data.totalUsers) * 100).toFixed(
                1,
              )}% of total`}
            />
            <MetricCard
              title="Total Scans"
              value={formatNumber(data.totalScans)}
              icon="📸"
              color="#FFC107"
            />
            <MetricCard
              title="Recipes Generated"
              value={formatNumber(data.totalRecipes)}
              icon="🍳"
              color="#6F42C1"
            />
            <MetricCard
              title="Revenue"
              value={formatCurrency(data.revenue)}
              icon="💰"
              color="#28A745"
            />
            <MetricCard
              title="Session Duration"
              value={formatDuration(data.engagement.avgSessionDuration)}
              icon="⏱️"
              color="#17A2B8"
            />
          </View>

          {/* Engagement Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Engagement</Text>
            <View style={styles.engagementGrid}>
              <View style={styles.engagementCard}>
                <Text style={styles.engagementValue}>
                  {data.engagement.avgScansPerUser.toFixed(1)}
                </Text>
                <Text style={styles.engagementLabel}>Avg Scans/User</Text>
              </View>
              <View style={styles.engagementCard}>
                <Text style={styles.engagementValue}>
                  {(data.engagement.recipeConversionRate * 100).toFixed(1)}%
                </Text>
                <Text style={styles.engagementLabel}>Recipe Conversion</Text>
              </View>
            </View>
          </View>

          {/* Charts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Trends</Text>

            <SimpleChart
              data={data.charts.userGrowth}
              title="User Growth"
              color="#007BFF"
              valueKey="count"
            />

            <SimpleChart
              data={data.charts.scanActivity}
              title="Scan Activity"
              color="#FFC107"
              valueKey="count"
            />

            <SimpleChart
              data={data.charts.revenueGrowth}
              title="Revenue Growth"
              color="#28A745"
              valueKey="amount"
            />
          </View>

          {/* Summary Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Summary</Text>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                🎯 Your app has{" "}
                <Text style={styles.highlight}>
                  {formatNumber(data.totalUsers)}
                </Text>{" "}
                total users with{" "}
                <Text style={styles.highlight}>
                  {formatNumber(data.activeUsers)}
                </Text>{" "}
                active this {period}.
              </Text>
              <Text style={styles.summaryText}>
                📸 Users have completed{" "}
                <Text style={styles.highlight}>
                  {formatNumber(data.totalScans)}
                </Text>{" "}
                ingredient scans, generating{" "}
                <Text style={styles.highlight}>
                  {formatNumber(data.totalRecipes)}
                </Text>{" "}
                recipes.
              </Text>
              <Text style={styles.summaryText}>
                💵 Total revenue is{" "}
                <Text style={styles.highlight}>
                  {formatCurrency(data.revenue)}
                </Text>{" "}
                with a growth rate of{" "}
                <Text style={styles.highlight}>
                  {data.growthRate.toFixed(1)}%
                </Text>
                .
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6C757D",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#DC3545",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#343A40",
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: "#007BFF",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6C757D",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  metricCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6C757D",
    textTransform: "uppercase",
  },
  metricIcon: {
    fontSize: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 10,
    color: "#6C757D",
  },
  trendContainer: {
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#343A40",
    marginBottom: 16,
  },
  engagementGrid: {
    flexDirection: "row",
    gap: 12,
  },
  engagementCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  engagementValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007BFF",
    marginBottom: 4,
  },
  engagementLabel: {
    fontSize: 12,
    color: "#6C757D",
    textAlign: "center",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#343A40",
    marginBottom: 16,
  },
  chartArea: {
    position: "relative",
  },
  chart: {
    position: "relative",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  chartBar: {
    position: "absolute",
    borderRadius: 2,
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: "#6C757D",
  },
  chartPlaceholder: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  placeholderText: {
    color: "#6C757D",
    fontSize: 14,
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#495057",
    marginBottom: 12,
  },
  highlight: {
    fontWeight: "bold",
    color: "#007BFF",
  },
});
