import React from 'react';
import usePoseDetection from '../hooks/usePoseDetection';

const PoseDataDisplay = () => {
  const { poseData } = usePoseDetection();

  if (!poseData) {
    return (
      <div className="pose-data-display p-3 bg-gray-800 rounded text-white">
        <h4 className="text-sm font-medium mb-2">Pose Data</h4>
        <div className="text-xs text-gray-400">No pose detected</div>
      </div>
    );
  }

  const { landmarks, worldLandmarks, timestamp } = poseData;

  // Calculate some basic pose metrics
  const getPoseMetrics = () => {
    if (!landmarks || landmarks.length === 0) return null;

    // Calculate center of mass (average of all visible landmarks)
    let visibleCount = 0;
    let centerX = 0, centerY = 0, centerZ = 0;
    
    landmarks.forEach(landmark => {
      if (landmark.visibility > 0.5) {
        centerX += landmark.x;
        centerY += landmark.y;
        centerZ += landmark.z;
        visibleCount++;
      }
    });

    if (visibleCount === 0) return null;

    centerX /= visibleCount;
    centerY /= visibleCount;
    centerZ /= visibleCount;

    // Calculate pose bounding box
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(landmark => {
      if (landmark.visibility > 0.5) {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
      }
    });

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      center: { x: centerX, y: centerY, z: centerZ },
      boundingBox: { width, height, minX, maxX, minY, maxY },
      visibleLandmarks: visibleCount,
      totalLandmarks: landmarks.length
    };
  };

  const metrics = getPoseMetrics();

  return (
    <div className="pose-data-display p-3 bg-gray-800 rounded text-white">
      <h4 className="text-sm font-medium mb-2">Pose Data</h4>
      
      <div className="text-xs text-gray-300 space-y-1">
        <div>Timestamp: {timestamp?.toFixed(2)}s</div>
        <div>Landmarks: {landmarks?.length || 0}</div>
        
        {metrics && (
          <>
            <div>Visible: {metrics.visibleLandmarks}/{metrics.totalLandmarks}</div>
            <div>Center: ({metrics.center.x.toFixed(3)}, {metrics.center.y.toFixed(3)})</div>
            <div>Size: {metrics.boundingBox.width.toFixed(3)} × {metrics.boundingBox.height.toFixed(3)}</div>
          </>
        )}

        {landmarks && landmarks[0] && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 mb-1">Key Points:</div>
            <div>Head: {landmarks[0].visibility?.toFixed(3) || 'N/A'}</div>
            <div>Left Shoulder: {landmarks[11]?.visibility?.toFixed(3) || 'N/A'}</div>
            <div>Right Shoulder: {landmarks[12]?.visibility?.toFixed(3) || 'N/A'}</div>
            <div>Left Wrist: {landmarks[15]?.visibility?.toFixed(3) || 'N/A'}</div>
            <div>Right Wrist: {landmarks[16]?.visibility?.toFixed(3) || 'N/A'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoseDataDisplay;
