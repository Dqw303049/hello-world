import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef, CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, MapControls, RoundedBox } from "@react-three/drei";
import {
  BedDouble,
  Coffee,
  Hammer,
  Leaf,
  Soup,
  Store,
  TreeDeciduous,
} from "lucide-react";
import * as THREE from "three";
import { LOCATIONS } from "./locations";
import type { LocationId } from "./game";

const MARKER_ICONS = {
  home: BedDouble,
  tea: Leaf,
  noodles: Soup,
  workshop: Hammer,
  shop: Store,
  square: TreeDeciduous,
  camp: Coffee,
};
export interface SceneCommand {
  type: "in" | "out" | "reset";
  nonce: number;
}
interface SceneProps {
  selected: LocationId | null;
  onSelect: (id: LocationId) => void;
  command: SceneCommand | null;
  renovated: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}

function Box({
  position,
  size,
  color,
  rotation = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Roof({
  width = 3.5,
  depth = 3,
  color = "#616e66",
}: {
  width?: number;
  depth?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 - 0.25, 0);
    shape.lineTo(0, 1.12);
    shape.lineTo(width / 2 + 0.25, 0);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: depth + 0.5,
      bevelEnabled: false,
    });
  }, [width, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, 0, -depth / 2 - 0.25]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <Box
        position={[0, 1.13, 0]}
        size={[0.13, 0.12, depth + 0.8]}
        color={color}
      />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          position={[side * (width / 2 + 0.1), 0.03, 0]}
          size={[0.1, 0.1, depth + 0.65]}
          color={color}
        />
      ))}
      {[-depth / 2 - 0.27, depth / 2 + 0.27].map((z, index) => (
        <group key={index} position={[0, 0, z]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[(side * width) / 4, 0.53, 0]}
              rotation={[0, 0, side * -Math.atan(2.24 / (width + 0.5))]}
              castShadow
            >
              <boxGeometry
                args={[Math.hypot(width / 2 + 0.25, 1.12), 0.09, 0.08]}
              />
              <meshStandardMaterial color="#899087" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.19, 8, 6]} />
        <meshStandardMaterial color="#bb543f" roughness={0.9} />
      </mesh>
      <Box position={[0, -0.27, 0]} size={[0.04, 0.17, 0.04]} color="#d7a766" />
      <Box position={[0, 0.2, 0]} size={[0.18, 0.05, 0.18]} color="#b89356" />
    </group>
  );
}

