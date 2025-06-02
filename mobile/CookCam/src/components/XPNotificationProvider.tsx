import React from 'react';
import {View} from 'react-native';
import XPNotification from './XPNotification';
import {useGamification} from '../context/GamificationContext';

interface XPNotificationProviderProps {
  children: React.ReactNode;
}

const XPNotificationProvider: React.FC<XPNotificationProviderProps> = ({children}) => {
  const {
    xp,
    level,
    levelProgress,
    nextLevelXP,
    xpNotification,
    hideXPNotification,
  } = useGamification();

  return (
    <>
      {children}
      <XPNotification
        visible={xpNotification.visible}
        xpGained={xpNotification.xpGained}
        reason={xpNotification.reason}
        currentXP={xp}
        currentLevel={level}
        levelProgress={levelProgress}
        nextLevelXP={nextLevelXP}
        showConfetti={xpNotification.showConfetti}
        onComplete={hideXPNotification}
      />
    </>
  );
};

export default XPNotificationProvider; 