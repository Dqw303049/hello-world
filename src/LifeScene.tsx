import { memo, useEffect, useMemo, useRef } from "react";
import type { ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, MapControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { TownScenery, Box } from "./TownScene";
import { LOCATION_SPOTS, groundY, spot } from "./world";
import type { NpcId } from "./world";
import type { LocationId } from "./game";
import type { Simulation, Snapshot } from "./simulation";

export interface CameraCommand {
  type: "in" | "out" | "follow";
  nonce: number;
}
interface Props {
  simulation: Simulation;
  snapshot: Snapshot;
  command: CameraCommand | null;
  onReady: () => void;
  onUnavailable: () => void;
  onInteract: (id: string) => void;
}
const StaticTown = memo(function StaticTown({
  simulation,
  renovated,
}: {
  simulation: Simulation;
  renovated: boolean;
}) {
  const select = useMemo(
    () => (id: LocationId) => {
      simulation.navigate(LOCATION_SPOTS[id]);
    },
    [simulation],
  );
  return (
    <TownScenery selected={null} onSelect={select} renovated={renovated} />
  );
});

function Avatar({ simulation, npc }: { simulation: Simulation; npc?: NpcId }) {
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null),
    rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null),
    rightLeg = useRef<THREE.Group>(null);
  const phase = useRef(0),
    facing = useRef(0);
  const isApo = npc === "apo";
  const shirt = npc ? (isApo ? "#b49766" : "#788469") : "#5b7c67";
  useFrame((_, delta) => {
    if (!root.current || !body.current) return;
    const actor = npc ? simulation.actors.find((a) => a.id === npc)! : null;
    const busy = !npc ? simulation.busy : null;
    const moving = actor
      ? actor.moving && !simulation.paused && !simulation.blocked
      : simulation.moving;
    const p = actor ? actor.point : simulation.state.position;
    const sleeping = busy?.id === "rest";
    const targetYaw = sleeping ? 0 : actor ? actor.yaw : simulation.yaw;
    facing.current +=
      Math.atan2(
        Math.sin(targetYaw - facing.current),
        Math.cos(targetYaw - facing.current),
      ) * Math.min(1, delta * 12);
    phase.current += delta * (moving ? 9 : 3);
    const t = phase.current;
    const seated =
      !!busy && ["noodles", "shop", "walk", "camp"].includes(busy.id);
    root.current.position.set(
      sleeping ? -3.1 : p.x,
      groundY(simulation.state.scene, p) +
        (sleeping ? 0.65 : seated ? -0.12 : 0),
      sleeping ? -1.9 : p.z,
    );
    root.current.rotation.y = facing.current;
    body.current.rotation.x = sleeping ? Math.PI / 2 : 0;
    body.current.position.y = moving ? Math.abs(Math.sin(t)) * 0.035 : 0;
    const walking = moving ? Math.sin(t) * 0.65 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = seated ? -1.3 : walking;
    if (rightLeg.current)
      rightLeg.current.rotation.x = seated ? -1.3 : -walking;
    let l = -walking * 0.65,
      r = walking * 0.65;
    if (actor && !moving && !simulation.paused && !simulation.blocked) {
      if (actor.label.includes("打磨")) r = -0.65 + Math.sin(t * 2.5) * 0.45;
      else if (actor.label.includes("备餐")) {
        l = -0.65;
        r = -0.7 + Math.sin(t * 2) * 0.2;
      }
    }
    if (busy) {
      if (busy.id === "work" || busy.id === "renovate") {
        l = -0.6;
        r = -0.8 + Math.sin(t * 3) * 0.65;
      } else if (
        busy.id === "cook" ||
        busy.id === "porridge" ||
        busy.id === "wash" ||
        busy.id === "tea"
      ) {
        l = -0.8 + Math.sin(t * 2) * 0.18;
        r = -0.9 - Math.sin(t * 2) * 0.18;
      } else if (
        busy.id === "noodles" ||
        busy.id === "shop" ||
        busy.id === "camp"
      ) {
        l = -1;
        r = -1.3 + Math.sin(t * 1.8) * 0.3;
      } else if (busy.id.startsWith("chat")) {
        r = -0.5 + Math.sin(t * 2) * 0.25;
      }
    }
    if (leftArm.current) leftArm.current.rotation.x = l;
    if (rightArm.current) rightArm.current.rotation.x = r;
  });
  const busy = !npc ? simulation.busy : null;
  return (
    <group ref={root}>
      {!npc && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[0.34, 0.42, 32]} />
          <meshBasicMaterial
            color="#f6f4cf"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      )}
      <group ref={body}>
        <mesh position={[0, 0.87, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.32, 4, 8]} />
          <meshStandardMaterial color={shirt} roughness={1} />
        </mesh>
        {npc && (
          <Box
            position={[0, 0.78, 0.19]}
            size={[0.34, 0.46, 0.07]}
            color={isApo ? "#e3d5b0" : "#b39b75"}
          />
        )}
        {!npc && (
          <>
            <Box
              position={[0, 0.91, 0.21]}
              size={[0.045, 0.35, 0.025]}
              color="#d8ddc3"
            />
            <Box
              position={[-0.12, 0.84, 0.21]}
              size={[0.1, 0.08, 0.035]}
              color="#75907b"
            />
          </>
        )}
        <mesh position={[0, 1.29, 0]} castShadow>
          <sphereGeometry args={[0.23, 12, 10]} />
          <meshStandardMaterial color="#d6b08e" roughness={1} />
        </mesh>
        <mesh position={[0, 1.34, -0.015]} castShadow>
          <sphereGeometry
            args={[0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial color={isApo ? "#716e61" : "#514b3e"} />
        </mesh>
        {isApo && (
          <mesh position={[0, 1.36, -0.23]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color="#716e61" />
          </mesh>
        )}
        {!isApo && (
          <Box
            position={[0, 1.4, 0.06]}
            size={[0.42, 0.06, 0.38]}
            color={npc ? "#8b9471" : "#d9d4b4"}
          />
        )}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 1.29, 0.212]}>
            <sphereGeometry args={[0.022, 6, 4]} />
            <meshBasicMaterial color="#423d32" />
          </mesh>
        ))}
        <Box position={[0, 1.12, 0]} size={[0.1, 0.12, 0.1]} color="#cfaa83" />
        {[-1, 1].map((side) => (
          <group
            ref={side < 0 ? leftArm : rightArm}
            key={side}
            position={[side * 0.27, 1.01, 0]}
          >
            <mesh position={[0, -0.17, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.23, 3, 6]} />
              <meshStandardMaterial color={shirt} />
            </mesh>
            <mesh position={[0, -0.37, 0]}>
              <sphereGeometry args={[0.075, 8, 6]} />
              <meshStandardMaterial color="#d6b08e" />
            </mesh>
            {side > 0 && (busy?.id === "work" || busy?.id === "renovate") && (
              <group position={[0, -0.4, 0.06]}>
                <Box
                  position={[0, 0, 0.13]}
                  size={[0.055, 0.055, 0.35]}
                  color="#a18355"
                />
                <Box
                  position={[0, 0, 0.3]}
                  size={[0.25, 0.12, 0.1]}
                  color="#757c70"
                />
              </group>
            )}
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group
            key={side}
            ref={side < 0 ? leftLeg : rightLeg}
            position={[side * 0.105, 0.6, 0]}
          >
            <mesh position={[0, -0.23, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.3, 3, 6]} />
              <meshStandardMaterial color={npc ? "#69725e" : "#d5d1b5"} />
            </mesh>
            <Box
              position={[0, -0.49, 0.04]}
              size={[0.17, 0.11, 0.27]}
              color="#5c6250"
            />
          </group>
        ))}
        {busy && ["noodles", "shop", "camp"].includes(busy.id) && (
          <mesh position={[0, 0.98, 0.35]}>
            <sphereGeometry
              args={[0.19, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
            />
            <meshStandardMaterial color="#eeead7" side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      {!npc && !busy && (
        <mesh position={[0, 1.94, 0]} scale={[0.7, 1.3, 0.7]}>
          <octahedronGeometry args={[0.15]} />
          <meshStandardMaterial
            color="#8fac78"
            emissive="#7e9a63"
            emissiveIntensity={0.15}
          />
        </mesh>
      )}
      {!npc && !busy && (
        <Html
          position={[0, 2.25, 0]}
          center
          zIndexRange={[16, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="player-name-tag">林间客 · 我</span>
        </Html>
      )}
      {busy?.id === "rest" && (
        <Html center position={[0, 1.5, 0]} zIndexRange={[18, 0]}>
          <span className="sleep-bubble">z z Z</span>
        </Html>
      )}
    </group>
  );
}

function CharacterVisibility({
  simulation,
  sceneId,
}: {
  simulation: Simulation;
  sceneId: string;
}) {
  const { scene, camera } = useThree();
  const groups = useRef<THREE.Object3D[]>([]);
  const faded = useRef(
    new Map<
      THREE.Material,
      { opacity: number; transparent: boolean; depthWrite: boolean }
    >(),
  );
  const timer = useRef(0);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const restore = (material: THREE.Material) => {
    const saved = faded.current.get(material);
    if (saved) {
      Object.assign(material, saved);
      material.needsUpdate = true;
      faded.current.delete(material);
    }
  };
  useEffect(() => {
    groups.current = [];
    scene.traverse((object) => {
      if (object.userData.occluder) groups.current.push(object);
    });
    return () => {
      for (const material of [...faded.current.keys()]) restore(material);
    };
  }, [scene, sceneId]);
  useFrame((_, dt) => {
    timer.current += dt;
    if (timer.current < 0.14) return;
    timer.current = 0;
    const p = simulation.state.position;
    const target = new THREE.Vector3(
      p.x,
      groundY(simulation.state.scene, p) + 0.85,
      p.z,
    );
    const direction = target.clone().sub(camera.position);
    ray.set(camera.position, direction.clone().normalize());
    ray.far = direction.length() - 0.4;
    const hiding = new Set<THREE.Object3D>();
    for (const hit of ray.intersectObjects(groups.current, true)) {
      let parent: THREE.Object3D | null = hit.object;
      while (parent) {
        if (parent.userData.occluder) {
          hiding.add(parent);
          break;
        }
        parent = parent.parent;
      }
    }
    const materials = new Set<THREE.Material>();
    hiding.forEach((group) =>
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const list = Array.isArray(object.material)
            ? object.material
            : [object.material];
          list.forEach((material) => materials.add(material));
        }
      }),
    );
    for (const material of [...faded.current.keys()])
      if (!materials.has(material)) restore(material);
    materials.forEach((material) => {
      if (!faded.current.has(material)) {
        faded.current.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
        material.transparent = true;
        material.opacity = 0.24;
        material.depthWrite = false;
        material.needsUpdate = true;
      }
    });
  });
  return null;
}

function Room({ simulation }: { simulation: Simulation }) {
  const cooking =
      simulation.busy?.id === "cook" || simulation.busy?.id === "porridge",
    washing = simulation.busy?.id === "wash";
  return (
    <group>
      <RoundedBox args={[10.4, 0.3, 8.5]} radius={0.12} receiveShadow>
        <meshStandardMaterial color="#bda685" />
      </RoundedBox>
      {Array.from({ length: 16 }, (_, i) => (
        <Box
          key={i}
          position={[-4.85 + i * 0.65, 0.16, 0]}
          size={[0.018, 0.01, 8]}
          color="#a99475"
        />
      ))}
      <Box
        position={[0, 1.82, -4.1]}
        size={[10.3, 3.3, 0.15]}
        color="#e9dfc7"
      />
      <Box position={[-5.08, 1.6, 0]} size={[0.15, 2.9, 8.2]} color="#e4dbc2" />
      <Box
        position={[5.08, 0.55, 0]}
        size={[0.15, 0.85, 8.2]}
        color="#ded4b9"
      />
      <Box
        position={[-3.2, 0.5, 4.1]}
        size={[3.7, 0.7, 0.15]}
        color="#ded4b9"
      />
      <Box position={[3.2, 0.5, 4.1]} size={[3.7, 0.7, 0.15]} color="#ded4b9" />
      <Box
        position={[0, 0.18, 3.35]}
        size={[1.7, 0.025, 0.8]}
        color="#91a283"
      />
      {[-2.7, 2.7].map((x) => (
        <group key={x} position={[x, 2.05, -3.99]}>
          <Box position={[0, 0, 0]} size={[1.6, 1.35, 0.08]} color="#8b8265" />
          <Box
            position={[0, 0, 0.06]}
            size={[1.4, 1.18, 0.05]}
            color="#adc7b4"
          />
          <Box
            position={[0, 0, 0.1]}
            size={[0.055, 1.25, 0.03]}
            color="#dfdcc0"
          />
          <Box
            position={[0, 0, 0.1]}
            size={[1.5, 0.055, 0.03]}
            color="#dfdcc0"
          />
          <Box
            position={[-0.89, 0, 0.08]}
            size={[0.18, 1.65, 0.2]}
            color="#c3b58b"
          />
          <Box
            position={[0.89, 0, 0.08]}
            size={[0.18, 1.65, 0.2]}
            color="#c3b58b"
          />
        </group>
      ))}
      <Box
        position={[-3.1, 0.42, -1]}
        size={[2.3, 0.45, 3.1]}
        color="#937b58"
      />
      <RoundedBox
        args={[2.14, 0.23, 2.85]}
        radius={0.1}
        position={[-3.1, 0.73, -1]}
        castShadow
      >
        <meshStandardMaterial color="#eee6cd" />
      </RoundedBox>
      <Box
        position={[-3.1, 0.88, -1.45]}
        size={[2.15, 0.12, 1.85]}
        color="#9eac88"
      />
      <Box
        position={[-3.1, 0.97, -1.9]}
        size={[2.16, 0.035, 0.12]}
        color="#c1c8a7"
      />
      <RoundedBox
        args={[1.3, 0.18, 0.65]}
        radius={0.12}
        position={[-3.1, 0.93, 0.06]}
      >
        <meshStandardMaterial color="#f4ecd7" />
      </RoundedBox>
      <Box
        position={[-3.1, 0.8, -2.6]}
        size={[2.3, 1.2, 0.12]}
        color="#967f5c"
      />
      <Box position={[2.8, 0.65, -2.5]} size={[3.1, 1, 1.1]} color="#a99775" />
      <Box
        position={[2.8, 1.18, -2.5]}
        size={[3.2, 0.12, 1.2]}
        color="#d1c7a9"
      />
      {[1.8, 2.8, 3.8].map((x) => (
        <Box
          key={x}
          position={[x, 0.7, -1.93]}
          size={[0.8, 0.7, 0.06]}
          color="#b4a17c"
        />
      ))}
      <mesh position={[2.3, 1.35, -2.5]} castShadow>
        <cylinderGeometry args={[0.35, 0.3, 0.3, 12]} />
        <meshStandardMaterial color="#5e6957" />
      </mesh>
      <mesh position={[2.3, 1.53, -2.5]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 12]} />
        <meshStandardMaterial color="#7a856e" />
      </mesh>
      {cooking &&
        [0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[2.2 + i * 0.14, 1.7 + i * 0.2, -2.5]}
            scale={[0.15, 0.28, 0.15]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial
              color="#fff9dc"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        ))}
      <Box
        position={[3.85, 0.7, 1.1]}
        size={[1.25, 1.1, 1.25]}
        color="#b4b29a"
      />
      <mesh position={[3.85, 1.29, 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.39, 0.09, 8, 20]} />
        <meshStandardMaterial color="#efebd8" />
      </mesh>
      <Box
        position={[3.85, 1.53, 0.73]}
        size={[0.06, 0.5, 0.06]}
        color="#98a9a1"
      />
      <Box
        position={[3.85, 1.75, 0.91]}
        size={[0.06, 0.06, 0.4]}
        color="#98a9a1"
      />
      {washing && (
        <mesh position={[3.85, 1.48, 1.11]}>
          <cylinderGeometry args={[0.025, 0.04, 0.5, 6]} />
          <meshStandardMaterial color="#aad7cf" transparent opacity={0.7} />
        </mesh>
      )}
      <Box
        position={[-0.1, 0.88, 0.25]}
        size={[1.45, 0.13, 1]}
        color="#b5996c"
      />
      {[-0.6, 0.4].map((x) => (
        <Box
          key={x}
          position={[x, 0.5, 0.25]}
          size={[0.1, 0.8, 0.85]}
          color="#8f7e59"
        />
      ))}
      <mesh position={[-0.1, 0.96, 0.25]}>
        <cylinderGeometry args={[0.18, 0.12, 0.15, 10]} />
        <meshStandardMaterial color="#e5dcc0" />
      </mesh>
      <Box
        position={[-4.3, 0.6, 2.3]}
        size={[0.65, 0.85, 0.65]}
        color="#a18e66"
      />
      <mesh position={[-4.3, 1.3, 2.3]}>
        <coneGeometry args={[0.35, 0.5, 8]} />
        <meshStandardMaterial
          color="#c1ab6e"
          emissive="#d5b97b"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[4.1, 0.5, -3.5]}>
        <cylinderGeometry args={[0.32, 0.22, 0.6, 8]} />
        <meshStandardMaterial color="#b98b65" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[4.1 + (i - 1) * 0.15, 1.05 + (i % 2) * 0.2, -3.5]}
          scale={[0.3, 0.6, 0.3]}
          rotation={[0, i, (i - 1) * 0.5]}
        >
          <octahedronGeometry args={[0.7]} />
          <meshStandardMaterial color="#84966b" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#dedcca" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.18, 0]}
        onClick={(e) => {
          if (e.delta < 5) {
            e.stopPropagation();
            simulation.navigatePoint({ x: e.point.x, z: e.point.z });
          }
        }}
      >
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraRig({
  simulation,
  snapshot,
  command,
  onReady,
}: Pick<Props, "simulation" | "snapshot" | "command" | "onReady">) {
  const controls = useRef<ComponentRef<typeof MapControls>>(null);
  const { camera, size, gl } = useThree();
  const previous = useRef(""),
    previousSize = useRef(0);
  const baseline =
    snapshot.state.scene === "home"
      ? Math.min(size.width / 13, size.height / 11, 85)
      : Math.min(size.width / 18, size.height / 14, 58);
  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = previousSize.current
      ? (ortho.zoom * baseline) / previousSize.current
      : baseline;
    previousSize.current = baseline;
    ortho.updateProjectionMatrix();
  }, [camera, baseline]);
  useEffect(() => {
    if (!command) return;
    const ortho = camera as THREE.OrthographicCamera;
    if (command.type === "follow") {
      simulation.overview = false;
      ortho.zoom = baseline;
    } else
      ortho.zoom = THREE.MathUtils.clamp(
        ortho.zoom * (command.type === "in" ? 1.2 : 1 / 1.2),
        15,
        105,
      );
    ortho.updateProjectionMatrix();
  }, [command, camera, simulation, baseline]);
  useEffect(() => {
    const id = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    gl.domElement.addEventListener("contextmenu", prevent);
    return () => gl.domElement.removeEventListener("contextmenu", prevent);
  }, [gl]);
  useFrame((_, dt) => {
    if (!controls.current) return;
    const state = simulation.state;
    const mode = state.scene + (simulation.overview ? ":overview" : ":follow");
    const target = new THREE.Vector3(
      simulation.overview ? 0 : state.position.x,
      state.scene === "home" ? 0.6 : 1.4,
      simulation.overview ? 0 : state.position.z,
    );
    if (previous.current !== mode) {
      controls.current.target.copy(target);
      camera.position.copy(target).add(new THREE.Vector3(11, 15, 15));
      const ortho = camera as THREE.OrthographicCamera;
      ortho.zoom = simulation.overview
        ? Math.min(size.width / 44, size.height / 31)
        : baseline;
      ortho.updateProjectionMatrix();
      controls.current.update();
      previous.current = mode;
    }
    if (!simulation.overview) {
      const change = target
        .clone()
        .sub(controls.current.target)
        .multiplyScalar(1 - Math.exp(-dt * 7));
      controls.current.target.add(change);
      camera.position.add(change);
    }
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const length = Math.hypot(direction.x, direction.z) || 1;
    simulation.forward = { x: direction.x / length, z: direction.z / length };
  });
  return (
    <MapControls
      ref={controls}
      makeDefault
      enablePan={snapshot.overview}
      enableDamping
      dampingFactor={0.12}
      minZoom={15}
      maxZoom={105}
      minPolarAngle={0.3}
      maxPolarAngle={1.15}
    />
  );
}