function House({
  position,
  rotation = 0,
  variant = "home",
  scale = 1,
  renovated = false,
}: {
  position: [number, number, number];
  rotation?: number;
  variant?: string;
  scale?: number;
  renovated?: boolean;
}) {
  const isShop = variant === "shop" || variant === "noodles";
  const wall =
    variant === "workshop"
      ? "#bda184"
      : variant === "shop"
        ? "#e6c7a7"
        : "#f2ead6";
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <RoundedBox
        args={[4.3, 0.2, 3.9]}
        radius={0.07}
        position={[0, 0.03, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#ceceb6" />
      </RoundedBox>
      <Box position={[0, 1.25, 0]} size={[3.5, 2.4, 2.85]} color={wall} />
      <Box position={[0, 0.23, 0]} size={[3.65, 0.3, 3]} color="#9c9b86" />
      <group position={[0, 2.45, 0]}>
        <Roof color={variant === "noodles" ? "#7d705f" : "#626f69"} />
      </group>
      <Box
        position={[0.1, 0.91, 1.45]}
        size={[0.73, 1.6, 0.08]}
        color="#795b43"
      />
      <Box position={[0.1, 1, 1.5]} size={[0.035, 1.4, 0.03]} color="#b39365" />
      {[-1.1, 1.12].map((x) => (
        <group key={x} position={[x, 1.45, 1.46]}>
          <Box position={[0, 0, 0]} size={[0.64, 0.76, 0.08]} color="#807354" />
          <Box
            position={[0, 0.02, 0.05]}
            size={[0.48, 0.6, 0.02]}
            color="#b4c8bd"
          />
          <Box
            position={[0, 0, 0.07]}
            size={[0.04, 0.66, 0.02]}
            color="#756a4c"
          />
          <Box
            position={[0, 0, 0.07]}
            size={[0.5, 0.04, 0.02]}
            color="#756a4c"
          />
        </group>
      ))}
      <Box
        position={[-1.77, 1.4, 0]}
        size={[0.06, 0.72, 0.62]}
        color="#9aab9b"
      />
      <Box
        position={[0.1, 0.15, 1.82]}
        size={[1.6, 0.19, 0.6]}
        color="#b9b8a5"
      />
      {isShop && (
        <>
          <Box
            position={[0, 2, 1.59]}
            size={[2.95, 0.43, 0.16]}
            color={variant === "noodles" ? "#955d42" : "#486956"}
          />
          <mesh position={[0, 1.84, 2.04]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[3.6, 0.08, 1.1]} />
            <meshStandardMaterial
              color={variant === "noodles" ? "#c29867" : "#799b80"}
            />
          </mesh>
          <Lantern position={[-1.4, 1.45, 2]} />
          <Lantern position={[1.4, 1.45, 2]} />
          <Box
            position={[1.6, 0.43, 2.2]}
            size={[0.65, 0.7, 0.65]}
            color="#a18050"
          />
          {variant === "shop" && (
            <mesh position={[1.6, 0.85, 2.2]}>
              <sphereGeometry args={[0.24, 7, 6]} />
              <meshStandardMaterial color="#e9b950" />
            </mesh>
          )}
        </>
      )}
      {variant === "workshop" && (
        <>
          <Box
            position={[-1.25, 0.72, 2.1]}
            size={[1.5, 0.18, 0.85]}
            color="#bc9967"
          />
          {[-1.8, -0.7].map((x) => (
            <Box
              key={x}
              position={[x, 0.38, 2.1]}
              size={[0.12, 0.6, 0.65]}
              color="#876e47"
            />
          ))}
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[2.15, 0.3 + i * 0.27, 0.5]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.21, 0.21, 1.9, 8]} />
              <meshStandardMaterial color="#af8b59" />
            </mesh>
          ))}
        </>
      )}
      {variant === "home" && (
        <>
          <Box
            position={[-2.1, 0.35, 2]}
            size={[0.16, 0.65, 1.8]}
            color="#bcbba3"
          />
          <Box
            position={[2.1, 0.35, 2]}
            size={[0.16, 0.65, 1.8]}
            color="#bcbba3"
          />
          {[-1.6, 1.6].map((x) => (
            <group key={x} position={[x, 0, 2.4]}>
              <mesh position={[0, 0.23, 0]} castShadow>
                <cylinderGeometry args={[0.23, 0.16, 0.4, 8]} />
                <meshStandardMaterial color="#b87957" />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <icosahedronGeometry args={[renovated ? 0.36 : 0.25, 0]} />
                <meshStandardMaterial
                  color={renovated ? "#dcaa71" : "#739866"}
                />
              </mesh>
            </group>
          ))}
          {renovated && (
            <>
              <Box
                position={[0, 1.95, 1.55]}
                size={[1.1, 0.3, 0.05]}
                color="#657e52"
              />
              <Lantern position={[-0.6, 1.6, 1.7]} />
              <Lantern position={[0.8, 1.6, 1.7]} />
            </>
          )}
        </>
      )}
    </group>
  );
}

function Tree({
  position,
  size = 1,
  color = "#748c52",
  variant = 0,
}: {
  position: [number, number, number];
  size?: number;
  color?: string;
  variant?: number;
}) {
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 1.5, 6]} />
        <meshStandardMaterial color="#8b7955" />
      </mesh>
      {variant === 1 ? (
        <>
          <mesh position={[0, 1.8, 0]} castShadow>
            <coneGeometry args={[0.85, 2.4, 7]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 2.65, 0]} castShadow>
            <coneGeometry args={[0.59, 1.7, 7]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 1.95, 0]} scale={[1.1, 0.95, 1]} castShadow>
            <icosahedronGeometry args={[0.94, 0]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0.5, 1.65, 0.25]} castShadow>
            <icosahedronGeometry args={[0.65, 0]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
}

