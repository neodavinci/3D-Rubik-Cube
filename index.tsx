import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, cubeGroup, controls;

const CUBIE_SIZE = 1;
const CUBIE_GAP = 0.1;
const CUBE_DIMENSION = 3;
const HALF_CUBE = Math.floor(CUBE_DIMENSION / 2);
const POSITION_OFFSET = CUBIE_SIZE + CUBIE_GAP;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222); // Slightly lighter background

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 7); // Adjusted position for better view

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    const container = document.getElementById('app-container');
    if (container) {
        container.prepend(renderer.domElement);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    createCube();
    setupUI();

    window.addEventListener('resize', onWindowResize);
    animate();
}

function createCube() {
    if (cubeGroup) {
        scene.remove(cubeGroup);
    }
    cubeGroup = new THREE.Group();

    const colors = {
        right: new THREE.MeshStandardMaterial({ color: 0xff0000 }), // Red
        left: new THREE.MeshStandardMaterial({ color: 0xffa500 }), // Orange
        top: new THREE.MeshStandardMaterial({ color: 0xffffff }), // White
        bottom: new THREE.MeshStandardMaterial({ color: 0xffff00 }), // Yellow
        front: new THREE.MeshStandardMaterial({ color: 0x0000ff }), // Blue
        back: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
        inner: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }) // Match bg slightly or dark
    };

    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

    for (let x = -HALF_CUBE; x <= HALF_CUBE; x++) {
        for (let y = -HALF_CUBE; y <= HALF_CUBE; y++) {
            for (let z = -HALF_CUBE; z <= HALF_CUBE; z++) {
                // Keep the core if needed for structure, or skip. Skipping center is fine.
                // However, for animation pivots, having a full grid is sometimes safer, but here we attach/detach.
                // Skipping (0,0,0) for odd dimensions.
                if (x === 0 && y === 0 && z === 0 && CUBE_DIMENSION % 2 !== 0) continue;

                const materials = [
                    x === HALF_CUBE ? colors.right : colors.inner,
                    x === -HALF_CUBE ? colors.left : colors.inner,
                    y === HALF_CUBE ? colors.top : colors.inner,
                    y === -HALF_CUBE ? colors.bottom : colors.inner,
                    z === HALF_CUBE ? colors.front : colors.inner,
                    z === -HALF_CUBE ? colors.back : colors.inner,
                ];

                const cubie = new THREE.Mesh(geometry, materials);
                cubie.position.set(x * POSITION_OFFSET, y * POSITION_OFFSET, z * POSITION_OFFSET);
                
                // Add userData to identify initial grid position if needed
                cubie.userData = { x, y, z };
                
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
        shuffleButton.onclick = async () => {
            shuffleButton.disabled = true;
            if (resetButton) resetButton.disabled = true;
            await shuffleCube();
            shuffleButton.disabled = false;
            if (resetButton) resetButton.disabled = false;
        };
    }

    if (resetButton) {
        resetButton.onclick = () => {
            if (shuffleButton && shuffleButton.disabled) return;
            resetCube();
        };
    }
}

async function shuffleCube() {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const numMoves = 20;

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
        // Epsilon for float comparison
        const epsilon = 0.1;

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
        
        const animationDuration = 300; // ms
        const startTime = performance.now();
        const pivot = new THREE.Object3D();
        pivot.rotation.set(0, 0, 0);
        pivot.updateMatrixWorld();
        scene.add(pivot);
        
        // Attach cubies to pivot
        cubiesToRotate.forEach(cubie => {
            pivot.attach(cubie);
        });

        let lastAngle = 0;

        function animateRotation() {
            const elapsedTime = performance.now() - startTime;
            let progress = elapsedTime / animationDuration;
            if (progress > 1) progress = 1;
            
            // Ease out quad
            const ease = 1 - (1 - progress) * (1 - progress);
            
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
                    
                    // Snap positions
                    cubie.position.x = Math.round(cubie.position.x / POSITION_OFFSET) * POSITION_OFFSET;
                    cubie.position.y = Math.round(cubie.position.y / POSITION_OFFSET) * POSITION_OFFSET;
                    cubie.position.z = Math.round(cubie.position.z / POSITION_OFFSET) * POSITION_OFFSET;
                    
                    // Snap rotation
                    const euler = new THREE.Euler().setFromQuaternion(cubie.quaternion);
                    cubie.rotation.set(
                        Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2)
                    );
                    cubie.updateMatrixWorld();
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
        (c) => Math.abs(c.position[axis] - value) < 0.5 // Increased tolerance
    ) as THREE.Mesh[];
}

function resetCube() {
    createCube();
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

init();
