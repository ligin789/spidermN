/**
 * Pose library for the procedural hero rig. Angles are Euler XYZ radians in
 * each joint's parent space. The character faces +Z, its left side is +X.
 *  - arms hang along -Y: +X swings an arm backward, -X forward; +Z raises the
 *    left arm sideways, -Z raises the right arm.
 *  - legs hang along -Y: -X lifts the thigh forward; +X bends the knee.
 *  - spine/chest/head: +X leans forward / looks down.
 */

export const JOINTS = [
  'hips',
  'spine',
  'chest',
  'head',
  'shoulderL',
  'elbowL',
  'wristL',
  'shoulderR',
  'elbowR',
  'wristR',
  'hipL',
  'kneeL',
  'ankleL',
  'hipR',
  'kneeR',
  'ankleR',
] as const

export type Joint = (typeof JOINTS)[number]
export type Euler3 = readonly [number, number, number]

export interface Pose {
  /** Height of the hips joint above the feet, in unscaled hero units. */
  hipsY: number
  r: Partial<Record<Joint, Euler3>>
}

export const POSE_NAMES = ['stand', 'swing', 'soar', 'tuck', 'land', 'crouch', 'perch'] as const
export type PoseName = (typeof POSE_NAMES)[number]

export const POSES: Record<PoseName, Pose> = {
  stand: {
    hipsY: 1.0,
    r: {
      hips: [0, 0.06, 0],
      spine: [-0.05, -0.04, 0],
      chest: [-0.08, -0.04, 0],
      head: [0.02, 0.06, 0],
      shoulderL: [0.0, 0, 0.24],
      elbowL: [-0.5, 0, 0],
      wristL: [0, 0, -0.1],
      shoulderR: [-0.05, 0, -0.24],
      elbowR: [-0.55, 0, 0],
      wristR: [0, 0, 0.1],
      hipL: [-0.04, 0, 0.13],
      kneeL: [0.08, 0, 0],
      ankleL: [-0.04, 0, -0.13],
      hipR: [0.04, -0.1, -0.12],
      kneeR: [0.04, 0, 0],
      ankleR: [-0.08, 0.1, 0.12],
    },
  },

  swing: {
    hipsY: 1.0,
    r: {
      spine: [0.08, 0, 0],
      chest: [0.02, 0, 0],
      head: [-0.35, 0, 0],
      shoulderR: [-2.95, 0, -0.1],
      elbowR: [-0.12, 0, 0],
      shoulderL: [-0.55, 0, 1.15],
      elbowL: [-0.75, 0, 0],
      wristL: [0, 0, -0.3],
      hipL: [-1.15, 0, 0.12],
      kneeL: [1.7, 0, 0],
      ankleL: [0.45, 0, 0],
      hipR: [-0.25, 0, -0.06],
      kneeR: [0.95, 0, 0],
      ankleR: [0.55, 0, 0],
    },
  },
  soar: {
    hipsY: 1.0,
    r: {
      spine: [0.12, 0, 0],
      chest: [0.06, 0, 0],
      head: [-0.45, 0, 0],
      shoulderR: [-0.3, 0, -0.95],
      elbowR: [-0.75, 0, 0],
      wristR: [0, 0, 0.2],
      shoulderL: [-0.6, 0, 1.0],
      elbowL: [-0.55, 0, 0],
      wristL: [0, 0, -0.2],
      hipL: [-0.65, 0, 0.12],
      kneeL: [1.35, 0, 0],
      ankleL: [0.5, 0, 0],
      hipR: [0.15, 0, -0.06],
      kneeR: [0.55, 0, 0],
      ankleR: [0.6, 0, 0],
    },
  },

  tuck: {
    hipsY: 1.0,
    r: {
      spine: [0.6, 0, 0],
      chest: [0.45, 0, 0],
      head: [0.45, 0, 0],
      shoulderL: [-0.95, 0, 0.3],
      elbowL: [-1.55, 0, 0],
      shoulderR: [-0.95, 0, -0.3],
      elbowR: [-1.55, 0, 0],
      hipL: [-2.15, 0, 0.14],
      kneeL: [2.4, 0, 0],
      ankleL: [0.35, 0, 0],
      hipR: [-2.15, 0, -0.14],
      kneeR: [2.4, 0, 0],
      ankleR: [0.35, 0, 0],
    },
  },
  land: {
    hipsY: 1.0,
    r: {
      spine: [0.22, 0, 0],
      chest: [0.08, 0, 0],
      head: [-0.35, 0, 0],
      shoulderL: [-0.55, 0, 1.15],
      elbowL: [-0.85, 0, 0],
      wristL: [0, 0, -0.2],
      shoulderR: [-0.75, 0, -0.9],
      elbowR: [-0.7, 0, 0],
      wristR: [0, 0, 0.2],
      hipL: [-0.75, 0, 0.16],
      kneeL: [1.05, 0, 0],
      ankleL: [0.2, 0, 0],
      hipR: [-0.3, 0, -0.16],
      kneeR: [0.75, 0, 0],
      ankleR: [0.25, 0, 0],
    },
  },

  crouch: {
    hipsY: 0.4,
    r: {
      hips: [0.05, 0, 0],
      spine: [0.6, 0, 0],
      chest: [0.4, 0, 0],
      head: [-0.95, 0, 0],
      shoulderR: [-1.25, 0, -0.08],
      elbowR: [-0.05, 0, 0],
      wristR: [0.25, 0, 0],
      shoulderL: [0.95, 0, 0.7],
      elbowL: [-0.2, 0, 0],
      wristL: [0, 0, -0.25],
      hipL: [-1.75, 0, 0.22],
      kneeL: [2.1, 0, 0],
      ankleL: [-0.35, 0, -0.1],
      hipR: [0.75, 0, -0.1],
      kneeR: [0.82, 0, 0],
      ankleR: [0.6, 0, 0],
    },
  },

  perch: {
    hipsY: 0.42,
    r: {
      hips: [0.1, 0, 0],
      spine: [0.5, 0, 0],
      chest: [0.32, 0, 0],
      head: [-0.85, 0, 0],
      shoulderL: [-1.0, 0, 0.22],
      elbowL: [-0.25, 0, 0],
      shoulderR: [-1.0, 0, -0.22],
      elbowR: [-0.25, 0, 0],
      hipL: [-1.8, 0, 0.5],
      kneeL: [2.3, 0, 0],
      ankleL: [-0.45, 0, -0.2],
      hipR: [-1.8, 0, -0.5],
      kneeR: [2.3, 0, 0],
      ankleR: [-0.45, 0, 0.2],
    },
  },
}

/** Right-arm overlay for the friendly wave. */
export const WAVE_ARM: Partial<Record<Joint, Euler3>> = {
  shoulderR: [-0.3, 0, -1.25],
  elbowR: [0, 0, -1.65],
  wristR: [0, 0, 0],
}