function Bamboo({
  position,
  size = 1,
}: {
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position} scale={size}>
      {[0, 1, 2, 3].map((i) => (
        <group
          key={i}
          position={[(i % 2) * 0.35, 0, Math.floor(i / 2) * 0.25]}
          rotation={[0, i, (i - 1.5) * 0.06]}
        >
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.045, 0.065, 2.6, 5]} />
            <meshStandardMaterial color="#81935d" />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh
              key={j}
              position={[0.2 * (j % 2 ? -1 : 1), 1.3 + j * 0.55, 0]}
              rotation={[0.4, j, 0.4]}
              scale={[0.7, 0.15, 0.35]}
            >
              <octahedronGeometry args={[0.8]} />
              <meshStandardMaterial color="#819b5b" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Terrain() {
  const [land, river] = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(-20, -11);
    outline.quadraticCurveTo(-23, -5, -21, 6);
    outline.quadraticCurveTo(-20, 14, -12, 15);
    outline.quadraticCurveTo(0, 17, 13, 14);
    outline.quadraticCurveTo(22, 13, 22, 5);
    outline.quadraticCurveTo(24, -7, 17, -13);
    outline.quadraticCurveTo(7, -18, -4, -15);
    outline.quadraticCurveTo(-16, -16, -20, -11);
    const water = new THREE.Shape();
    water.moveTo(-23, -0.5);
    water.bezierCurveTo(-12, 4.2, -7, 1.1, 0, -0.8);
    water.bezierCurveTo(9, -3, 13, 1.5, 23, -0.5);
    water.lineTo(23, -3);
    water.bezierCurveTo(13, -1, 9, -5.3, 0, -3.3);
    water.bezierCurveTo(-7, -1.4, -12, 1.7, -23, -3);
    water.closePath();
    return [
      new THREE.ExtrudeGeometry(outline, {
        depth: 1.2,
        bevelEnabled: true,
        bevelThickness: 0.4,
        bevelSize: 0.7,
        bevelSegments: 2,
      }),
      new THREE.ShapeGeometry(water, 32),
    ];
  }, []);
  useEffect(
    () => () => {
      land.dispose();
      river.dispose();
    },
    [land, river],
  );
  return (
    <>
      <mesh
        geometry={land}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.65, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#b6c593" roughness={1} />
      </mesh>
      <mesh
        geometry={river}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.99, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#7fbbb5"
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>
      {[-15, -11, -6, 6, 12, 17].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1.008, 1.8 + Math.sin(x / 6) * 1.3]}
          rotation={[-Math.PI / 2, 0, -0.12]}
        >
          <planeGeometry args={[1.2 + (i % 2) * 0.4, 0.035]} />
          <meshBasicMaterial color="#bbd9cb" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.32, 0]}
        receiveShadow
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#e3e6d6" />
      </mesh>
    </>
  );
}

