import { useState, useCallback } from 'react';

// Global pose data store
let globalPoseData = null;
let poseDataListeners = new Set();

const usePoseDetection = () => {
  const [poseData, setPoseData] = useState(globalPoseData);

  const updatePoseData = useCallback((newPoseData) => {
    globalPoseData = newPoseData;
    poseDataListeners.forEach(listener => listener(newPoseData));
  }, []);

  const subscribeToPoseData = useCallback((callback) => {
    poseDataListeners.add(callback);
    return () => {
      poseDataListeners.delete(callback);
    };
  }, []);

  const unsubscribeFromPoseData = useCallback((callback) => {
    poseDataListeners.delete(callback);
  }, []);

  return {
    poseData,
    updatePoseData,
    subscribeToPoseData,
    unsubscribeFromPoseData
  };
};

export default usePoseDetection;
