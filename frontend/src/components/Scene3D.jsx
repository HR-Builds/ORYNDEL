import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;

  float t = uTime * 0.045;
  vec2 drift = (uMouse - 0.5) * 0.22;

  float n1 = fbm(p * 1.5 + vec2(t, -t * 0.55) + drift);
  float n2 = fbm(p * 3.1 - vec2(t * 0.65, t * 0.4) + n1 * 1.4);

  vec3 obsidian = vec3(0.039, 0.039, 0.051);
  vec3 gold = vec3(0.788, 0.663, 0.384);
  vec3 oxblood = vec3(0.30, 0.06, 0.10);

  vec3 col = obsidian;
  col = mix(col, oxblood * 0.8, smoothstep(0.38, 0.9, n1) * 0.6);
  col += gold * pow(smoothstep(0.60, 0.98, n2), 3.5) * 0.32;
  col += gold * 0.05 * smoothstep(0.85, 1.0, n1 * n2 * 2.2);

  float vig = smoothstep(1.3, 0.3, distance(uv, vec2(0.5, 0.45)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function Scene3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    const clock = new THREE.Clock();
    let raf;
    const tick = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    };
    const onMouse = (e) => {
      uniforms.uMouse.value.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouse);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="scene3d" aria-hidden="true" />;
}