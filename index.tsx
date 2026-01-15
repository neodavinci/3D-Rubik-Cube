import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene: THREE.Scene, 
    camera: THREE.PerspectiveCamera, 
    renderer: THREE.WebGLRenderer, 
    cubeGroup: THREE.Group, 
    controls: OrbitControls;

const CUBIE_SIZE = 1;
const CUBIE_GAP = 0.05;
const CUBE_DIMENSION = 3;
const HALF_CUBE = Math.floor(CUBE_DIMENSION / 2);
const POSITION_OFFSET = CUBIE_SIZE + CUBIE_GAP;

function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);

    // Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(6, 6, 8);
    camera.lookAt(0, 0, 0);

    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const container = document.getElementById('app-container');
    if (container) {
        container.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 15);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-10, -10, -10);
    scene.add(fillLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;

    createCube();
    setupUI();

    window.addEventListener('resize', onWindowResize);
    animate();
    
    console.log("Rubik's Cube Initialized Successfully");
}

function createCube() {
    if (cubeGroup) {
        scene.remove(cubeGroup);
    }
    cubeGroup = new THREE.Group();

    // High quality materials with rounded-like feel using roughness/metalness
    const materials = {
        right: new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.1, metalness: 0.1 }),  // Red
        left: new THREE.MeshStandardMaterial({ color: 0xff5800, roughness: 0.1, metalness: 0.1 }),   // Orange
        top: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 }),    // White
        bottom: new THREE.MeshStandardMaterial({ color: 0xffd500, roughness: 0.1, metalness: 0.1 }), // Yellow
        front: new THREE.MeshStandardMaterial({ color: 0x0046ad, roughness: 0.1, metalness: 0.1 }),  // Blue
        back: new THREE.MeshStandardMaterial({ color: 0x009b48, roughness: 0.1, metalness: 0.1 }),   // Green
        inner: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0, metalness: 0.0 })   // Black
    };

    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

    for (let x = -HALF_CUBE; x <= HALF_CUBE; x++) {
        for (let y = -HALF_CUBE; y <= HALF_CUBE; y++) {
            for (let z = -HALF_CUBE; z <= HALF_CUBE; z++) {
                // Skip the core for better performance
                if (x === 0 && y === 0 && z === 0) continue;

                const cubeMaterials = [
                    x === HALF_CUBE ? materials.right : materials.inner,
                    x === -HALF_CUBE ? materials.left : materials.inner,
                    y === HALF_CUBE ? materials.top : materials.inner,
                    y === -HALF_CUBE ? materials.bottom : materials.inner,
                    z === HALF_CUBE ? materials.front : materials.inner,
                    z === -HALF_CUBE ? materials.back : materials.inner,
                ];

                const cubie = new THREE.Mesh(geometry, cubeMaterials);
                cubie.position.set(x * POSITION_OFFSET, y * POSITION_OFFSET, z * POSITION_OFFSET);
                cubeGroup.add(cubie);
            }
        }
    }
    scene.add(cubeGroup);
}

function setupUI() {
    const shuffleButton = document.getElementById('shuffle-btn') as HTMLButtonElement;
    const resetButton = document.getElementById('reset-btn') as HTMLButtonElement;

    if (shuffleButton) {
        shuffleButton.addEventListener('click', async () => {
            shuffleButton.disabled = true;
            if (resetButton) resetButton.disabled = true;
            await shuffleCube();
            shuffleButton.disabled = false;
            if (resetButton) resetButton.disabled = false;
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (shuffleButton && shuffleButton.disabled) return;
            createCube();
        });
    }
}

async function shuffleCube() {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const numMoves = 15;

    for (let i = 0; i < numMoves; i++) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        await performMove(move + modifier);
    }
}

function performMove(move: string) {
    return new Promise<void>(resolve => {
        const face = move[0];
        const isPrime = move.includes("'");
        const isDouble = move.includes("2");
        
        const axis = new THREE.Vector3();
        let cubiesToRotate: THREE.Mesh[] = [];
        let angleDirection = 1;

        const layerPosition = HALF_CUBE * POSITION_OFFSET;

        switch(face) {
            case 'U': axis.set(0, 1, 0); cubiesToRotate = getCubiesByPosition('y', layerPosition); angleDirection = -1; break;
            case 'D': axis.set(0, 1, 0); cubiesToRotate = getCubiesByPosition('y', -layerPosition); angleDirection = 1; break;
            case 'R': axis.set(1, 0, 0); cubiesToRotate = getCubiesByPosition('x', layerPosition); angleDirection = -1; break;
            case 'L': axis.set(1, 0, 0); cubiesToRotate = getCubiesByPosition('x', -layerPosition); angleDirection = 1; break;
            case 'F': axis.set(0, 0, 1); cubiesToRotate = getCubiesByPosition('z', layerPosition); angleDirection = -1; break;
            case 'B': axis.set(0, 0, 1); cubiesToRotate = getCubiesByPosition('z', -layerPosition); angleDirection = 1; break;
        }

        if (cubiesToRotate.length === 0) {
            resolve();
            return;
        }

        let totalAngle = (Math.PI / 2) * angleDirection;
        if (isPrime) totalAngle *= -1;
        if (isDouble) totalAngle *= 2;
        
        const animationDuration = 200; 
        const startTime = performance.now();
        const pivot = new THREE.Object3D();
        scene.add(pivot);
        
        cubiesToRotate.forEach(cubie => pivot.attach(cubie));

        let lastAngle = 0;

        function animateRotation() {
            const elapsedTime = performance.now() - startTime;
            let progress = Math.min(elapsedTime / animationDuration, 1);
            const ease = progress * (2 - progress); // Ease out
            
            const currentAngle = totalAngle * ease;
            const delta = currentAngle - lastAngle;
            
            pivot.rotateOnWorldAxis(axis, delta);
            lastAngle = currentAngle;

            if (progress < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                pivot.updateMatrixWorld(true);
                cubiesToRotate.forEach(cubie => {
                    cubeGroup.attach(cubie);
                    // Snap positions & rotations
                    cubie.position.x = Math.round(cubie.position.x / POSITION_OFFSET) * POSITION_OFFSET;
                    cubie.position.y = Math.round(cubie.position.y / POSITION_OFFSET) * POSITION_OFFSET;
                    cubie.position.z = Math.round(cubie.position.z / POSITION_OFFSET) * POSITION_OFFSET;
                    
                    const euler = new THREE.Euler().setFromQuaternion(cubie.quaternion);
                    cubie.rotation.set(
                        Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2)
                    );
                });
                scene.remove(pivot);
                resolve();
            }
        }
        requestAnimationFrame(animateRotation);
    });
}

function getCubiesByPosition(axis: 'x' | 'y' | 'z', value: number): THREE.Mesh[] {
    return cubeGroup.children.filter(
        (c) => Math.abs(c.position[axis] - value) < 0.2
    ) as THREE.Mesh[];
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Start only after DOM is fully ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}
