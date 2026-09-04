import { CircleGeometry, Mesh, MeshBasicMaterial } from 'three';

/**
 * A soft dark disc under a character.
 *
 * The game runs with no real-time shadow maps (see `renderer.ts`), so this is
 * what grounds moving characters. It is one triangle fan with a flat colour,
 * and it is the difference between a creature standing on the meadow and one
 * hovering half a metre above it.
 */
let sharedGeometry: CircleGeometry | null = null;
let sharedMaterial: MeshBasicMaterial | null = null;

export function createBlobShadow(radius: number): Mesh {
  if (!sharedGeometry) {
    sharedGeometry = new CircleGeometry(1, 14);
    sharedGeometry.rotateX(-Math.PI / 2);
  }
  if (!sharedMaterial) {
    sharedMaterial = new MeshBasicMaterial({
      color: 0x2f4438,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });
  }
  const shadow = new Mesh(sharedGeometry, sharedMaterial);
  shadow.scale.setScalar(radius);
  shadow.position.y = 0.035;
  shadow.renderOrder = -1;
  return shadow;
}

export function disposeBlobShadows(): void {
  sharedGeometry?.dispose();
  sharedMaterial?.dispose();
  sharedGeometry = null;
  sharedMaterial = null;
}
