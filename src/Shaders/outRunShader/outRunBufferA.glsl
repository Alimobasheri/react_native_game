#version 300 es

// Buffer A - Particle Data Management
const int NUM_PARTICLES = 100;

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

struct Particle {
    vec2 position;
    float velocityY;
    float life;
};

Particle initializeParticle(float index) {
    Particle p;
    p.position = vec2(rand(index), 1.0); // Random x position, starting at the top
    p.velocityY = -0.01 - rand(index + 1.0) * 0.02; // Random downward velocity
    p.life = 1.0; // Full life initially
    return p;
}

Particle updateParticle(Particle p, float deltaTime) {
    p.position.y += p.velocityY * deltaTime;
    p.life -= deltaTime * 0.1; // Decrease life over time

    // Reset particle if it goes off screen or runs out of life
    if (p.position.y < 0.0 || p.life <= 0.0) {
        p = initializeParticle(rand(p.position.x * 100.0 + p.position.y * 100.0));
    }

    return p;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float index = fragCoord.x;
    Particle p;

    if (iFrame == 0) {
        // Initialize particles
        p = initializeParticle(index);
    } else {
        // Load particle data from previous frame
        vec4 data = texelFetch(iChannel0, ivec2(int(index), 0.), 0.);
        p.position = data.xy;
        p.velocityY = data.z;
        p.life = data.w;

        // Update particle
        p = updateParticle(p, iTimeDelta);
    }

    // Store updated particle data
    fragColor = vec4(p.position, p.velocityY, p.life);
}
