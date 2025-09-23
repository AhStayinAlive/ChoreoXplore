import { useState, useCallback, useEffect } from 'react';

// Global pose data store
let globalPoseData = null;
let poseDataListeners = new Set();

const usePoseDetection = () => {
  const [poseData, setPoseData] = useState(globalPoseData);

  // Listen for global pose data changes
  useEffect(() => {
    const handlePoseDataChange = (newPoseData) => {
      setPoseData(newPoseData);
    };

    // Subscribe to global pose data changes
    poseDataListeners.add(handlePoseDataChange);

    // Set initial value
    setPoseData(globalPoseData);

    return () => {
      poseDataListeners.delete(handlePoseDataChange);
    };
  }, []);

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
