import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { subscribeToMotionData } from '../core/motionMapping';
import usePoseDetection from '../hooks/usePoseDetection';
import useStore from '../core/store';
import * as THREE from 'three';

const HumanoidAvatar = () => {
  const avatarRef = useRef();
  const motionDataRef = useRef(null);
  const poseDataRef = useRef(null);
  const { poseData } = usePoseDetection();
  const inverseHands = useStore(s => s.inverseHands);
  
  // Movement detection state
  const lastPoseRef = useRef(null);
  const movementThreshold = 0.02; // Minimum movement to trigger avatar motion
  const stillnessTimeoutRef = useRef(0);
  const isStillRef = useRef(false);

  // Subscribe to motion data
  useEffect(() => {
    const subscription = subscribeToMotionData((motionData) => {
      motionDataRef.current = motionData;
    });
    return () => subscription.unsubscribe();
  }, []);

  // Update pose data reference
  useEffect(() => {
    poseDataRef.current = poseData;
  }, [poseData]);

  // Calculate movement between poses
  const calculateMovement = (currentPose, lastPose) => {
    if (!currentPose || !lastPose || !currentPose.landmarks || !lastPose.landmarks) {
      return 0;
    }

    let totalMovement = 0;
    const keyPoints = [11, 12, 15, 16, 23, 24]; // shoulders, wrists, hips
    
    keyPoints.forEach(index => {
      const current = currentPose.landmarks[index];
      const last = lastPose.landmarks[index];
      
      if (current && last && current.visibility > 0.5 && last.visibility > 0.5) {
        const dx = current.x - last.x;
        const dy = current.y - last.y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
      }
    });

    return totalMovement / keyPoints.length;
  };

  // Map MediaPipe landmarks to avatar body parts
  const mapLandmarksToAvatar = (landmarks) => {
    if (!landmarks || landmarks.length < 33) return null;

    // Key landmark indices for MediaPipe pose (official documentation)
    // Swap left/right when inverse hands is enabled
    const landmarkMap = {
      // Head
      nose: 0,
      leftEyeInner: 1,
      leftEye: 2,
      leftEyeOuter: 3,
      rightEyeInner: 4,
      rightEye: 5,
      rightEyeOuter: 6,
      leftEar: 7,
      rightEar: 8,
      mouthLeft: 9,
      mouthRight: 10,
      
      // Shoulders (swap if inverse)
      leftShoulder: inverseHands ? 12 : 11,
      rightShoulder: inverseHands ? 11 : 12,
      
      // Elbows (swap if inverse)
      leftElbow: inverseHands ? 14 : 13,
      rightElbow: inverseHands ? 13 : 14,
      
      // Wrists (swap if inverse)
      leftWrist: inverseHands ? 16 : 15,
      rightWrist: inverseHands ? 15 : 16,
      
      // Hands (swap if inverse)
      leftPinky: inverseHands ? 18 : 17,
      rightPinky: inverseHands ? 17 : 18,
      leftIndex: inverseHands ? 20 : 19,
      rightIndex: inverseHands ? 19 : 20,
      leftThumb: inverseHands ? 22 : 21,
      rightThumb: inverseHands ? 21 : 22,
      
      // Hips (swap if inverse)
      leftHip: inverseHands ? 24 : 23,
      rightHip: inverseHands ? 23 : 24,
      
      // Knees (swap if inverse)
      leftKnee: inverseHands ? 26 : 25,
      rightKnee: inverseHands ? 25 : 26,
      
      // Ankles (swap if inverse)
      leftAnkle: inverseHands ? 28 : 27,
      rightAnkle: inverseHands ? 27 : 28,
      
      // Feet (swap if inverse)
      leftHeel: inverseHands ? 30 : 29,
      rightHeel: inverseHands ? 29 : 30,
      leftFootIndex: inverseHands ? 32 : 31,
      rightFootIndex: inverseHands ? 31 : 32
    };

    const getLandmark = (key) => {
      const index = landmarkMap[key];
      return landmarks[index] && landmarks[index].visibility > 0.5 ? landmarks[index] : null;
    };

    return {
      head: {
        position: getLandmark('nose'),
        leftEye: getLandmark('leftEye'),
        rightEye: getLandmark('rightEye'),
        leftEar: getLandmark('leftEar'),
        rightEar: getLandmark('rightEar'),
        mouthLeft: getLandmark('mouthLeft'),
        mouthRight: getLandmark('mouthRight')
      },
      leftArm: {
        shoulder: getLandmark('leftShoulder'),
        elbow: getLandmark('leftElbow'),
        wrist: getLandmark('leftWrist'),
        pinky: getLandmark('leftPinky'),
        index: getLandmark('leftIndex'),
        thumb: getLandmark('leftThumb')
      },
      rightArm: {
        shoulder: getLandmark('rightShoulder'),
        elbow: getLandmark('rightElbow'),
        wrist: getLandmark('rightWrist'),
        pinky: getLandmark('rightPinky'),
        index: getLandmark('rightIndex'),
        thumb: getLandmark('rightThumb')
      },
      torso: {
        leftShoulder: getLandmark('leftShoulder'),
        rightShoulder: getLandmark('rightShoulder'),
        leftHip: getLandmark('leftHip'),
        rightHip: getLandmark('rightHip')
      },
      leftLeg: {
        hip: getLandmark('leftHip'),
        knee: getLandmark('leftKnee'),
        ankle: getLandmark('leftAnkle'),
        heel: getLandmark('leftHeel'),
        footIndex: getLandmark('leftFootIndex')
      },
      rightLeg: {
        hip: getLandmark('rightHip'),
        knee: getLandmark('rightKnee'),
        ankle: getLandmark('rightAnkle'),
        heel: getLandmark('rightHeel'),
        footIndex: getLandmark('rightFootIndex')
      }
    };
  };

  // Calculate bone rotations from landmarks
  const calculateBoneRotation = (start, end) => {
    if (!start || !end) return { x: 0, y: 0, z: 0 };
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    
    // Calculate rotation angles
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
    
    return { x: pitch, y: yaw, z: 0 };
  };

  // Calculate position from landmark with body-relative scaling
  const landmarkToPosition = (landmark, scale = 100, bodyScale = 1) => {
    if (!landmark) return { x: 0, y: 0, z: 0 };
    
    // Increase horizontal range to better capture 1920x1080 camera width
    const horizontalScale = scale * 1.8;
    
    return {
      x: -(landmark.x - 0.5) * horizontalScale, // INVERTED: negate X to mirror the avatar with wider range
      y: (0.5 - landmark.y) * scale * bodyScale, // Flip Y for 3D space, apply body scale normalization
      z: landmark.z * scale
    };
  };

  useFrame(() => {
    if (!avatarRef.current || !poseDataRef.current) return;

    const currentPose = poseDataRef.current;
    const landmarks = currentPose.landmarks;
    
    if (!landmarks) return;

    // Body scale set to 1.0 - no vertical normalization needed
    // The horizontal scaling fix (1.8x) addresses the camera tracking issue
    // Vertical normalization was causing stretching when hands moved in/out of frame
    const bodyScale = 1;

    // Debug logging

    // Check for movement
    const movement = lastPoseRef.current ? 
      calculateMovement(currentPose, lastPoseRef.current) : 0;
    
    // Update stillness state
    if (movement < movementThreshold) {
      stillnessTimeoutRef.current += 1;
      if (stillnessTimeoutRef.current > 30) { // ~1 second at 30fps
        isStillRef.current = true;
      }
    } else {
      stillnessTimeoutRef.current = 0;
      isStillRef.current = false;
    }

    // Always update avatar for now to debug
    const bodyParts = mapLandmarksToAvatar(landmarks);
    if (!bodyParts) {
      return;
    }

    const avatar = avatarRef.current;

      // Update head
      if (bodyParts.head.position) {
        const headPos = landmarkToPosition(bodyParts.head.position, 60, bodyScale);
        avatar.children[0].position.set(headPos.x, headPos.y + 30, headPos.z);
      }

      // Update left arm
      if (bodyParts.leftArm.shoulder && bodyParts.leftArm.elbow) {
        const shoulderPos = landmarkToPosition(bodyParts.leftArm.shoulder, 60, bodyScale);
        
        avatar.children[1].position.set(shoulderPos.x - 12, shoulderPos.y + 15, shoulderPos.z);
        
        const upperArmRotation = calculateBoneRotation(bodyParts.leftArm.shoulder, bodyParts.leftArm.elbow);
        avatar.children[1].rotation.set(upperArmRotation.x, upperArmRotation.y, upperArmRotation.z);
        
        // Update forearm if wrist is available
        if (bodyParts.leftArm.wrist) {
          const forearmRotation = calculateBoneRotation(bodyParts.leftArm.elbow, bodyParts.leftArm.wrist);
          avatar.children[1].children[1].rotation.set(forearmRotation.x, forearmRotation.y, forearmRotation.z);
        }
      }

      // Update right arm
      if (bodyParts.rightArm.shoulder && bodyParts.rightArm.elbow) {
        const shoulderPos = landmarkToPosition(bodyParts.rightArm.shoulder, 60, bodyScale);
        
        avatar.children[2].position.set(shoulderPos.x + 12, shoulderPos.y + 15, shoulderPos.z);
        
        const upperArmRotation = calculateBoneRotation(bodyParts.rightArm.shoulder, bodyParts.rightArm.elbow);
        avatar.children[2].rotation.set(upperArmRotation.x, upperArmRotation.y, upperArmRotation.z);
        
        // Update forearm if wrist is available
        if (bodyParts.rightArm.wrist) {
          const forearmRotation = calculateBoneRotation(bodyParts.rightArm.elbow, bodyParts.rightArm.wrist);
          avatar.children[2].children[1].rotation.set(forearmRotation.x, forearmRotation.y, forearmRotation.z);
        }
      }

      // Update torso
      if (bodyParts.torso.leftShoulder && bodyParts.torso.rightShoulder && 
          bodyParts.torso.leftHip && bodyParts.torso.rightHip) {
        const leftShoulder = landmarkToPosition(bodyParts.torso.leftShoulder, 60, bodyScale);
        const rightShoulder = landmarkToPosition(bodyParts.torso.rightShoulder, 60, bodyScale);
        const leftHip = landmarkToPosition(bodyParts.torso.leftHip, 60, bodyScale);
        const rightHip = landmarkToPosition(bodyParts.torso.rightHip, 60, bodyScale);
        
        const torsoCenter = {
          x: (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4,
          y: (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4,
          z: (leftShoulder.z + rightShoulder.z + leftHip.z + rightHip.z) / 4
        };
        
        avatar.children[3].position.set(torsoCenter.x, torsoCenter.y, torsoCenter.z);
      }

      // Update left leg
      if (bodyParts.leftLeg.hip && bodyParts.leftLeg.knee) {
        const hipPos = landmarkToPosition(bodyParts.leftLeg.hip, 60, bodyScale);
        
        avatar.children[4].position.set(hipPos.x - 6, hipPos.y - 15, hipPos.z);
        
        const thighRotation = calculateBoneRotation(bodyParts.leftLeg.hip, bodyParts.leftLeg.knee);
        avatar.children[4].rotation.set(thighRotation.x, thighRotation.y, thighRotation.z);
        
        // Update shin if ankle is available
        if (bodyParts.leftLeg.ankle) {
          const shinRotation = calculateBoneRotation(bodyParts.leftLeg.knee, bodyParts.leftLeg.ankle);
          avatar.children[4].children[1].rotation.set(shinRotation.x, shinRotation.y, shinRotation.z);
        }
      }

      // Update right leg
      if (bodyParts.rightLeg.hip && bodyParts.rightLeg.knee) {
        const hipPos = landmarkToPosition(bodyParts.rightLeg.hip, 60, bodyScale);
        
        avatar.children[5].position.set(hipPos.x + 6, hipPos.y - 15, hipPos.z);
        
        const thighRotation = calculateBoneRotation(bodyParts.rightLeg.hip, bodyParts.rightLeg.knee);
        avatar.children[5].rotation.set(thighRotation.x, thighRotation.y, thighRotation.z);
        
        // Update shin if ankle is available
        if (bodyParts.rightLeg.ankle) {
          const shinRotation = calculateBoneRotation(bodyParts.rightLeg.knee, bodyParts.rightLeg.ankle);
          avatar.children[5].children[1].rotation.set(shinRotation.x, shinRotation.y, shinRotation.z);
        }
      }

    // Store current pose for next frame
    lastPoseRef.current = currentPose;
  });

  return (
    <group ref={avatarRef} position={[0, 0, 0]} scale={[1.5, 1.5, 1.5]}>
      {/* Head */}
      <group name="head">
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[6, 16, 16]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-2.5, 1.5, 5.5]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[2.5, 1.5, 5.5]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Eye highlights */}
        <mesh position={[-2.2, 1.8, 6]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[2.8, 1.8, 6]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 0, 6]}>
          <coneGeometry args={[0.5, 1, 6]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        {/* Mouth */}
        <mesh position={[0, -1.5, 5.8]}>
          <sphereGeometry args={[0.3, 8, 4]} />
          <meshBasicMaterial color="#FF6B6B" />
        </mesh>
      </group>
      
      {/* Left Arm */}
      <group name="leftArm">
        {/* Upper Arm */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[1.5, 15]} />
          <meshBasicMaterial color="#FF6B6B" />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -12, 0]}>
          <capsuleGeometry args={[1.2, 12]} />
          <meshBasicMaterial color="#FF8E8E" />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -20, 0]}>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        {/* Fingers */}
        <mesh position={[-1, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        <mesh position={[0, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        <mesh position={[1, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
      </group>
      
      {/* Right Arm */}
      <group name="rightArm">
        {/* Upper Arm */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[1.5, 15]} />
          <meshBasicMaterial color="#FF6B6B" />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -12, 0]}>
          <capsuleGeometry args={[1.2, 12]} />
          <meshBasicMaterial color="#FF8E8E" />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -20, 0]}>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        {/* Fingers */}
        <mesh position={[-1, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        <mesh position={[0, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
        <mesh position={[1, -21, 0]}>
          <capsuleGeometry args={[0.2, 2]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
      </group>
      
      {/* Torso */}
      <group name="torso">
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[15, 25, 6]} />
          <meshBasicMaterial color="#4ECDC4" />
        </mesh>
        {/* Chest detail */}
        <mesh position={[0, 3, 3]}>
          <boxGeometry args={[12, 18, 1.5]} />
          <meshBasicMaterial color="#5ED5CD" />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 12, 0]}>
          <capsuleGeometry args={[2, 4]} />
          <meshBasicMaterial color="#FFDBAC" />
        </mesh>
      </group>
      
      {/* Left Leg */}
      <group name="leftLeg">
        {/* Thigh */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[2.5, 20]} />
          <meshBasicMaterial color="#45B7D1" />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -18, 0]}>
          <capsuleGeometry args={[2, 18]} />
          <meshBasicMaterial color="#6BC5D6" />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -28, 1]}>
          <boxGeometry args={[4, 2, 8]} />
          <meshBasicMaterial color="#2C3E50" />
        </mesh>
        {/* Toes */}
        <mesh position={[0, -29, 2]}>
          <boxGeometry args={[3, 1, 6]} />
          <meshBasicMaterial color="#2C3E50" />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group name="rightLeg">
        {/* Thigh */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[2.5, 20]} />
          <meshBasicMaterial color="#45B7D1" />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -18, 0]}>
          <capsuleGeometry args={[2, 18]} />
          <meshBasicMaterial color="#6BC5D6" />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -28, 1]}>
          <boxGeometry args={[4, 2, 8]} />
          <meshBasicMaterial color="#2C3E50" />
        </mesh>
        {/* Toes */}
        <mesh position={[0, -29, 2]}>
          <boxGeometry args={[3, 1, 6]} />
          <meshBasicMaterial color="#2C3E50" />
        </mesh>
      </group>
    </group>
  );
};

export default HumanoidAvatar;
