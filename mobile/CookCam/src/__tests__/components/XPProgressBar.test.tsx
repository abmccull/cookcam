import React from 'react';
import { render, screen } from '@testing-library/react-native';
import XPProgressBar from '../../components/XPProgressBar';
import GamificationContext from '../../context/GamificationContext';

// Mock the Animated API
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = jest.fn(() => ({
    start: jest.fn((cb) => cb && cb()),
  }));
  return RN;
});

// Mock context provider
const MockGamificationProvider = ({ children, value }: unknown) => (
  <GamificationContext.Provider value={value}>
    {children}
  </GamificationContext.Provider>
);

// Helper to render with context
const renderWithContext = (props = {}, contextValue = {}) => {
  const defaultContext = {
    xp: 50,
    level: 1,
    levelProgress: 0.5,
    nextLevelXP: 100,
    streak: 0,
    freezeTokens: 0,
    todayXP: 0,
    badges: [],
    recentAchievements: [],
    weeklyLeaderboardPosition: null,
    addXP: jest.fn(),
    checkStreak: jest.fn(),
    useStreakFreeze: jest.fn(),
    refreshGamificationData: jest.fn(),
    claimAchievement: jest.fn(),
    ...contextValue,
  };

  return render(
    <MockGamificationProvider value={defaultContext}>
      <XPProgressBar {...props} />
    </MockGamificationProvider>
  );
};

describe('XPProgressBar', () => {
  it('renders correctly with default props', () => {
    renderWithContext();
    
    // The component should render with the context values
    expect(screen.getByText(/XP/)).toBeTruthy();
  });

  it('displays correct XP text when showLabels is true', () => {
    renderWithContext({ showLabels: true }, { xp: 75, nextLevelXP: 100 });
    
    // Should show the XP progress
    expect(screen.getByText('75 / 100 XP')).toBeTruthy();
  });

  it('hides labels when showLabels is false', () => {
    renderWithContext({ showLabels: false });
    
    // Should not show XP text
    expect(screen.queryByText(/XP/)).toBeFalsy();
  });

  it('applies custom height', () => {
    const { getByTestId } = renderWithContext({ height: 30 });
    
    // Progress bar container should have the custom height
    const container = getByTestId('xp-progress-container');
    expect(container.props.style).toMatchObject(
      expect.objectContaining({
        height: 30,
      })
    );
  });

  it('handles zero XP correctly', () => {
    renderWithContext({}, { xp: 0, nextLevelXP: 100, levelProgress: 0 });
    
    expect(screen.getByText('0 / 100 XP')).toBeTruthy();
  });

  it('handles full XP correctly', () => {
    renderWithContext({}, { xp: 100, nextLevelXP: 100, levelProgress: 1 });
    
    expect(screen.getByText('100 / 100 XP')).toBeTruthy();
  });
});