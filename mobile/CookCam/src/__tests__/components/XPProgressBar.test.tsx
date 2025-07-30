import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { XPProgressBar } from '../../components/XPProgressBar';

describe('XPProgressBar', () => {
  it('renders correctly with default props', () => {
    render(<XPProgressBar currentXP={50} nextLevelXP={100} />);
    
    // Check if the component renders
    expect(screen.getByTestId('xp-progress-bar')).toBeTruthy();
  });

  it('displays correct XP text', () => {
    render(<XPProgressBar currentXP={75} nextLevelXP={100} />);
    
    // Should show the XP progress
    expect(screen.getByText('75/100 XP')).toBeTruthy();
  });

  it('calculates progress percentage correctly', () => {
    render(<XPProgressBar currentXP={25} nextLevelXP={100} />);
    
    // Progress should be 25%
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar.props.style).toEqual(
      expect.objectContaining({
        width: '25%',
      })
    );
  });

  it('handles edge case when currentXP equals nextLevelXP', () => {
    render(<XPProgressBar currentXP={100} nextLevelXP={100} />);
    
    expect(screen.getByText('100/100 XP')).toBeTruthy();
    
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar.props.style).toEqual(
      expect.objectContaining({
        width: '100%',
      })
    );
  });

  it('handles zero XP correctly', () => {
    render(<XPProgressBar currentXP={0} nextLevelXP={100} />);
    
    expect(screen.getByText('0/100 XP')).toBeTruthy();
    
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar.props.style).toEqual(
      expect.objectContaining({
        width: '0%',
      })
    );
  });
});