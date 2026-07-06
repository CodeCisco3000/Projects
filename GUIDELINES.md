# Room Quality Guidelines

## Overall Goal

Build a modern, realistic, AAA-quality interactive room that showcases the portfolio.
Prioritize realism, immersion, and high visual fidelity over simplicity.

## Visual Quality

### Rendering

- Always assume desktop-first.
- Use physically based rendering (PBR).
- Use realistic lighting and materials.
- Use HDRI environment maps whenever possible.
- Use ACES Filmic tone mapping.
- Enable color management.
- Use sRGB textures.
- Prefer soft realistic shadows.
- Never use flat colors if a realistic material exists.

### Models

- Prefer high-poly models.
- Preserve geometry detail.
- Avoid low-poly or stylized assets.
- Use bevels on hard edges.
- Add realistic imperfections.
- Never simplify geometry unless specifically asked.

### Materials

Every object should use realistic PBR materials.
Include:

- Albedo
- Roughness
- Metalness
- Normal maps
- Ambient Occlusion
- Height/Displacement when appropriate

Avoid placeholder materials.

### Textures

Use:

- 2K minimum
- 4K for hero assets
- Tile seamlessly
- Maintain consistent texel density

Avoid blurry textures.

### Lighting

Lighting should feel cinematic.
Use:

- HDRI
- Directional sunlight
- Fill lighting
- Practical lights (lamps, LEDs, monitors)
- Contact shadows
- Ambient bounce

Avoid:

- Flat lighting
- Pure white lighting
- Overexposure

### Realism

Every object should have:

- Proper scale
- Correct proportions
- Realistic spacing
- Accurate materials
- Small imperfections

Examples:

- Slight edge wear
- Fingerprints on glossy surfaces
- Small scratches
- Dust in corners
- Slight roughness variation

Nothing should look computer-generated.

## Scene Composition

The room should feel lived in.
Include believable details like:

- Books
- Plants
- Papers
- Keyboard
- Mouse
- Coffee mug
- Backpack
- Cables
- Monitor accessories

Everything should have a purpose.

## Animation

Animations should be subtle.
Examples:

- Floating dust particles
- Monitor glow
- Slight curtain movement
- Ceiling fan rotation
- Clock movement
- Screen reflections
- Mouse hover effects

Avoid excessive animation.

## Camera

Use cinematic camera movement.
Requirements:

- Smooth interpolation
- Slight inertia
- Gentle easing
- Comfortable FOV (45-60 degrees)
- No sudden movements

## Performance

Optimize intelligently.
Allowed:

- Texture compression
- Instancing
- Frustum culling
- LOD for distant objects
- Lazy loading
- GLTF optimization

Do NOT reduce visible quality.
Visual quality always takes priority.

## Code Quality

Code should be:

- Modular
- Reusable
- TypeScript-first
- Well documented
- Easy to extend

Organize by:

```
components/
models/
materials/
lighting/
animations/
hooks/
utils/
config/
```

Avoid large monolithic files.

## React Three Fiber

Use best practices.
Prefer:

- Suspense
- Drei helpers
- useGLTF
- useTexture
- useAnimations
- Environment
- AccumulativeShadows
- ContactShadows

Avoid unnecessary rerenders.

## Asset Loading

All assets should:

- Load asynchronously
- Display loading states
- Cache properly
- Be compressed
- Use Draco or Meshopt when possible

## Interactions

Interactions should feel premium.
Examples:

- Hover effects
- Cursor changes
- Smooth transitions
- Camera focus
- Interactive objects
- Portfolio screens
- Clickable devices

No abrupt changes.

## UI Design

UI should be minimal.
Use:

- Glassmorphism
- Soft blur
- Rounded corners
- Subtle shadows
- Elegant typography
- Smooth fades

Avoid flashy colors.

## Color Palette

Use a cohesive palette.
Examples:

- Warm wood
- Matte black
- Brushed aluminum
- White walls
- Soft ambient lighting
- Accent LEDs

No oversaturated colors.

## Audio

Optional but encouraged.
Include subtle:

- Room ambience
- Keyboard clicks
- Light hum
- Computer fan
- Rain outside
- Footsteps

Keep volume low.

## Portfolio Integration

Projects should exist naturally inside the room.
Examples:

- Monitor displaying project websites
- Whiteboard with project sketches
- Shelf containing awards
- Framed certificates
- Tablet showing UI work
- Books representing skills

Avoid floating menus.

## Responsiveness

Support:

- Desktop (highest quality)
- Laptop
- Tablet

Mobile may reduce effects but preserve overall appearance.

## Accessibility

Include:

- Keyboard navigation
- High contrast where needed
- Reduced motion option
- Focus indicators

## Development Philosophy

Before implementing any feature, ask:

- Does this improve realism?
- Does this improve immersion?
- Would this exist in a real room?
- Does it feel premium?
- Is there a more polished implementation?

If the answer is no, reconsider the approach.

## General Rules

- Never use placeholder assets in production.
- Never leave unfinished sections.
- Maintain a consistent level of detail across the scene.
- Favor realistic proportions and believable object placement.
- Prioritize quality over quantity.
- Every addition should contribute to the atmosphere or functionality of the room.
- Keep visual style consistent throughout the project.
- Use physically accurate lighting, materials, and shadows whenever possible.

## Engineering Rules

- Target performance: maintain 60+ FPS at 1440p on a mid-range GPU (e.g., RTX 3060/RX 6700 XT).
  Profile before adding new effects.
- Post-processing: use effects sparingly (Bloom, SSAO, Depth of Field, Motion Blur) and only when they enhance realism.
  Avoid over-processing the scene.
- Asset budget: optimize all imported models by removing hidden geometry, merging static meshes where appropriate, and using compressed textures and meshes.
  High quality does not mean unnecessarily heavy assets.
- Lighting workflow: bake lighting where practical for static geometry, reserving real-time shadows and dynamic lights for interactive elements.
- Maintainability: expose tweakable values (lighting intensity, exposure, animation speeds, camera positions, colors) in configuration files rather than hardcoding them.
- Documentation: every significant component should include a brief comment explaining its purpose, dependencies, and any performance considerations.
- Consistency: before introducing a new model, material, or interaction, ensure it matches the existing artistic style, lighting model, and scale of the room.
