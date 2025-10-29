"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
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

  return (
    <group position={position}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <Html distanceFactor={8} style={{ pointerEvents: "auto" }}>
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

  // Load Earth texture
  const earthTexture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
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
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
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
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
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
