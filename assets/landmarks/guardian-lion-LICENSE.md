# Chinatown Lion Statue — reusable asset provenance

- Title: **Chinatown Lion Statue**
- Author: **vmccurley** (https://sketchfab.com/vmccurley)
- Original model: https://sketchfab.com/3d-models/chinatown-lion-statue-249b684b29234e26b1a09038bcf1023c
- Original model UID: `249b684b29234e26b1a09038bcf1023c`
- Archive download: https://zenodo.org/records/10335910
- Original archive GLB: https://zenodo.org/api/records/10335910/files/249b684b29234e26b1a09038bcf1023c.glb/content
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- License link: https://creativecommons.org/licenses/by/4.0/
- License legal text: https://creativecommons.org/licenses/by/4.0/legalcode

## Verification

Both Zenodo record metadata (`record-10335910.json`) and the original Sketchfab public API (`vancouver-sketchfab-metadata.json`) identify the author and CC BY 4.0 license. The Sketchfab API license requirements explicitly state “Author must be credited. Commercial use is allowed.”

The author's description identifies a photogrammetry capture of a Chinese stone guardian lion outside the Dr. Sun Yat-Sen Classical Chinese Garden in Vancouver’s Chinatown. This is a scan of a real carved statue, not a procedure-generated mascot. It is not a Beijing-specific site survey.

## Delivered derivative

- `guardian-lion-web.glb`: normalized/optimized derivative for the Beijing city scene.
- Operations: combined mesh chunks, applied source transforms, normalized total height to one unit and bottom to zero, centered in X/Z, welded duplicate seam vertices, decimated to 100,000 triangles, smooth vertex shading, limited embedded texture resolution to 2048 pixels, exported JPEG textures at quality 90, set surface roughness to 0.9.
- No external decoder is required.
- Full original stone plinth is retained. It should replace the old lion and old primitive pedestal together.
- Axis: glTF +Y up; front toward +Z.
- Approximate total bounds: X ±0.16716, Y 0..1.00003, Z ±0.23469.
- Mesh: 100,000 triangles, 50,287 vertices.
- Size: 4,020,712 bytes.

## Suggested attribution for the website

“Chinatown Lion Statue” by vmccurley, licensed under CC BY 4.0. Source: Sketchfab / Zenodo. Modified for web use: scale normalization, mesh simplification and texture optimization.

Link the title to the original model and “CC BY 4.0” to the license. A served credits page or asset credits file linked from the website is a reasonable place to retain this attribution. Do not imply endorsement by the author.

## Actual visual inspection

Original highest-resolution preview saved as `10335910-preview.jpg` and inspected before optimization. Optimized mesh was rendered in Blender at four cardinal directions (`web-angle0.png`, `web-angle90.png`, `web-angle180.png`, `web-angle270.png`) and each rendered image inspected. The face has a connected carved muzzle, eyebrows, open mouth, curled mane, muscular chest, ball and decorated plinth. The optimized front direction is confirmed from `web-angle0.png` (Blender camera at -Y, mapping to +Z front in glTF).

## Rejected alternatives

- Forbidden City scan (Zenodo 21671290): downloadable and visually relevant, but license is CC BY-NC-SA 4.0, so excluded for a reusable potentially commercial website.
- Moult Chinese lion scan: CC BY-SA 4.0 but low-quality worn scan and incomplete ground capture, not selected.
- rvscanners porcelain lion scan: CC BY 4.0, high-quality scan but depicts a porcelain figurine rather than stone; original retrieved as fallback, not selected.