function Hills() {
  const hills = [
    [-18, -9, 5.5, 5, "#8fa879"],
    [-17, -15, 7, 8, "#839d75"],
    [-9, -17, 7.5, 7, "#a0b286"],
    [1, -19, 8, 9, "#8ba27e"],
    [11, -17, 8, 7, "#9aac87"],
    [19, -12, 5, 6, "#94ab7e"],
  ] as const;
  return (
    <group>
      {hills.map(([x, z, size, height, color], i) => (
        <group key={i}>
          <mesh
            position={[x, height * 0.28, z]}
            rotation={[0, i * 0.7, 0]}
            scale={[1.15, 1, 0.85]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[size, height, 7]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <Tree
            position={[x - 1.5, height * 0.4, z + 1]}
            size={0.9}
            variant={1}
            color="#657f59"
          />
          <Tree
            position={[x + 1, height * 0.25, z + 2]}
            size={1.15}
            variant={1}
            color="#789065"
          />
        </group>
      ))}
      {[-23, -13, 0, 13, 24].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1, -30 - (i % 2) * 4]}
          rotation={[0, i, 0]}
          scale={[1.4, 1, 1]}
        >
          <coneGeometry args={[9, 12 + (i % 3) * 3, 5]} />
          <meshStandardMaterial
            color={i % 2 ? "#b0bda4" : "#bdc7b0"}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function Paths() {
  return (
    <group>
      <RoundedBox
        args={[31, 0.06, 1.7]}
        radius={0.15}
        position={[-0.5, 0.96, 4.7]}
        receiveShadow
      >
        <meshStandardMaterial color="#dad5b9" />
      </RoundedBox>
      <RoundedBox
        args={[25, 0.06, 1.5]}
        radius={0.15}
        position={[-0.2, 0.96, -4.1]}
        receiveShadow
      >
        <meshStandardMaterial color="#dad5b9" />
      </RoundedBox>
      <Box
        position={[1.3, 0.97, -2.2]}
        size={[1.5, 0.06, 12.5]}
        color="#d5ceb0"
      />
      <Box position={[-8, 0.97, 9.2]} size={[1.4, 0.06, 8]} color="#d7d0b2" />
      <Box position={[11, 0.97, -5.9]} size={[1.3, 0.06, 5]} color="#d7d0b2" />
      {Array.from({ length: 23 }, (_, i) => (
        <Box
          key={i}
          position={[-15 + i * 1.3, 1, 4.7]}
          size={[0.035, 0.009, 1.6]}
          color="#c5c4aa"
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Box
          key={i}
          position={[-10 + i * 0.15, 1.05 + i * 0.12, -4.6 - i * 0.38]}
          size={[1.5, 0.16, 0.45]}
          color="#c9c8a9"
        />
      ))}
    </group>
  );
}

function Bridge() {
  return (
    <group position={[1.3, 1, 1.7]}>
      <RoundedBox
        args={[2.3, 0.45, 5.8]}
        radius={0.12}
        position={[0, 0.18, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#b7b8a5" />
      </RoundedBox>
      {[-1.05, 1.05].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.94, 0]}
            size={[0.18, 0.18, 5.8]}
            color="#c7c7b3"
          />
          {[-2.6, -1.3, 0, 1.3, 2.6].map((z) => (
            <Box
              key={z}
              position={[x, 0.65, z]}
              size={[0.23, 1, 0.23]}
              color="#b3b5a3"
            />
          ))}
        </group>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          position={[0, 0.416, -2.6 + i * 0.57]}
          size={[1.9, 0.015, 0.025]}
          color="#a5ac9b"
        />
      ))}
    </group>
  );
}

function TeaGarden() {
  return (
    <group position={[-11.5, 0.8, -7]} rotation={[0, -0.12, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, i * 0.42, -i * 1.25]}>
          <RoundedBox
            args={[7 - i * 0.5, 0.48, 1.2]}
            radius={0.12}
            position={[0, 0.1, 0]}
            receiveShadow
          >
            <meshStandardMaterial color="#aab67a" />
          </RoundedBox>
          <RoundedBox
            args={[6.5 - i * 0.5, 0.52, 0.65]}
            radius={0.22}
            position={[0, 0.49, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={i % 2 ? "#7a9855" : "#6d8b4b"}
              roughness={1}
            />
          </RoundedBox>
          {[-2.4, -1.2, 0, 1.2, 2.4]
            .filter((x) => Math.abs(x) < (6.5 - i * 0.5) / 2)
            .map((x) => (
              <mesh key={x} position={[x, 0.82, 0]} scale={[0.4, 0.15, 0.35]}>
                <icosahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial color="#90a866" />
              </mesh>
            ))}
        </group>
      ))}
      <House
        position={[-4.5, 0.25, 0.6]}
        scale={0.55}
        rotation={0.3}
        variant="shed"
      />
    </group>
  );
}

