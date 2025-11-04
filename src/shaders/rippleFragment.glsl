// Screen-space hand ripple fragment shader
// Multiple ripple support with pooling

uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform int maxRipples;
uniform vec2 rippleCenters[8];
uniform float rippleStarts[8];
uniform float rippleAmps[8];
uniform float expansionSpeed;
uniform float decay;
uniform float maxRadius;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 displacement = vec2(0.0);
    
    // Accumulate displacement from all active ripples
    for (int i = 0; i < 8; i++) {
        if (i >= maxRipples) break;
        
        float rippleAge = time - rippleStarts[i];
        if (rippleAge < 0.0 || rippleAge > 2.5) continue; // Skip inactive or expired ripples
        
        vec2 center = rippleCenters[i];
        float dist = distance(uv, center);
        
        // Ripple expands outward
        float rippleRadius = rippleAge * expansionSpeed;
        if (rippleRadius > maxRadius) continue;
        
        // Ring width and amplitude decay over time
        float decayFactor = exp(-decay * rippleAge);
        float amplitude = rippleAmps[i] * decayFactor;
        
        // Create ring effect with smooth falloff
        float ringWidth = 0.05;
        float ringDist = abs(dist - rippleRadius);
        float ring = smoothstep(ringWidth, 0.0, ringDist);
        
        // Compute displacement direction (radial from center)
        vec2 dir = normalize(uv - center);
        if (length(uv - center) < 0.001) dir = vec2(1.0, 0.0); // Avoid division by zero
        
        // Add displacement
        displacement += dir * ring * amplitude * 0.02;
    }
    
    // Sample texture with displacement
    vec2 sampledUV = uv + displacement;
    vec4 color = texture2D(tDiffuse, sampledUV);
    
    gl_FragColor = color;
}