function LifeWorld({
  simulation,
  snapshot,
  onInteract,
}: Pick<Props, "simulation" | "snapshot" | "onInteract">) {
  const home = snapshot.state.scene === "home";
  const pathPoints = snapshot.path.map(
    (p) =>
      [p.x, groundY(snapshot.state.scene, p) + 0.06, p.z] as [
        number,
        number,
        number,
      ],
  );
  if (pathPoints.length)
    pathPoints.unshift([
      snapshot.state.position.x,
      groundY(snapshot.state.scene, snapshot.state.position) + 0.06,
      snapshot.state.position.z,
    ]);
  return (
    <>
      {home ? (
        <Room simulation={simulation} />
      ) : (
        <>
          <StaticTown
            simulation={simulation}
            renovated={snapshot.state.renovated}
          />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 1.015, 0]}
            onClick={(e) => {
              if (e.delta < 5) {
                e.stopPropagation();
                simulation.navigatePoint({ x: e.point.x, z: e.point.z });
              }
            }}
          >
            <planeGeometry args={[46, 32]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <Box
            position={[-1.1, 1.75, 9.1]}
            size={[1.25, 0.12, 0.75]}
            color="#b69c6d"
          />
          <Box
            position={[-1.1, 1.35, 9.1]}
            size={[0.16, 0.8, 0.5]}
            color="#8c7754"
          />
          <Box
            position={[-1.1, 1.35, 10.1]}
            size={[0.75, 0.45, 0.45]}
            color="#ae9467"
          />
          {snapshot.actors.map((actor) => (
            <group key={actor.id}>
              <Avatar simulation={simulation} npc={actor.id} />
              <Html
                position={[actor.point.x, 3, actor.point.z]}
                center
                zIndexRange={[18, 0]}
              >
                <button
                  className="npc-label"
                  onClick={() => simulation.navigate(actor.id)}
                  aria-label={"寻找" + actor.name}
                >
                  <span>{actor.id === "apo" ? "✿" : "⌁"}</span>
                  <strong>{actor.name}</strong>
                  <small>{actor.label}</small>
                </button>
              </Html>
            </group>
          ))}
        </>
      )}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints}
          color="#f0e5a6"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.14}
          transparent
          opacity={0.8}
        />
      )}
      <Avatar simulation={simulation} />
      {!snapshot.busy &&
        snapshot.nearby.slice(0, 1).map((target) => (
          <group key={target.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[
                target.point.x,
                groundY(snapshot.state.scene, target.point) + 0.04,
                target.point.z,
              ]}
            >
              <ringGeometry args={[0.5, 0.59, 32]} />
              <meshBasicMaterial color="#f9edb6" depthWrite={false} />
            </mesh>
            <Html
              position={[
                target.point.x,
                groundY(snapshot.state.scene, target.point) + 1,
                target.point.z,
              ]}
              center
              zIndexRange={[20, 0]}
            >
              <button
                className="world-interact"
                aria-label={"靠近互动：" + target.name}
                onClick={() => onInteract(target.id)}
              >
                <kbd>E</kbd>
                {target.name}
              </button>
            </Html>
          </group>
        ))}
      {home &&
        ["bed", "stove", "sink", "exit"].map((id) => {
          const s = spot(id)!;
          return (
            <Html
              key={id}
              position={[s.point.x, 2.5, s.point.z]}
              center
              zIndexRange={[15, 0]}
            >
              <button
                className="room-label"
                onClick={() => simulation.navigate(id)}
                aria-label={"走到" + s.name}
              >
                {s.icon === "bed"
                  ? "☾"
                  : s.icon === "stove"
                    ? "♨"
                    : s.icon === "sink"
                      ? "⌁"
                      : "↗"}
                <span>{s.name.split(" · ").pop()}</span>
              </button>
            </Html>
          );
        })}
    </>
  );
}

