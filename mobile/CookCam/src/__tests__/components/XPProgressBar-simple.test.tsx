import React from 'react';
import { render } from '@testing-library/react-native';

// Minimal mocks - start simple
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    View: 'AnimatedView',
  },
}));

// Mock the context
jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => ({
    xp: 150,
    level: 2,
    levelProgress: 60,
    nextLevelXP: 250,
  }),
}));

import XPProgressBar from '../../components/XPProgressBar';

describe('XPProgressBar Simple Test', () => {
  it('should import and render without crashing', () => {
    const { toJSON } = render(<XPProgressBar />);
    expect(toJSON()).toBeTruthy();
  });
});