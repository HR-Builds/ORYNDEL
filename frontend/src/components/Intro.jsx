
import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export default function Intro({ onComplete }) {
  const mountRef = useRef(null);
  const overlayRef = useRef(null);
  const titleRef = useRef(null);
  const tagRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = overlayRef.current;
    const title = titleRef.current;
    const tag = tagRef.current;

    if (!mount || !overlay || !title || !tag) return;

    let disposed = false;
    let completed = false;
    let frameId = 0;
    let fallbackTimer;
    let resizeObserver;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080507");

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(
      mount.clientWidth || window.innerWidth,
      mount.clientHeight || window.innerHeight
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    mount.appendChild(renderer.domElement);

    // CINEMATIC BURGUNDY BACKGROUND

    const backgroundGeometry = new THREE.PlaneGeometry(24, 16);

    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
          ),
        },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform float uTime;
        uniform float uReveal;
        uniform vec2 uResolution;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv - 0.5;

          p.x *= uResolution.x / max(uResolution.y, 1.0);

          float n = noise(uv * 3.0 + vec2(0.0, uTime * 0.025));
          float n2 = noise(uv * 6.0 - vec2(uTime * 0.018, 0.0));

          float centralMist = exp(
            -dot(p * vec2(0.7, 1.15), p * vec2(0.7, 1.15)) * 7.0
          );

          float sideMist = exp(
            -dot(
              (p - vec2(-0.34, 0.08)) * vec2(1.0, 1.8),
              (p - vec2(-0.34, 0.08)) * vec2(1.0, 1.8)
            ) * 8.0
          );

          vec3 base = vec3(0.018, 0.008, 0.014);
          vec3 wine = vec3(0.17, 0.018, 0.055);
          vec3 burgundy = vec3(0.075, 0.009, 0.027);
          vec3 gold = vec3(0.40, 0.19, 0.055);

          vec3 color = base;
          color += wine * centralMist * (0.50 + n * 0.60);
          color += burgundy * sideMist * (0.45 + n2 * 0.70);
          color += gold * centralMist * uReveal * 0.45;

          float vignette = smoothstep(0.90, 0.18, length(p * vec2(0.85, 1.0)));
          color *= vignette;
          color += (n - 0.5) * 0.012;

          gl_FragColor = vec4(color, 1.0);
        }
      `,

      depthWrite: false,
    });

    const background = new THREE.Mesh(
      backgroundGeometry,
      backgroundMaterial
    );

    background.position.z = -5;
    scene.add(background);

    // LIGHTING

    scene.add(new THREE.AmbientLight(0x8b6370, 0.75));

    const keyLight = new THREE.DirectionalLight(0xffd99a, 4.2);
    keyLight.position.set(3.5, 4.5, 5);
    scene.add(keyLight);

    const coolLight = new THREE.PointLight(0x8aabff, 45, 12);
    coolLight.position.set(-3.5, 1.5, 2.5);
    scene.add(coolLight);

    const rubyLight = new THREE.PointLight(0x9d123b, 55, 13);
    rubyLight.position.set(0, -2.2, 1.5);
    scene.add(rubyLight);

    const goldLight = new THREE.PointLight(0xffb84d, 0, 10);
    goldLight.position.set(0, 0, 1.2);
    scene.add(goldLight);

    const rimLight = new THREE.DirectionalLight(0xfff1d0, 2.5);
    rimLight.position.set(-2.5, -3, 4);
    scene.add(rimLight);

    // INFINITE SINGULARITY

    const singularity = new THREE.Group();
    scene.add(singularity);

    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x17151b,
      metalness: 1,
      roughness: 0.19,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      reflectivity: 1,
      side: THREE.DoubleSide,
    });

    const darkChromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x08080c,
      metalness: 0.95,
      roughness: 0.27,
      clearcoat: 1,
      clearcoatRoughness: 0.17,
      side: THREE.DoubleSide,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8ad62,
      metalness: 0.92,
      roughness: 0.23,
      emissive: 0x8a4510,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });

    const brightGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe1a0,
      metalness: 0.75,
      roughness: 0.17,
      emissive: 0xff9b27,
      emissiveIntensity: 2.8,
    });

    const panelData = [
      {
        points: [
          [-0.13, -0.15],
          [0.48, -0.03],
          [1.66, 1.66],
          [0.85, 1.34],
          [0.13, 0.52],
          [-0.28, 0.18],
        ],
        position: [-0.12, 0.04, 0.12],
        rotation: [0.42, -0.48, -0.23],
        startRotation: [1.25, 0.8, -1.0],
        scale: 1,
        material: chromeMaterial,
      },
      {
        points: [
          [-0.1, 0.04],
          [0.16, -0.2],
          [1.52, -0.92],
          [1.12, -0.19],
          [0.49, 0.43],
          [0.04, 0.29],
        ],
        position: [0.08, -0.08, -0.12],
        rotation: [-0.48, 0.62, 0.48],
        startRotation: [-1.0, 1.6, 1.1],
        scale: 0.95,
        material: darkChromeMaterial,
      },
      {
        points: [
          [-0.12, -0.1],
          [0.08, 0.25],
          [-0.48, 1.63],
          [-0.7, 0.87],
          [-0.58, 0.22],
          [-0.28, -0.26],
        ],
        position: [0.05, 0.05, 0.23],
        rotation: [0.62, 0.24, 0.3],
        startRotation: [1.8, -1.2, 1.4],
        scale: 1.08,
        material: chromeMaterial,
      },
      {
        points: [
          [-0.1, 0.1],
          [0.42, 0.18],
          [0.92, -1.35],
          [0.31, -0.95],
          [-0.27, -0.35],
          [-0.3, -0.08],
        ],
        position: [-0.02, -0.04, -0.3],
        rotation: [-0.3, -0.7, -0.6],
        startRotation: [-1.4, 1.2, -1.7],
        scale: 1,
        material: darkChromeMaterial,
      },
      {
        points: [
          [-0.08, -0.04],
          [0.27, -0.16],
          [1.28, 0.26],
          [0.63, 0.55],
          [0.08, 0.37],
          [-0.22, 0.1],
        ],
        position: [0, 0.04, 0.4],
        rotation: [0.76, 0.28, -0.9],
        startRotation: [1.2, -1.8, 0.9],
        scale: 0.92,
        material: chromeMaterial,
      },
    ];

    const panels = [];

    function makeShard(points, material) {
      const shape = new THREE.Shape();

      shape.moveTo(points[0][0], points[0][1]);

      for (let i = 1; i < points.length; i += 1) {
        shape.lineTo(points[i][0], points[i][1]);
      }

      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.105,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        curveSegments: 2,
      });

      geometry.computeVertexNormals();

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -0.052;

      return mesh;
    }

    function makeGoldSeam(points, z = 0.025) {
      const positions = points.map(
        ([x, y]) => new THREE.Vector3(x, y, z)
      );

      const curve = new THREE.CatmullRomCurve3(
        positions,
        false,
        "centripetal"
      );

      const geometry = new THREE.TubeGeometry(
        curve,
        28,
        0.009,
        5,
        false
      );

      return new THREE.Mesh(geometry, goldMaterial);
    }

    panelData.forEach((data, index) => {
      const pivot = new THREE.Group();

      pivot.position.set(...data.position);
      pivot.rotation.set(...data.startRotation);
      pivot.scale.setScalar(0.001);

      const shard = makeShard(data.points, data.material);
      shard.scale.setScalar(data.scale);
      pivot.add(shard);

      const seam = makeGoldSeam(
        data.points.slice(0, 4),
        0.085 + index * 0.003
      );

      seam.scale.setScalar(data.scale);
      pivot.add(seam);

      if (index === 0 || index === 2 || index === 4) {
        const pin = new THREE.Mesh(
          new THREE.OctahedronGeometry(index === 2 ? 0.045 : 0.032, 0),
          brightGoldMaterial
        );

        const corner = data.points[Math.min(2, data.points.length - 1)];
        pin.position.set(corner[0], corner[1], 0.11);

        pivot.add(pin);
      }

      singularity.add(pivot);
      panels.push({ pivot, data, index });
    });

    // GOLD CORE

    const coreGroup = new THREE.Group();
    singularity.add(coreGroup);

    const coreOuterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x28170e,
      metalness: 0.95,
      roughness: 0.14,
      emissive: 0x8a3109,
      emissiveIntensity: 0.4,
      clearcoat: 1,
    });

    const coreOuter = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.31, 1),
      coreOuterMaterial
    );

    coreGroup.add(coreOuter);

    const coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 1),
      brightGoldMaterial
    );

    coreGroup.add(coreInner);

    const corePoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffedc4 })
    );

    coreGroup.add(corePoint);

    const fracturePoints = [
      new THREE.Vector3(-0.48, 0.14, 0.08),
      new THREE.Vector3(-0.2, 0.02, 0.16),
      new THREE.Vector3(0.02, 0.11, 0.2),
      new THREE.Vector3(0.22, -0.07, 0.15),
      new THREE.Vector3(0.47, -0.2, 0.08),
    ];

    const fractureCurve = new THREE.CatmullRomCurve3(fracturePoints);

    const fracture = new THREE.Mesh(
      new THREE.TubeGeometry(fractureCurve, 48, 0.014, 6, false),
      brightGoldMaterial
    );

    coreGroup.add(fracture);

    function makeGlowTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;

      const context = canvas.getContext("2d");
      const gradient = context.createRadialGradient(
        64, 64, 1,
        64, 64, 63
      );

      gradient.addColorStop(0, "rgba(255,224,153,0.95)");
      gradient.addColorStop(0.12, "rgba(255,171,63,0.55)");
      gradient.addColorStop(0.36, "rgba(199,49,43,0.18)");
      gradient.addColorStop(1, "rgba(110,20,35,0)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      return texture;
    }

    const glowTexture = makeGlowTexture();

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffb95e,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const coreGlow = new THREE.Sprite(glowMaterial);
    coreGlow.scale.set(2.1, 2.1, 1);
    coreGlow.position.z = -0.16;
    coreGroup.add(coreGlow);

    // GOLD PARTICLES

    const particleCount = 650;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;

      particlePositions[i3] = (Math.random() - 0.5) * 13;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 5;

      particleSeeds[i] = Math.random() * Math.PI * 2;
      particleSizes[i] = 0.5 + Math.random() * 1.6;
    }

    const particleGeometry = new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    particleGeometry.setAttribute(
      "aSeed",
      new THREE.BufferAttribute(particleSeeds, 1)
    );

    particleGeometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(particleSizes, 1)
    );

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
      },

      vertexShader: `
        attribute float aSeed;
        attribute float aSize;

        uniform float uTime;
        uniform float uBurst;

        varying float vAlpha;

        void main() {
          vec3 p = position;

          p.y += sin(uTime * 0.45 + aSeed) * 0.12;
          p.x += cos(uTime * 0.28 + aSeed) * 0.08;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

          gl_PointSize = aSize * (34.0 / max(1.0, -mvPosition.z));
          gl_PointSize *= 1.0 + uBurst * 1.7;

          gl_Position = projectionMatrix * mvPosition;

          vAlpha = 0.35 + 0.45 * (
            0.5 + 0.5 * sin(uTime + aSeed)
          );
        }
      `,

      fragmentShader: `
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);

          if (d > 0.5) discard;

          float glow = exp(-d * 13.0);
          float core = smoothstep(0.16, 0.0, d);

          vec3 color = mix(
            vec3(0.65, 0.29, 0.07),
            vec3(1.0, 0.83, 0.48),
            core
          );

          gl_FragColor = vec4(color, glow * vAlpha);
        }
      `,

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );

    scene.add(particles);

    // TEXT: HIDDEN AT START, REVEALED BELOW THE OBJECT

    const animation = {
      bloom: 0,
      core: 0,
      reveal: 0,
      particleBurst: 0,
      dissolve: 0,
    };

    gsap.set(title, {
      autoAlpha: 0,
      y: 24,
      scale: 0.94,
      transformOrigin: "center center",
      letterSpacing: "0.38em",
      color: "#f0d7a0",
      textShadow: "0 0 0 rgba(201,169,98,0)",
    });

    gsap.set(tag, {
      autoAlpha: 0,
      y: 12,
      letterSpacing: "0.42em",
    });

    gsap.set(overlay, { opacity: 1 });

    const timeline = gsap.timeline({
      onComplete: () => {
        if (completed || disposed) return;

        completed = true;

        gsap.to(overlay, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            if (!disposed) onCompleteRef.current?.();
          },
        });
      },
    });

    timeline.to(
      animation,
      {
        bloom: 1,
        duration: 2.05,
        ease: "expo.out",
      },
      0.15
    );

    timeline.to(
      animation,
      {
        core: 1,
        duration: 1.15,
        ease: "power3.out",
      },
      0.95
    );

    timeline.to(
      animation,
      {
        reveal: 1,
        duration: 1.4,
        ease: "power2.inOut",
      },
      1.25
    );

    timeline.to(
      animation,
      {
        particleBurst: 1,
        duration: 0.85,
        ease: "power3.out",
      },
      2.45
    );

    timeline.to(
      animation,
      {
        particleBurst: 0.18,
        duration: 1,
        ease: "power2.out",
      },
      3
    );

    timeline.to(
      animation,
      {
        dissolve: 1,
        duration: 0.8,
        ease: "power2.inOut",
      },
      3
    );

    // ORYNDEL reveals only after the sculpture climax.

    timeline.to(
      title,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        letterSpacing: "0.24em",
        color: "#f0d7a0",
        textShadow:
          "0 0 14px rgba(201,169,98,0.55), 0 0 45px rgba(201,169,98,0.25)",
        duration: 1.4,
        ease: "power4.out",
      },
      3.35
    );

    timeline.to(
      tag,
      {
        autoAlpha: 1,
        y: 0,
        letterSpacing: "0.30em",
        duration: 1,
        ease: "power3.out",
      },
      3.9
    );

    // RESPONSIVE RESIZE

    const resize = () => {
      if (disposed) return;

      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.position.z = width < 600 ? 9.4 : 8;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

      backgroundMaterial.uniforms.uResolution.value.set(width, height);
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);

    // RENDER LOOP

    const clock = new THREE.Clock();

    const render = () => {
      if (disposed) return;

      frameId = requestAnimationFrame(render);

      const elapsed = clock.getElapsedTime();
      const bloom = animation.bloom;
      const corePower = animation.core;
      const burst = animation.particleBurst;
      const dissolve = animation.dissolve;

      backgroundMaterial.uniforms.uTime.value = elapsed;
      backgroundMaterial.uniforms.uReveal.value = animation.reveal;

      particleMaterial.uniforms.uTime.value = elapsed;
      particleMaterial.uniforms.uBurst.value = burst;

      singularity.rotation.y = Math.sin(elapsed * 0.25) * 0.12;
      singularity.rotation.x = Math.cos(elapsed * 0.21) * 0.06;
      singularity.rotation.z = Math.sin(elapsed * 0.18) * 0.035;

      const objectScale = THREE.MathUtils.lerp(0.48, 1, bloom);
      const exitScale = THREE.MathUtils.lerp(1, 0.74, dissolve);

      singularity.scale.setScalar(objectScale * exitScale);
      singularity.position.y =
        -0.02 + Math.sin(elapsed * 0.7) * 0.035;

      panels.forEach(({ pivot, data, index }) => {
        const t = bloom;

        pivot.rotation.x = THREE.MathUtils.lerp(
          data.startRotation[0],
          data.rotation[0],
          t
        );

        pivot.rotation.y = THREE.MathUtils.lerp(
          data.startRotation[1],
          data.rotation[1],
          t
        );

        pivot.rotation.z = THREE.MathUtils.lerp(
          data.startRotation[2],
          data.rotation[2],
          t
        );

        const spread = 1 - t;

        pivot.position.x =
          data.position[0] + Math.sin(index * 2.1) * spread * 0.8;

        pivot.position.y =
          data.position[1] + Math.cos(index * 1.7) * spread * 0.8;

        pivot.position.z =
          data.position[2] - spread * (0.9 + index * 0.12);

        pivot.scale.setScalar(Math.max(0.001, t) * data.scale);
      });

      coreGroup.scale.setScalar(
        Math.max(0.001, corePower) *
          (1 + Math.sin(elapsed * 2.5) * 0.035)
      );

      coreGroup.rotation.x = elapsed * 0.14;
      coreGroup.rotation.y = elapsed * 0.21;
      coreGroup.rotation.z = Math.sin(elapsed * 0.55) * 0.1;

      coreOuter.material.emissiveIntensity = 0.25 + corePower * 2.4;
      brightGoldMaterial.emissiveIntensity = 1.2 + corePower * 4.5;

      coreGlow.material.opacity = Math.min(
        1,
        corePower * 0.85 + burst * 0.35
      );

      coreGlow.scale.setScalar(1 + corePower * 1.7 + burst * 1.2);

      goldLight.intensity = corePower * 65 + burst * 100;
      goldLight.distance = 8 + burst * 5;

      keyLight.intensity = 3.2 + corePower * 1.2;
      rubyLight.intensity = 35 + animation.reveal * 25;

      particles.rotation.y = elapsed * 0.012;
      particles.rotation.x = Math.sin(elapsed * 0.1) * 0.025;
      particles.position.z = burst * 0.2;

      camera.position.x = Math.sin(elapsed * 0.12) * 0.045;
      camera.position.y = Math.cos(elapsed * 0.16) * 0.035;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    render();

    fallbackTimer = window.setTimeout(() => {
      if (!disposed && !completed) {
        timeline.progress(1);
      }
    }, 5200);

    return () => {
      disposed = true;

      window.clearTimeout(fallbackTimer);
      cancelAnimationFrame(frameId);

      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();

      timeline.kill();
      gsap.killTweensOf([overlay, title, tag]);

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });

      renderer.dispose();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={overlayRef} className="intro-overlay">
      <div ref={mountRef} className="intro-canvas" />

      <div className="intro-wordmark">
        <h1 ref={titleRef}>ORYNDEL</h1>

        <p ref={tagRef} className="intro-tag">
          BEYOND THE ORDINARY
        </p>
      </div>
    </div>
  );
}
