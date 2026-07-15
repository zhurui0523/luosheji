import { AiSkill } from "../../skills/types.ts";

export const perspectiveSimSkill: AiSkill = {
  id: "perspective-sim",
  name: "3D导演台",
  desc: "精准控制3D场景与角色位置",
  icon: "🎥",
  instruction: "精准控制3D场景与角色位置",
  isSystem: true,
  isInstalled: true,
  isPublic: true,
  customOptions: [
    {
      id: "perspectiveFocalLength",
      name: "焦段",
      choices: ["24mm", "50mm", "85mm"]
    }
  ],
  code: `import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { 
  RotateCw, Move, Hand, Maximize, User, Camera, Settings2, ChevronRight, ChevronDown, Play, Pause,
  RefreshCcw, Box, Maximize2, Plus, X, Trash2, Layers, Layout, Sparkles, Search, Square, Zap,
  Accessibility, Flame, Shield, Smartphone, Compass, Anchor, ArrowRight, Monitor, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ==========================================
// 1. DirectorStage.tsx
// ==========================================


// @ts-ignore

// @ts-ignore

// @ts-ignore






function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CharacterInstance {
  id: string;
  type: 'advanced' | 'crowd';
  position: [number, number, number];
  rotation: number;
  scale: number;
  bodyThickness: number;
  color: string;
  bodyStyle: 'standard' | 'slim' | 'strong' | 'overweight';
  joints: {
    headPitch: number;
    headYaw: number;
    headRoll: number;
    bodyTiltFront: number;
    bodyTurn: number;
    bodyTiltSide: number;
    torsoLean: number;
    torsoTurn: number;
    torsoTiltSide: number;
    leftArmRaise: number;
    leftArmLift: number;
    leftArmTwist: number;
    rightArmRaise: number;
    rightArmLift: number;
    rightArmTwist: number;
    leftElbow: number;
    rightElbow: number;
    leftLegStep: number;
    leftLegAbduct: number;
    leftLegTwist: number;
    rightLegStep: number;
    rightLegAbduct: number;
    rightLegTwist: number;
    leftKnee: number;
    rightKnee: number;
  };
}

interface PropInstance {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'chair' | 'table' | 'tree' | 'car' | 'door';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

interface CameraInstance {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface DirectorStageProps {
  onParamsChange?: (params: any) => void;
  referenceImage?: string;
}

const fetchLocalBlobUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  try {
    // Try direct fetch first
    let response: Response;
    try {
      response = await fetch(url, { mode: 'cors' });
    } catch (e) {
      // Fallback to proxy-download
      const proxyUrl = \`/api/proxy-download?url=\${encodeURIComponent(url)}\`;
      response = await fetch(proxyUrl);
    }
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error("Empty blob");
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("Failed to fetch image via fallback, using original url:", url, err);
    return url;
  }
};

export const DirectorStage: React.FC<DirectorStageProps> = ({ onParamsChange, referenceImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<any>(null);
  
  const defaultChar: CharacterInstance = {
    id: 'char-1',
    type: 'advanced',
    position: [0, 0, 0],
    rotation: 0,
    scale: 1.0,
    bodyThickness: 1.0,
    color: '#6366f1',
    bodyStyle: 'standard',
    joints: {
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
      bodyTiltFront: 0,
      bodyTurn: 0,
      bodyTiltSide: 0,
      torsoLean: 0,
      torsoTurn: 0,
      torsoTiltSide: 0,
      leftArmRaise: 0,
      leftArmLift: 15,
      leftArmTwist: 0,
      rightArmRaise: 0,
      rightArmLift: 15,
      rightArmTwist: 0,
      leftElbow: 0,
      rightElbow: 0,
      leftLegStep: 0,
      leftLegAbduct: 0,
      leftLegTwist: 0,
      rightLegStep: 0,
      rightLegAbduct: 0,
      rightLegTwist: 0,
      leftKnee: 0,
      rightKnee: 0,
    }
  };

  const [characters, setCharacters] = useState<CharacterInstance[]>([defaultChar]);

  const [props, setProps] = useState<PropInstance[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('char-1');
  const [selectedPropId, setSelectedPropId] = useState<string>('');
  const [cameras, setCameras] = useState<CameraInstance[]>([
    { id: 'cam-main', name: '主机位', position: [5, 5, 5], target: [0, 1, 0], fov: 45 },
  ]);
  const [activeCamId, setActiveCamId] = useState<string>('cam-main');
  
  const [showUI, setShowUI] = useState(true);
  const [activeTab, setActiveTab] = useState<'director' | 'shot'>('director');
  const [propertyTab, setPropertyTab] = useState<'properties' | 'environment' | 'library'>('properties');
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale' | 'none'>('translate');
  const [leftSidebarSearch, setLeftSidebarSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['actors', 'crowd']);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };
  const transformModeRef = useRef(transformMode);
  useEffect(() => { transformModeRef.current = transformMode; }, [transformMode]);

  const [selectionMode, setSelectionMode] = useState<'object' | 'character'>('character');
  const [showCrowdGen, setShowCrowdGen] = useState(false);
  const [showPropMenu, setShowPropMenu] = useState(false);
  const [showHelpers, setShowHelpers] = useState(true);
  const [lightPreset, setLightPreset] = useState<'studio' | 'daylight' | 'noir' | 'cinematic'>('studio');
  const [crowdParams, setCrowdParams] = useState({ count: 20, rows: 2, spacingX: 1.5, spacingZ: 1.8 });

  const [sceneSettings, setSceneSettings] = useState({
    skyColor: '#06080f',
    floorOpacity: 0.4,
    floorHeight: 0.0,
    showGrid: true,
    showLabels: true,
    snapToGrid: false,
    panoramaImage: referenceImage || null as string | null,
    panoramaRotation: 0,
    panoramaRadius: 25,
    environmentIntensity: 1.0,
    sunRotation: 45,
    sunElevation: 45,
    cameraFov: 42,
  });

  const sceneSettingsRef = useRef(sceneSettings);
  useEffect(() => {
    sceneSettingsRef.current = sceneSettings;
  }, [sceneSettings]);

  // Sync cameraFov in sceneSettings when activeCamId changes to load its fov
  useEffect(() => {
    if (activeCamId) {
      const cam = cameras.find(c => c.id === activeCamId);
      if (cam) {
        setSceneSettings(prev => ({ ...prev, cameraFov: cam.fov }));
      }
    }
  }, [activeCamId]);

  // Synchronize cameraFov with actual Three.js perspective camera FOV and persist it to activeCam
  useEffect(() => {
    if (cameraRef.current && sceneSettings.cameraFov !== undefined) {
      cameraRef.current.fov = sceneSettings.cameraFov;
      cameraRef.current.updateProjectionMatrix();

      // Only update model cameras list if they differ to avoid infinite loops
      setCameras(prev => {
        const activeCamIdx = prev.findIndex(c => c.id === activeCamId);
        if (activeCamIdx !== -1 && prev[activeCamIdx].fov !== sceneSettings.cameraFov) {
          const updated = [...prev];
          updated[activeCamIdx] = {
            ...prev[activeCamIdx],
            fov: sceneSettings.cameraFov
          };
          return updated;
        }
        return prev;
      });
    }
  }, [sceneSettings.cameraFov, activeCamId]);

  const [resolvedPanoramaBlob, setResolvedPanoramaBlob] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentBlob = '';

    if (sceneSettings.panoramaImage) {
      const resolve = async () => {
        const resolved = await fetchLocalBlobUrl(sceneSettings.panoramaImage!);
        if (active) {
          setResolvedPanoramaBlob(resolved);
          currentBlob = resolved;
        }
      };
      resolve();
    } else {
      setResolvedPanoramaBlob(null);
    }

    return () => {
      active = false;
      if (currentBlob && currentBlob.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlob);
      }
    };
  }, [sceneSettings.panoramaImage]);

  const [cameraStats, setCameraStats] = useState({ azimuth: 0, elevation: 0, distance: 0 });
  const [showFlash, setShowFlash] = useState(false);

  const charMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const labelSpritesRef = useRef<Map<string, any>>(new Map());
  const propMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const selectedChar = characters.find(c => c.id === selectedCharId);
  const selectedProp = props.find(p => p.id === selectedPropId);

  const selectedCharIdRef = useRef<string>('');
  const selectedPropIdRef = useRef<string>('');

  useEffect(() => {
    selectedCharIdRef.current = selectedCharId;
  }, [selectedCharId]);

  useEffect(() => {
    selectedPropIdRef.current = selectedPropId;
  }, [selectedPropId]);

  const transitionRef = useRef({
    active: false,
    targetPosition: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    targetFov: 45
  });

  const addCharacter = (type: 'advanced' | 'crowd' = 'advanced') => {
    const newId = \`\${type}-\${Date.now()}\`;
    const newChar: CharacterInstance = {
      id: newId,
      type,
      position: [Math.random() * 2 - 1, 0, Math.random() * 2 - 1],
      rotation: 0,
      scale: 1.0,
      bodyThickness: 1.0,
      color: ['#6366f1', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 4)],
      bodyStyle: 'standard',
      joints: {
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        bodyTiltFront: 0,
        bodyTurn: 0,
        bodyTiltSide: 0,
        torsoLean: 0,
        torsoTurn: 0,
        torsoTiltSide: 0,
        leftArmRaise: 0,
        leftArmLift: 15,
        leftArmTwist: 0,
        rightArmRaise: 0,
        rightArmLift: 15,
        rightArmTwist: 0,
        leftElbow: 0,
        rightElbow: 0,
        leftLegStep: 0,
        leftLegAbduct: 0,
        leftLegTwist: 0,
        rightLegStep: 0,
        rightLegAbduct: 0,
        rightLegTwist: 0,
        leftKnee: 0,
        rightKnee: 0,
      }
    };
    setCharacters(prev => [...prev, newChar]);
    setSelectedCharId(newId);
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (selectedCharId === id) setSelectedCharId('');
  };

  const addProp = (type: PropInstance['type']) => {
    const newId = \`prop-\${Date.now()}\`;
    const newProp: PropInstance = {
      id: newId,
      type,
      position: [Math.random() * 4 - 2, 0, Math.random() * 4 - 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#94a3b8'
    };
    setProps(prev => [...prev, newProp]);
    setSelectedPropId(newId);
    setSelectedCharId('');
    setSelectionMode('object');
  };

  const removeProp = (id: string) => {
    setProps(prev => prev.filter(p => p.id !== id));
    if (selectedPropId === id) setSelectedPropId('');
  };

  const addCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    const newId = \`cam-\${Date.now()}\`;
    const newName = \`\${String.fromCharCode(65 + cameras.length)}机位\`;
    
    const pos = cameraRef.current.position;
    const target = controlsRef.current.target;
    
    const newCam: CameraInstance = {
      id: newId,
      name: newName,
      position: [pos.x, pos.y, pos.z],
      target: [target.x, target.y, target.z],
      fov: cameraRef.current.fov
    };
    
    setCameras(prev => [...prev, newCam]);
    setActiveCamId(newId);
    setActiveTab('shot');
  };

  const removeCamera = (id: string) => {
    if (cameras.length <= 1) return;
    setCameras(prev => prev.filter(c => c.id !== id));
    if (activeCamId === id) {
      setActiveCamId(cameras.find(c => c.id !== id)?.id || '');
    }
  };

  const updateActiveCamera = () => {
    if (!cameraRef.current || !controlsRef.current || activeTab !== 'shot') return;
    
    const pos = cameraRef.current.position;
    const target = controlsRef.current.target;
    
    setCameras(prev => prev.map(c => c.id === activeCamId ? {
      ...c,
      position: [pos.x, pos.y, pos.z],
      target: [target.x, target.y, target.z],
      fov: cameraRef.current!.fov
    } : c));
  };

  useEffect(() => {
    const updateCamStats = () => {
      if (!cameraRef.current || !controlsRef.current) return;
      
      const pos = cameraRef.current.position;
      const target = controlsRef.current.target;
      const dx = pos.x - target.x;
      const dy = pos.y - target.y;
      const dz = pos.z - target.z;
      
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const azimuth = Math.atan2(dx, dz) * (180 / Math.PI);
      const elevation = Math.asin(dy / distance) * (180 / Math.PI);
      
      setCameraStats({
        azimuth: Math.round(azimuth < 0 ? azimuth + 360 : azimuth),
        elevation: Math.round(elevation),
        distance: parseFloat(distance.toFixed(1))
      });
    };

    const interval = setInterval(updateCamStats, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080f); // Even darker background for more contrast
    sceneRef.current = scene;

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(
      42, // Slightly narrower FOV for more cinematic feel
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000 // Increased far plane to prevent panorama clipping
    );
    camera.position.set(6, 4, 6);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Crucial: Absolute positioning ensures it fills the relative container without shifting layout
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.maxDistance = 50; // Prevent flying out of the background sphere
    orbit.target.set(0, 1, 0);
    controlsRef.current = orbit;

    const transform = new TransformControls(camera, renderer.domElement) as any;
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
      
      if (!event.value && transform.object) {
        const obj = transform.object as THREE.Group;
        const id = obj.userData.id;

        // Grid Snapping Logic
        if (sceneSettingsRef.current.snapToGrid) {
          obj.position.x = Math.round(obj.position.x / 0.5) * 0.5;
          obj.position.z = Math.round(obj.position.z / 0.5) * 0.5;
        }
        
        if (id.startsWith('prop-')) {
          setProps(prev => prev.map(p => p.id === id ? {
            ...p,
            position: [obj.position.x, obj.position.y, obj.position.z],
            rotation: [(obj.rotation.x * 180) / Math.PI, (obj.rotation.y * 180) / Math.PI, (obj.rotation.z * 180) / Math.PI],
            scale: [obj.scale.x, obj.scale.y, obj.scale.z]
          } : p));
        } else {
          setSelectedCharId(id); // Ensure state matches
          setCharacters(prev => prev.map(c => c.id === id ? {
            ...c,
            position: [obj.position.x, obj.position.y, obj.position.z],
            rotation: (obj.rotation.y * 180) / Math.PI,
            scale: obj.scale.x
          } : c));
        }
      }
    });

    scene.add(transform);
    transformRef.current = transform;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    ambientLight.name = 'ambient';
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.name = 'main-light';
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0x6366f1, 15);
    rimLight.position.set(-10, 5, -10);
    rimLight.name = 'rim-light';
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffffff, 5);
    fillLight.position.set(5, 2, 5);
    fillLight.name = 'fill-light';
    scene.add(fillLight);

    // Helpers
    const gridHelper = new THREE.GridHelper(50, 50, 0x1e293b, 0x0f172a);
    gridHelper.name = 'grid-helper';
    gridHelper.visible = sceneSettings.showGrid;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.name = 'axes-helper';
    axesHelper.visible = showHelpers;
    scene.add(axesHelper);

    // --- Camera Gizmo Implementation ---
    const gizmoGroup = new THREE.Group();
    gizmoGroup.name = 'camera-gizmos';
    scene.add(gizmoGroup);

    // Azimuth Orbit (Green)
    const aziGeom = new THREE.TorusGeometry(4, 0.02, 16, 100);
    const aziMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.4 });
    const aziOrbit = new THREE.Mesh(aziGeom, aziMat);
    aziOrbit.rotation.x = Math.PI / 2;
    gizmoGroup.add(aziOrbit);

    // Elevation Arc (Pink)
    const eleGeom = new THREE.TorusGeometry(4, 0.02, 16, 100, Math.PI / 2);
    const eleMat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.4 });
    const eleOrbit = new THREE.Mesh(eleGeom, eleMat);
    gizmoGroup.add(eleOrbit);

    // Camera Model
    const camBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    const camLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    camLens.rotation.x = Math.PI / 2;
    camLens.position.z = 0.25;
    const camGroup = new THREE.Group();
    camGroup.name = 'camera-model';
    camGroup.add(camBody);
    camGroup.add(camLens);
    scene.add(camGroup);

    // Target Marker (Orange/Yellow - Center)
    const targetMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    targetMarker.name = 'target-marker';
    scene.add(targetMarker);

    // Param Balls
    const aziBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }) // Green
    );
    aziBall.name = 'azi-ball';
    scene.add(aziBall);

    const eleBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xec4899 }) // Pink
    );
    eleBall.name = 'ele-ball';
    scene.add(eleBall);

    // North indicator
    const northArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0.05, 0),
      3,
      0xffffff,
      0.5,
      0.2
    );
    northArrow.name = 'north-arrow';
    northArrow.visible = showHelpers;
    scene.add(northArrow);

    // Studio Cyclorama (The curved wall) - Removed cyc and curve as requested
    const cycGroup = new THREE.Group();
    cycGroup.name = 'cyc-group';
    scene.add(cycGroup);

    // Studio Lights - Top Rig - Removed topRing as requested
    const lightRig = new THREE.Group();
    
    const studioPoint = new THREE.PointLight(0x6366f1, 50, 20);
    studioPoint.position.set(0, 7.5, 0);
    lightRig.add(studioPoint);
    scene.add(lightRig);

    // Add a circular stage indicator
    const stageCircleGeom = new THREE.RingGeometry(1.9, 2.0, 64);
    const stageCircleMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const stageCircle = new THREE.Mesh(stageCircleGeom, stageCircleMat);
    stageCircle.name = 'stage-ring';
    stageCircle.rotation.x = -Math.PI / 2;
    stageCircle.position.y = 0.02;
    scene.add(stageCircle);

    // Panorama Background
    // We will use scene.background and scene.environment for the best 720VR match
    // rather than a physical sphere mesh, to avoid clipping and depth issues.
    // However, we'll keep a reference if we need to do something custom later.

    // Shadow Catcher (Invisible ground that catches shadows)
    const shadowCatcherGeom = new THREE.PlaneGeometry(100, 100);
    const shadowCatcherMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowCatcher = new THREE.Mesh(shadowCatcherGeom, shadowCatcherMat);
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0;
    shadowCatcher.receiveShadow = true;
    shadowCatcher.name = 'shadow-catcher';
    scene.add(shadowCatcher);

    // Handle Mouse Events for Selection & Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersectedObj = (clientX: number, clientY: number) => {
      if (!containerRef.current || !cameraRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      const charMeshes = Array.from(charMeshesRef.current.values());
      const propMeshes = Array.from(propMeshesRef.current.values());
      
      // Select depending on mode or proximity
      const intersects = raycaster.intersectObjects([...charMeshes, ...propMeshes], true);
      
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.id) {
          obj = obj.parent;
        }
        return obj.userData.id ? { id: obj.userData.id, type: obj.userData.id.startsWith('prop-') ? 'prop' : 'char' } : null;
      }
      return null;
    };

    let isDragging = false;
    let draggingId = '';
    let draggingType = '';
    let isDraggingVertical = false;
    const dragOffset = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    const onPointerDown = (event: PointerEvent) => {
      // Don't select if clicking on transform handles
      if (transform.dragging) return;
      
      const target = getIntersectedObj(event.clientX, event.clientY);
      if (target) {
        if (target.type === 'prop') {
          setSelectedPropId(target.id);
          setSelectedCharId('');
          setSelectionMode('object');
        } else {
          setSelectedCharId(target.id);
          setSelectedPropId('');
          setSelectionMode('character');
        }

        const group = target.type === 'prop' ? propMeshesRef.current.get(target.id) : charMeshesRef.current.get(target.id);

        // Ensure handles are visible if a tool is active
        if (transformModeRef.current !== 'none') {
          if (group) {
            transform.attach(group);
            transform.visible = true;
            transform.setMode(transformModeRef.current as any);
          }
        }

        // --- Start Direct Dragging ---
        if (transformModeRef.current === 'translate' && group) {
          isDragging = true;
          draggingId = target.id;
          draggingType = target.type;
          isDraggingVertical = event.shiftKey;
          orbit.enabled = false;
          
          if (isDraggingVertical) {
            // Vertical Plane facing camera
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(camDir.x, 0, camDir.z).normalize(), group.position);
          } else {
            // Horizontal Plane
            plane.set(new THREE.Vector3(0, 1, 0), -group.position.y);
          }
          
          raycaster.setFromCamera(mouse, camera);
          raycaster.ray.intersectPlane(plane, intersection);
          dragOffset.copy(group.position).sub(intersection);
        }
      } else {
        // Optional: click empty space to deselect
        // setSelectedCharId('');
        // setSelectedPropId('');
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging && draggingId) {
        const group = draggingType === 'char' ? charMeshesRef.current.get(draggingId) : propMeshesRef.current.get(draggingId);
        if (group) {
          raycaster.setFromCamera(mouse, cameraRef.current);
          
          // Handle Shift Toggle mid-drag
          if (event.shiftKey !== isDraggingVertical) {
            isDraggingVertical = event.shiftKey;
            if (isDraggingVertical) {
              const camDir = new THREE.Vector3();
              cameraRef.current.getWorldDirection(camDir);
              plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(camDir.x, 0, camDir.z).normalize(), group.position);
            } else {
              plane.set(new THREE.Vector3(0, 1, 0), -group.position.y);
            }
            // Recalculate offset for the new mode/plane
            raycaster.ray.intersectPlane(plane, intersection);
            dragOffset.copy(group.position).sub(intersection);
          }

          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const newPos = intersection.add(dragOffset);
            
            if (isDraggingVertical) {
              group.position.y = newPos.y;
            } else {
              group.position.x = newPos.x;
              group.position.z = newPos.z;
            }
            
            // Grid Snapping (Only for horizontal movement)
            if (sceneSettingsRef.current.snapToGrid && !isDraggingVertical) {
              group.position.x = Math.round(group.position.x / 0.5) * 0.5;
              group.position.z = Math.round(group.position.z / 0.5) * 0.5;
            }

            // Sync gizmo if it's attached to this object
            if (transform.object === group) {
              transform.updateMatrixWorld();
            }

            // Sync label
            const label = labelSpritesRef.current.get(draggingId);
            if (label) {
              label.position.set(group.position.x, group.position.y + 2.2 * group.scale.y, group.position.z);
            }
            
            if (rendererRef.current.domElement) rendererRef.current.domElement.style.cursor = 'grabbing';
          }
        }
        return;
      }

      if (transform.dragging) return;
      const target = getIntersectedObj(event.clientX, event.clientY);
      if (rendererRef.current.domElement) {
        if (target) {
          rendererRef.current.domElement.style.cursor = transformModeRef.current === 'translate' ? 'grab' : 'pointer';
        } else {
          rendererRef.current.domElement.style.cursor = 'move';
        }
      }
    };

    const onPointerUp = () => {
      if (isDragging && draggingId) {
        const group = draggingType === 'char' ? charMeshesRef.current.get(draggingId) : propMeshesRef.current.get(draggingId);
        if (group) {
          if (draggingType === 'char') {
            setCharacters(prev => prev.map(c => c.id === draggingId ? {
              ...c,
              position: [group.position.x, group.position.y, group.position.z]
            } : c));
          } else {
            setProps(prev => prev.map(p => p.id === draggingId ? {
              ...p,
              position: [group.position.x, group.position.y, group.position.z]
            } : p));
          }
        }
        isDragging = false;
        draggingId = '';
        orbit.enabled = true;
        if (rendererRef.current && rendererRef.current.domElement) rendererRef.current.domElement.style.cursor = 'move';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

  // Handle smooth transition update in animate loop
  const animate = () => {
    requestAnimationFrame(animate);

    if (transitionRef.current.active && cameraRef.current && controlsRef.current) {
      const cam = cameraRef.current;
      const target = controlsRef.current.target;
      const t = transitionRef.current;
      
      // Lerp position
      cam.position.lerp(t.targetPosition, 0.15);
      // Lerp target
      target.lerp(t.targetLookAt, 0.15);
      
      // Update FOV
      if (Math.abs(cam.fov - t.targetFov) > 0.01) {
        cam.fov += (t.targetFov - cam.fov) * 0.15;
        cam.updateProjectionMatrix();
      }

      controlsRef.current.update();

      // Check if finished
      if (cam.position.distanceTo(t.targetPosition) < 0.05 && 
          target.distanceTo(t.targetLookAt) < 0.05) {
        t.active = false;
        // Snap to final to avoid micro jitter
        cam.position.copy(t.targetPosition);
        target.copy(t.targetLookAt);
        controlsRef.current.update();
      }
    }
      
      if (isAutoRotate && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 2.0;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      orbit.update();

      // Sync Camera Model & Gizmos
      if (cameraRef.current && controlsRef.current) {
        const cam = cameraRef.current;
        const target = controlsRef.current.target;
        
        // Determine basePosition (centering on selected character/actor)
        const latestCharId = selectedCharIdRef.current;
        const latestPropId = selectedPropIdRef.current;
        const selectedMesh = latestCharId 
          ? charMeshesRef.current.get(latestCharId) 
          : latestPropId 
            ? propMeshesRef.current.get(latestPropId) 
            : null;
        
        const basePosition = (latestCharId && selectedMesh) ? selectedMesh.position : target;
        
        // Sync stats regardless of mode, relative to basePosition
        const dx = cam.position.x - basePosition.x;
        const dy = cam.position.y - basePosition.y;
        const dz = cam.position.z - basePosition.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const azimuth = (Math.atan2(dx, dz) * 180) / Math.PI;
        const elevation = (Math.asin(dy / distance) * 180) / Math.PI;

        setCameraStats({
          azimuth: Math.round(azimuth),
          elevation: Math.round(elevation),
          distance: parseFloat(distance.toFixed(1))
        });

        // Mirror the ACTIVE camera's location into our model if in director mode
        const activeCam = cameras.find(c => c.id === activeCamId);
        if (activeCam && camGroup) {
          camGroup.position.set(...activeCam.position);
          camGroup.lookAt(...activeCam.target);
        }
        
        // Always update gizmo positions relative to basePosition in director mode
        if (targetMarker) targetMarker.position.copy(basePosition);
        
        // Update Gizmo Rotations
        const azimuthRad = Math.atan2(dx, dz);
        
        if (gizmoGroup) {
          gizmoGroup.position.copy(basePosition);
          aziOrbit.scale.set(distance / 4, distance / 4, distance / 4);
          eleOrbit.scale.set(distance / 4, distance / 4, distance / 4);
          eleOrbit.rotation.y = azimuthRad + Math.PI / 2;
        }

        // Position Balls relative to basePosition
        // Azimuth Ball (at current azimuth on the orbit)
        if (aziBall) {
          aziBall.position.set(
            basePosition.x + Math.sin(azimuthRad) * distance,
            basePosition.y,
            basePosition.z + Math.cos(azimuthRad) * distance
          );
        }

        // Elevation Ball (at current position)
        if (eleBall) {
          eleBall.position.copy(cam.position);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      orbit.dispose();
      transform.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const createLabelSprite = (text: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Sprite();
    
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 36px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Shadow for legibility
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
    
    // Main text
    context.fillStyle = '#ffffff';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  };

  const createCharacterMesh = (char: CharacterInstance) => {
    const createLimb = (name: string, radius: number, length: number, mat: THREE.Material, subLimb?: { name: string, radius: number, length: number }) => {
      const g = new THREE.Group();
      g.name = name;
      
      // Mannequin limb segment (rounded capsule)
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - radius * 2, 8, 16), mat);
      mesh.position.y = -length / 2;
      mesh.castShadow = true;
      g.add(mesh);

      // Joint sphere at the top for better bending appearance
      const joint = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.1, 16, 16), mat);
      g.add(joint);

      if (subLimb) {
        const sub = createLimb(subLimb.name, subLimb.radius, subLimb.length, mat);
        sub.position.y = -length;
        g.add(sub);
      }
      
      return g;
    };

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: char.color,
      roughness: 0.4,
      metalness: 0.1
    });
    
    // Torso - Re-styled as mannequin torso
    const torso = new THREE.Group();
    torso.name = 'torso';
    torso.position.y = 1.0;
    
    const upperTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 8, 16), bodyMat);
    upperTorso.name = 'upperTorso';
    upperTorso.position.y = 0.4;
    upperTorso.castShadow = true;
    torso.add(upperTorso);

    const lowerTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.25, 8, 16), bodyMat);
    lowerTorso.name = 'lowerTorso';
    lowerTorso.position.y = 0.1;
    lowerTorso.castShadow = true;
    torso.add(lowerTorso);

    // Head - High quality solid posture mannequin block
    const headGroup = new THREE.Group();
    headGroup.name = 'headGroup';
    headGroup.position.y = 0.65;
    torso.add(headGroup);
    
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.15), bodyMat);
    neck.position.y = 0.05;
    headGroup.add(neck);

    // Matte head with clean organic scaling mimicking painting wooden/plastic drawing dummies (no helmet or glass mask)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32), 
      bodyMat
    );
    head.name = 'head';
    head.scale.set(1.0, 1.15, 1.05); // Oval/egg shaped vertical contour for elegance
    head.position.y = 0.28;
    head.castShadow = true;
    headGroup.add(head);

    // Arms with forearms
    const leftArm = createLimb('leftArm', 0.06, 0.3, bodyMat, { name: 'leftForearm', radius: 0.05, length: 0.3 });
    leftArm.position.set(0.25, 0.55, 0);
    torso.add(leftArm);

    const rightArm = createLimb('rightArm', 0.06, 0.3, bodyMat, { name: 'rightForearm', radius: 0.05, length: 0.3 });
    rightArm.position.set(-0.25, 0.55, 0);
    torso.add(rightArm);

    // Legs with lower legs
    const leftLeg = createLimb('leftLeg', 0.085, 0.45, bodyMat, { name: 'leftLowerLeg', radius: 0.07, length: 0.45 });
    leftLeg.position.set(0.12, 1.0, 0);

    const rightLeg = createLimb('rightLeg', 0.085, 0.45, bodyMat, { name: 'rightLowerLeg', radius: 0.07, length: 0.45 });
    rightLeg.position.set(-0.12, 1.0, 0);
    
    // Articulation base group wrapping upper torso and legs for coordinated whole-body rotation
    const articulationGroup = new THREE.Group();
    articulationGroup.name = 'articulationGroup';
    
    articulationGroup.add(torso);
    articulationGroup.add(leftLeg);
    articulationGroup.add(rightLeg);
    
    group.add(articulationGroup);

    // Selection Glow Ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.75, 64),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    ring.name = 'ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    return group;
  };

  const createPropMesh = (prop: PropInstance) => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ 
      color: prop.color,
      roughness: 0.5,
      metalness: 0.1
    });

    let mesh: THREE.Mesh | THREE.Group;

    switch (prop.type) {
      case 'cube':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        mesh.position.y = 0.5;
        break;
      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), mat);
        mesh.position.y = 0.5;
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), mat);
        mesh.position.y = 0.5;
        break;
      case 'table':
        mesh = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1), mat);
        top.position.y = 0.8;
        mesh.add(top);
        const legGeom = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([x, z]) => {
          const leg = new THREE.Mesh(legGeom, mat);
          leg.position.set(x, 0.4, z);
          mesh.add(leg);
        });
        break;
      case 'chair':
        mesh = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), mat);
        seat.position.y = 0.5;
        mesh.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.1), mat);
        back.position.set(0, 0.8, -0.2);
        mesh.add(back);
        const cLegGeom = new THREE.BoxGeometry(0.08, 0.5, 0.08);
        [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z]) => {
          const leg = new THREE.Mesh(cLegGeom, mat);
          leg.position.set(x, 0.25, z);
          mesh.add(leg);
        });
        break;
      case 'tree':
        mesh = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
        trunk.position.y = 0.5;
        mesh.add(trunk);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshStandardMaterial({ color: 0x2e7d32 }));
        foliage.position.y = 1.6;
        mesh.add(foliage);
        break;
      default:
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
        mesh.position.y = 0.25;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Selection Glow Ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.9, 64),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    ring.name = 'ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    return group;
  };

  const updateCharacterMesh = (group: THREE.Group, char: CharacterInstance) => {
    const torso = group.getObjectByName('torso') as THREE.Group;
    const upperTorso = group.getObjectByName('upperTorso') as THREE.Mesh;
    const lowerTorso = group.getObjectByName('lowerTorso') as THREE.Mesh;
    const headGroup = group.getObjectByName('headGroup') as THREE.Group;
    const leftArm = group.getObjectByName('leftArm') as THREE.Group;
    const rightArm = group.getObjectByName('rightArm') as THREE.Group;
    const leftLeg = group.getObjectByName('leftLeg') as THREE.Group;
    const rightLeg = group.getObjectByName('rightLeg') as THREE.Group;
    const leftForearm = group.getObjectByName('leftForearm') as THREE.Group;
    const rightForearm = group.getObjectByName('rightForearm') as THREE.Group;
    const leftLowerLeg = group.getObjectByName('leftLowerLeg') as THREE.Group;
    const rightLowerLeg = group.getObjectByName('rightLowerLeg') as THREE.Group;
    const ring = group.getObjectByName('ring') as THREE.Mesh;

    if (!torso || !headGroup || !leftArm || !rightArm || !leftLeg || !rightLeg || !ring) return;

    // Body Style scaling including overweight/heavy type as seen in pic 2 (fat green figure C)
    const t = char.bodyThickness || 1.0;
    if (char.bodyStyle === 'slim') {
      upperTorso.scale.set(0.8 * t, 1, 0.8 * t);
      lowerTorso.scale.set(0.85 * t, 1, 0.8 * t);
      lowerTorso.position.z = 0;
    } else if (char.bodyStyle === 'strong') {
      upperTorso.scale.set(1.4 * t, 1.1, 1.3 * t);
      lowerTorso.scale.set(1.2 * t, 1, 1.1 * t);
      lowerTorso.position.z = 0;
    } else if (char.bodyStyle === 'overweight') {
      upperTorso.scale.set(1.45 * t, 1.12, 1.35 * t);
      lowerTorso.scale.set(2.0 * t, 1.05, 1.9 * t); // beautiful thick tummy bulge
      lowerTorso.position.z = 0.12; // bulge belly out forward correctly
    } else {
      upperTorso.scale.set(1 * t, 1, 1 * t);
      lowerTorso.scale.set(1 * t, 1, 1 * t);
      lowerTorso.position.z = 0;
    }

    // Color update - Entire mannequin structure inherits exact same material color
    group.traverse((child) => {
      if ((child as any).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
        ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(char.color);
      }
    });

    // Articulation
    // Articulation base group for whole body adjustments
    const articulationGroup = group.getObjectByName('articulationGroup') as THREE.Group;
    if (articulationGroup) {
      articulationGroup.rotation.x = ((char.joints.bodyTiltFront || 0) * Math.PI) / 180;
      articulationGroup.rotation.y = ((char.joints.bodyTurn || 0) * Math.PI) / 180;
      articulationGroup.rotation.z = ((char.joints.bodyTiltSide || 0) * Math.PI) / 180;
    }

    // Head
    headGroup.rotation.x = ((char.joints.headPitch || 0) * Math.PI) / 180;
    headGroup.rotation.y = ((char.joints.headYaw || 0) * Math.PI) / 180;
    headGroup.rotation.z = ((char.joints.headRoll || 0) * Math.PI) / 180;
    
    // Chest / Torso
    torso.rotation.x = ((char.joints.torsoLean || 0) * Math.PI) / 180;
    torso.rotation.y = ((char.joints.torsoTurn || 0) * Math.PI) / 180;
    torso.rotation.z = ((char.joints.torsoTiltSide || 0) * Math.PI) / 180;
    
    // Arms
    // Pitch / Front Raise (local X)
    leftArm.rotation.x = ((char.joints.leftArmRaise || 0) * Math.PI) / 180;
    rightArm.rotation.x = ((char.joints.rightArmRaise || 0) * Math.PI) / 180;

    // Roll / Abduction (local Z) - Left Z is outward, Right -Z is outward
    leftArm.rotation.z = ((char.joints.leftArmLift || 0) * Math.PI) / 180;
    rightArm.rotation.z = -((char.joints.rightArmLift || 0) * Math.PI) / 180;

    // Yaw / Humeral twist (local Y)
    leftArm.rotation.y = ((char.joints.leftArmTwist || 0) * Math.PI) / 180;
    rightArm.rotation.y = -((char.joints.rightArmTwist || 0) * Math.PI) / 180;
    
    // Legs / Hips
    // Pitch / Front step (local X)
    leftLeg.rotation.x = ((char.joints.leftLegStep || 0) * Math.PI) / 180;
    rightLeg.rotation.x = ((char.joints.rightLegStep || 0) * Math.PI) / 180;

    // Roll / Abduction (local Z) - Left Z is outward, Right -Z is outward
    leftLeg.rotation.z = ((char.joints.leftLegAbduct || 0) * Math.PI) / 180;
    rightLeg.rotation.z = -((char.joints.rightLegAbduct || 0) * Math.PI) / 180;

    // Yaw / Twist (local Y)
    leftLeg.rotation.y = ((char.joints.leftLegTwist || 0) * Math.PI) / 180;
    rightLeg.rotation.y = -((char.joints.rightLegTwist || 0) * Math.PI) / 180;

    // Sub-joint Articulation (Elbows & Knees)
    // Elbows: Positive = bend forward (Flexion)
    if (leftForearm) leftForearm.rotation.x = ((char.joints.leftElbow || 0) * Math.PI) / 180;
    if (rightForearm) rightForearm.rotation.x = ((char.joints.rightElbow || 0) * Math.PI) / 180;
    // Knees: Positive = bend backward (Flexion)
    if (leftLowerLeg) leftLowerLeg.rotation.x = -((char.joints.leftKnee || 0) * Math.PI) / 180;
    if (rightLowerLeg) rightLowerLeg.rotation.x = -((char.joints.rightKnee || 0) * Math.PI) / 180;

    ring.visible = char.id === selectedCharId;
    // Selection pulse
    if (ring.visible) {
      ring.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.05);
    }
  };

  // Sync Characters & Props to Scene
  useEffect(() => {
    if (!sceneRef.current) return;

    // --- CHARACTER SYNC ---
    charMeshesRef.current.forEach((mesh, id) => {
      if (!characters.find(c => c.id === id)) {
        sceneRef.current?.remove(mesh);
        charMeshesRef.current.delete(id);
      }
    });

    characters.forEach((char, index) => {
      let group = charMeshesRef.current.get(char.id);
      let label = labelSpritesRef.current.get(char.id);
      
      const charName = char.type === 'advanced' ? \`角色 \${String.fromCharCode(65 + index)}\` : \`群众 \${index}\`;

      if (!group) {
        group = createCharacterMesh(char);
        group.userData.id = char.id;
        sceneRef.current?.add(group);
        charMeshesRef.current.set(char.id, group);
        
        label = createLabelSprite(charName);
        sceneRef.current?.add(label);
        labelSpritesRef.current.set(char.id, label);
      }
      
      group.position.set(char.position[0], char.position[1], char.position[2]);
      group.rotation.y = (char.rotation * Math.PI) / 180;
      group.scale.set(char.scale, char.scale, char.scale);
      updateCharacterMesh(group, char);

      if (label) {
        label.position.set(char.position[0], char.position[1] + 2.2 * char.scale, char.position[2]);
        label.visible = sceneSettings.showLabels;
      }
    });

    // Cleanup labels
    labelSpritesRef.current.forEach((sprite, id) => {
      if (!characters.find(c => c.id === id)) {
        sceneRef.current?.remove(sprite);
        labelSpritesRef.current.delete(id);
      }
    });

    // --- PROP SYNC ---
    propMeshesRef.current.forEach((mesh, id) => {
      if (!props.find(p => p.id === id)) {
        sceneRef.current?.remove(mesh);
        propMeshesRef.current.delete(id);
      }
    });

    props.forEach(prop => {
      let group = propMeshesRef.current.get(prop.id);
      if (!group) {
        group = createPropMesh(prop);
        group.userData.id = prop.id;
        sceneRef.current?.add(group);
        propMeshesRef.current.set(prop.id, group);
      }
      
      group.position.set(prop.position[0], prop.position[1], prop.position[2]);
      group.rotation.set(
        (prop.rotation[0] * Math.PI) / 180,
        (prop.rotation[1] * Math.PI) / 180,
        (prop.rotation[2] * Math.PI) / 180
      );
      group.scale.set(prop.scale[0], prop.scale[1], prop.scale[2]);

      const ring = group.getObjectByName('ring') as THREE.Mesh;
      if (ring) {
        ring.visible = prop.id === selectedPropId;
        if (ring.visible) ring.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.05);
      }
    });

    // --- TRANSFORM CONTROLS ATTACHMENT ---
    if (transformRef.current) {
      const selectedMesh = selectedCharId 
        ? charMeshesRef.current.get(selectedCharId) 
        : selectedPropId 
          ? propMeshesRef.current.get(selectedPropId) 
          : null;

      if (selectedMesh && transformMode !== 'none') {
        transformRef.current.attach(selectedMesh);
        transformRef.current.visible = true;
        transformRef.current.setMode(transformMode as any);
      } else {
        transformRef.current.detach();
        transformRef.current.visible = false;
      }
    }
  }, [characters, props, selectedCharId, selectedPropId, transformMode]);

  // Support dynamic updates to referenceImage prop
  useEffect(() => {
    if (referenceImage) {
      setSceneSettings(prev => ({ ...prev, panoramaImage: referenceImage }));
    }
  }, [referenceImage]);

  // Handle Reference Image Stand (Removed physical card stand since 360 VR panorama is now fully active)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Cleanup existing stand
    const existing = scene.getObjectByName('refStand');
    if (existing) {
      scene.remove(existing);
    }
  }, [referenceImage]);

  // Sync camera angle stats back to parent
  useEffect(() => {
    onParamsChange?.({ 
      characters, 
      props,
      cameras, 
      activeCamId,
      cameraStats,
      cinematicLabel: getCinematicDesc()
    });
  }, [cameraStats, characters, props, activeCamId]);

  // Sync Camera when activeCamId or activeTab changes
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    if (activeTab === 'shot') {
      const cam = cameras.find(c => c.id === activeCamId);
      if (cam) {
        transitionRef.current.targetPosition.set(...cam.position);
        transitionRef.current.targetLookAt.set(...cam.target);
        transitionRef.current.targetFov = cam.fov;
        transitionRef.current.active = true;
      }
    }
  }, [activeCamId, activeTab]);

  const generateCrowd = () => {
    const newCrowd: CharacterInstance[] = [];
    for (let i = 0; i < crowdParams.count; i++) {
      const row = Math.floor(i / (crowdParams.count / crowdParams.rows));
      const col = i % (crowdParams.count / crowdParams.rows);
      newCrowd.push({
        id: \`crowd-\${i}\`,
        type: 'crowd',
        position: [
          (col - (crowdParams.count / crowdParams.rows) / 2) * crowdParams.spacingX,
          0,
          (row + 1) * crowdParams.spacingZ
        ],
        rotation: 0,
        scale: 0.9 + Math.random() * 0.2,
        color: '#475569',
        bodyStyle: 'standard',
        bodyThickness: 1.0,
        joints: {
          headPitch: 0,
          headYaw: 0,
          headRoll: 0,
          bodyTiltFront: 0,
          bodyTurn: 0,
          bodyTiltSide: 0,
          torsoLean: 0,
          torsoTurn: 0,
          torsoTiltSide: 0,
          leftArmRaise: 0,
          leftArmLift: 15,
          leftArmTwist: 0,
          rightArmRaise: 0,
          rightArmLift: 15,
          rightArmTwist: 0,
          leftElbow: 0,
          rightElbow: 0,
          leftLegStep: 0,
          leftLegAbduct: 0,
          leftLegTwist: 0,
          rightLegStep: 0,
          rightLegAbduct: 0,
          rightLegTwist: 0,
          leftKnee: 0,
          rightKnee: 0,
        }
      });
    }
    setCharacters(prev => [...prev.filter(c => c.type === 'advanced'), ...newCrowd]);
    setShowCrowdGen(false);
  };

  const setPose = (pose: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== selectedCharId) return c;
      
      const resetJoints = {
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        bodyTiltFront: 0,
        bodyTurn: 0,
        bodyTiltSide: 0,
        torsoLean: 0,
        torsoTurn: 0,
        torsoTiltSide: 0,
        leftArmRaise: 0,
        leftArmLift: 15,
        leftArmTwist: 0,
        rightArmRaise: 0,
        rightArmLift: 15,
        rightArmTwist: 0,
        leftElbow: 0,
        rightElbow: 0,
        leftLegStep: 0,
        leftLegAbduct: 0,
        leftLegTwist: 0,
        rightLegStep: 0,
        rightLegAbduct: 0,
        rightLegTwist: 0,
        leftKnee: 0,
        rightKnee: 0,
      };

      if (pose === 'reset') {
        return { ...c, position: [c.position[0], 0, c.position[2]], rotation: 0, scale: 1.0, joints: resetJoints };
      }
      
      let newJoints = { ...resetJoints };
      if (pose === 'tpose') {
        newJoints = { ...resetJoints, leftArmLift: 90, rightArmLift: 90 };
      } else if (pose === 'walk') {
        newJoints = { ...resetJoints, leftLegStep: 30, rightLegStep: -30, leftArmLift: 15, rightArmLift: 15, leftElbow: 45, rightElbow: 45, leftKnee: 40, rightKnee: 20 };
      } else if (pose === 'run') {
        newJoints = { ...resetJoints, leftLegStep: 70, rightLegStep: -70, leftArmLift: 40, rightArmLift: 40, leftElbow: 100, rightElbow: 100, leftKnee: 90, rightKnee: 30, torsoLean: 25 };
      } else if (pose === 'sit') {
        newJoints = { ...resetJoints, leftLegStep: 90, rightLegStep: 90, leftKnee: 90, rightKnee: 90 };
      } else if (pose === 'squat') {
        newJoints = { ...resetJoints, leftLegStep: 70, rightLegStep: 70, leftKnee: 85, rightKnee: 85, torsoLean: 20, leftArmLift: 25, rightArmLift: 25, leftElbow: 45, rightElbow: 45 };
      } else if (pose === 'kneel_one') {
        newJoints = { ...resetJoints, leftLegStep: 60, leftKnee: 90, rightLegStep: -60, rightKnee: 90, torsoLean: 5, headPitch: 5 };
      } else if (pose === 'kneel_both') {
        newJoints = { ...resetJoints, leftLegStep: -45, rightLegStep: -45, leftKnee: 90, rightKnee: 90, torsoLean: 5 };
      } else if (pose === 'hips') {
        newJoints = { ...resetJoints, leftArmLift: 40, rightArmLift: 40, leftElbow: 110, rightElbow: 110, torsoLean: -5 };
      } else if (pose === 'lean') {
        newJoints = { ...resetJoints, torsoLean: -15, leftLegStep: 15, rightLegStep: -5, leftKnee: 10, leftArmLift: 15, rightArmLift: 15, leftElbow: 30, rightElbow: 30 };
      } else if (pose === 'bow') {
        newJoints = { ...resetJoints, torsoLean: 45, headPitch: 30, leftArmLift: 10, rightArmLift: 10 };
      } else if (pose === 'think') {
        newJoints = { ...resetJoints, rightArmLift: 20, rightElbow: 120, headPitch: 25, torsoLean: 10 };
      } else if (pose === 'fight') {
        newJoints = { ...resetJoints, leftLegStep: 30, rightLegStep: -30, leftKnee: 20, rightKnee: 10, leftArmLift: 45, rightArmLift: 45, leftElbow: 90, rightElbow: 90, torsoLean: 15, headPitch: 5 };
      } else if (pose === 'kick') {
        newJoints = { ...resetJoints, leftLegStep: -20, leftKnee: 10, rightLegStep: 75, rightKnee: 30, leftArmLift: 45, rightArmLift: 60, leftElbow: 30, rightElbow: 30, torsoLean: -15 };
      } else if (pose === 'throw') {
        newJoints = { ...resetJoints, leftLegStep: 40, rightLegStep: -30, leftArmLift: 45, leftElbow: 20, rightArmLift: 75, rightElbow: 75, torsoLean: 15, headPitch: -10 };
      } else if (pose === 'push') {
        newJoints = { ...resetJoints, leftLegStep: 45, leftKnee: 35, rightLegStep: -45, rightKnee: 15, leftArmLift: 70, leftElbow: 15, rightArmLift: 70, rightElbow: 15, torsoLean: 30 };
      } else if (pose === 'wave') {
        newJoints = { ...resetJoints, rightArmLift: 140, rightElbow: 45 };
      } else if (pose === 'reach') {
        newJoints = { ...resetJoints, rightArmLift: 75, rightElbow: 15, leftArmLift: 20, leftElbow: 10, torsoLean: 10 };
      } else if (pose === 'cross_arms') {
        newJoints = { ...resetJoints, leftArmLift: 30, leftElbow: 95, rightArmLift: 30, rightElbow: 95 };
      } else if (pose === 'phone') {
        newJoints = { ...resetJoints, rightArmLift: 35, rightElbow: 110, headPitch: 25, torsoLean: 5, leftArmLift: 10, leftElbow: 30 };
      } else if (pose === 'fig1') {
        newJoints = { ...resetJoints, leftArmLift: 25, rightArmLift: 25, leftElbow: 45, rightElbow: 45, torsoLean: 5, bodyTurn: 10 };
      } else if (pose === 'fig2') {
        newJoints = { ...resetJoints, rightArmLift: 90, rightElbow: 10, leftArmLift: 30, leftElbow: 80, torsoTurn: 15, headYaw: 15 };
      } else if (pose === 'fig3') {
        newJoints = { ...resetJoints, leftArmLift: 15, leftElbow: 30, rightArmLift: 50, rightElbow: 90, leftLegStep: 20, rightLegStep: -20, leftKnee: 25, rightKnee: 10 };
      }

      return { ...c, joints: newJoints };
    }));
  };

  // Reactivity for Scene Settings & Lights
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Sky color
    if (!sceneSettings.panoramaImage) {
      scene.background = new THREE.Color(sceneSettings.skyColor);
    }
    
    // Floor controls
    const reflector = scene.getObjectByName('ground-refl') as Reflector; // Changed to match possible rename or partial
    const realReflector = scene.getObjectByName('ground-reflector') as Reflector;
    const activeReflector = realReflector || reflector;

    if (activeReflector) {
      activeReflector.position.y = sceneSettings.floorHeight - 0.01;
      activeReflector.visible = !resolvedPanoramaBlob;
    }

    const grid = scene.getObjectByName('grid-helper');
    const axes = scene.getObjectByName('axes-helper');
    const stageRing = scene.getObjectByName('stage-ring');
    const northArrow = scene.getObjectByName('north-arrow');
    const camModel = scene.getObjectByName('camera-model');
    const camGizmos = scene.getObjectByName('camera-gizmos');
    const targetMarker = scene.getObjectByName('target-marker');
    const cycGroup = scene.getObjectByName('cyc-group');
    const shadowCatcher = scene.getObjectByName('shadow-catcher');

    if (grid) {
      // Hide grid when panorama is active for better fusion, unless explicitly toggled
      grid.visible = resolvedPanoramaBlob ? false : sceneSettings.showGrid;
      grid.position.y = sceneSettings.floorHeight;
    }
    if (shadowCatcher) {
      shadowCatcher.visible = true;
      shadowCatcher.position.y = sceneSettings.floorHeight + 0.005;
      if ((shadowCatcher as THREE.Mesh).material) {
        ((shadowCatcher as THREE.Mesh).material as THREE.ShadowMaterial).opacity = resolvedPanoramaBlob ? sceneSettings.floorOpacity : 0.2;
      }
    }
    
    const hasSelection = !!selectedCharId;
    const selectedMesh = selectedCharId ? charMeshesRef.current.get(selectedCharId) : null;

    // Global visibility control for all helper elements
    if (axes) {
      if (hasSelection && selectedMesh) {
        axes.position.copy(selectedMesh.position);
        axes.visible = showHelpers;
      } else {
        axes.visible = false;
      }
    }
    if (stageRing) {
      if (hasSelection && selectedMesh) {
        stageRing.position.set(selectedMesh.position.x, 0.02, selectedMesh.position.z);
        stageRing.visible = showHelpers;
      } else {
        stageRing.visible = false;
      }
    }
    if (northArrow) {
      if (hasSelection && selectedMesh) {
        northArrow.position.set(selectedMesh.position.x, 0.05, selectedMesh.position.z);
        northArrow.visible = showHelpers;
      } else {
        northArrow.visible = false;
      }
    }
    
    // Interaction between tab mode and helper visibility
    if (camModel) camModel.visible = activeTab === 'director' && showHelpers;
    if (camGizmos) camGizmos.visible = activeTab === 'director' && showHelpers && hasSelection;
    if (targetMarker) targetMarker.visible = activeTab === 'director' && showHelpers && hasSelection;

    const aziBall = scene.getObjectByName('azi-ball');
    const eleBall = scene.getObjectByName('ele-ball');
    if (aziBall) {
      aziBall.visible = activeTab === 'director' && showHelpers && hasSelection;
    }
    if (eleBall) {
      eleBall.visible = activeTab === 'director' && showHelpers && hasSelection;
    }
    
    // Panorama and Cyclorama logic
    if (resolvedPanoramaBlob) {
      if (cycGroup) cycGroup.visible = false;
      
      if (!scene.background || (scene.background as any).originalSrc !== sceneSettings.panoramaImage) {
        const loader = new THREE.TextureLoader();
        if (!resolvedPanoramaBlob.startsWith('blob:') && !resolvedPanoramaBlob.startsWith('data:')) {
          loader.setCrossOrigin('anonymous');
        }
        loader.load(
          resolvedPanoramaBlob, 
          (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            (texture as any).originalSrc = sceneSettings.panoramaImage!;
            
            scene.background = texture;
            scene.environment = texture;
            
            // Force update for some cases
            scene.traverse((obj) => {
              if ((obj as any).isMesh && (obj as any).material.envMap === undefined) {
                (obj as any).material.needsUpdate = true;
              }
            });
          },
          undefined,
          (err) => {
            console.error("[DirectorStage] Error loading panorama background texture:", err);
          }
        );
      }
      
      // Handle rotation for scene background
      if (scene.background && (scene.background as any).isTexture) {
        const rotationVal = (sceneSettings.panoramaRotation * Math.PI) / 180;
        // In newer three.js, we can use backgroundRotation
        if ((scene as any).backgroundRotation) {
          (scene as any).backgroundRotation.y = rotationVal;
        }
        if ((scene as any).environmentRotation) {
          (scene as any).environmentRotation.y = rotationVal;
        }
      }
    } else {
      if (cycGroup) cycGroup.visible = true;
      if (!scene.background || !(scene.background as any).isColor) {
        scene.background = new THREE.Color(sceneSettings.skyColor);
      }
      scene.environment = null;
    }

    // Apply light presets
    const main = scene.getObjectByName('main-light') as THREE.DirectionalLight;
    const rim = scene.getObjectByName('rim-light') as THREE.PointLight;
    const fill = scene.getObjectByName('fill-light') as THREE.PointLight;

    if (main && rim && fill) {
      // Apply sun direction from settings
      const phi = (90 - sceneSettings.sunElevation) * (Math.PI / 180);
      const theta = (sceneSettings.sunRotation) * (Math.PI / 180);
      main.position.setFromSphericalCoords(20, phi, theta);
      main.castShadow = true;
      main.shadow.mapSize.width = 1024;
      main.shadow.mapSize.height = 1024;
      main.shadow.camera.near = 0.5;
      main.shadow.camera.far = 100;
      main.shadow.camera.left = -20;
      main.shadow.camera.right = 20;
      main.shadow.camera.top = 20;
      main.shadow.camera.bottom = -20;

      if (scene.environment) {
         // Apply environment intensity if using panorama
         (scene as any).environmentIntensity = sceneSettings.environmentIntensity;
      }

      if (lightPreset === 'studio') {
        main.intensity = 1.2; main.color.set(0xffffff);
        fill.intensity = 5; fill.color.set(0xffffff);
        rim.intensity = 15; rim.color.set(0x6366f1);
      } else if (lightPreset === 'daylight') {
        main.intensity = 2.5; main.color.set(0xfff0dd);
        fill.intensity = 1; fill.color.set(0xffffff);
        rim.intensity = 0; 
      } else if (lightPreset === 'noir') {
        main.intensity = 0.5; main.color.set(0xffffff);
        fill.intensity = 0;
        rim.intensity = 40; rim.color.set(0xffffff);
        rim.position.set(-15, 8, -5);
      } else if (lightPreset === 'cinematic') {
        main.intensity = 1.0; main.color.set(0x0ea5e9);
        fill.intensity = 2; fill.color.set(0xf43f5e);
        rim.intensity = 25; rim.color.set(0xeab308);
      }
    }
  }, [sceneSettings, lightPreset, showHelpers, activeTab, selectedCharId, characters, resolvedPanoramaBlob]);

  const applyScenePreset = (presetId: string) => {
    const baseChar: CharacterInstance = characters[0] || { 
      id: 'char-1', 
      type: 'advanced', 
      position: [0, 0, 0], 
      rotation: 0, 
      scale: 1, 
      color: '#6366f1', 
      bodyStyle: 'standard', 
      bodyThickness: 1.0,
      joints: { 
        headPitch: 0, 
        headYaw: 0, 
        headRoll: 0, 
        bodyTiltFront: 0, 
        bodyTurn: 0, 
        bodyTiltSide: 0, 
        torsoLean: 0, 
        torsoTurn: 0, 
        torsoTiltSide: 0, 
        leftArmRaise: 0, 
        leftArmLift: 15, 
        leftArmTwist: 0, 
        rightArmRaise: 0, 
        rightArmLift: 15, 
        rightArmTwist: 0, 
        leftElbow: 0, 
        rightElbow: 0, 
        leftLegStep: 0, 
        leftLegAbduct: 0, 
        leftLegTwist: 0, 
        rightLegStep: 0, 
        rightLegAbduct: 0, 
        rightLegTwist: 0, 
        leftKnee: 0, 
        rightKnee: 0 
      } 
    };

    switch (presetId) {
      case 'interview':
        setCharacters([
          { ...baseChar, id: 'char-1', position: [-1, 0, 0], rotation: 90 },
          { ...baseChar, id: 'char-2', position: [1, 0, 0], rotation: -90, color: '#ec4899' }
        ]);
        setProps([
          { id: 'prop-table', type: 'table', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#475569' },
          { id: 'prop-chair-1', type: 'chair', position: [-1.2, 0, 0], rotation: [0, 90, 0], scale: [1, 1, 1], color: '#334155' },
          { id: 'prop-chair-2', type: 'chair', position: [1.2, 0, 0], rotation: [0, -90, 0], scale: [1, 1, 1], color: '#334155' },
        ]);
        break;
      case 'confrontation':
        setCharacters([
          { ...baseChar, id: 'char-1', position: [0, 0, -2], rotation: 180 },
          { ...baseChar, id: 'char-2', position: [0, 0, 2], rotation: 0, color: '#ef4444' }
        ]);
        setProps([]);
        break;
      case 'chase':
        setCharacters([
          { ...baseChar, id: 'char-1', position: [0, 0, 5], rotation: 0 },
          { ...baseChar, id: 'char-2', position: [0, 0, 0], rotation: 0, color: '#f59e0b' }
        ]);
        setProps([
          { id: 'prop-box-1', type: 'cube', position: [-2, 0, 2], rotation: [0, 0, 0], scale: [1, 2, 1], color: '#1e293b' },
          { id: 'prop-box-2', type: 'cube', position: [2, 0, 8], rotation: [0, 45, 0], scale: [1, 1.5, 1], color: '#1e293b' },
        ]);
        break;
      case 'crowd':
        const crowd: CharacterInstance[] = [];
        for (let i = 0; i < 6; i++) {
          crowd.push({
            ...baseChar,
            id: \`char-crowd-\${i}\`,
            type: 'advanced',
            position: [(Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8],
            rotation: Math.random() * 360,
            color: '#334155'
          });
        }
        setCharacters(crowd);
        setProps([]);
        break;
    }
  };

  const getCinematicDesc = () => {
    const { azimuth, elevation, distance } = cameraStats;
    let aziDesc = "正面视图";
    
    // Normalize azimuth to 0-360
    const a = ((azimuth % 360) + 360) % 360;
    
    if (a > 345 || a <= 15) aziDesc = "正面直击";
    else if (a > 15 && a <= 45) aziDesc = "前侧面微斜";
    else if (a > 45 && a <= 75) aziDesc = "侧前方视角";
    else if (a > 75 && a <= 105) aziDesc = "正侧面平拍";
    else if (a > 105 && a <= 135) aziDesc = "侧后方视角";
    else if (a > 135 && a <= 165) aziDesc = "三四分之一后背";
    else if (a > 165 && a <= 195) aziDesc = "正后方跟踪";
    else if (a > 195 && a <= 225) aziDesc = "左三四分之一后背";
    else if (a > 225 && a <= 255) aziDesc = "左侧后视角";
    else if (a > 255 && a <= 285) aziDesc = "左侧面视角";
    else if (a > 285 && a <= 315) aziDesc = "左侧前视角";
    else if (a > 315 && a <= 345) aziDesc = "左三四分之一正面";

    let eleDesc = "平视镜头";
    if (elevation > 50) eleDesc = "上帝视角";
    else if (elevation > 30) eleDesc = "高角度俯拍";
    else if (elevation > 12) eleDesc = "俯拍视角";
    else if (elevation < -40) eleDesc = "极低仰拍";
    else if (elevation < -15) eleDesc = "仰视镜头";
    else if (elevation < -5) eleDesc = "微仰视角";

    let distDesc = "中景";
    if (distance > 35) distDesc = "极远景";
    else if (distance > 22) distDesc = "远景";
    else if (distance > 15) distDesc = "全景";
    else if (distance > 10) distDesc = "中远景";
    else if (distance < 2.5) distDesc = "极特写";
    else if (distance < 4.5) distDesc = "特写";
    else if (distance < 7.5) distDesc = "中近景";

    return \`\${aziDesc} • \${eleDesc} • \${distDesc}\`;
  };

  const takeSnapshot = () => {
    if (!rendererRef.current || !containerRef.current || !sceneRef.current || !cameraRef.current) return;
    
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 500);

    try {
      const canvas = rendererRef.current.domElement;
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = \`composition_\${Date.now()}.png\`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Snapshot failed:", err);
      alert("截图失败，请重试");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#06080f] overflow-hidden text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Universal Top Header */}
      <div className="h-10 bg-[#0a0b14] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-[60]">
        <div className="flex items-center space-x-2">
           <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
             <Layout className="w-3 h-3 text-white" />
           </div>
           <span className="text-[11px] font-black tracking-tight uppercase opacity-80">3D导演台 v2.0</span>
        </div>
        
        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('director')}
            className={cn(
              "px-3 py-1 rounded-md text-[10px] font-black transition-all",
              activeTab === 'director' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            导演视角
          </button>
        </div>

        <div></div>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
    {/* Left Navigator (Assets/Cameras/Actors) */}
    <div className={cn("w-64 bg-[#0a0b14] border-r border-white/5 flex flex-col shrink-0 z-50 transition-all duration-500 translate-x-0 font-sans", !showUI && "-translate-x-full w-0 border-r-0")}>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar">
        <div className="relative mb-4">
           <input 
            type="text"
            placeholder="搜索资产 (名称/编号)..."
            value={leftSidebarSearch}
            onChange={(e) => setLeftSidebarSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
           />
           <Search className="w-3.5 h-3.5 text-slate-700 absolute left-3.5 top-1/2 -translate-y-1/2 rotate-0" />
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar">
          {/* Actors Category */}
          <div className="space-y-0.5 group/cat">
             <div className="flex items-center justify-between hover:bg-white/5 rounded-lg pr-2 transition-colors">
               <button 
                onClick={() => toggleCategory('actors')}
                className="flex-1 flex items-center space-x-2 px-2 py-2"
               >
                  <ChevronRight className={cn("w-2.5 h-2.5 text-slate-600 transition-transform", expandedCategories.includes('actors') && "rotate-90")} />
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">角色</span>
                  <span className="text-[9px] font-mono text-slate-800 font-bold ml-1">{characters.filter(c => c.type === 'advanced').length}</span>
               </button>
               <button 
                onClick={(e) => { e.stopPropagation(); addCharacter('advanced'); }}
                className="p-1 hover:text-indigo-400 text-slate-700 transition-colors opacity-0 group-hover/cat:opacity-100"
               >
                 <Plus className="w-2.5 h-2.5" />
               </button>
             </div>
             {expandedCategories.includes('actors') && (
               <div className="pl-6 space-y-1 py-1">
                  {characters.filter(c => c.type === 'advanced' && (c.id.toLowerCase().includes(leftSidebarSearch.toLowerCase()))).map((char, i) => (
                    <div key={char.id} className="group/item relative">
                      <button 
                        onClick={() => { setSelectedCharId(char.id); setSelectedPropId(''); setSelectionMode('character'); setPropertyTab('properties'); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all border",
                          selectedCharId === char.id ? "bg-indigo-500/10 text-white border-indigo-500/30" : "text-slate-500 border-transparent hover:bg-slate-800"
                        )}
                      >
                         <div className="flex items-center space-x-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", selectedCharId === char.id ? "bg-indigo-400" : "bg-slate-700")} />
                            <span>角色 {String.fromCharCode(65 + i)}</span>
                         </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all",
                          selectedCharId === char.id && "opacity-100"
                        )}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
               </div>
             )}
          </div>

              {/* Crowd Category */}
              <div className="space-y-0.5 group/cat">
                 <div className="flex items-center justify-between hover:bg-white/5 rounded-lg pr-2 transition-colors">
                   <button 
                    onClick={() => toggleCategory('crowd')}
                    className="flex-1 flex items-center space-x-2 px-2 py-2"
                   >
                      <ChevronRight className={cn("w-2.5 h-2.5 text-slate-600 transition-transform", expandedCategories.includes('crowd') && "rotate-90")} />
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">群体</span>
                   </button>
                   {characters.some(c => c.type === 'crowd') && (
                     <button 
                      onClick={(e) => { e.stopPropagation(); setCharacters(prev => prev.filter(c => c.type !== 'crowd')); }}
                      className="p-1 hover:text-red-500 text-slate-700 transition-colors opacity-0 group-hover/cat:opacity-100"
                      title="清除群体"
                     >
                       <Trash2 className="w-2.5 h-2.5" />
                     </button>
                   )}
                 </div>
                 {expandedCategories.includes('crowd') && (
                    <div className="pl-6 space-y-1 py-1">
                       <button 
                         onClick={() => setShowCrowdGen(true)}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-white/5 transition-all border border-white/5"
                        >
                           <Box className="w-3 h-3" />
                           <span>群体分布编辑器</span>
                        </button>
                    </div>
                  )}


              </div>
            </div>
          </div>
        </div>
        {/* Main 3D Viewport Area */}
        <div className="flex-1 relative bg-[#06080f] overflow-hidden">
          <div ref={containerRef} className="absolute inset-0 cursor-move" />
          
          <AnimatePresence>
            {showFlash && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-[100] bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>
          
          {/* Viewport Labels / Overlays */}
          <div className="absolute top-6 left-6 pointer-events-none">
            <h2 className="text-xl font-black text-white/5 tracking-tighter uppercase select-none">3D 导演视角</h2>
            <div className="mt-2 flex bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 w-fit">
              <span className="text-[10px] font-black text-indigo-400 tracking-wider uppercase">当前场景 • {activeTab === 'director' ? '编辑模式' : '预览模式'}</span>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 text-[9px] font-mono font-bold text-slate-400 select-none">
              坐标: {cameraStats.azimuth}°, {cameraStats.elevation}°, {cameraStats.distance}m
            </div>
          </div>

          {/* Floating Bottom Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center px-4 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/5 shadow-2xl space-x-1 z-50">
            <button 
              onClick={() => setTransformMode(transformMode === 'translate' ? 'none' : 'translate')}
              className={cn("p-2.5 rounded-full transition-all", transformMode === 'translate' ? "text-indigo-400 bg-indigo-500/10 shadow-inner scale-110" : "text-slate-400 hover:text-white")}
              title="移动工具"
            >
              <Move className={cn("w-4 h-4", transformMode === 'translate' && "fill-current")} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => addCharacter('advanced')}
              className="p-2.5 text-slate-400 hover:text-white rounded-full transition-all hover:bg-white/5"
              title="添加角色"
            >
              <User className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowCrowdGen(true)}
              className="p-2.5 text-slate-400 hover:text-white rounded-full transition-all hover:bg-white/5"
              title="群体"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => {
                const newState = !sceneSettings.showGrid;
                setSceneSettings(prev => ({ ...prev, showGrid: newState }));
                setShowHelpers(newState);
              }}
              className={cn("p-2.5 rounded-full transition-all", sceneSettings.showGrid ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:text-white")}
              title="显示辅助图形"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSceneSettings(prev => ({ ...prev, showLabels: !prev.showLabels }))}
              className={cn("p-2.5 rounded-full transition-all", sceneSettings.showLabels ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 hover:text-white")}
              title="角色标签"
            >
              <Maximize className="w-4 h-4" />
            </button>
             <button 
              onClick={() => setShowUI(!showUI)}
              className={cn("p-2.5 rounded-full transition-all ml-4", !showUI ? "text-indigo-400 bg-indigo-500/10 shadow-lg scale-110" : "text-slate-400 hover:text-white")}
              title="沉浸模式 (隐藏UI)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className={cn("w-80 bg-[#0a0b14] border-l border-white/5 flex flex-col shrink-0 z-50 transition-all duration-500 translate-x-0 font-sans", !showUI && "translate-x-full w-0 border-l-0")}>
          <div className="flex bg-black/60 border-b border-white/5 p-1">
             <button 
              onClick={() => setPropertyTab('properties')}
              className={cn("flex-1 py-1.5 text-[10px] font-black rounded-md transition-all", propertyTab === 'properties' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
             >
              对象
             </button>
             <button 
              onClick={() => setPropertyTab('environment')}
              className={cn("flex-1 py-1.5 text-[10px] font-black rounded-md transition-all", propertyTab === 'environment' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
             >
              全景工坊
             </button>
             <button 
              onClick={() => setPropertyTab('library')}
              className={cn("flex-1 py-1.5 text-[10px] font-black rounded-md transition-all", propertyTab === 'library' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300")}
             >
              预设
             </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-8">
            <AnimatePresence mode="wait">
              {propertyTab === 'environment' ? (
                <motion.div 
                  key="env-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2 pt-2">
                           <span className="text-[9px] font-bold text-slate-600 uppercase mb-1">手动上传素材</span>
                           <button 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (re) => {
                                    setSceneSettings(prev => ({ ...prev, panoramaImage: re.target?.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-center group overflow-hidden relative"
                           >
                              {sceneSettings.panoramaImage ? (
                                <div className="relative w-full h-24">
                                  <img src={sceneSettings.panoramaImage} className="w-full h-full object-cover rounded-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <RefreshCcw className="w-5 h-5 text-white shadow-xl" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                   <Plus className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 mb-1" />
                                   <span className="text-[9px] font-black text-slate-600 uppercase">点击上传全景贴图</span>
                                </div>
                              )}
                           </button>
                           {sceneSettings.panoramaImage && (
                             <button 
                              onClick={() => setSceneSettings(prev => ({ ...prev, panoramaImage: null }))}
                              className="text-[9px] font-bold text-red-500/50 hover:text-red-500 text-right uppercase"
                             >
                              移除背景
                             </button>
                           )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">背景水平旋转</span>
                          <span className="text-[10px] font-mono font-bold text-indigo-400">{sceneSettings.panoramaRotation}°</span>
                        </div>
                        <input 
                          type="range"
                          min="0" max="360"
                          value={sceneSettings.panoramaRotation}
                          onChange={(e) => setSceneSettings(prev => ({ ...prev, panoramaRotation: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">远近调整 (视角)</span>
                          <span className="text-[10px] font-mono font-bold text-indigo-400">{sceneSettings.cameraFov ?? 42}°</span>
                        </div>
                        <input 
                          type="range"
                          min="15" max="95"
                          value={sceneSettings.cameraFov ?? 42}
                          onChange={(e) => setSceneSettings(prev => ({ ...prev, cameraFov: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">网格控制</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <button 
                            onClick={() => {
                              const newState = !sceneSettings.showGrid;
                              setSceneSettings(prev => ({ ...prev, showGrid: newState }));
                              setShowHelpers(newState);
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg border text-[9px] font-black transition-all",
                              sceneSettings.showGrid ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "bg-white/5 border-white/5 text-slate-600"
                            )}
                           >
                             <span>显示辅助</span>
                             <div className={cn("w-1.5 h-1.5 rounded-full", sceneSettings.showGrid ? "bg-indigo-400" : "bg-slate-800")} />
                           </button>
                           <button 
                            onClick={() => setSceneSettings(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-lg border text-[9px] font-black transition-all",
                              sceneSettings.snapToGrid ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/5 text-slate-600"
                            )}
                           >
                             <span>网格吸附</span>
                             <div className={cn("w-1.5 h-1.5 rounded-full", sceneSettings.snapToGrid ? "bg-emerald-400" : "bg-slate-800")} />
                           </button>
                        </div>
                    </div>
                  </div>
                </motion.div>
               ) : propertyTab === 'library' ? (
                <motion.div 
                  key="lib-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">导演布局预设</span>
                  <div className="grid grid-cols-1 gap-3">
                       {[
                         { id: 'interview', label: '两人访谈', desc: '经典访谈对角线构图', icon: User },
                         { id: 'confrontation', label: '峙势构图', desc: '视线引导与景深分布', icon: Maximize },
                         { id: 'chase', label: '追逐叙事', desc: '运动模糊与前后景追踪', icon: Play },
                         { id: 'crowd', label: '空间站位', desc: '群体空间节奏演示', icon: Layers },
                       ].map(preset => (
                       <button 
                        key={preset.id}
                        onClick={() => applyScenePreset(preset.id)}
                        className="w-full text-left p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                       >
                         <div className="flex items-center space-x-3 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                               <preset.icon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{preset.label}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{preset.desc}</p>
                       </button>
                     ))}
                  </div>
                </motion.div>
              ) : propertyTab === 'properties' ? (
                <motion.div 
                  key="props-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">资产清单</span>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar pr-1">
                      {characters.map(char => (
                        <button 
                          key={char.id}
                          onClick={() => { setSelectedCharId(char.id); setSelectedPropId(''); }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all border",
                            selectedCharId === char.id ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/40" : "bg-white/5 text-slate-500 border-transparent hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                             <User className="w-3.5 h-3.5" />
                             <span>{char.type === 'advanced' ? '主角' : '群演'} - {char.id.slice(-4)}</span>
                          </div>
                          {selectedCharId === char.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                        </button>
                      ))}
                      {props.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => { setSelectedPropId(p.id); setSelectedCharId(''); }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all border",
                            selectedPropId === p.id ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" : "bg-white/5 text-slate-500 border-transparent hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                             <Box className="w-3.5 h-3.5" />
                             <span>道具: {p.type === 'cube' ? '立方体' : p.type === 'sphere' ? '球体' : p.type === 'cylinder' ? '圆柱' : p.type === 'table' ? '桌子' : p.type === 'chair' ? '椅子' : p.type === 'tree' ? '树木' : p.type}</span>
                          </div>
                          {selectedPropId === p.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">快捷添加道具</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: 'cube', label: '正方', icon: Box },
                        { type: 'sphere', label: '球体', icon: RotateCw },
                        { type: 'chair', label: '座椅', icon: User },
                        { type: 'table', label: '长桌', icon: Layout },
                      ].map(p => (
                        <button 
                          key={p.type}
                          onClick={() => addProp(p.type as any)}
                          className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                        >
                          <p.icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 mb-1" />
                          <span className="text-[8px] font-bold text-slate-600 group-hover:text-slate-300">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCharId ? (
                    <React.Fragment>
                      <div className="space-y-6 pt-4 border-t border-white/5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">位置与变换</span>
                           <button 
                             onClick={() => setTransformMode(transformMode === 'translate' ? 'none' : 'translate')}
                             className={cn(
                               "flex items-center space-x-1.5 px-2 py-1 rounded-md transition-all border",
                               transformMode === 'translate' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-white/5 text-slate-500 border-white/5"
                             )}
                           >
                             <Move className="w-3 h-3" />
                             <span className="text-[9px] font-black">启用移动工具</span>
                           </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                           {['x', 'y', 'z'].map((axis, idx) => (
                             <div key={axis} className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-600 uppercase pl-1">{axis} 坐标</span>
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={selectedChar?.position?.[idx]?.toFixed(1) || '0.0'}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      setCharacters(prev => prev.map(c => {
                                        if (c.id === selectedCharId) {
                                          const newPos = [...c.position] as [number, number, number];
                                          newPos[idx] = val;
                                          return { ...c, position: newPos };
                                        }
                                        return c;
                                      }));
                                    }
                                  }}
                                  className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2 text-[10px] font-mono text-white focus:outline-none focus:border-indigo-500/30"
                                />
                             </div>
                           ))}
                           
                           <div className="space-y-1.5 col-span-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">缩放大小 (Scale)</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round((selectedChar?.scale || 1.0) * 100)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0.1" max="5.0" step="0.1"
                                value={selectedChar?.scale || 1.0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, scale: val } : c));
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                              />
                           </div>

                           <div className="space-y-1.5 col-span-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">角色宽窄 (Thickness)</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-400">{(selectedChar?.bodyThickness || 1.0).toFixed(1)}x</span>
                              </div>
                              <input 
                                type="range"
                                min="0.5" max="3.0" step="0.1"
                                value={selectedChar?.bodyThickness || 1.0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, bodyThickness: val } : c));
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                              />
                           </div>

                           <div className="space-y-1.5 col-span-3">
                              <span className="text-[9px] font-bold text-slate-600 uppercase pl-1">体型风格 (Body Type)</span>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[
                                  { id: 'slim', label: '偏瘦' },
                                  { id: 'standard', label: '标准' },
                                  { id: 'strong', label: '结实' },
                                  { id: 'overweight', label: '偏胖' }
                                ].map(style => (
                                  <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => {
                                      setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, bodyStyle: style.id as any } : c));
                                    }}
                                    className={cn(
                                      "py-1.5 rounded-lg border text-[9px] font-bold transition-all text-center",
                                      selectedChar?.bodyStyle === style.id
                                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-extrabold"
                                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300"
                                    )}
                                  >
                                    {style.label}
                                  </button>
                                ))}
                              </div>
                           </div>

                           <div className="space-y-1.5 col-span-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">水平旋转 (Rotation)</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(selectedChar?.rotation || 0)}°</span>
                              </div>
                              <input 
                                type="range"
                                min="0" max="360" step="1"
                                value={selectedChar?.rotation || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, rotation: val } : c));
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                              />
                           </div>
                        </div>
                      </div>
                    </div>

                      <div className="space-y-6 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">骨骼调节</span>
                         <button onClick={() => setCharacters(prev => prev.filter(c => c.id !== selectedCharId))} className="text-slate-600 hover:text-red-500 transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        {['#3b82f6', '#10b981', '#dc2626', '#ea580c', '#e2e8f0', '#475569'].map(c => (
                          <button 
                            key={c}
                            onClick={() => setCharacters(prev => prev.map(char => char.id === selectedCharId ? { ...char, color: c } : char))}
                            className={cn("w-5 h-5 rounded-full border-2", selectedChar?.color === c ? "border-white" : "border-transparent")}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 block mb-3">预设姿态 (基础动作)</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'fig1', label: '图1姿势', icon: User },
                            { id: 'fig2', label: '图2姿势', icon: Accessibility },
                            { id: 'fig3', label: '图3姿势', icon: Sparkles },
                            { id: 'reset', label: '站立', icon: User },
                            { id: 'tpose', label: 'T型', icon: Accessibility },
                            { id: 'walk', label: '行走', icon: Move },
                            { id: 'run', label: '跑步', icon: Zap },
                            { id: 'sit', label: '坐姿', icon: Box },
                            { id: 'squat', label: '蹲下', icon: ChevronDown },
                            { id: 'kneel_one', label: '单膝跪', icon: Compass },
                            { id: 'kneel_both', label: '双膝跪', icon: Anchor },
                            { id: 'hips', label: '叉腰', icon: RefreshCcw },
                            { id: 'lean', label: '倚靠', icon: Flame },
                            { id: 'bow', label: '鞠躬', icon: ChevronRight },
                            { id: 'think', label: '思考', icon: Search },
                            { id: 'fight', label: '格斗', icon: Shield },
                            { id: 'kick', label: '踢球', icon: RotateCw },
                            { id: 'throw', label: '投掷', icon: Sparkles },
                            { id: 'push', label: '推进', icon: ArrowRight },
                            { id: 'wave', label: '招手', icon: Hand },
                            { id: 'reach', label: '伸手', icon: Hand },
                            { id: 'cross_arms', label: '抱臂', icon: Layers },
                            { id: 'phone', label: '看手机', icon: Smartphone },
                          ].map(pose => (
                            <button 
                              key={pose.id}
                              onClick={() => setPose(pose.id)}
                              className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group"
                            >
                              <pose.icon className="w-3.5 h-3.5 mb-1 text-slate-400 group-hover:text-white transition-colors" />
                              <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-300">{pose.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-2">骨骼调节 (细调 - 姿势参数)</span>
                        <div className="space-y-5">
                          {[
                            {
                              title: '身体',
                              sliders: [
                                { key: 'bodyTiltFront', label: '前倾', min: -90, max: 90 },
                                { key: 'bodyTurn', label: '转身', min: -180, max: 180 },
                                { key: 'bodyTiltSide', label: '侧倾', min: -90, max: 90 },
                              ]
                            },
                            {
                              title: '躯干',
                              sliders: [
                                { key: 'torsoLean', label: '前倾', min: -90, max: 90 },
                                { key: 'torsoTurn', label: '扭转', min: -90, max: 90 },
                                { key: 'torsoTiltSide', label: '侧倾', min: -90, max: 90 },
                              ]
                            },
                            {
                              title: '头部',
                              sliders: [
                                { key: 'headPitch', label: '点头', min: -60, max: 60 },
                                { key: 'headYaw', label: '转头', min: -90, max: 90 },
                                { key: 'headRoll', label: '歪头', min: -60, max: 60 },
                              ]
                            },
                            {
                              title: '手臂 — 肩',
                              sides: [
                                {
                                  label: '左',
                                  badge: '左',
                                  badgeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                                  sliders: [
                                    { key: 'leftArmRaise', label: '前举', min: -180, max: 180 },
                                    { key: 'leftArmLift', label: '外展', min: -180, max: 180 },
                                    { key: 'leftArmTwist', label: '扭转', min: -180, max: 180 },
                                  ]
                                },
                                {
                                  label: '右',
                                  badge: '右',
                                  badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                  sliders: [
                                    { key: 'rightArmRaise', label: '前举', min: -180, max: 180 },
                                    { key: 'rightArmLift', label: '外展', min: -180, max: 180 },
                                    { key: 'rightArmTwist', label: '扭转', min: -180, max: 180 },
                                  ]
                                }
                              ]
                            },
                            {
                              title: '肘部',
                              sides: [
                                {
                                  label: '左',
                                  badge: '左',
                                  badgeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                                  sliders: [
                                    { key: 'leftElbow', label: '弯曲', min: -10, max: 150 },
                                  ]
                                },
                                {
                                  label: '右',
                                  badge: '右',
                                  badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                  sliders: [
                                    { key: 'rightElbow', label: '弯曲', min: -10, max: 150 },
                                  ]
                                }
                              ]
                            },
                            {
                              title: '腿部 — 髋',
                              sides: [
                                {
                                  label: '左',
                                  badge: '左',
                                  badgeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                                  sliders: [
                                    { key: 'leftLegStep', label: '前抬', min: -90, max: 120 },
                                    { key: 'leftLegAbduct', label: '外展', min: -60, max: 90 },
                                    { key: 'leftLegTwist', label: '扭转', min: -90, max: 90 },
                                  ]
                                },
                                {
                                  label: '右',
                                  badge: '右',
                                  badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                  sliders: [
                                    { key: 'rightLegStep', label: '前抬', min: -90, max: 120 },
                                    { key: 'rightLegAbduct', label: '外展', min: -60, max: 90 },
                                    { key: 'rightLegTwist', label: '扭转', min: -90, max: 90 },
                                  ]
                                }
                              ]
                            },
                            {
                              title: '膝部',
                              sides: [
                                {
                                  label: '左',
                                  badge: 'loc_left',
                                  badgeBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                                  sliders: [
                                    { key: 'leftKnee', label: '弯曲', min: 0, max: 150 },
                                  ]
                                },
                                {
                                  label: '右',
                                  badge: 'loc_right',
                                  badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                  sliders: [
                                    { key: 'rightKnee', label: '弯曲', min: 0, max: 150 },
                                  ]
                                }
                              ]
                            }
                          ].map((group) => {
                            return (
                              <div key={group.title} className="space-y-3 pb-3 border-b border-white/5 last:border-b-0">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">{group.title}</span>
                                
                                {group.sliders && (
                                  <div className="space-y-2.5">
                                    {group.sliders.map((s) => {
                                      const val = selectedChar.joints[s.key as keyof typeof selectedChar.joints] ?? 0;
                                      return (
                                        <div key={s.key} className="flex items-center gap-3">
                                          <span className="w-10 text-[9px] font-bold text-slate-500">{s.label}</span>
                                          <input 
                                            type="range" min={s.min} max={s.max} value={val}
                                            onChange={(e) => {
                                              const v = parseInt(e.target.value);
                                              setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, joints: { ...c.joints, [s.key]: v } } : c));
                                            }}
                                            className="flex-1 h-1 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"
                                          />
                                          <div className="w-10 py-1 bg-slate-800/80 border border-white/5 text-slate-300 rounded text-center text-[10px] font-mono font-bold">
                                            {val}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {group.sides && (
                                  <div className="space-y-4 pl-1.5 border-l border-white/10">
                                    {group.sides.map((side) => (
                                      <div key={side.label} className="space-y-2">
                                        <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase", side.badgeBg)}>
                                          {side.label}
                                        </span>
                                        <div className="space-y-2.5 pl-1">
                                          {side.sliders.map((s) => {
                                            const val = selectedChar.joints[s.key as keyof typeof selectedChar.joints] ?? 0;
                                            return (
                                              <div key={s.key} className="flex items-center gap-3">
                                                <span className="w-10 text-[9px] font-bold text-slate-500">{s.label}</span>
                                                <input 
                                                  type="range" min={s.min} max={s.max} value={val}
                                                  onChange={(e) => {
                                                    const v = parseInt(e.target.value);
                                                    setCharacters(prev => prev.map(c => c.id === selectedCharId ? { ...c, joints: { ...c.joints, [s.key]: v } } : c));
                                                  }}
                                                  className="flex-1 h-1 bg-slate-800 rounded-full appearance-none accent-indigo-400 cursor-pointer"
                                                />
                                                <div className="w-10 py-1 bg-slate-800/80 border border-white/5 text-slate-300 rounded text-center text-[10px] font-mono font-bold">
                                                  {val}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </React.Fragment>
                  ) : selectedPropId ? (
                    <div className="space-y-6 pt-4 border-t border-white/5">
                       <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">位置与变换</span>
                            <button 
                              onClick={() => setTransformMode(transformMode === 'translate' ? 'none' : 'translate')}
                              className={cn(
                                "flex items-center space-x-1.5 px-2 py-1 rounded-md transition-all border",
                                transformMode === 'translate' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-white/5 text-slate-500 border-white/5"
                              )}
                            >
                              <Move className="w-3 h-3" />
                              <span className="text-[9px] font-black">启用移动工具</span>
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-2">
                            {['x', 'y', 'z'].map((axis, idx) => (
                              <div key={axis} className="space-y-1.5">
                                 <span className="text-[9px] font-bold text-slate-600 uppercase pl-1">{axis} 坐标</span>
                                 <input 
                                   type="number"
                                   step="0.1"
                                   value={selectedProp?.position?.[idx]?.toFixed(1) || '0.0'}
                                   onChange={(e) => {
                                     const val = parseFloat(e.target.value);
                                     if (!isNaN(val)) {
                                       setProps(prev => prev.map(p => {
                                         if (p.id === selectedPropId) {
                                           const newPos = [...p.position] as [number, number, number];
                                           newPos[idx] = val;
                                           return { ...p, position: newPos };
                                         }
                                         return p;
                                       }));
                                     }
                                   }}
                                   className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2 text-[10px] font-mono text-white focus:outline-none focus:border-emerald-500/30"
                                 />
                              </div>
                            ))}
                            
                            <div className="space-y-1.5 col-span-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">整体缩放 (Scale)</span>
                                <span className="text-[10px] font-mono font-bold text-emerald-400">{(selectedProp?.scale?.[0] || 1.0).toFixed(1)}x</span>
                              </div>
                              <input 
                                type="range"
                                min="0.1" max="10.0" step="0.1"
                                value={selectedProp?.scale?.[0] || 1.0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setProps(prev => prev.map(p => p.id === selectedPropId ? { ...p, scale: [val, val, val] } : p));
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                              />
                           </div>

                           <div className="space-y-1.5 col-span-3">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">水平旋转 (Rotation)</span>
                                <span className="text-[10px] font-mono font-bold text-emerald-400">{Math.round(selectedProp?.rotation?.[1] || 0)}°</span>
                              </div>
                              <input 
                                type="range"
                                min="0" max="360" step="1"
                                value={selectedProp?.rotation?.[1] || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setProps(prev => prev.map(p => {
                                    if (p.id === selectedPropId) {
                                      const newRot = [...p.rotation] as [number, number, number];
                                      newRot[1] = val;
                                      return { ...p, rotation: newRot };
                                    }
                                    return p;
                                  }));
                                }}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                              />
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">道具调节</span>
                         <button onClick={() => setProps(prev => prev.filter(p => p.id !== selectedPropId))} className="text-slate-600 hover:text-red-500 transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">道具颜色</span>
                        <div className="flex items-center space-x-2">
                          {['#94a3b8', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setProps(prev => prev.map(p => p.id === selectedPropId ? { ...p, color: c } : p))}
                              className={cn("w-5 h-5 rounded-full border-2", selectedProp?.color === c ? "border-white" : "border-transparent")}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center opacity-30">
                       <Layout className="w-10 h-10 mx-auto mb-2" />
                       <p className="text-[10px] font-black uppercase">未选择资产</p>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="p-6 border-t border-white/5 bg-black/40">
             <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10 mb-6">
                 <h4 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 select-none">导演构思备忘</h4>
                 <p className="text-[10px] font-medium text-slate-500 italic tracking-tight leading-relaxed">
                   {getCinematicDesc()}
                 </p>
             </div>

            <button 
              onClick={takeSnapshot}
              className="w-full py-5 bg-white text-[#06080f] hover:bg-slate-100 rounded-[22px] text-[11px] font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center space-x-2 group"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>截图并下载</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCrowdGen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="w-full max-w-sm bg-[#0a0b14] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <span className="text-[11px] font-black uppercase tracking-widest">群众分布预设</span>
                 <button onClick={() => setShowCrowdGen(false)} className="text-slate-600 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                     <span>生成总数</span>
                     <span className="text-indigo-400 font-mono font-bold">{crowdParams.count}</span>
                   </div>
                   <input 
                    type="range" min="1" max="40"
                    value={crowdParams.count}
                    onChange={(e) => setCrowdParams(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500"
                   />
                 </div>
                 <button 
                  onClick={() => { generateCrowd(); setShowCrowdGen(false); }}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                 >
                   更新空间分布
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 2. PerspectiveSim.tsx
// ==========================================








interface PerspectiveSimProps {
  onClose: () => void;
  onGenerate: (params: PerspectiveParams) => void;
  initialImage?: string;
  isEmbedded?: boolean;
}

export interface PerspectiveParams {
  azimuth: number;
  elevation: number;
  distance: number;
  prompt: string;
  referenceImage?: string;
  stageParams?: {
    characters: any[];
    cameras: any[];
    activeCamId: string;
    cameraStats?: {
      azimuth: number;
      elevation: number;
      distance: number;
    };
    cinematicLabel?: string;
  };
}

export const PerspectiveSim: React.FC<PerspectiveSimProps> = ({ onClose, onGenerate, initialImage, isEmbedded = false }) => {
  const [params, setParams] = useState<PerspectiveParams>({
    azimuth: 139,
    elevation: 11,
    distance: 4.0,
    prompt: '',
    referenceImage: initialImage,
    stageParams: {
      characters: [],
      cameras: [],
      activeCamId: ''
    }
  });

  useEffect(() => {
    if (initialImage) {
      setParams(prev => ({ ...prev, referenceImage: initialImage }));
    }
  }, [initialImage]);

  const [renderConfig, setRenderConfig] = useState([
    { label: '高精度渲染', icon: Zap, active: true, id: 'high-res' },
    { label: '光影追踪', icon: RotateCw, active: false, id: 'ray-tracing' },
    { label: '深度映射', icon: Layers, active: true, id: 'depth-map' },
    { label: '机位锁定', icon: Camera, active: true, id: 'cam-lock' },
  ]);

  const toggleConfig = (id: string) => {
    setRenderConfig(prev => prev.map(item => 
      item.id === id ? { ...item, active: !item.active } : item
    ));
  };

  const [isRendering, setIsRendering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setParams(prev => ({ ...prev, referenceImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    setIsRendering(true);
    
    const currentAzi = params.stageParams?.cameraStats?.azimuth ?? params.azimuth;
    const currentEle = params.stageParams?.cameraStats?.elevation ?? params.elevation;
    const currentDist = params.stageParams?.cameraStats?.distance ?? params.distance;
    const cinematicLabel = params.stageParams?.cinematicLabel || '';
    
    // Split cinematic label into components
    const labels = cinematicLabel.split(' • ');
    const perspective = labels[0] || 'Perspective';
    const angle = labels[1] || 'Camera Angle';
    const shotType = labels[2] || 'Shot Type';

    // Construct the structured metadata as requested
    const structuredData = {
      camera_config: {
        perspective,
        angle,
        shot_type: shotType,
        azimuth: currentAzi,
        elevation: currentEle,
        distance: currentDist
      },
      characters: (params.stageParams?.characters || []).map((char: any) => ({
        id: char.id,
        name: char.type === 'advanced' ? '主角角色' : '群众演员',
        body_type: char.bodyStyle,
        kinematics: {
          head_tilt: char.joints.headPitch,
          torso_tilt: char.joints.torsoLean,
          l_arm_lift: char.joints.leftArmLift,
          r_arm_lift: char.joints.rightArmLift,
          step_length: char.joints.leftLegStep
        }
      })),
      user_prompt: params.prompt,
      render_settings: {
        high_res: renderConfig.find(c => c.id === 'high-res')?.active ?? false,
        depth_mapping: renderConfig.find(c => c.id === 'depth-map')?.active ?? false,
        ray_tracing_simulation: renderConfig.find(c => c.id === 'ray-tracing')?.active ?? false
      }
    };

    // Automated prompt concatenation logic (simulating the Python logic)
    const cameraPrompt = \`\${shotType}, \${angle}, \${perspective}\`;
    const charDescriptions = structuredData.characters.map((char: any) => 
      \`one character with \${char.body_type} body build\`
    ).join(', ');
    
    const finalAutomatedPrompt = \`\${cameraPrompt}, \${params.prompt}, \${charDescriptions}, cinematic lighting, photorealistic, 8k\`;

    const finalParams = {
      ...params,
      azimuth: currentAzi,
      elevation: currentEle,
      distance: currentDist,
      // Pass both the automated prompt and the raw metadata for the backend
      prompt: finalAutomatedPrompt,
      metadata: structuredData
    };

    // Simulate rendering delay
    setTimeout(() => {
      onGenerate(finalParams);
      setIsRendering(false);
    }, 1500);
  };

  const renderInner = () => (
    <div className={cn("relative overflow-hidden bg-[#06080f] w-full flex flex-col", isEmbedded ? "h-[380px] rounded-2xl" : "h-full")}>
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      {/* Top Header */}
      {!isEmbedded && (
        <div className="h-16 border-b border-slate-800/50 bg-[#0a0b14] flex items-center justify-between px-6 shrink-0 relative z-30 shadow-2xl text-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black tracking-tight text-white flex items-center">
                3D 导演台 <span className="mx-2 text-slate-700">/</span> DIRECTOR_STAGE
              </h1>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">3D Cinematic Director Stage</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">当前机位</span>
                <span className="text-[11px] font-black text-indigo-400">A-SHOT (MAIN)</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">渲染状态</span>
                <span className="text-[11px] font-black text-green-500 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span>READY</span>
                </span>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isRendering}
              className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>渲染生成机位</span>
            </button>
            
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-[#06080f]">
        <DirectorStage 
          onParamsChange={(stageParams) => setParams(prev => ({ ...prev, stageParams }))}
          referenceImage={params.referenceImage}
        />

        {/* Floating Controls for Embedded/Standard View inside the Stage */}
        <div className="absolute bottom-4 right-4 z-[40] flex items-center space-x-2">
          {isEmbedded && (
            <button 
              onClick={handleGenerate}
              disabled={isRendering}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
              {isRendering ? <Loader2 className="w-3 animate-spin" /> : <Sparkles className="w-3" />}
              <span>{isRendering ? '渲染中...' : '生成场景机位'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return renderInner();
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#06080f] flex flex-col overflow-hidden text-slate-100"
    >
      {renderInner()}
    </motion.div>
  );
};

const PerspectiveSimApp = () => {
  const context = window.pluginContext || {};
  const initialImage = context.initialImage || context.referenceImage || "";
  const initialPrompt = context.initialPrompt || "";

  const handleGenerate = (params) => {
    window.parent.postMessage({
      type: 'perspective-sim-generate',
      params: params
    }, '*');
  };

  const handleClose = () => {
    window.parent.postMessage({
      type: 'perspective-sim-close'
    }, '*');
  };

  return (
    <PerspectiveSim 
      initialImage={initialImage}
      onClose={handleClose}
      onGenerate={handleGenerate}
      isEmbedded={false}
    />
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PerspectiveSimApp />);`
};
