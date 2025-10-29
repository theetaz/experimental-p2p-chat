"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { OnlineUser } from "@/lib/types";
import { generateAvatarUrl } from "@/lib/utils";
import Image from "next/image";

interface UserMarkerProps {
  user: OnlineUser;
  onPokeUser: (userId: string) => void;
}

function UserMarker({ user, onPokeUser }: UserMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Convert lat/lon to 3D coordinates
  const position = useMemo(() => {
    const radius = 2.05; // Slightly above globe surface
    const phi = (90 - user.location.latitude) * (Math.PI / 180);
    const theta = (user.location.longitude + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return [x, y, z] as [number, number, number];
  }, [user.location]);

  const avatarUrl = generateAvatarUrl(user.avatar.style, user.avatar.seed);

  // Check if marker is visible from camera perspective
  const [isVisible, setIsVisible] = useState(true);

  useFrame(() => {
    if (groupRef.current) {
      const markerWorldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(markerWorldPos);

      // Get surface normal (direction from globe center to marker)
      const surfaceNormal = markerWorldPos.clone().normalize();

      // Get direction from marker to camera
      const directionToCamera = camera.position.clone().sub(markerWorldPos).normalize();

      // If surface normal points toward camera (dot product > 0), marker is visible
      // If surface normal points away from camera (dot product < 0), marker is hidden
      const dotProduct = surfaceNormal.dot(directionToCamera);

      // Visible if dot product is positive (angle < 90 degrees)
      setIsVisible(dotProduct > 0);
    }
  });

  return (
    <group ref={groupRef} position={position} visible={isVisible}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <Html distanceFactor={8} style={{ pointerEvents: "auto", opacity: isVisible ? 1 : 0 }}>
        <div
          className="flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
          onClick={(e) => {
            console.log("🖱️ Click event fired on user marker");
            console.log("🆔 User ID:", user.id);
            console.log("👤 Username:", user.username);
            e.stopPropagation();
            onPokeUser(user.id);
          }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white">
            <Image src={avatarUrl} alt={user.username} width={32} height={32} />
          </div>
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {user.username}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Globe({ users, onPokeUser }: { users: OnlineUser[]; onPokeUser: (userId: string) => void }) {
  const globeGroupRef = useRef<THREE.Group>(null);

  // Load textures following globe.gl official examples
  const earthTexture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
  );

  const bumpTexture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png'
  );

  const specularTexture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png'
  );

  useFrame(() => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={globeGroupRef}>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={0.05}
          specularMap={specularTexture}
          specular={new THREE.Color('grey')}
          shininess={15}
        />
      </mesh>
      {/* Atmosphere glow effect */}
      <mesh>
        <sphereGeometry args={[2.02, 32, 32]} />
        <meshBasicMaterial
          color="#4a9eff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      {users.map((user) => (
        <UserMarker key={user.id} user={user} onPokeUser={onPokeUser} />
      ))}
    </group>
  );
}

interface Globe3DProps {
  users: OnlineUser[];
  onPokeUser: (userId: string) => void;
}

export function Globe3D({ users, onPokeUser }: Globe3DProps) {
  return (
    <div className="w-full h-full pointer-events-auto">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ pointerEvents: 'auto' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 1, 1]} intensity={0.8} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Globe users={users} onPokeUser={onPokeUser} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
