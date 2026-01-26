import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text3D, Center, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere = ({ position, color, size = 1, speed = 1 }: { position: [number, number, number], color: string, size?: number, speed?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5 * speed;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 32, 32]} />
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
};

const PhoneIcon = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Phone body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 2.4, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0.1, 0.08]}>
          <boxGeometry args={[1, 2, 0.01]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} />
        </mesh>
        {/* Call button glow */}
        <mesh position={[0, -0.8, 0.1]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      </group>
    </Float>
  );
};

const FloatingRing = ({ position, rotation, color, size = 1 }: { position: [number, number, number], rotation: [number, number, number], color: string, size?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} rotation={rotation}>
        <torusGeometry args={[size, 0.05, 16, 100]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  );
};

const ParticleField = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 100;
  
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#0ea5e9" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#0ea5e9" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      <spotLight position={[0, 5, 5]} intensity={1} color="#ffffff" />
      
      {/* Main phone in center */}
      <PhoneIcon />
      
      {/* Floating spheres */}
      <AnimatedSphere position={[-2.5, 1.5, -1]} color="#0ea5e9" size={0.4} speed={0.8} />
      <AnimatedSphere position={[2.5, -1, -2]} color="#8b5cf6" size={0.3} speed={1.2} />
      <AnimatedSphere position={[-2, -1.5, 0]} color="#22c55e" size={0.25} speed={1} />
      <AnimatedSphere position={[2, 2, -1]} color="#f59e0b" size={0.35} speed={0.9} />
      
      {/* Floating rings */}
      <FloatingRing position={[0, 0, -1]} rotation={[Math.PI / 4, 0, 0]} color="#0ea5e9" size={1.8} />
      <FloatingRing position={[0, 0, -1.5]} rotation={[-Math.PI / 3, Math.PI / 4, 0]} color="#8b5cf6" size={2.2} />
      
      {/* Particle field */}
      <ParticleField />
      
      <Environment preset="city" />
    </>
  );
};

export const Login3DAnimation: React.FC = () => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};
