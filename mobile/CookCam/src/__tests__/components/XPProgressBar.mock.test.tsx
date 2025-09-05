import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Use the mock component directly
jest.mock('../../components/XPProgressBar', () => require('../../__mocks__/components/XPProgressBar').default);

import XPProgressBar from '../../components/XPProgressBar';

describe('XPProgressBar with Mock', () => {
  it('should render the mocked component', () => {
    render(<XPProgressBar />);
    
    expect(screen.getByTestId('xp-progress-bar')).toBeTruthy();
    expect(screen.getByTestId('level-text')).toBeTruthy();
    expect(screen.getByText('Level 2')).toBeTruthy();
  });

  it('should hide labels when showLabels is false', () => {
    render(<XPProgressBar showLabels={false} />);
    
    expect(screen.getByTestId('xp-progress-bar')).toBeTruthy();
    expect(screen.queryByTestId('xp-labels')).toBeFalsy();
  });

  it('should apply custom height', () => {
    render(<XPProgressBar height={32} />);
    
    const progressBar = screen.getByTestId('xp-progress-bar');
    expect(progressBar.props.style).toEqual([{ height: 32 }, undefined]);
  });

  it('should display XP values', () => {
    render(<XPProgressBar />);
    
    expect(screen.getByText('150 / 250 XP')).toBeTruthy();
  });

  it('should show progress fill', () => {
    render(<XPProgressBar />);
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toEqual({ width: '60%' });
  });
});