function Bench({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box position={[0, 0.45, 0]} size={[1.5, 0.13, 0.5]} color="#a68a58" />
      <Box
        position={[0, 0.85, -0.23]}
        size={[1.5, 0.42, 0.1]}
        color="#a68a58"
      />
      {[-0.55, 0.55].map((x) => (
        <Box
          key={x}
          position={[x, 0.24, 0]}
          size={[0.12, 0.45, 0.4]}
          color="#6d7865"
        />
      ))}
    </group>
  );
}

function Plaza() {
  return (
    <group position={[-0.5, 0.85, -2.5]}>
      <mesh
        position={[0, 0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[3.1, 32]} />
        <meshStandardMaterial color="#d5cfb1" />
      </mesh>
      <mesh
        position={[0, 0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[1.1, 1.33, 20]} />
        <meshStandardMaterial color="#b2b39b" />
      </mesh>
      <Tree position={[0, 0.2, 0]} size={1.75} color="#c4ac59" />
      <Tree position={[0.5, 0.2, -0.15]} size={1.1} color="#d9bd62" />
      <Bench position={[-2, 0.2, 0.5]} rotation={0.6} />
      <Bench position={[1.7, 0.2, 1.2]} rotation={-0.6} />
    </group>
  );
}

function Camp() {
  return (
    <group position={[13, 0.85, -2.5]}>
      <Box position={[0, 0.15, 0]} size={[4.5, 0.2, 3.3]} color="#b3ac83" />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          position={[-2.1 + i * 0.46, 0.26, 0]}
          size={[0.03, 0.02, 3.3]}
          color="#9f9777"
        />
      ))}
      <mesh position={[-0.4, 0.83, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.16, 12]} />
        <meshStandardMaterial color="#9d8052" />
      </mesh>
      <Box
        position={[-0.4, 0.48, 0]}
        size={[0.15, 0.8, 0.15]}
        color="#826e49"
      />
      <mesh position={[-0.4, 1.03, 0]}>
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshStandardMaterial color="#595e4c" />
      </mesh>
      <Bench position={[-0.4, 0.25, -1]} />
      <Bench position={[-0.4, 0.25, 1]} rotation={Math.PI} />
      <Box
        position={[1.3, 1.8, -0.6]}
        size={[0.08, 3.3, 0.08]}
        color="#8b7953"
      />
      <mesh position={[1.3, 3.3, -0.6]} rotation={[0, 0.3, 0]} castShadow>
        <coneGeometry args={[1.8, 0.7, 6]} />
        <meshStandardMaterial color="#cfb386" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Villager({
  position,
  color = "#6d8592",
  phase = 0,
  moving = false,
}: {
  position: [number, number, number];
  color?: string;
  phase?: number;
  moving?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !moving) return;
    ref.current.position.x =
      position[0] + Math.sin(clock.elapsedTime * 0.15 + phase) * 3;
    ref.current.position.y =
      position[1] + Math.abs(Math.sin(clock.elapsedTime * 3 + phase)) * 0.025;
    ref.current.rotation.y =
      Math.cos(clock.elapsedTime * 0.15 + phase) > 0
        ? Math.PI / 2
        : -Math.PI / 2;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#d5ad86" />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <Box
          key={x}
          position={[x, 0.29, 0]}
          size={[0.11, 0.35, 0.13]}
          color="#575f57"
        />
      ))}
      <mesh position={[0, 1.02, 0]}>
        <coneGeometry args={[0.28, 0.16, 8]} />
        <meshStandardMaterial color="#cfb880" />
      </mesh>
    </group>
  );
}

