/**
 * Opaline Wave Shaders
 * Silky, pastel, oil-on-water swirls with iridescent rims
 */

// Shared noise and utility functions
export const shaderUtils = `
// Hash for noise
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Curl noise for flow field
vec2 curlNoise(vec2 p) {
  float e = 0.1;
  float n1 = noise(p + vec2(e, 0.0));
  float n2 = noise(p + vec2(0.0, e));
  float n3 = noise(p - vec2(e, 0.0));
  float n4 = noise(p - vec2(0.0, e));
  
  return vec2(n2 - n4, n3 - n1) / (2.0 * e);
}

// Domain warping
vec2 domainWarp(vec2 p, float strength) {
  vec2 q = vec2(
    noise(p + vec2(0.0, 0.0)),
    noise(p + vec2(5.2, 1.3))
  );
  return p + strength * q;
}

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Soft light blend
vec3 softlight(vec3 base, vec3 blend) {
  vec3 result;
  for(int i = 0; i < 3; i++) {
    if(blend[i] < 0.5) {
      result[i] = 2.0 * base[i] * blend[i] + base[i] * base[i] * (1.0 - 2.0 * blend[i]);
    } else {
      result[i] = 2.0 * base[i] * (1.0 - blend[i]) + sqrt(base[i]) * (2.0 * blend[i] - 1.0);
    }
  }
  return result;
}

// Swirl vortex function
float swirl(vec2 uv, vec2 center, float radius, float strength) {
  vec2 diff = uv - center;
  float dist = length(diff);
  float falloff = smoothstep(radius, 0.0, dist);
  return strength * falloff;
}
`;

// Advection pass - updates thickness field
export const advectVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const advectFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform float uTime;
uniform float uDeltaTime;
uniform float uWaveScale;
uniform float uFlowStrength;
uniform float uSwirlStrength;
uniform float uDecay;
uniform float uHighFreq;
uniform vec2 uResolution;

// Vortices (up to 6)
uniform vec2 uVortex1;
uniform float uVortex1Strength;
uniform vec2 uVortex2;
uniform float uVortex2Strength;
uniform vec2 uVortex3;
uniform float uVortex3Strength;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 pixelSize = 1.0 / uResolution;
  
  // Domain-warped curl noise flow
  vec2 warpedUV = domainWarp(uv * uWaveScale, 0.3);
  vec2 flow = curlNoise(warpedUV + uTime * 0.05 * (1.0 + 0.6 * uHighFreq));
  
  // Add swirl vortices
  if(uVortex1Strength > 0.0) {
    vec2 diff1 = uv - uVortex1;
    float angle1 = swirl(uv, uVortex1, 0.3, uVortex1Strength);
    flow += vec2(-diff1.y, diff1.x) * angle1;
  }
  if(uVortex2Strength > 0.0) {
    vec2 diff2 = uv - uVortex2;
    float angle2 = swirl(uv, uVortex2, 0.3, uVortex2Strength);
    flow += vec2(-diff2.y, diff2.x) * angle2;
  }
  if(uVortex3Strength > 0.0) {
    vec2 diff3 = uv - uVortex3;
    float angle3 = swirl(uv, uVortex3, 0.3, uVortex3Strength);
    flow += vec2(-diff3.y, diff3.x) * angle3;
  }
  
  // Advect backwards
  vec2 backUV = uv - uDeltaTime * flow * uFlowStrength;
  backUV = fract(backUV); // Wrap
  
  // Sample previous thickness
  float thick = texture2D(uThickness, backUV).r;
  
  // Light diffusion (3x3 blur)
  float blur = 0.0;
  for(float y = -1.0; y <= 1.0; y++) {
    for(float x = -1.0; x <= 1.0; x++) {
      vec2 offset = vec2(x, y) * pixelSize;
      blur += texture2D(uThickness, uv + offset).r;
    }
  }
  blur /= 9.0;
  
  // Mix original with blur for creamy diffusion
  thick = mix(thick, blur, 0.06);
  
  // Decay
  thick *= 1.0 - (1.0 - uDecay) * uDeltaTime * 2.0;
  
  gl_FragColor = vec4(thick, 0.0, 0.0, 1.0);
}
`;

// Render pass - converts thickness to color
export const renderVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const renderFragmentShader = `
${shaderUtils}

uniform sampler2D uThickness;
uniform float uTime;
uniform float uTransparency;
uniform float uRMS;
uniform float uHighFreq;
uniform vec2 uResolution;

// Color mode: 0=User, 1=Music, 2=Rainbow
uniform int uColorMode;

// User mode
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform float uGradientBias;

// Music mode
uniform vec3 uLowColor;
uniform vec3 uMidColor;
uniform vec3 uHighColor;
uniform float uLowBand;
uniform float uMidBand;
uniform float uHighBand;

// Rainbow mode
uniform float uColorSpread;
uniform float uShimmerSpeed;
uniform float uWhiteMix;

// Global tint
uniform vec3 uBgTint;
uniform vec3 uAssetTint;

varying vec2 vUv;

vec3 colorUser(float x) {
  float t = smoothstep(0.0, 1.0, x + (uGradientBias - 0.5) * 0.6);
  return mix(uPrimaryColor, uSecondaryColor, t);
}

vec3 colorMusic(float x) {
  vec3 w = normalize(vec3(uLowBand, uMidBand, uHighBand) + 1e-4);
  return uLowColor * w.x + uMidColor * w.y + uHighColor * w.z;
}

vec3 colorRainbow(float x, float time) {
  float hue = fract(x * uColorSpread + time * uShimmerSpeed);
  vec3 irid = hsv2rgb(vec3(hue, 0.65 + 0.2 * uHighFreq, 0.85 + 0.1 * uRMS));
  return mix(vec3(1.0), irid, 1.0 - uWhiteMix);
}

void main() {
  vec2 uv = vUv;
  vec2 pixelSize = 1.0 / uResolution;
  
  // Sample thickness
  float th = texture2D(uThickness, uv).r;
  
  // Select color pipeline
  vec3 base;
  if(uColorMode == 0) {
    base = colorUser(th);
  } else if(uColorMode == 1) {
    base = colorMusic(th);
  } else {
    base = colorRainbow(th, uTime);
  }
  
  // Pearlescent rim using gradient
  float dth_dx = texture2D(uThickness, uv + vec2(pixelSize.x, 0.0)).r - texture2D(uThickness, uv - vec2(pixelSize.x, 0.0)).r;
  float dth_dy = texture2D(uThickness, uv + vec2(0.0, pixelSize.y)).r - texture2D(uThickness, uv - vec2(0.0, pixelSize.y)).r;
  float gradient = length(vec2(dth_dx, dth_dy)) / (2.0 * length(pixelSize));
  float rim = smoothstep(0.0, 1.0, gradient * 3.0);
  base += rim * 0.05;
  
  // Apply global tint (softlight blend)
  vec3 tinted = softlight(base, mix(uBgTint, uAssetTint, 0.5));
  tinted = mix(base, tinted, 0.15);
  
  // Add subtle grain
  float grainNoise = noise(uv * 500.0 + uTime);
  tinted += (grainNoise - 0.5) * 0.02;
  
  gl_FragColor = vec4(tinted, uTransparency * smoothstep(0.0, 0.1, th));
}
`;