export default function LifeScene(props: Props) {
  const { snapshot } = props;
  const evening = Math.max(
    0,
    Math.min(1, (snapshot.state.minute - 1020) / 210),
  );
  const background = new THREE.Color("#e3e6d6")
    .lerp(new THREE.Color("#73858a"), evening)
    .getStyle();
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.4]}
      camera={{ position: [3, 16, 26], zoom: 55, near: 0.1, far: 180 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onUnavailable();
        });
      }}
    >
      <color
        attach="background"
        args={[snapshot.state.scene === "home" ? "#dedcca" : background]}
      />
      <fog attach="fog" args={[background, 45, 110]} />
      <ambientLight
        intensity={snapshot.state.scene === "home" ? 1.5 : 1.15 - evening * 0.5}
        color="#fff3da"
      />
      <hemisphereLight args={["#e7efe0", "#a5a083", 1.5 - evening * 0.6]} />
      <directionalLight
        position={[-15, 30, 12]}
        color={evening > 0.3 ? "#ffd4a5" : "#fff0d3"}
        intensity={2.5 - evening}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-normalBias={0.04}
        shadow-bias={-0.00015}
      />
      <LifeWorld
        simulation={props.simulation}
        snapshot={snapshot}
        onInteract={props.onInteract}
      />
      <CameraRig
        simulation={props.simulation}
        snapshot={snapshot}
        command={props.command}
        onReady={props.onReady}
      />
      <CharacterVisibility
        simulation={props.simulation}
        sceneId={snapshot.state.scene}
      />
    </Canvas>
  );
}