function Clouds() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.position.x = Math.sin(clock.elapsedTime * 0.025) * 2;
  });
  return (
    <group ref={ref}>
      {[
        [-13, 12, -17],
        [13, 15, -23],
        [2, 14, -28],
      ].map((p, i) => (
        <group
          key={i}
          position={p as [number, number, number]}
          scale={i === 0 ? 1 : 1.3}
        >
          {[-1.4, 0, 1.5].map((x, j) => (
            <mesh
              key={j}
              position={[x, j === 1 ? 0.3 : 0, 0]}
              scale={[1.6, 0.6, 0.8]}
            >
              <icosahedronGeometry args={[1.5, 1]} />
              <meshStandardMaterial
                color="#f1f1df"
                transparent
                opacity={0.65}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function CameraRig({
  command,
  onReady,
}: {
  command: SceneCommand | null;
  onReady: () => void;
}) {
  const controls = useRef<ComponentRef<typeof MapControls>>(null);
  const { camera, size, gl } = useThree();
  const baselineZoom = useRef<number | null>(null);
  useEffect(() => {
    const nextBaseline = Math.min(size.width / 42, size.height / 29);
    const orthographic = camera as THREE.OrthographicCamera;
    orthographic.zoom = baselineZoom.current
      ? (orthographic.zoom * nextBaseline) / baselineZoom.current
      : nextBaseline;
    baselineZoom.current = nextBaseline;
    orthographic.updateProjectionMatrix();
  }, [camera, size]);
  useEffect(() => {
    if (!command) return;
    const orthographic = camera as THREE.OrthographicCamera;
    if (command.type === "reset") {
      camera.position.set(29, 30, 37);
      controls.current?.target.set(0, 0, 0);
      orthographic.zoom = baselineZoom.current ?? 28;
    } else {
      orthographic.zoom = THREE.MathUtils.clamp(
        orthographic.zoom * (command.type === "in" ? 1.2 : 1 / 1.2),
        11,
        65,
      );
    }
    orthographic.updateProjectionMatrix();
    controls.current?.update();
  }, [command, camera]);
  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    const canvas = gl.domElement;
    const prevent = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", prevent);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("contextmenu", prevent);
    };
  }, [gl, onReady]);
  useFrame(() => {
    if (!controls.current) return;
    const target = controls.current.target;
    const x = THREE.MathUtils.clamp(target.x, -17, 17);
    const z = THREE.MathUtils.clamp(target.z, -13, 13);
    if (x !== target.x || z !== target.z) {
      camera.position.x += x - target.x;
      camera.position.z += z - target.z;
      target.set(x, 0, z);
    }
  });
  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={11}
      maxZoom={65}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.6}
      screenSpacePanning={false}
    />
  );
}

function Town({
  selected,
  onSelect,
  renovated,
}: Pick<SceneProps, "selected" | "onSelect" | "renovated">) {
  const [hover, setHover] = useState<LocationId | null>(null);
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);
  const trees = useMemo(
    () =>
      Array.from({ length: 51 }, (_, i) => {
        const angle = i * 2.39996;
        const radius = 15.5 + Math.sin(i * 7) * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius * 0.75,
          size: 0.65 + (i % 4) * 0.15,
          color: ["#698659", "#849a63", "#94a66c", "#78915e"][i % 4],
        };
      }).filter(
        (t) =>
          t.z > -7 &&
          Math.abs(t.z - (2 + Math.sin(t.x / 7))) > 2.5 &&
          !(t.x > 10 && t.z < 0),
      ),
    [],
  );
  return (
    <>
      <Terrain />
      <Hills />
      <Paths />
      <Bridge />
      <TeaGarden />
      <Plaza />
      <Camp />
      <House position={[-8, 0.8, 7.5]} renovated={renovated} />
      <House position={[-2.5, 0.8, 7]} variant="noodles" />
      <House position={[6.5, 0.8, 6]} variant="shop" />
      <House position={[6, 0.8, -6]} variant="workshop" />
      <House
        position={[-5.8, 0.8, -5.4]}
        scale={0.78}
        variant="neighbor"
        rotation={0.08}
      />
      <House
        position={[10, 0.8, 10.6]}
        scale={0.8}
        rotation={-0.2}
        variant="neighbor"
      />
      <House
        position={[-13, 0.8, 7.8]}
        scale={0.65}
        variant="neighbor"
        rotation={0.1}
      />
      <House
        position={[1, 1.2, -11.2]}
        scale={0.9}
        variant="neighbor"
        rotation={0.05}
      />
      <House
        position={[-3.3, 0.8, 12]}
        scale={0.65}
        variant="neighbor"
        rotation={Math.PI / 2}
      />
      {trees.map((t, i) => (
        <Tree
          key={i}
          position={[t.x, 0.8, t.z]}
          size={t.size}
          color={t.color}
          variant={i % 4 === 0 ? 1 : 0}
        />
      ))}
      <Bamboo position={[10, 0.85, -9]} size={1.3} />
      <Bamboo position={[15, 0.85, -4]} />
      <Bamboo position={[-14.5, 0.85, 4]} />
      <Tree position={[-10.8, 0.8, 10]} size={1.3} color="#cca95c" />
      <Tree position={[8.8, 0.8, 3.4]} size={1.1} color="#a5af69" />
      {[
        [-12, 1, 2],
        [-5, 1, 1],
        [8, 1, 1.7],
        [15, 1, 3],
      ].map((p, i) => (
        <mesh
          key={i}
          position={p as [number, number, number]}
          scale={[0.8, 0.5, 0.65]}
          rotation={[0, i, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#b0b5a2" flatShading />
        </mesh>
      ))}
      <Villager position={[-4, 1, 4.7]} phase={0} moving />
      <Villager position={[7, 1, 4.9]} phase={1} color="#bb8064" moving />
      <Villager position={[-1.8, 1, -0.8]} color="#b5a16b" />
      <Villager position={[-9.5, 1.2, -5.8]} color="#839174" />
      <Villager position={[5.5, 1, -3.7]} color="#c2ab77" phase={2} moving />
      <Clouds />
      {LOCATIONS.map((location) => {
        const Icon = MARKER_ICONS[location.id];
        return (
          <group key={location.id} position={location.position}>
            <mesh
              position={[0, 1.8, 0]}
              onClick={(event) => {
                event.stopPropagation();
                if (event.delta < 6) onSelect(location.id);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                setHover(location.id);
              }}
              onPointerOut={() => setHover(null)}
            >
              <boxGeometry
                args={location.id === "tea" ? [7, 3, 4] : [4, 3.6, 3.5]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {(selected === location.id || hover === location.id) && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
                <ringGeometry args={[2.55, 2.68, 48]} />
                <meshBasicMaterial
                  color="#fff4c3"
                  transparent
                  opacity={0.85}
                  depthWrite={false}
                />
              </mesh>
            )}
            <Html
              position={[
                0,
                location.id === "square"
                  ? 5.9
                  : location.id === "tea"
                    ? 3.8
                    : 4.7,
                0,
              ]}
              center
              zIndexRange={[20, 1]}
              style={{ pointerEvents: "none" }}
            >
              <button
                className={`map-marker ${selected === location.id ? "selected" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(location.id);
                }}
                aria-label={`前往${location.name}`}
                style={{ "--marker-color": location.color } as CSSProperties}
              >
                <span className="marker-icon">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="marker-name">{location.name}</span>
                <span className="marker-dot" />
              </button>
            </Html>
          </group>
        );
      })}
      <Html
        position={[-6, 1.1, 1.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        center
        transform
        distanceFactor={12}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span className="river-label">听 风 溪</span>
      </Html>
    </>
  );
}

export default function TownScene(props: SceneProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [29, 30, 37], zoom: 28, near: 0.1, far: 200 }}
      shadows
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#e3e6d6");
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          props.onUnavailable();
        });
      }}
      fallback={
        <div className="canvas-fallback">
          <h2>山镇正在等你</h2>
          <p>当前设备未能启动 3D 地图。你仍可从下方地点菜单探索小镇。</p>
        </div>
      }
    >
      <fog attach="fog" args={["#e3e6d6", 52, 115]} />
      <ambientLight intensity={1.25} color="#fff3dc" />
      <hemisphereLight args={["#e8f1e2", "#a6a383", 1.8]} />
      <directionalLight
        position={[-18, 32, 15]}
        intensity={2.8}
        color="#fff2d7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-normalBias={0.04}
        shadow-bias={-0.00015}
      />
      <Suspense fallback={null}>
        <Town
          selected={props.selected}
          onSelect={props.onSelect}
          renovated={props.renovated}
        />
      </Suspense>
      <CameraRig command={props.command} onReady={props.onReady} />
    </Canvas>
  );
}
